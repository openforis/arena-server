import * as path from 'path'
// @ts-ignore Missing type definitions
import * as DBMigrate from 'db-migrate'
import { ProcessEnv } from 'src/processEnv'
import { DB } from './db'
import { SurveyService } from '@openforis/arena-core'

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

const env = ProcessEnv.nodeEnv

const publicSchema = 'public'

enum migrationFolders {
  public = 'public',
  survey = 'survey',
}

const migrateSchema = async (schema = publicSchema) => {
  const migrationsFolder = schema === publicSchema ? migrationFolders.public : migrationFolders.survey

  const migrateOptions = {
    config: { ...config },
    cwd: `${path.join(__dirname, migrationsFolder)}`,
    env,

    // Required to work around an EventEmitter leak bug.
    // See: https://github.com/db-migrate/node-db-migrate/issues/421
    throwUncatched: true,
  }

  migrateOptions.config.schema = schema

  if (schema !== publicSchema) {
    // First create db schema
    await DB.none(`CREATE SCHEMA IF NOT EXISTS ${schema}`)
  }

  const dbm = DBMigrate.getInstance(true, migrateOptions)

  await dbm.up()
}

export const migrateSurveySchema = async (surveyId: string) => {
  logger.info(`starting db migrations for survey ${surveyId}`)

  const schema = SurveyService.getSurveyDBSchema(surveyId)

  await migrateSchema(schema)
}

export const migrateSurveySchemas = async () => {
  const surveyIds = await SurveyService.fetchAllSurveyIds()

  logger.info(`starting data schemas migrations for ${surveyIds.length} surveys`)

  for (const element of surveyIds) {
    await migrateSurveySchema(element)
  }

  logger.info('data schemas migrations completed')
}

export const migrateAll = async () => {
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
