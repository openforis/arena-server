import { JobManager } from '../jobManager'
import { JobStatus, JobSummary, UserFactory, UserStatus, UserTitle, UUIDs } from '@openforis/arena-core'
import { JobMessageOut } from '../jobMessage'
import { JobData } from '../jobData'
import { Worker } from '../../thread'
import { SimpleJob, SimpleJobsWithJobs } from './testJobs'

const waitForJobStatus = <R>(
  worker: Worker<JobData>,
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
  await new Promise((resolve) => setTimeout(resolve, 1000))
})

describe('Job', () => {
  const user = UserFactory.createInstance({
    email: 'test@arena.com',
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

  test('SimpleJobsWithJobs', async () => {
    const worker = JobManager.executeJob({
      user: { ...user, uuid: UUIDs.v4() },
      type: SimpleJobsWithJobs.type,
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
      type: SimpleJobsWithJobs.type,
      surveyId: 1,
    })

    JobManager.cancelUserJob(userUuid)
    const summary = await waitForJobStatus<number>(worker, JobStatus.canceled)

    await expect(summary.status).toBe(JobStatus.canceled)
    await expect(summary.result).not.toBeDefined()
  })
})
