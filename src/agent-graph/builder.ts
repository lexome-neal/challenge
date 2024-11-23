import { v4 as uuidv4 } from "uuid"

import { CallTracker, CallTrackerInterface } from "../utils/orchestration/CallTracker"
import { NodePathQueue, NodePathQueueInterface } from "../utils/orchestration/NodePathQueue"
import { generateAnalystResponses } from "../prompts/generateAnalystResponses"
import { AgentGraph } from "./index"
import { NodeAgent } from "./types"
import { executeCall } from "../utils/orchestration/executeCall"
import { generateTranscript } from "../utils/ai/generateTranscript"
import { analyzeTranscript } from "../prompts/analyzeTranscript"
import { CancelSubscription, deleteStream, subscribeToEvents } from "../utils/orchestration/eventStream"
import { getMediaUrl } from "../constants"

export class AgentGraphBuilder {
  graph: AgentGraph
  callTracker: CallTrackerInterface
  nodePathQueue: NodePathQueueInterface
  concurrentCalls: number
  activeCalls: number
  executedCalls: number
  maxCalls: number
  runId: string
  cancelEventStream: CancelSubscription

  constructor(params: {
    callTracker: CallTrackerInterface,
    nodePathQueue: NodePathQueueInterface,
    concurrentCalls: number,
    maxCalls: number,
  }) {
    this.runId = uuidv4()
    this.graph = new AgentGraph()

    this.callTracker = params.callTracker || new CallTracker()
    this.nodePathQueue = params.nodePathQueue || new NodePathQueue()
    this.concurrentCalls = params.concurrentCalls || 1
    this.activeCalls = 0
    this.executedCalls = 0
    this.maxCalls = params.maxCalls || 20
  }

  checkIfGraphIsComplete() {
    return this.nodePathQueue.isEmpty() && this.callTracker.checkIfAllCallsResolved()
  }

  async startCallThread() {
    const nodePath = this.nodePathQueue.next()

    if (nodePath) {
      this.activeCalls++
      this.executedCalls++

      const script = this.graph.generateScriptFromNodePath({ nodePath: nodePath })

      const { id } = await executeCall({
        script,
        phoneNumber: nodePath[0],
      })

      this.callTracker.addCall({
        id,
        graphNodePath: nodePath,
      })
    }
  }

  async handleAudio(params: {
    audioUrl: string,
    nodePath: string[],
  }) {
    const { audioUrl, nodePath } = params

    const transcript = await generateTranscript({ audioUrl })

    const script = this.graph.generateScriptFromNodePath({ nodePath })

    const analysis = await analyzeTranscript({ template: script, actual: transcript })

    return {
      additionalMessage: analysis.additionalMessage,
      conversationSuccess: analysis.conversationSuccess,
    }
  }

  finishBuild() {
    this.cancelEventStream()

    deleteStream(this.runId)
  }

  async resolveCallThread(params: {
    audioUrl: string,
    callId: string
  }) {

    try {
      const { audioUrl, callId } = params

      const call = this.callTracker.getCall({ id: callId })
      const callNodePath = call.graphNodePath

      const { additionalMessage } = await this.handleAudio({ audioUrl, nodePath: callNodePath })

      if (additionalMessage) {
        await this.addAgentResponse({
          nodePath: callNodePath,
          response: additionalMessage,
        })
      }
    } catch (error) {
      console.error(error)
    }

    this.activeCalls--

    if (
      !this.checkIfGraphIsComplete() &&
      this.executedCalls < this.maxCalls
    ) {
      this.startCallThread()
    }
  }

  async subscribeToCallCompletions() {
    const { cancel } = subscribeToEvents({
      runId: this.runId,
      callback: async (event) => {
        const { id, recording_available, status } = event

        console.log(recording_available, status)

        if (recording_available) {
          this.resolveCallThread({
            callId: id as string,
            audioUrl: getMediaUrl(id as string),
          })
        }
      },
    })

    this.cancelEventStream = cancel
  }

  async addAgentResponse(params: {
    nodePath: string[],
    response: string,
  }) {
    const { nodePath, response } = params

    const node = this.graph.selectNode({ nodePath })

    const nextId = uuidv4()

    node.responses.push({
      script: response,
      id: nextId,
      isClarification: false,
      agent: NodeAgent.agent,
      responses: [],
    })

    const nextNodePath = [...nodePath, nextId]

    const {
      responses,
      isResponseAClarification,
    } = await generateAnalystResponses({ script: response })

    this.addAnalystResponses({
      nodePath: nextNodePath,
      responses,
      isClarification: isResponseAClarification,
    })
  }

  addAnalystResponses(params: {
    nodePath: string[],
    responses: string[],
    isClarification: boolean,
  }) {
    const { nodePath, responses, isClarification } = params

    const node = this.graph.selectNode({ nodePath })

    if (isClarification && node.responses.length > 1) {
      console.error("Clarification questions should not be included with siblings")
    }

    const newNodes = responses.map((response) => ({
      script: response,
      id: uuidv4(),
      agent: NodeAgent.analyst,
      isClarification: isClarification && node.responses.length === 1,
      responses: [],
    }))

    node.responses.push(...newNodes)

    for (const newNode of newNodes) {
      this.nodePathQueue.add({
        nodePath: [...nodePath, newNode.id],
      })
    }
  }
}

