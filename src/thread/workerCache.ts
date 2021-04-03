export class WorkerCache {
  private readonly threads: Map<string, any> = new Map<string, any>()

  get(key: string): any {
    return this.threads.get(key)
  }

  set(key: string, worker: any) {
    this.threads.set(key, worker)
    return worker
  }

  delete(key: string) {
    this.threads.delete(key)
  }
}
