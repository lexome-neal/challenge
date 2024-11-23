import { openai } from "../providers/openai"

export const generateTranscript = async (params: {
  audioUrl: string,
}) => {
  const { audioUrl } = params

  const response = await fetch(audioUrl)

  const audioBlob = await response.blob()

  const audioFile = new File([audioBlob], "audio.wav", { type: "audio/wav" })

  const transcript = await openai.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-1",
  })

  return transcript.text
}