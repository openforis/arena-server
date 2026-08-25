import { JobStatus, UUIDs } from '@openforis/arena-core'

import { DB } from '../../../db'
import { DBMigrator } from '../../../db/dbMigrator'
import { ProcessEnv } from '../../../processEnv'
import { JobRepository } from '../index'
import { deleteTestSurvey, deleteTestUser, insertTestSurvey, insertTestUser } from './testUtils'

describe('JobRepository', () => {
  let userUuid: string
  let surveyId: number

  beforeAll(async () => {
    await DBMigrator.migrateSchema()
    userUuid = await insertTestUser()
    surveyId = await insertTestSurvey(userUuid)
  })

  afterAll(async () => {
    await deleteTestSurvey(surveyId)
    await deleteTestUser(userUuid)
    await DB.$pool.end()
  })

  test('insert creates a pending job, visible via getByUuid', async () => {
    const uuid = UUIDs.v4()

    const inserted = await JobRepository.insert({ uuid, userUuid, surveyId, type: 'TestJob' })
    expect(inserted.status).toBe(JobStatus.pending)

    const job = await JobRepository.getByUuid(uuid)
    expect(job).toMatchObject({ uuid, userUuid, surveyId, type: 'TestJob', status: JobStatus.pending })

    await JobRepository.updateStatus({ uuid, status: JobStatus.succeeded })
  })

  test('getByUuid returns null for an unknown job', async () => {
    await expect(JobRepository.getByUuid(UUIDs.v4())).resolves.toBeNull()
  })

  test('getActiveByUserUuid finds a pending/running job and ignores terminal ones', async () => {
    const uuid = UUIDs.v4()
    await JobRepository.insert({ uuid, userUuid, surveyId, type: 'TestJob' })

    await expect(JobRepository.getActiveByUserUuid(userUuid)).resolves.toMatchObject({ uuid })

    await JobRepository.updateStatus({ uuid, status: JobStatus.succeeded })

    await expect(JobRepository.getActiveByUserUuid(userUuid)).resolves.toBeNull()
  })

  test('getActiveBySurveyId finds a pending/running job and ignores terminal ones', async () => {
    const uuid = UUIDs.v4()
    await JobRepository.insert({ uuid, userUuid, surveyId, type: 'TestJob' })

    await expect(JobRepository.getActiveBySurveyId(surveyId)).resolves.toMatchObject({ uuid })

    await JobRepository.updateStatus({ uuid, status: JobStatus.failed })

    await expect(JobRepository.getActiveBySurveyId(surveyId)).resolves.toBeNull()
  })

  test('updateProgress refreshes processed/total', async () => {
    const uuid = UUIDs.v4()
    await JobRepository.insert({ uuid, userUuid, surveyId, type: 'TestJob' })

    await JobRepository.updateProgress({ uuid, processed: 3, total: 10 })

    const job = await JobRepository.getByUuid(uuid)
    expect(job).toMatchObject({ processed: 3, total: 10 })
  })

  test('updateStatus merges props and updates status', async () => {
    const uuid = UUIDs.v4()
    await JobRepository.insert({ uuid, userUuid, surveyId, type: 'TestJob' })

    await JobRepository.updateStatus({
      uuid,
      status: JobStatus.succeeded,
      props: { result: { count: 42 } },
    })

    const job = await JobRepository.getByUuid(uuid)
    expect(job).toMatchObject({ status: JobStatus.succeeded, props: { result: { count: 42 } } })
  })

  test('insert persists a global job with a null surveyId', async () => {
    const uuid = UUIDs.v4()

    const inserted = await JobRepository.insert({ uuid, userUuid, type: 'GlobalJob' })
    expect(inserted.surveyId).toBeNull()

    const job = await JobRepository.getByUuid(uuid)
    expect(job).toMatchObject({ uuid, userUuid, surveyId: null, type: 'GlobalJob' })

    await JobRepository.updateStatus({ uuid, status: JobStatus.succeeded })
  })

  test('insert stamps the row with this process instanceId', async () => {
    const uuid = UUIDs.v4()

    const inserted = await JobRepository.insert({ uuid, userUuid, surveyId, type: 'TestJob' })
    expect(inserted.instanceId).toBe(ProcessEnv.instanceId)

    await JobRepository.updateStatus({ uuid, status: JobStatus.succeeded })
  })

  test('failOrphanedByInstanceId fails pending/running rows owned by that instance', async () => {
    const uuidPending = UUIDs.v4()
    const uuidRunning = UUIDs.v4()
    const uuidAlreadyDone = UUIDs.v4()

    await JobRepository.insert({ uuid: uuidPending, userUuid, surveyId, type: 'TestJob' })
    await JobRepository.insert({ uuid: uuidRunning, userUuid, surveyId, type: 'TestJob' })
    await JobRepository.updateStatus({ uuid: uuidRunning, status: JobStatus.running })
    await JobRepository.insert({ uuid: uuidAlreadyDone, userUuid, surveyId, type: 'TestJob' })
    await JobRepository.updateStatus({ uuid: uuidAlreadyDone, status: JobStatus.succeeded })

    const failedCount = await JobRepository.failOrphanedByInstanceId(ProcessEnv.instanceId)
    expect(failedCount).toBeGreaterThanOrEqual(2)

    const pendingJob = await JobRepository.getByUuid(uuidPending)
    expect(pendingJob).toMatchObject({ status: JobStatus.failed })
    // the webapp's job monitor renders props.errors as a Validation instance (see core/validation) -
    // each entry must be a fields-map (Validation.getFieldValidations), not a bare {key, params}
    expect(pendingJob?.props.errors).toMatchObject({
      generic: { error: { valid: false, errors: [{ key: 'appErrors:jobOrphanedOnRestart' }] } },
    })

    await expect(JobRepository.getByUuid(uuidRunning)).resolves.toMatchObject({ status: JobStatus.failed })
    // untouched: was already terminal before the call
    await expect(JobRepository.getByUuid(uuidAlreadyDone)).resolves.toMatchObject({ status: JobStatus.succeeded })
  })

  test('failOrphanedByInstanceId ignores rows owned by a different instance', async () => {
    const uuid = UUIDs.v4()
    await JobRepository.insert({ uuid, userUuid, surveyId, type: 'TestJob' })

    const failedCount = await JobRepository.failOrphanedByInstanceId('some-other-dyno-instance')
    expect(failedCount).toBe(0)

    await expect(JobRepository.getByUuid(uuid)).resolves.toMatchObject({ status: JobStatus.pending })

    await JobRepository.updateStatus({ uuid, status: JobStatus.succeeded })
  })
})
