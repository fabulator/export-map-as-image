import path from 'path';
import fs from 'fs';
import { fork } from 'child_process';
import { ApiScope } from 'strava-api-handler';
import fastify from 'fastify';
import { pino } from 'pino';
import { config } from 'dotenv';
import sanitize from 'sanitize-filename';
import { api, tokenService } from './services';

config();

if (!process.env.STRAVA_RETURN_URL || !process.env.CACHE_DIRECTORY) {
    throw new Error('Invalid .env variables.');
}

const logger = pino();

export const app = fastify({ logger });

app.get<{ Params: { activityId: string; height: string; width: string }; Querystring: { urlTemplate?: string } }>(
    '/activity/:activityId/width/:width/height/:height.png',
    {
        handler: async (request, reply) => {
            const { activityId, height, width } = request.params;
            const urlTemplate = request.query.urlTemplate || process.env.TEMPLATE;

            const cacheKey = sanitize(`${activityId}${height}${width}${urlTemplate || ''}`);

            const file = path.resolve(process.env.CACHE_DIRECTORY as string, `${cacheKey}.png`);

            if (fs.existsSync(file)) {
                reply.header('Content-Type', 'image/png');
                return fs.readFileSync(file);
            }

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const child = fork(path.resolve(__dirname, './exportImage.js'), [activityId, width, height, urlTemplate, file]);

            child.on('error', (m) => {
                console.error(m);
            });

            child.on('message', (m) => {
                console.log(m);
            });

            await new Promise((resolve) => {
                child.on('exit', resolve);
            });

            if (fs.existsSync(file)) {
                reply.header('Content-Type', 'image/png');
                return fs.readFileSync(file);
            }

            throw new Error('Export failed');
        },
    },
);

app.get('/strava/login', {
    handler: () => api.getLoginUrl(process.env.STRAVA_RETURN_URL as string, [ApiScope.ACTIVITY_READ_ALL]),
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
