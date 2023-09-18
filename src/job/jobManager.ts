import path from 'path'
import { JobStatus } from '@openforis/arena-core'

import { WebSocketEvent, WebSocketServer } from '../webSocket'
import { Worker } from '../thread'
import { JobMessageInType, JobMessageOut, JobMessageOutType } from './jobMessage'
import { JobContext } from './jobContext'

export class JobManager {
  private static workers = new Map<string, Worker<any>>()

  static cancelUserJob(userUuid: string): void {
    const worker = JobManager.workers.get(userUuid)
    if (!worker) return
    worker.postMessage({ type: JobMessageInType.cancel })
  }

  private static onMessage(msg: JobMessageOut): void {
    if (msg.type === JobMessageOutType.summaryUpdate) {
      const { summary } = msg
      const { status, userUuid } = summary
      const worker = JobManager.workers.get(userUuid)

      WebSocketServer.notifyUser(userUuid, WebSocketEvent.jobUpdate, summary)

      // Job has not ended
      if ([JobStatus.pending, JobStatus.running].includes(status) || !worker) return

      // Delay thread termination by 1 second (give time to print debug info to the console)
      setTimeout(() => {
        worker.terminate().then(() => JobManager.workers.delete(userUuid))
      }, 1000)
    }
  }

  static executeJob<C extends JobContext = JobContext>(data: C): Worker<C> {
    const worker = new Worker<C>(path.resolve(__dirname, 'jobThread.js'), data)
    worker.on('message', JobManager.onMessage)
    JobManager.workers.set(data.user.uuid, worker)
    return worker
  }
}
