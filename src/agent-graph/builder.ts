import { v4 as uuidv4 } from "uuid"

import { CallTracker, CallTrackerInterface } from "../utils/orchestration/CallTracker"
import { NodePathQueue, NodePathQueueInterface } from "../utils/orchestration/NodePathQueue"
import { generateAnalystResponses } from "../prompts/generateAnalystResponses"
import { AgentGraph } from "./index"
import { GraphNode, NodeAgent } from "./types"
import { executeCall } from "../utils/orchestration/executeCall"
import { generateTranscript } from "../utils/ai/generateTranscript"
import { analyzeTranscript } from "../prompts/analyzeTranscript"
import { CancelSubscription, deleteStream, subscribeToEvents } from "../utils/orchestration/eventStream"
import { getMediaUrl, INITIAL_NODE_PATH } from "../constants"
import ThreadManager from "../utils/orchestration/ThreadManager"
import analystInitialInstructions from "../prompts/analystInitialInstructions"
import { generateInitialAnalystResponses } from "../prompts/generateInitialAnalystResponses"

const isInitialNodePath = (nodePath: string[] | null) => nodePath && nodePath.length === 1 && nodePath[0] === INITIAL_NODE_PATH[0]

export class AgentGraphBuilder {
  graph: AgentGraph
  callTracker: CallTrackerInterface
  nodePathQueue: NodePathQueueInterface
  threadManager: ThreadManager
  runId: string
  cancelEventStream: CancelSubscription | undefined
  phoneNumber: string = ''

  constructor(params: {
    concurrentCalls: number,
    maxCalls: number,
    phoneNumber: string,
  }) {
    this.runId = uuidv4()
    this.graph = new AgentGraph()
    this.phoneNumber = params.phoneNumber

    this.callTracker = new CallTracker()
    this.nodePathQueue = new NodePathQueue()
    this.threadManager = new ThreadManager({
      maxThreads: params.concurrentCalls || 1,
      maxExecutedThreads: params.maxCalls || 20,
      startThread: () => this.startCallThread(),
    })
  }

  async build() {
    this.nodePathQueue.add({ nodePath: INITIAL_NODE_PATH })
    this.subscribeToCallCompletions()
    this.threadManager.spinUpThreads()
  }

  checkIfGraphIsComplete() {
    return this.nodePathQueue.isEmpty() && this.callTracker.checkIfAllCallsResolved()
  }

  async startCallThread() {
    const nodePath = this.nodePathQueue.next()

    if (nodePath) {
      const isInitial = isInitialNodePath(nodePath)

      const script = isInitial
        ? analystInitialInstructions
        : this.graph.generateScriptFromNodePath({ nodePath })

      const { id } = await executeCall({
        script,
        phoneNumber: this.phoneNumber,
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

    if (isInitialNodePath(nodePath)) {
      // The analyst is calling the agent to see how it starts the call
      // TO-DO verify that the transcript has only one message

      return {
        additionalMessage: transcript,
        conversationSuccess: true,
      }
    }

    const script = this.graph.generateScriptFromNodePath({ nodePath })

    const analysis = await analyzeTranscript({ template: script, actual: transcript })

    return {
      additionalMessage: analysis.additionalMessage,
      conversationSuccess: analysis.conversationSuccess,
    }
  }

  finishBuild() {
    if (this.cancelEventStream) {
      this.cancelEventStream()
    }

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

    this.threadManager.markThreadResolved()

    if (!this.checkIfGraphIsComplete()) {
      this.threadManager.startThread()
    }
  }

  async subscribeToCallCompletions() {
    const { cancel } = subscribeToEvents({
      runId: this.runId,
      callback: async (event) => {
        const { id, recording_available, status } = event

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

    let node: GraphNode | undefined = undefined

    const isInitial = isInitialNodePath(nodePath)

    const nextId = uuidv4()

    if (isInitial) {
      node = {
        id: nextId,
        agent: NodeAgent.agent,
        script: response,
        isClarification: false,
        responses: [],
      }

    } else {
      node = this.graph.selectNode({ nodePath })

      node.responses.push({
        script: response,
        id: nextId,
        isClarification: false,
        agent: NodeAgent.agent,
        responses: [],
      })
    }

    const updatedNodePath = isInitial ? [nextId] : [...nodePath, nextId]

    const {
      responses,
      isResponseAClarification,
    } = isInitial
      ? await generateInitialAnalystResponses({ transcript: response })
      : await generateAnalystResponses({ script: response })

    this.addAnalystResponses({
      nodePath: updatedNodePath,
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

