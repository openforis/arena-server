import * as path from 'path'
// @ts-ignore
import * as DBMigrate from 'db-migrate'
import { ServiceRegistry, ServiceType, SurveyService } from '@openforis/arena-core'

import { Logger } from '../../log'
import { ProcessEnv } from '../../processEnv'
import { DB } from '../db'
import { Schemata } from '../schemata'
import { getConfig } from './config'

const logger = new Logger('DBMigrator')

enum migrationFolders {
  public = 'public',
  survey = 'survey',
}

const migrateSchema = async (params: { schema?: string; migrationsFolder?: string } = {}): Promise<void> => {
  const { schema = Schemata.PUBLIC, migrationsFolder = __dirname } = params
  const folder = schema === Schemata.PUBLIC ? migrationFolders.public : migrationFolders.survey

  const options = {
    config: getConfig(schema),
    cwd: `${path.join(migrationsFolder, 'migration', folder)}`,
    env: ProcessEnv.nodeEnv,
    // Required to work around an EventEmitter leak bug.
    // See: https://github.com/db-migrate/node-db-migrate/issues/421
    throwUncatched: true,
  }

  if (schema !== Schemata.PUBLIC) {
    // First create db schema
    await DB.none(`CREATE SCHEMA IF NOT EXISTS ${schema}`)
  }

  const dbm = DBMigrate.getInstance(true, options)
  await dbm.up()
}

const migrateSurveySchema = async (surveyId: number): Promise<void> => {
  logger.info(`starting db migrations for survey ${surveyId}`)
  await migrateSchema({ schema: Schemata.getSchemaSurvey(surveyId) })
}

const migrateSurveySchemas = async (): Promise<void> => {
  const service = ServiceRegistry.getInstance().getService(ServiceType.survey) as SurveyService
  const surveyIds = await service.getAllIds()

  logger.info(`starting data schemas migrations for ${surveyIds.length} surveys`)

  await Promise.all(surveyIds.map((surveyId) => migrateSurveySchema(surveyId)))

  logger.info('data schemas migrations completed')
}

const migrateAll = async (): Promise<void> => {
  try {
    logger.info('running database migrations')

    await migrateSchema()

    await migrateSurveySchemas()

    logger.info('database migrations completed')
  } catch (error) {
    logger.error(`error running database migrations: ${error.toString()}`)
    throw error
  }
}

export const DBMigrator = {
  migrateSchema,
  migrateSurveySchema,
  migrateSurveySchemas,
  migrateAll,
}
