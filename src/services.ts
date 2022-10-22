import { config } from 'dotenv';
import { Api } from 'strava-api-handler';
import { ADAPTERS, Storage } from 'storage-keeper';
import { DateTime } from 'luxon';

config();

if (
    !process.env.STRAVA_CLIENT_ID ||
    !process.env.STRAVA_CLIENT_SECRET ||
    !process.env.STRAVA_RETURN_URL ||
    !process.env.TOKEN_PATH ||
    !process.env.CACHE_DIRECTORY
) {
    throw new Error('Invalid .env variables.');
}

export const api = new Api(process.env.STRAVA_CLIENT_ID, process.env.STRAVA_CLIENT_SECRET);

const storage = new Storage(undefined, new ADAPTERS.FileAdapter(process.env.TOKEN_PATH));

type Token = {
    access_token: string;
    expireDate: string;
    refresh_token: string;
};

export const tokenService = {
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
