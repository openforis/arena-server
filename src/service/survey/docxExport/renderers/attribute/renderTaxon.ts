import { Paragraph, TextRun } from 'docx'

import { NodeDefs, NodeValues, Taxa } from '@openforis/arena-core'

import {
  EMPTY_FIELD,
  EMPTY_SHORT,
  formItemLabelRun,
  getTaxonFieldCommonProps,
  isNodeFilled,
  label,
  SPACING_COMPOSITE_LABEL_ROW,
  inputLine,
} from './common'
import type { AttributeRenderer } from './types'

export const renderTaxon: AttributeRenderer = async ({ nodeDef, context, node }) => {
  const lbl = label(nodeDef, context.lang)
  const hasValue = isNodeFilled(node)
  const taxon = hasValue ? node.refData?.taxon : undefined
  const taxonCode = taxon ? (Taxa.getCode(taxon) ?? '') : EMPTY_SHORT
  const sciName = taxon ? Taxa.getScientificName(taxon) : EMPTY_FIELD
  const vernacularNameVisible = NodeDefs.isFieldVisible(NodeValues.ValuePropsTaxon.vernacularName)(nodeDef)
  const vernacularNameUuid = node ? NodeValues.getVernacularNameUuid(node) : undefined
  const { vernacularName } = vernacularNameUuid && taxon ? Taxa.getVernacularNameAndLang(vernacularNameUuid)(taxon) : {}

  const fieldCommonProps = getTaxonFieldCommonProps()

  const rows: Paragraph[] = [
    new Paragraph({ spacing: SPACING_COMPOSITE_LABEL_ROW, keepNext: true, children: [formItemLabelRun(lbl, false)] }),
    new Paragraph({
      ...fieldCommonProps,
      children: [
        formItemLabelRun(context.i18n.t('surveyForm:nodeDefTaxon.code')),
        hasValue ? new TextRun({ text: taxonCode }) : inputLine(EMPTY_SHORT),
      ],
    }),
    new Paragraph({
      ...fieldCommonProps,
      children: [
        formItemLabelRun(context.i18n.t('surveyForm:nodeDefTaxon.scientificName')),
        hasValue ? new TextRun({ text: sciName }) : inputLine(EMPTY_FIELD),
      ],
    }),
  ]

  if (vernacularNameVisible) {
    rows.push(
      new Paragraph({
        ...fieldCommonProps,
        children: [
          formItemLabelRun(context.i18n.t('surveyForm:nodeDefTaxon.vernacularName')),
          vernacularName ? new TextRun({ text: vernacularName }) : inputLine(EMPTY_FIELD),
        ],
      })
    )
  }

  return rows
}
