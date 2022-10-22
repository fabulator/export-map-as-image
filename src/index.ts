import 'cross-fetch/polyfill';
import path from 'path';
import fs from 'fs';
import { Api, Stream, ApiScope } from 'strava-api-handler';
import fastify from 'fastify';
import { pino } from 'pino';
import { ADAPTERS, Storage } from 'storage-keeper';
import { config } from 'dotenv';
import { DateTime } from 'luxon';
import sanitize from 'sanitize-filename';

import { getImage } from './getImage';

config();

if (
    !process.env.STRAVA_CLIENT_ID ||
    !process.env.STRAVA_CLIENT_SECRET ||
    !process.env.STRAVA_CLIENT_ACCESS_TOKEN ||
    !process.env.STRAVA_RETURN_URL ||
    !process.env.TOKEN_PATH ||
    !process.env.CACHE_DIRECTORY
) {
    throw new Error('Invalid .env variables.');
}

const logger = pino();

const api = new Api(process.env.STRAVA_CLIENT_ID, process.env.STRAVA_CLIENT_SECRET);

api.setAccessToken(process.env.STRAVA_CLIENT_ACCESS_TOKEN);

export const app = fastify({ logger });

const storage = new Storage(undefined, new ADAPTERS.FileAdapter(process.env.TOKEN_PATH));

type Token = {
    access_token: string;
    expireDate: string;
    refresh_token: string;
};

const tokenService = {
    get: async () => {
        const token = (await storage.get('token')) as Token;

        if (!token) {
            return undefined;
        }

        if (DateTime.fromISO(token.expireDate).minus({ minute: 5 }) < DateTime.local()) {
            const stravaToken = await api.refreshToken(token.refresh_token);

            const extendedToken = {
                ...stravaToken,
                expireDate: new Date(stravaToken.expires_at * 1000).toISOString(),
            };

            await tokenService.set(extendedToken);

            return extendedToken;
        }

        return token;
    },
    set: async (token: Token) => {
        storage.set('token', token);
    },
};

app.get<{ Params: { activityId: string; height: string; width: string }; Querystring: { urlTemplate?: string } }>(
    '/activity/:activityId/width/:width/height/:height',
    {
        handler: async (request, reply) => {
            const { activityId, height, width } = request.params;
            const urlTemplate = request.query.urlTemplate || process.env.TEMPLATE;

            const cacheKey = sanitize(`${activityId}${height}${width}${urlTemplate}`);

            const token = await tokenService.get();

            if (!token) {
                throw new Error('There is no token.');
            }

            api.setAccessToken(token.access_token);

            const stream = (await Promise.all(activityId.split(',').map((id) => api.getStream(Number(id), [Stream.LATNG])))).flat();

            reply.header('Content-Type', 'image/png');

            const file = path.resolve(process.env.CACHE_DIRECTORY as string, `${cacheKey}.png`);

            if (fs.existsSync(file)) {
                return fs.readFileSync(file);
            }

            const image = await getImage(
                stream.map(({ latlng }) => latlng),
                { width: Number(width), height: Number(height) },
                urlTemplate,
            );

            fs.writeFileSync(file, image);

            return image;
        },
    },
);

app.get('/strava/login', {
    handler: async () => api.getLoginUrl(process.env.STRAVA_RETURN_URL as string, [ApiScope.ACTIVITY_READ_ALL]),
});

app.get<{ Querystring: { code: string } }>('/strava/authorize', {
    handler: async (request) => {
        const { code } = request.query;

        const stravaToken = await api.requestAccessToken(code);

        const token = {
            ...stravaToken,
            expireDate: new Date(stravaToken.expires_at * 1000).toISOString(),
        };

        await tokenService.set(token);

        return token.athlete.id;
    },
});

(async () => {
    await app.listen({ port: Number(process.env.PORT) || 3005, host: '0.0.0.0' });
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
