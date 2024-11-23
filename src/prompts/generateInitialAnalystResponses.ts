import { executeCompletionPrompt } from "../utils/ai/executeCompletionPrompt";
import { analystResponsesResponseSchema } from "./generateAnalystResponses"

const analystInitialResponsesSystemPrompt = `
You are an agent tasked with understanding the capabilities of a phone 
agent.

The prompt you will receive is the transcript of 
the first message said by the agent.

Your task is to generate a list of possible responses.

If there are multiple ways to respond, you should include multiple responses.

If the agent asks for an arbitrary piece of information, such as a name,
you should include one example in the responses.

If the number of ways to respond is not clear, you should include a response
asking for clarification. In this situation, only include 1
response in the responses array, and set the boolean
isResponseAClarification to true. Otherwise, set it to false.

All responses should be in the natural language of a person speaking.

{
  responses: string[],
  conversationEnded: boolean,
  isResponseAClarification: boolean,
}
`

export const generateInitialAnalystResponses = (params: {
  transcript: string,
}) => {
  const { transcript } = params

  return executeCompletionPrompt({
    systemPrompt: analystInitialResponsesSystemPrompt,
    userPrompt: transcript,
    responseSchema: analystResponsesResponseSchema,
    responseSchemaName: "analystResponsesSchema",
  })
}