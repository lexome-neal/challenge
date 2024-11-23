import { executeCompletionPrompt } from "../utils/ai/executeCompletionPrompt";
import { z } from "zod";

export const analystResponsesResponseSchema = z.object({
  responses: z.array(z.string()),
  conversationEnded: z.boolean(),
  isResponseAClarification: z.boolean(),
})

const analystResponsesSystemPrompt = `
You are an agent tasked with producing a comprehensive list of possible responses
that a user might answer given a script.

Your response should adopt the persona that is established in the script.

If information about the persona or situation is not clear from the script,
you should include a variety of responses that cover the range of possible
personalities and situations.

When asked for pieces of information that are arbitrary,
such as names, your list of responses should only include one example.

If it is reasonably clear that your persona of the script has had 
your need satisfied or the agent has exhausted their ability to
help, the responses list should be empty, and the boolean
conversationEnded should be set to true. Otherwise, the
conversationEnded boolean should be set to false.

If the agent asked a question, and it is not clear what the possible
responses are, the array of responses should include exactly
one response asking for clarification. In this case, the boolean
isResponseAClarification should be set to true. Otherwise, it should be set
to false.

The response script should be empty if the agent asks if there is any
further assistance needed.

The response that you produce should be a JSON object structured as follows:

{
  responses: string[],
  conversationEnded: boolean,
  isResponseAClarification: boolean,
}
`

export const generateAnalystResponses = (params: {
  script: string,
}) => {
  const { script } = params

  return executeCompletionPrompt({
    systemPrompt: analystResponsesSystemPrompt,
    userPrompt: script,
    responseSchema: analystResponsesResponseSchema,
    responseSchemaName: "analystResponsesSchema",
  })
}