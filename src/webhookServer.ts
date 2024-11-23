
import Fastify from 'fastify';
import cors from '@fastify/cors';

import { publishEvent } from './utils/orchestration/eventStream';
import { SERVICE_HOST, SERVICE_PORT } from './constants';
import 'dotenv/config';

const fastify = Fastify({
  logger: true
});

// Configure CORS to allow all origins
const corsOptions = {
  origin: true, // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

fastify.register(cors, corsOptions);

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
    await fastify.listen({
      port: Number(SERVICE_PORT),
      host: SERVICE_HOST
    });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();


