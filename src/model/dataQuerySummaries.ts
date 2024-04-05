import { Labels, LanguageCode, Objects, UUIDs } from '@openforis/arena-core'

import { DataQuery, DataQuerySummary } from './dataQuery'

enum PropKeys {
  name = 'name',
  labels = 'labels',
  descriptions = 'descriptions',
}

const create = ({ content = undefined }): DataQuerySummary => ({ uuid: UUIDs.v4(), content })

const getUuid = (querySummary: DataQuerySummary): string => querySummary.uuid ?? ''

const getName = (querySummary: DataQuerySummary): string => querySummary.props?.name ?? ''

const getContent = (querySummary: DataQuerySummary): DataQuery | undefined => querySummary.content

const getLabels = (querySummary: DataQuerySummary): Labels => querySummary.props?.labels ?? {}

const getLabel =
  (lang: LanguageCode) =>
  (querySummary: DataQuerySummary): string =>
    getLabels(querySummary)[lang] ?? ''

const getDescriptions = (querySummary: DataQuerySummary): Labels => querySummary.props?.descriptions ?? {}

const getDescription =
  (lang: LanguageCode) =>
  (querySummary: DataQuerySummary): string =>
    getDescriptions(querySummary)[lang] ?? ''

const assocProp =
  (params: { prop: string; value: any }) =>
  (obj: any): any => {
    const { prop, value } = params
    return Objects.assocPath({ obj, path: ['props', prop], value })
  }

const assocName =
  (value: string) =>
  (querySummary: DataQuerySummary): DataQuerySummary =>
    assocProp({ prop: PropKeys.name, value })(querySummary)

const assocLabels =
  (value: Labels) =>
  (querySummary: DataQuerySummary): DataQuerySummary =>
    assocProp({ prop: PropKeys.labels, value })(querySummary)

const assocDescriptions =
  (value: Labels) =>
  (querySummary: DataQuerySummary): DataQuerySummary =>
    assocProp({ prop: PropKeys.descriptions, value })(querySummary)

export const DataQuerySummaries = {
  // create
  create,
  // read
  getUuid,
  getName,
  getContent,
  getLabels,
  getLabel,
  getDescriptions,
  getDescription,
  // update
  assocName,
  assocLabels,
  assocDescriptions,
}
