import { ProcessEnv } from '../../processEnv'
import { InfoRepository } from '../../repository/info'
import { InfoItem, InfoItemKey } from '../../repository/info/types'

const defaultVersion = '2.0.0'

const upsert = async (item: InfoItem): Promise<InfoItem> => {
  const oldItem = await InfoRepository.getByKey(item.key)
  if (oldItem && oldItem.value === item.value) {
    return oldItem
  }
  return InfoRepository.upsert(item)
}

const getVersion = async (): Promise<string> =>
  (await InfoRepository.getByKey(InfoItemKey.appVersion))?.value ?? defaultVersion

const updateVersion = async (): Promise<InfoItem> =>
  upsert({ key: InfoItemKey.appVersion, value: ProcessEnv.applicationVersion })

export interface InfoService {
  getVersion: typeof getVersion
  updateVersion: typeof updateVersion
}

export const InfoServiceServer: InfoService = {
  getVersion,
  updateVersion,
}
