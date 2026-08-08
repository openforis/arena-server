import { describe, expect, test } from '@jest/globals'
import {
  I18n,
  LanguageCode,
  NodeDefEntity,
  Objects,
  Records,
  RecordBuilder,
  RecordNodeBuilders,
  SurveyBuilder,
  SurveyObjectBuilders,
  Surveys,
  UserFactory,
  UUIDs,
} from '@openforis/arena-core'

import type { SurveyDocRenderer } from './SurveyDocRenderer'
import { walkSurvey } from './SurveyDocWalker'
import type { PrintOrientation } from './types'

const { entityDef, integerDef } = SurveyObjectBuilders
const { attribute, entity } = RecordNodeBuilders

const cycle = '0'

const i18n: I18n = {
  t: (key: string) => key,
  exists: () => false,
}

const stringRenderer: SurveyDocRenderer<string> = {
  renderTitle: (text) => [`TITLE:${text}`],
  renderSubtitle: (text) => [`SUB:${text}`],
  renderEntityHeading: (text) => [`H:${text}`],
  renderEntityInstanceHeading: (text) => [`IH:${text}`],
  renderAttribute: async ({ nodeDef }) => [`A:${nodeDef.props.name}`],
  renderGridTable: () => [],
  renderEntityTable: () => [],
}

const setOwnPage = (pageNodeDef: NodeDefEntity, parentNodeDef: NodeDefEntity): void => {
  const pageUuid = UUIDs.v4()
  Objects.setInPath({ obj: pageNodeDef, path: ['props', 'layout', cycle, 'pageUuid'], value: pageUuid })
  const indexChildren =
    (Objects.path(['props', 'layout', cycle, 'indexChildren'])(parentNodeDef) as string[] | undefined) ?? []
  Objects.setInPath({
    obj: parentNodeDef,
    path: ['props', 'layout', cycle, 'indexChildren'],
    value: [...indexChildren, pageNodeDef.uuid],
  })
}

const setPrintOrientation = (entityDef: NodeDefEntity, orientation: PrintOrientation): void => {
  Objects.setInPath({ obj: entityDef, path: ['props', 'printOrientation'], value: orientation })
}

const buildSurveyWithOwnPagePlot = async () => {
  const user = UserFactory.createInstance({ email: 'test@example.com', name: 'Test User' })
  const survey = await new SurveyBuilder(
    user,
    entityDef('cluster', integerDef('cluster_id').key(), entityDef('plot', integerDef('plot_id').key()).multiple())
  ).build()

  const rootDef = Surveys.getNodeDefRoot({ survey }) as NodeDefEntity
  const plotDef = Surveys.getNodeDefByName({ survey, name: 'plot' }) as NodeDefEntity
  setOwnPage(plotDef, rootDef)
  setPrintOrientation(plotDef, 'landscape')

  const record = new RecordBuilder(
    user,
    survey,
    entity(
      'cluster',
      attribute('cluster_id', 10),
      entity('plot', attribute('plot_id', 1)),
      entity('plot', attribute('plot_id', 2))
    )
  ).build()

  return { survey, record, rootDef, plotDef }
}

describe('walkSurvey', () => {
  test('full export default: one portrait section with survey title', async () => {
    const user = UserFactory.createInstance({ email: 'test@example.com', name: 'Test User' })
    const survey = await new SurveyBuilder(
      user,
      entityDef('cluster', integerDef('cluster_id').key())
    ).build()
    const record = new RecordBuilder(
      user,
      survey,
      entity('cluster', attribute('cluster_id', 10))
    ).build()
    const surveyLabel = Surveys.getLabel(LanguageCode.en)(survey)

    const { sections, surveyName } = await walkSurvey({ survey, record, i18n, cycle }, stringRenderer)

    expect(surveyName).toBe(Surveys.getName(survey))
    expect(sections).toHaveLength(1)
    expect(sections[0].orientation).toBe('portrait')
    expect(sections[0].elements[0]).toBe(`TITLE:${surveyLabel}`)
    expect(sections[0].elements).toContain('A:cluster_id')
  })

  test('current page: entity title and excludes own-page child content', async () => {
    const { survey, record, rootDef } = await buildSurveyWithOwnPagePlot()
    const clusterNode = Records.getRoot(record)
    if (!clusterNode) throw new Error('Expected root record node')
    const clusterLabel = rootDef.props.name

    const { sections } = await walkSurvey(
      {
        survey,
        record,
        i18n,
        cycle,
        exportScope: 'currentPage',
        entityDefUuid: rootDef.uuid,
        entityNodeUuid: clusterNode.uuid,
      },
      stringRenderer
    )

    expect(sections).toHaveLength(1)
    expect(sections[0].elements[0]).toBe(`TITLE:${clusterLabel}`)
    expect(sections[0].elements).toContain('A:cluster_id')
    expect(sections[0].elements.some((el) => el.includes('plot'))).toBe(false)
  })

  test('full export: own-page child with landscape printOrientation creates second section', async () => {
    const { survey, record } = await buildSurveyWithOwnPagePlot()

    const { sections } = await walkSurvey({ survey, record, i18n, cycle }, stringRenderer)

    expect(sections).toHaveLength(2)
    expect(sections[0].orientation).toBe('portrait')
    expect(sections[1].orientation).toBe('landscape')
    expect(sections[1].elements.some((el) => el.includes('plot'))).toBe(true)
  })

  test('current page: entity printOrientation overrides document default', async () => {
    const { survey, record, plotDef } = await buildSurveyWithOwnPagePlot()
    const rootNode = Records.getRoot(record)
    if (!rootNode) throw new Error('Expected root record node')
    const plotNode = Records.getChildren(rootNode, plotDef.uuid)(record)[0]
    if (!plotNode) throw new Error('Expected plot record node')

    const { sections } = await walkSurvey(
      {
        survey,
        record,
        i18n,
        cycle,
        orientation: 'portrait',
        exportScope: 'currentPage',
        entityDefUuid: plotDef.uuid,
        entityNodeUuid: plotNode.uuid,
      },
      stringRenderer
    )

    expect(sections).toHaveLength(1)
    expect(sections[0].orientation).toBe('landscape')
  })
})
