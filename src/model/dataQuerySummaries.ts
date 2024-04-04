import { LanguageCode } from '@openforis/arena-core'

import { DataQuerySummary } from './dataQuery'

const getName = (querySummary: DataQuerySummary): string => querySummary.props?.name ?? ''
const getLabel =
  (lang: LanguageCode) =>
  (querySummary: DataQuerySummary): string =>
    querySummary.props?.labels?.[lang] ?? ''

export const DataQuerySummaries = {
  getName,
  getLabel,
}
