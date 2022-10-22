FROM node:18-alpine AS build

WORKDIR /srv
COPY package*.json /srv/
RUN apk add --no-cache --virtual .build-deps git build-base g++ \
	&& apk add --no-cache --virtual .npm-deps cairo-dev libjpeg-turbo-dev pango
RUN npm ci
COPY tsconfig.json /srv/
COPY src /srv/src/
RUN npm run build
RUN npm ci --production

FROM node:18-alpine
WORKDIR /srv
RUN apk add --no-cache cairo-dev libjpeg-turbo-dev pango
COPY --from=build /srv/node_modules /srv/node_modules
COPY --from=build /srv/dist /srv/
CMD node index.js
