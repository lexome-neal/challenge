
import Fastify from 'fastify';

import { publishEvent } from './utils/orchestration/eventStream';
import { SERVICE_PORT } from './constants';
import 'dotenv/config';

const fastify = Fastify({
  logger: true
});


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
  }
};

fastify.post<{
  Params: { runId: string },
  Body: Record<string, unknown>
}>(
  '/publish-event/:runId',
  { schema: publishEventSchema },
  async (request, reply) => {
    try {
      const { runId } = request.params;
      await publishEvent(runId, JSON.stringify(request.body))
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


