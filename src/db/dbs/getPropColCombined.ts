import { Strings } from '@openforis/arena-core'

export const getPropsCombined = (
  draft?: boolean,
  { tableAlias = '', alias = 'props' }: { tableAlias?: string; alias?: string | null } = {}
) => {
  const columnPrefix = tableAlias ? Strings.appendIfMissing('.')(tableAlias) : ''
  return draft
    ? `(${columnPrefix}props || ${columnPrefix}props_draft)${alias ? ` AS ${alias}` : ''}`
    : `${columnPrefix}props${alias ? ` AS ${alias}` : ''}`
}
export const getPropColCombined = (
  propName: string,
  {
    draft,
    columnPrefix = '',
    asText = true,
    alias = null,
  }: {
    draft?: boolean
    columnPrefix?: string
    asText?: boolean
    alias?: string | null
  } = {}
) =>
  `(${getPropsCombined(draft, { tableAlias: columnPrefix, alias: null })})${asText ? '->>' : '->'}'${propName}'${alias ? ` AS ${alias}` : ''}`
