import { Worker } from './worker'

export class WorkerCache {
  private readonly threads: Map<string, Worker<any>> = new Map<string, Worker<any>>()

  get(key: string): Worker<any> | undefined {
    return this.threads.get(key)
  }

  set(key: string, worker: Worker<any>): Worker<any> {
    this.threads.set(key, worker)
    return worker
  }

  delete(key: string): boolean {
    return this.threads.delete(key)
  }
}
