import { redis } from "../providers/redis";

export const getStreamKey = (runId: string) => {
  return `run:${runId}:events`
}

export const publishEvent = async (runId: string, event: Record<string, unknown>) => {
  const streamKey = `run:${runId}:events`;
  await redis.xadd(streamKey, '*', 'event', JSON.stringify(event));
};

export type CancelSubscription = () => void

type SubscribeToEvents = (params: {
  callback: (event: Record<string, unknown>) => void
  runId: string
}) => {
  cancel: CancelSubscription
}

export const subscribeToEvents: SubscribeToEvents = ({ runId, callback }) => {
  const streamKey = `run:${runId}:events`;
  let cancelSubscription = false

  const listenForEvents = async (lastId: string = '$') => {
    const results = await redis.xread('BLOCK', 10000, 'STREAMS', streamKey, lastId);

    const [_, messages] = results?.[0] ?? [];

    if (!messages) {
      if (!cancelSubscription) {
        listenForEvents(lastId)
      }

      return
    }

    messages.forEach(([id, fields]) => {
      callback(JSON.parse(fields[0]));
    });

    listenForEvents(messages[messages.length - 1]?.[0]);
  };

  listenForEvents()

  return {
    cancel: () => {
      cancelSubscription = true
    }
  }
};

export const deleteStream = async (runId: string) => {
  const streamKey = getStreamKey(runId)
  await redis.del(streamKey)
}
