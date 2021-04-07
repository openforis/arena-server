import { JobManager } from '../jobManager'
import { JobStatus, UserFactory, UserStatus, UserTitle } from '@openforis/arena-core'
import { JobMessageOut } from '../jobMessage'
import { JobData } from '../jobData'
import { Worker } from '../../thread'
import { SimpleJob } from './simpleJob'

const waitForJobSuccess = (worker: Worker<JobData>): Promise<number> =>
  new Promise<number>((resolve) => {
    worker.on('message', (msg: JobMessageOut) => {
      const { summary } = msg
      if (summary.status === JobStatus.succeeded) {
        return resolve(summary.result)
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
    const jobWorker = JobManager.executeJob({ user, type: SimpleJob.TYPE, surveyId: 1 })
    const result = await waitForJobSuccess(jobWorker)
    await expect(result).toBe(3)
  })
})
