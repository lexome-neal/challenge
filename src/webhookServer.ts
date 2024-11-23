
import Fastify from 'fastify';

import { publishEvent } from './utils/orchestration/eventStream';
import { SERVICE_PORT } from './constants';
import 'dotenv/config';

const fastify = Fastify({
  logger: true
});

// Register JSON body parser
fastify.register(require('@fastify/cors'));

interface PublishEventBody {
  event: Record<string, unknown>;
}

const publishEventSchema = {
  params: {
    type: 'object',
    required: ['runId'],
    properties: {
      runId: { type: 'string' }
    }
  },
  body: {
    type: 'object',
    required: ['event'],
    properties: {
      event: { type: 'object' }
    }
  }
};

fastify.post<{ Params: { runId: string }, Body: PublishEventBody }>(
  '/publish-event/:runId',
  { schema: publishEventSchema },
  async (request, reply) => {
    try {
      const { runId } = request.params;
      const { event } = request.body;
      await publishEvent(runId, event)
      return { success: true };
    } catch (error) {
      request.log.error('Error publishing event:', error);
      throw new Error('Internal server error');
    }
  }
);

const start = async () => {
  try {
    await fastify.listen({ port: Number(SERVICE_PORT) });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();


