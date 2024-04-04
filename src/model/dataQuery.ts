import { Labels } from '@openforis/arena-core'

export enum DataQueryMode {
  raw = 'raw',
  rawEdit = 'rawEdit',
  aggregate = 'aggregate',
}

export interface DataQuery {
  mode: DataQueryMode
  filter?: string
  sort?: string
  entityDefUuid?: string
  attributeDefUuids?: string[]
  dimensions?: string[]
  measures?: string[]
  filterRecordUuids?: string[]
}

export interface DataQuerySummaryProps {
  name?: string
  labels?: Labels
}

export interface DataQuerySummary {
  content?: any
  dateCreated?: string
  dateModified?: string
  id?: number
  props?: DataQuerySummaryProps
  uuid?: string
}
