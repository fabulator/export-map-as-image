import crypto from 'crypto';
import fs from 'fs';
import { buildGPX, GarminBuilder } from 'gpx-builder';
import path from 'path';
import simplify from 'simplify-js';
import { Stream } from 'strava-api-handler';
import { api, tokenService } from './services';

export const getGpxFile = async (activityId: string | string[]) => {
    const activitiesId = Array.isArray(activityId) ? activityId : [activityId];

    const cacheKey = crypto
        .createHash('md5')
        .update(`${activitiesId.join(',')}`)
        .digest('hex');

    const file = path.resolve(process.env.CACHE_DIRECTORY as string, `${cacheKey}.gpx`);

    if (fs.existsSync(file)) {
        return file;
    }

    const token = await tokenService.get();
    if (token) {
        api.setAccessToken(token.access_token);
    }

    const stream = (await Promise.all(activitiesId.map((id) => api.getStream(Number(id), [Stream.LATNG, Stream.ALTITUDE])))).flat();

    const data = stream.map(({ latlng, altitude }) => ({ x: latlng[0], y: latlng[1], altitude }));

    const points = simplify(data, 0.0001);

    const { Point } = GarminBuilder.MODELS;

    const gpxData = new GarminBuilder();

    gpxData.setSegmentPoints(
        points.map(
            (point) =>
                new Point(point.x, point.y, {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    ele: point.altitude,
                }),
        ),
    );

    fs.writeFileSync(file, buildGPX(gpxData.toObject()));

    if (fs.existsSync(file)) {
        return file;
    }

    throw new Error('Export failed');
};
