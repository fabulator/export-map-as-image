import fs from 'fs';
import { _experimentalParseGpx } from 'gpx-builder';
import { getImage } from './getImage';
import { getGpxFile } from './getGpxFile';

(async () => {
    const [, , activityId, width, height, urlTemplate, file] = process.argv;

    const gpxFile = await getGpxFile(activityId.split(','));

    const data = fs.readFileSync(gpxFile, 'utf-8');

    const gpx = _experimentalParseGpx(data);

    const points =
        gpx.toObject().trk?.[0]?.trkseg?.[0]?.trkpt.map((pt) => [pt.attributes.lat, pt.attributes.lon] as [number, number]) || [];

    const image = await getImage(points, { width: Number(width), height: Number(height) }, urlTemplate);

    fs.writeFileSync(file, image as unknown as string);
})();
