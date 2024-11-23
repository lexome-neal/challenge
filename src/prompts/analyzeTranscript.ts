import { TEST_FAILURE_CUE } from "../constants";
import { z } from "zod";
import { executeCompletionPrompt } from "../utils/ai/executeCompletionPrompt";

const analyzeTranscriptResponseSchema = z.object({
  additionalMessage: z.string(),
  conversationSuccess: z.boolean(),
})

export const analyzeTranscriptSystemPrompt = `
You are a conversation analyst. You will be given two scripts: a conversation template and the actual conversation.

The conversation template will have a speaker identified as "You" and a speaker identified as "Agent".
The actual conversation is a transcript and does not contain any speaker identifiers.

The actual conversation may not follow the template exactly. The actual conversation
also should have exactly one additional new message at the end of the conversation
from the speaker identified as "Agent".

Your task is to extract this additional message from the transcript.

Your response should be a JSON object structured as follows:

{
  "additionalMessage": <string>,
  "conversationSuccess": <boolean>
}

If the conversation ended with the words "${TEST_FAILURE_CUE}", set
conversationSuccess to false. You do not need to extract the additional message
in this case.

Otherwise, set conversationSuccess to true.
`

export const analyzeTranscriptUserPrompt = (params: {
  template: string,
  actual: string,
}) => {
  const { template, actual } = params

  return `Template: ${template}\n\nActual: ${actual}`
}

export const analyzeTranscript = (params: {
  template: string,
  actual: string,
}) => {
  const { template, actual } = params

  return executeCompletionPrompt({
    systemPrompt: analyzeTranscriptSystemPrompt,
    userPrompt: analyzeTranscriptUserPrompt({ template, actual }),
    responseSchema: analyzeTranscriptResponseSchema,
    responseSchemaName: "analyzeTranscriptResponseSchema",
  })
}