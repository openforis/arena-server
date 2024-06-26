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
  skip?: string[]
}): any => {
  const { row, draft = false, assocPublishedDraft = false, backup = false, skip = [] } = options
  if (row === null) {
    return null
  }

  // Assoc published and draft properties based on props
  const currentRow = backup || assocPublishedDraft ? _assocPublishedDraft(row) : row
  const rowUpdated = Objects.camelize(currentRow, {
    skip: ['validation', 'props', 'props_draft', ...skip],
    sideEffect: true,
  })

  if (!Object.hasOwn(rowUpdated, 'props_draft')) {
    return rowUpdated
  }

  if (!backup) {
    return mergeProps({ row: rowUpdated, draft })
  }

  // backup: camelize props_draft column into propsDraft
  rowUpdated.propsDraft = row.props_draft
  delete rowUpdated.props_draft
  return rowUpdated
}

export const transformCallbackCount = (row: any): number => Number(row?.count)
