import { CALLER_API_URI, WEBHOOK_URL } from "../../constants"

export const executeCall = async ({
  script,
  phoneNumber,
}: {
  script: string,
  phoneNumber: string,
}): Promise<{
  id: string,
}> => {
  const response = await fetch(CALLER_API_URI, {
    method: "POST",
    body: JSON.stringify({
      phone_number: phoneNumber,
      prompt: script,
      webhook_url: WEBHOOK_URL,
    }),
  })

  const data = await response.json()

  return {
    id: data.id,
  }
}