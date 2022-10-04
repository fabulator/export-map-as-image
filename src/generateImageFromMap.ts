import { Map } from 'leaflet';
import { Canvas } from 'canvas';
import { importLeaflet } from './importLeaflet';

export const generateImageFromMap = async (map: Map): Promise<Buffer> => {
    const { leafletImage } = await importLeaflet();

    return new Promise((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        // eslint-disable-next-line promise/prefer-await-to-callbacks
        leafletImage(map, (err?: Error, canvas: Canvas) => {
            if (err) {
                reject(err);
                return;
            }
            const data = canvas.toDataURL().replace(/^data:image\/\w+;base64,/, '');
            resolve(Buffer.from(data, 'base64'));
        });
    });
};
