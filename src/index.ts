import 'cross-fetch/polyfill';
import { Api, Stream } from 'strava-api-handler';
import fastify from 'fastify';
import { pino } from 'pino';
import { config } from 'dotenv';
import { getImage } from './getImage';

config();

if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET || !process.env.STRAVA_CLIENT_ACCESS_TOKEN) {
    throw new Error('Invalid .env variables.');
}

const logger = pino();

const api = new Api(process.env.STRAVA_CLIENT_ID, process.env.STRAVA_CLIENT_SECRET);

api.setAccessToken(process.env.STRAVA_CLIENT_ACCESS_TOKEN);

export const app = fastify({ logger });

app.get<{ Params: { activityId: string; height: string; width: string } }>('/activity/:activityId/width/:width/height/:height', {
    handler: async (request, reply) => {
        const { activityId, height, width } = request.params;

        const stream = await api.getStream(Number(activityId), [Stream.LATNG]);

        reply.header('Content-Type', 'image/png');

        return getImage(
            stream.map(({ latlng }) => latlng),
            { width: Number(width), height: Number(height) },
        );
    },
});

(async () => {
    await app.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
})();

const close = async (signal: string) => {
    logger.info(`${signal} signal received.`);

    if (signal === 'SIGINT') {
        process.exit(0);
    }

    await app.close();

    process.exit(0);
};

process.on('SIGTERM', close);
process.on('SIGINT', close);
