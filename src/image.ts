import https from 'https';

import { Image as CanvasImage } from 'canvas';

const downloadImage = (src: string): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        https
            .get(src, (res) => {
                const data: Uint8Array[] = [];

                res.on('data', (chunk) => {
                    data.push(chunk);
                });

                res.on('end', () => {
                    resolve(Buffer.concat(data));
                });
            })
            .on('error', (err) => {
                reject(err);
            });
    });
};

export class Image {
    set src(url: string) {
        // eslint-disable-next-line promise/prefer-await-to-then,promise/catch-or-return
        downloadImage(url).then((result) => {
            const image = new CanvasImage();
            image.src = result;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            this.onload.apply(image);
            return result;
        });
    }
}
