import { NodeDefType } from '@openforis/arena-core'

import { renderBoolean } from './renderBoolean'
import { renderCode } from './renderCode'
import { renderCoordinate } from './renderCoordinate'
import { renderDate } from './renderDate'
import { renderFile } from './renderFile'
import { renderFormHeader } from './renderFormHeader'
import { renderGeo } from './renderGeo'
import { renderNumber } from './renderNumber'
import { renderTaxon } from './renderTaxon'
import { renderText } from './renderText'
import { renderTime } from './renderTime'
import type { AttributeRenderer, AttributeRendererArgs } from './types'

const rendererByNodeDefType: Partial<Record<NodeDefType, AttributeRenderer>> = {
  [NodeDefType.boolean]: renderBoolean,
  [NodeDefType.code]: renderCode,
  [NodeDefType.coordinate]: renderCoordinate,
  [NodeDefType.date]: renderDate,
  [NodeDefType.time]: renderTime,
  [NodeDefType.taxon]: renderTaxon,
  [NodeDefType.file]: renderFile,
  [NodeDefType.geo]: renderGeo,
  [NodeDefType.formHeader]: renderFormHeader,
  [NodeDefType.integer]: renderNumber,
  [NodeDefType.decimal]: renderNumber,
  [NodeDefType.text]: renderText,
}

export const renderAttributeByType = async (args: AttributeRendererArgs) => {
  const renderer = rendererByNodeDefType[args.nodeDef.type] ?? renderText
  return renderer(args)
}

export type { RenderContext, DocChild, RenderLimits } from './types'
