import { UUIDs } from '@openforis/arena-core'

import { DB } from '../../../db'
import { DBMigrator } from '../../../db/dbMigrator'
import { RecordSocketAssociationRepository } from '../index'
import { deleteTestSocket, deleteTestUser, insertTestSocket, insertTestUser } from './testUtils'

describe('RecordSocketAssociationRepository', () => {
  let userUuid: string

  beforeAll(async () => {
    await DBMigrator.migrateSchema()
    userUuid = await insertTestUser()
  })

  afterAll(async () => {
    await deleteTestUser(userUuid)
    await DB.$pool.end()
  })

  test('assocSocket makes the socket visible via getSocketIdsByRecordUuid', async () => {
    const recordUuid = UUIDs.v4()
    const socketId = UUIDs.v4()
    await insertTestSocket(userUuid, socketId)

    await RecordSocketAssociationRepository.assocSocket({ recordUuid, socketId })

    await expect(RecordSocketAssociationRepository.getSocketIdsByRecordUuid(recordUuid)).resolves.toEqual([socketId])

    await deleteTestSocket(socketId)
  })

  test('assocSocket is idempotent (no duplicate/conflict on re-association)', async () => {
    const recordUuid = UUIDs.v4()
    const socketId = UUIDs.v4()
    await insertTestSocket(userUuid, socketId)

    await RecordSocketAssociationRepository.assocSocket({ recordUuid, socketId })
    await RecordSocketAssociationRepository.assocSocket({ recordUuid, socketId })

    await expect(RecordSocketAssociationRepository.getSocketIdsByRecordUuid(recordUuid)).resolves.toEqual([socketId])

    await deleteTestSocket(socketId)
  })

  test('dissocSocket removes a single association', async () => {
    const recordUuid = UUIDs.v4()
    const socketId = UUIDs.v4()
    await insertTestSocket(userUuid, socketId)
    await RecordSocketAssociationRepository.assocSocket({ recordUuid, socketId })

    await RecordSocketAssociationRepository.dissocSocket({ recordUuid, socketId })

    await expect(RecordSocketAssociationRepository.getSocketIdsByRecordUuid(recordUuid)).resolves.toEqual([])

    await deleteTestSocket(socketId)
  })

  test('dissocSocketsByRecordUuid removes every association for a record', async () => {
    const recordUuid = UUIDs.v4()
    const socketIds = [UUIDs.v4(), UUIDs.v4()]
    for (const socketId of socketIds) {
      await insertTestSocket(userUuid, socketId)
      await RecordSocketAssociationRepository.assocSocket({ recordUuid, socketId })
    }

    await RecordSocketAssociationRepository.dissocSocketsByRecordUuid(recordUuid)

    await expect(RecordSocketAssociationRepository.getSocketIdsByRecordUuid(recordUuid)).resolves.toEqual([])

    for (const socketId of socketIds) {
      await deleteTestSocket(socketId)
    }
  })

  test('dissocSocketBySocketId removes every association for a socket, across records', async () => {
    const socketId = UUIDs.v4()
    await insertTestSocket(userUuid, socketId)
    const recordUuids = [UUIDs.v4(), UUIDs.v4()]
    for (const recordUuid of recordUuids) {
      await RecordSocketAssociationRepository.assocSocket({ recordUuid, socketId })
    }

    await RecordSocketAssociationRepository.dissocSocketBySocketId(socketId)

    for (const recordUuid of recordUuids) {
      await expect(RecordSocketAssociationRepository.getSocketIdsByRecordUuid(recordUuid)).resolves.toEqual([])
    }

    await deleteTestSocket(socketId)
  })

  test('deleting the connected_socket row cascades and removes its associations', async () => {
    const recordUuid = UUIDs.v4()
    const socketId = UUIDs.v4()
    await insertTestSocket(userUuid, socketId)
    await RecordSocketAssociationRepository.assocSocket({ recordUuid, socketId })

    await deleteTestSocket(socketId)

    await expect(RecordSocketAssociationRepository.getSocketIdsByRecordUuid(recordUuid)).resolves.toEqual([])
  })
})
