export interface CallTrackerInterface {
  addCall: (params: {
    id: string,
    graphNodePath: string[],
  }) => void

  getCall: (params: {
    id: string,
  }) => {
    graphNodePath: string[],
    transcript: string | null,
  }

  checkIfAllCallsResolved: () => boolean
  calls: {
    [id: string]: {
      graphNodePath: string[],
      transcript: string | null,
    }
  }
}

export class CallTracker implements CallTrackerInterface {
  calls: {
    [id: string]: { 
      graphNodePath: string[],
      transcript: string | null,
    }
  } = {}

  getCall(params: {
    id: string,
  }) {
    return this.calls[params.id]
  }


  addCall(params: {
    id: string,
    graphNodePath: string[],
  }) {
    this.calls[params.id] = {
      graphNodePath: params.graphNodePath,
      transcript: null,
    }
  }

  checkIfAllCallsResolved() {
    return Object.values(this.calls).every((call) => call.transcript !== null)
  }
}
