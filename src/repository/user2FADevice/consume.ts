import { BaseProtocol, DB, TableUser2FADevice } from '../../db'

/**
 * Records `timeStep` as the device's last used TOTP time step, only if it is newer than the stored one.
 * The check and the write are one statement, so two concurrent logins with the same code cannot both succeed.
 *
 * @param params - Device UUID and TOTP time step of the accepted code
 * @param client - Database client
 * @returns True if the time step was recorded (the code was not used before)
 */
export const markTimeStepUsed = async (
  params: { uuid: string; timeStep: number },
  client: BaseProtocol = DB
): Promise<boolean> => {
  const { uuid, timeStep } = params
  const table = new TableUser2FADevice()
  const lastUsedTimeStep = table.lastUsedTimeStep.columnName

  const result = await client.result(
    `UPDATE ${table.nameQualified}
     SET ${lastUsedTimeStep} = $/timeStep/, ${table.dateModified.columnName} = $/now/
     WHERE ${table.uuid.columnName} = $/uuid/
       AND (${lastUsedTimeStep} IS NULL OR ${lastUsedTimeStep} < $/timeStep/)`,
    { uuid, timeStep, now: new Date() }
  )
  return result.rowCount === 1
}

/**
 * Replaces the device's backup codes, only if they still equal `expectedBackupCodes`.
 * The check and the write are one statement, so a backup code cannot be consumed twice concurrently.
 *
 * @param params - Device UUID, backup codes read before matching and backup codes to store
 * @param client - Database client
 * @returns True if the backup codes were replaced
 */
export const replaceBackupCodes = async (
  params: { uuid: string; expectedBackupCodes: string[]; backupCodes: string[] },
  client: BaseProtocol = DB
): Promise<boolean> => {
  const { uuid, expectedBackupCodes, backupCodes } = params
  const table = new TableUser2FADevice()
  const backupCodesColumn = table.backupCodes.columnName

  const result = await client.result(
    `UPDATE ${table.nameQualified}
     SET ${backupCodesColumn} = $/backupCodes/::jsonb, ${table.dateModified.columnName} = $/now/
     WHERE ${table.uuid.columnName} = $/uuid/ AND ${backupCodesColumn} = $/expectedBackupCodes/::jsonb`,
    {
      uuid,
      backupCodes: JSON.stringify(backupCodes),
      expectedBackupCodes: JSON.stringify(expectedBackupCodes),
      now: new Date(),
    }
  )
  return result.rowCount === 1
}
