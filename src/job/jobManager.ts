import path from 'path'
import { JobStatus } from '@openforis/arena-core'

import { Worker } from '../thread'
import { JobMessageInType, JobMessageOut, JobMessageOutType } from './jobMessage'
import { JobData } from './jobData'

export class JobManager {
  private static workers = new Map<string, Worker<any>>()

  static cancelUserJob(userUuid: string): void {
    const worker = JobManager.workers.get(userUuid)
    if (!worker) return
    worker.postMessage({ type: JobMessageInType.cancel })
  }

  private static async onMessage(msg: JobMessageOut): Promise<void> {
    if (msg.type === JobMessageOutType.summaryUpdate) {
      const { summary } = msg
      const { status, userUuid } = summary
      const worker = JobManager.workers.get(userUuid)

      // TODO: add WebSocket
      // WebSocket.notifyUser(userUuid, WebSocketEvents.jobUpdate, summary)

      // Job has not ended
      if ([JobStatus.pending, JobStatus.running].includes(status) || !worker) return

      // Delay thread termination by 1 second (give time to print debug info to the console)
      setTimeout(() => {
        worker.terminate().then(() => JobManager.workers.delete(userUuid))
      }, 1000)
    }
  }

  static executeJob<D extends JobData = JobData>(data: D): Worker<D> {
    const worker = new Worker<D>(path.resolve(__dirname, 'jobThread.js'), data)
    worker.on('message', JobManager.onMessage)
    JobManager.workers.set(data.user.uuid, worker)
    return worker
  }
}
