import { ServiceRegistry, ServiceType, SurveyService } from '@openforis/arena-core'

import { Logger } from '../../log'
import { DB } from '../db'
import { Schemata } from '../schemata'
import { DBMigrate } from './dbMigrate'

const logger = new Logger('DBMigrator')

const migrateSchema = async (params: { schema?: string; migrationsFolder?: string } = {}): Promise<void> => {
  const { schema = Schemata.PUBLIC, migrationsFolder = __dirname } = params

  if (schema !== Schemata.PUBLIC) {
    await DB.none(`CREATE SCHEMA IF NOT EXISTS ${schema}`)
  }

  const dbm = DBMigrate.getInstance(schema, migrationsFolder)
  dbm.silence(true)
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
