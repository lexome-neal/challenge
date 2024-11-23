import { zodResponseFormat } from "openai/helpers/zod";
import { z, ZodSchema } from "zod";
import { openai } from "../providers/openai";

export const executeCompletionPrompt = <Schema extends ZodSchema>(params: {
  systemPrompt: string,
  userPrompt: string,
  responseSchema: Schema,
  responseSchemaName: string,
}): Promise<z.infer<Schema>> => {
  const { systemPrompt, userPrompt, responseSchema, responseSchemaName } = params

  return openai.beta.chat.completions.parse({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: zodResponseFormat(responseSchema, responseSchemaName),
  })
}
