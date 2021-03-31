import path from 'path'

// @ts-ignore
import DBMigrate from 'db-migrate'

import { ServiceRegistry, ServiceType, SurveyService } from '@openforis/arena-core'

import { ProcessEnv } from '../processEnv'
import { DB } from './db'
import { Schemata } from './schemata'

// TODO: Add logger
const logger = console

const config = {
  driver: 'pg',
  user: ProcessEnv.pgUser,
  password: ProcessEnv.pgPassword,
  host: ProcessEnv.pgHost,
  database: ProcessEnv.pgDatabase,
  ssl: ProcessEnv.pgSsl,
  schema: '',
}

enum migrationFolders {
  public = 'public',
  survey = 'survey',
}

const migrateSchema = async (schema: string): Promise<void> => {
  const migrationsFolder = schema === Schemata.PUBLIC ? migrationFolders.public : migrationFolders.survey

  const migrateOptions = {
    config: { ...config },
    cwd: `${path.join(__dirname, migrationsFolder)}`,
    env: ProcessEnv.nodeEnv,

    // Required to work around an EventEmitter leak bug.
    // See: https://github.com/db-migrate/node-db-migrate/issues/421
    throwUncatched: true,
  }

  migrateOptions.config.schema = schema

  if (schema !== Schemata.PUBLIC) {
    // First create db schema
    await DB.none(`CREATE SCHEMA IF NOT EXISTS ${schema}`)
  }

  const dbm = DBMigrate.getInstance(true, migrateOptions)
  await dbm.up()
}

const migrateSurveySchema = async (surveyId: number): Promise<void> => {
  logger.info(`starting db migrations for survey ${surveyId}`)
  await migrateSchema(Schemata.getSchemaSurvey(surveyId))
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

    await migrateSchema(Schemata.PUBLIC)
    await migrateSurveySchemas()

    logger.info('database migrations completed')
  } catch (error) {
    logger.error(`error running database migrations: ${error.toString()}`)
    throw error
  }
}

export const DBMigrator = {
  migrateSurveySchema,
  migrateSurveySchemas,
  migrateAll,
}
