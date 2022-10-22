import { JSDOM } from 'jsdom';
import { Image } from './image';

declare let global: any;

export const prepareDom = () => {
    const jsdom = new JSDOM('<html><head></head><body></body></html>');

    global.document = jsdom.window.document;
    global.window = jsdom.window;
    global.navigator = global.window.navigator;
    global.Image = Image;

    global.L_DISABLE_3D = true;
    global.L_NO_TOUCH = true;

    return () => {
        jsdom.window.close();
    };
};
