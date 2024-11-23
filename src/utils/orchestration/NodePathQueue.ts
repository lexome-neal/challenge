export interface NodePathQueueInterface {
  add: (params: {
    nodePath: string[],
  }) => void
  next: () => string[] | null
  length: () => number
  isEmpty: () => boolean
}

export class NodePathQueue implements NodePathQueueInterface {
  queue: string[] = []

  add(params: {
    nodePath: string[],
  }) {
    this.queue.push(params.nodePath.join("."))
  }

  next() {
    const nodePath = this.queue.shift()

    if (!nodePath) {
      return null
    }

    return nodePath.split('.')
  }

  length() {
    return this.queue.length
  }


  isEmpty() {
    return this.queue.length === 0
  }
}
