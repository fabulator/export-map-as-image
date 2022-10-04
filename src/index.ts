import fs from 'fs';
import 'cross-fetch/polyfill';
import { Api, Stream } from 'strava-api-handler';
import { getImage } from './getImage';

const api = new Api('CLIENT_ID', 'CLIENT_SECRET');

api.setAccessToken('ACCESS_TOKEN');

(async () => {
    const workoutId = 9999999;
    const workout = await api.getStream(workoutId, [Stream.LATNG]);

    fs.writeFileSync(`${workoutId}.png`, await getImage(workout.map(({ latlng }) => latlng)));
})();
