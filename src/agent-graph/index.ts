import { GraphNode, NodeAgent } from "./types"

export class AgentGraph {
  entry?: GraphNode

  generateScriptFromNodePath(params: {
    nodePath: string[],
  }) {
    const { nodePath } = params

    let currentNode = this.entry as GraphNode
    let script = currentNode.script
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

    if (!this.entry || nodePath[0] !== this.entry.id) {
      throw new Error("Invalid node path")
    }

    let node = this.entry as GraphNode

    for (const nodeId of nodePath.slice(1)) {
      node = node?.responses.find((node) => node.id === nodeId) as GraphNode

      if (!node) {
        throw new Error(`Node with id ${nodeId} not found`)
      }
    }

    return node as GraphNode
  }
}
