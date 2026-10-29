import { generateSync } from 'otplib'

import { DB } from '../../../db'
import { DBMigrator } from '../../../db/dbMigrator'
import { insertTestUser } from '../../../api/tests/utils/insertTestUser'
import { mockUser } from '../../../api/tests/mock/user'
import { User2FADeviceRepository } from '../../../repository'
import { User2FAServiceServer } from '../user2FAService'

describe('User2FAService.verifyLogin', () => {
  let userUuid: string
  let secret: string
  let backupCodes: string[]

  beforeAll(async () => {
    await DBMigrator.migrateSchema()
    await insertTestUser()
    userUuid = await DB.one('SELECT uuid FROM "user" WHERE email = $1', [mockUser.email], (row) => row.uuid)
    await User2FAServiceServer.disableAll({ userUuid })

    const device = await User2FAServiceServer.addDevice({ userUuid, userEmail: mockUser.email, deviceName: 'test' })
    secret = device.secret
    backupCodes = device.backupCodes
    await User2FADeviceRepository.update({ uuid: device.uuid, enabled: true })
  })

  afterAll(async () => {
    await User2FAServiceServer.disableAll({ userUuid })
    await DB.$pool.end()
  })

  test('accepts a TOTP code once and rejects its replay', async () => {
    const token = generateSync({ secret })

    await expect(User2FAServiceServer.verifyLogin({ userUuid, token })).resolves.toBe(true)
    await expect(User2FAServiceServer.verifyLogin({ userUuid, token })).resolves.toBe(false)
  })

  test('accepts a backup code once, even with concurrent logins', async () => {
    const token = backupCodes[0]

    const results = await Promise.all([
      User2FAServiceServer.verifyLogin({ userUuid, token }),
      User2FAServiceServer.verifyLogin({ userUuid, token }),
    ])
    expect(results.filter(Boolean)).toHaveLength(1)

    await expect(User2FAServiceServer.verifyLogin({ userUuid, token })).resolves.toBe(false)
  })

  test('rejects wrong codes', async () => {
    await expect(User2FAServiceServer.verifyLogin({ userUuid, token: '000000' })).resolves.toBe(false)
    await expect(User2FAServiceServer.verifyLogin({ userUuid, token: 'not-a-code' })).resolves.toBe(false)
  })
})
