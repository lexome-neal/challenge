import { GraphNode, NodeAgent } from "./types"

export class AgentGraph {
  entry?: GraphNode
  initialized: boolean

  initialize(params: {
    entry: GraphNode,
  }) {
    this.entry = params.entry
    this.initialized = true
  }

  generateScriptFromNodePath(params: {
    nodePath: string[],
  }) {
    const { nodePath } = params

    if (!this.initialized) {
      throw new Error("Graph not initialized")
    }

    let currentNode = this.entry
    let script = ""
    let wasLastNodeClarification = false

    for (const nodeId of nodePath) {
      const node = currentNode?.responses.find((node) => node.id === nodeId)

      if (!node) {
        throw new Error(`Node with id ${nodeId} not found`)
      }

      // Don't include clarification question / responses in the script
      // Unless the clarification question is the last question asked
      if (
        node.responses.length > 0 &&
        (node.isClarification || wasLastNodeClarification)
      ) {
        wasLastNodeClarification = node.isClarification
        continue
      }

      const speakerIdentifier = node.agent === NodeAgent.agent ? "Agent" : "You"
      script += `${speakerIdentifier}: ${node.script}\n\n`
    }

    script += "You:"

    return script
  }

  selectNode(params: {
    nodePath: string[],
  }) {
    const { nodePath } = params

    let node = this.entry?.responses.find((node) => node.id === nodePath[0])

    if (!node) {
      throw new Error(`Node with id ${nodePath[0]} not found`)
    }

    for (const nodeId of nodePath.slice(1)) {
      node = node?.responses.find((node) => node.id === nodeId)

      if (!node) {
        throw new Error(`Node with id ${nodeId} not found`)
      }
    }

    return node
  }


}
