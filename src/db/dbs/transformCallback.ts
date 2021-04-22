import { Objects } from '@openforis/arena-core'

const mergeProps = (options: { row: any; draft: boolean }) => {
  const { row, draft } = options
  if (!row) {
    return null
  }
  const { props = {}, props_draft: propsDraft = {}, ...rest } = row
  const propsUpdate = draft ? { ...(props || {}), ...(propsDraft || {}) } : props
  return { ...rest, props: propsUpdate }
}

const _assocPublishedDraft = (row: any) => ({
  ...row,
  published: !Objects.isEmpty(row.props),
  draft: !Objects.isEmpty(row.props_draft),
})

export const transformCallback = (options: {
  row: any
  draft?: boolean
  assocPublishedDraft?: boolean
  backup?: boolean
}): any => {
  const { row, draft = false, assocPublishedDraft = false, backup = false } = options
  if (row === null) {
    return null
  }

  // Assoc published and draft properties based on props
  const currentRow = assocPublishedDraft ? _assocPublishedDraft(row) : row
  const rowUpdated = Objects.camelize({ object: currentRow, skip: ['validation', 'props', 'props_draft'] })

  if (!backup) {
    return mergeProps({ row: rowUpdated, draft })
  }

  delete rowUpdated.props_draft
  return rowUpdated
}
