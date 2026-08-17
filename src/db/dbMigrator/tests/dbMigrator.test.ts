import { UUIDs } from '@openforis/arena-core'

import { DB } from '../../db'
import { Schemata } from '../../schemata'
import { DBMigrator } from '../dbMigrator'

const schemaExists = async (schema: string): Promise<boolean> => {
  const row = await DB.oneOrNone(`SELECT 1 FROM information_schema.schemata WHERE schema_name = $1`, [schema])
  return row !== null
}

describe('DBMigrator.migrateSurveySchemas', () => {
  let ownerUuid: string
  let surveyIdByAppVersion: Record<string, number>

  beforeAll(async () => {
    // ensure public schema (survey table, including app_version column) is up to date
    await DBMigrator.migrateSchema()

    const email = `dbmigrator-test-${UUIDs.v4()}@openforis-arena.org`
    const user = await DB.one<{ uuid: string }>(
      `INSERT INTO "user" (name, email, status) VALUES ($1, $2, 'ACCEPTED') RETURNING uuid`,
      ['DBMigrator Test User', email]
    )
    ownerUuid = user.uuid

    const appVersions = [null, '2.7.0', '2.8.0', '2.9.0']
    surveyIdByAppVersion = {}
    for (const appVersion of appVersions) {
      const survey = await DB.one<{ id: number }>(
        `INSERT INTO survey (owner_uuid, app_version) VALUES ($1, $2) RETURNING id`,
        [ownerUuid, appVersion]
      )
      surveyIdByAppVersion[String(appVersion)] = survey.id
    }
  })

  afterAll(async () => {
    const surveyIds = Object.values(surveyIdByAppVersion)
    for (const surveyId of surveyIds) {
      await DB.none(`DROP SCHEMA IF EXISTS ${Schemata.getSchemaSurvey(surveyId)} CASCADE`)
    }
    await DB.none(`DELETE FROM survey WHERE id = ANY($1::bigint[])`, [surveyIds])
    await DB.none(`DELETE FROM "user" WHERE uuid = $1`, [ownerUuid])
  })

  test('only surveys with a missing or outdated app_version get their schema migrated', async () => {
    await DBMigrator.migrateSurveySchemas()

    const migratedByAppVersion: Record<string, boolean> = {}
    for (const [appVersion, surveyId] of Object.entries(surveyIdByAppVersion)) {
      migratedByAppVersion[appVersion] = await schemaExists(Schemata.getSchemaSurvey(surveyId))
    }

    expect(migratedByAppVersion).toEqual({
      null: true, // no app_version yet: needs migration
      '2.7.0': true, // older than the version requiring migration (2.8.0): needs migration
      '2.8.0': false, // already at the version requiring migration: does not need migration
      '2.9.0': false, // newer than the version requiring migration: does not need migration
    })
  })

  test('notifier is invoked once for every migrated survey, and not for the others', async () => {
    const notifications: Array<{ surveyId: number; index: number; total: number }> = []
    const notifier = jest.fn(async (params: { surveyId: number; index: number; total: number }) => {
      notifications.push(params)
    })

    await DBMigrator.migrateSurveySchemas({ notifier })

    const expectedSurveyIds = [surveyIdByAppVersion['null'], surveyIdByAppVersion['2.7.0']].sort()

    expect(notifications).toHaveLength(expectedSurveyIds.length)
    expect(notifications.map(({ surveyId }) => surveyId).sort()).toEqual(expectedSurveyIds)
    expect(notifications.every(({ total }) => total === expectedSurveyIds.length)).toBe(true)
    expect(notifications.map(({ index }) => index).sort()).toEqual([0, 1])
  })
})
