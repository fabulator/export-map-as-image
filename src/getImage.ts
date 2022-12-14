import { prepareDom } from './prepareDom';
import { importLeaflet } from './importLeaflet';
import { generateImageFromMap } from './generateImageFromMap';

export const getImage = async (
    points: [number, number][],
    { width, height }: { height: number; width: number },
    urlTemplate = 'https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}',
) => {
    const close = prepareDom();
    const { leaflet } = await importLeaflet();

    global.L = leaflet;

    const map = leaflet.map(document.createElement('div'), { preferCanvas: true }).setView([52, 4], 10);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    map._size = new leaflet.Point(width, height);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    map._resetView(map.getCenter(), map.getZoom());

    leaflet.tileLayer(urlTemplate).addTo(map);

    leaflet.polyline(points, { color: 'white', smoothFactor: 1, weight: 5 }).addTo(map);

    const polygon = leaflet.polyline(points, { color: '#bf2e28', smoothFactor: 1, weight: 3, fillOpacity: 1 }).addTo(map);

    map.fitBounds(polygon.getBounds());

    const response = await generateImageFromMap(map);

    close();

    return response;
};
