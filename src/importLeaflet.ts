export const importLeaflet = async () => {
    return {
        leaflet: await import('leaflet'),
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        leafletImage: (await import('leaflet-image')).default,
    };
};
