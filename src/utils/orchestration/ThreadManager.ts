export type StartThread = () => Promise<any> | null

export default class ThreadManager {
  maxThreads: number = 10
  currentThreads: number = 0
  executedThreads: number = 0
  maxExecutedThreads: number = 20

  startThreadCallback: StartThread = () => null

  constructor(params: {
    maxThreads: number,
    maxExecutedThreads: number,
    startThread: StartThread,
  }) {
    this.maxThreads = params.maxThreads
    this.maxExecutedThreads = params.maxExecutedThreads
    this.startThreadCallback = params.startThread
  }

  spinUpThreads() {
    let lastThread: Promise<any> | null | undefined = Promise.resolve(1)

    while (
      this.currentThreads < this.maxThreads &&
      this.executedThreads < this.maxExecutedThreads &&
      lastThread
    ) {
      lastThread = this.startThread()
    }
  }

  markThreadResolved() {
    this.currentThreads--
  }

  startThread() {
    if (
      this.currentThreads >= this.maxThreads ||
      this.executedThreads >= this.maxExecutedThreads
    ) {
      return null
    }

    this.currentThreads++
    this.executedThreads++

    return this.startThreadCallback()
  }
}
