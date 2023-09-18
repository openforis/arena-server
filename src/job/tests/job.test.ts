import { JobStatus, JobSummary, UserFactory, UserStatus, UserTitle, UUIDs } from '@openforis/arena-core'
import { Worker } from '../../thread'
import { JobManager } from '../jobManager'
import { JobMessageOut } from '../jobMessage'
import { JobContext } from '../jobContext'
import { SimpleJob, SimpleJobWithJobs } from './testJobs'

const waitForJobStatus = <R>(
  worker: Worker<JobContext>,
  status: JobStatus = JobStatus.succeeded
): Promise<JobSummary<R>> =>
  new Promise<JobSummary<R>>((resolve) => {
    worker.on('message', (msg: JobMessageOut) => {
      const { summary } = msg
      if (summary.status === status) {
        return resolve(summary)
      }
    })
  })

afterAll(async () => {
  // await jobs to be terminated
  await new Promise((resolve) => setTimeout(resolve, 1250))
})

describe('Job', () => {
  const user = UserFactory.createInstance({
    email: 'test@openforis-arena.org',
    name: 'Tester',
    status: UserStatus.ACCEPTED,
    title: UserTitle.mr,
  })

  test('SimpleJob', async () => {
    const worker = JobManager.executeJob({ user, type: SimpleJob.type, surveyId: 1 })
    const summary = await waitForJobStatus<number>(worker)

    await expect(summary.status).toBe(JobStatus.succeeded)
    await expect(summary.result).toBe(3)
  })

  test('SimpleJobWithJobs', async () => {
    const worker = JobManager.executeJob({
      user: { ...user, uuid: UUIDs.v4() },
      type: SimpleJobWithJobs.type,
      surveyId: 1,
    })
    const summary = await waitForJobStatus<number>(worker)

    await expect(summary.status).toBe(JobStatus.succeeded)
    await expect(summary.result).toBe(6)
  })

  test('SimpleJobsWithJobs - cancel', async () => {
    const userUuid = UUIDs.v4()
    const worker = JobManager.executeJob({
      user: { ...user, uuid: userUuid },
      type: SimpleJobWithJobs.type,
      surveyId: 1,
    })

    // simulate cancel 1st inner job
    await new Promise((resolve) => setTimeout(resolve, 600))
    JobManager.cancelUserJob(userUuid)
    const summary = await waitForJobStatus<number>(worker, JobStatus.canceled)

    await expect(summary.status).toBe(JobStatus.canceled)
    await expect(summary.result).not.toBeDefined()
  })
})
