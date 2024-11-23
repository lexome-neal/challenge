export enum NodeAgent {
  agent = "agent",
  analyst = "analyst",
}

export type GraphNode = {
  id: string
  agent: NodeAgent
  script: string
  isClarification: boolean
  responses: GraphNode[]
}