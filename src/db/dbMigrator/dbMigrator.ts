import fs from 'fs'
import { ServiceRegistry, ServiceType, SurveyService } from '@openforis/arena-core'

import { Logger } from '../../log'
import { DB } from '../db'
import { Schemata } from '../schemata'
import { DBMigrate } from './dbMigrate'

const logger = new Logger('DBMigrator')

const migrateSchema = async (params: { schema?: string; migrationsFolder?: string } = {}): Promise<void> => {
  const { schema = Schemata.PUBLIC, migrationsFolder = __dirname } = params

  if (!fs.existsSync(migrationsFolder)) return

  if (schema !== Schemata.PUBLIC) {
    await DB.none(`CREATE SCHEMA IF NOT EXISTS ${schema}`)
  }

  const dbm = DBMigrate.getInstance(schema, migrationsFolder)
  dbm.silence(true)
  await dbm.up()
}

const migrateSurveySchema = async (surveyId: number): Promise<void> => {
  logger.info(`migrations for survey ${surveyId} - start`)
  await migrateSchema({ schema: Schemata.getSchemaSurvey(surveyId) })
  logger.info(`migrations for survey ${surveyId} - end`)
}

const migrateSurveySchemas = async (): Promise<void> => {
  const service = ServiceRegistry.getInstance().getService(ServiceType.survey) as SurveyService
  const surveyIds = await service.getAllIds()

  logger.info(`starting survey migrations for ${surveyIds.length} surveys`)

  for await (const surveyId of surveyIds) {
    await migrateSurveySchema(surveyId)
  }

  logger.info('survey migrations completed')
}

const migrateAll = async (): Promise<void> => {
  try {
    logger.info('running database migrations')

    await migrateSchema()

    await migrateSurveySchemas()

    logger.info('database migrations completed')
  } catch (error: any) {
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
