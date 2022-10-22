import 'cross-fetch/polyfill';
import fs from 'fs';
import { Stream } from 'strava-api-handler';
import { getImage } from './getImage';
import { api, tokenService } from './services';

(async () => {
    const token = await tokenService.get();

    if (!token) {
        throw new Error('There is no token.');
    }

    api.setAccessToken(token.access_token);

    console.log(process.argv);

    const [, , activityId, width, height, urlTemplate, file] = process.argv;

    const stream = (await Promise.all(activityId.split(',').map((id) => api.getStream(Number(id), [Stream.LATNG])))).flat();

    const image = await getImage(
        stream.map(({ latlng }) => latlng),
        { width: Number(width), height: Number(height) },
        urlTemplate,
    );

    fs.writeFileSync(file, image);
})();
