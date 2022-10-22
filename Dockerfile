FROM node:18-alpine AS build

WORKDIR /srv
COPY package*.json /srv/
RUN apk add --no-cache python3 py3-pip make g++ libc6-compat pkgconfig pixman-dev cairo-dev pango-dev
RUN npm ci
COPY tsconfig.json /srv/
COPY src /srv/src/
RUN npm run build
RUN npm ci --production

FROM node:18-alpine
WORKDIR /srv
COPY --from=build /srv/node_modules /srv/node_modules
COPY --from=build /srv/dist /srv/
CMD node index.js
