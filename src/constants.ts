export const SERVICE_PORT = process.env.PORT || 3000
export const WEBHOOK_URL = process.env.WEBHOOK_URL
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY
export const CALLER_API_URI = "https://app.hamming.ai/api/rest/exercise/start-call"
export const TEST_FAILURE_CUE = "Test failed"

export const REDIS_HOST = process.env.REDIS_HOST
export const REDIS_PORT = process.env.REDIS_PORT
export const REDIS_USER = process.env.REDIS_USER || 'default'
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD

export const getMediaUrl = (id: string) => `https://app.hamming.ai/api/media/exercise?id=${id}`
