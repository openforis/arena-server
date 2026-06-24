import { Paragraph } from 'docx'

import type { NodeDefCode } from '@openforis/arena-core'
import { NodeValues, Surveys } from '@openforis/arena-core'

import {
  checkboxRun,
  fieldRow,
  getCategoryItemLabel,
  label,
  nodeDefFormItemLabelRun,
  SPACING_FIELD_ROW,
  valueRow,
} from './common'
import type { AttributeRenderer } from './types'

export const renderCode: AttributeRenderer = async ({ nodeDef, context, node }) => {
  const codeDef = nodeDef as NodeDefCode
  const { survey, lang } = context
  const items = survey.refData ? Surveys.getCategoryItemsByNodeDef({ survey, nodeDef: codeDef }) : []

  const lbl = label(codeDef, lang)
  const isCheckboxLayout =
    codeDef.props?.layout && Object.values(codeDef.props.layout).some((l: any) => l?.renderType === 'checkbox')
  const selectedItemUuid = node ? NodeValues.getItemUuid(node) : undefined
  const showAsCheckboxes = (isCheckboxLayout || items.length <= 8) && items.length > 0

  if (showAsCheckboxes) {
    const optionRuns = items.flatMap((item) => {
      const checked = selectedItemUuid !== undefined && item.uuid === selectedItemUuid
      return checkboxRun(getCategoryItemLabel(item, lang), checked)
    })
    return [
      new Paragraph({
        spacing: SPACING_FIELD_ROW,
        keepLines: true,
        children: [nodeDefFormItemLabelRun(codeDef, context), ...optionRuns],
      }),
    ]
  }

  if (selectedItemUuid !== undefined) {
    const selectedItem = node?.refData?.categoryItem
    const displayValue = selectedItem
      ? getCategoryItemLabel(selectedItem, lang)
      : (node?.value?.code ?? selectedItemUuid)
    return [valueRow(lbl, String(displayValue))]
  }

  const sizeLabel = items.length > 0 ? ` (${items.length} options)` : ''
  return [fieldRow(lbl, `[select${sizeLabel}]`)]
}
