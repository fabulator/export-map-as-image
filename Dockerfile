FROM node:18-bullseye AS build

WORKDIR /srv
COPY package*.json /srv/
RUN npm ci
COPY tsconfig.json /srv/
COPY src /srv/src/
RUN npm run build
RUN npm ci --production

FROM node:18-bullseye
WORKDIR /srv
COPY --from=build /srv/node_modules /srv/node_modules
COPY --from=build /srv/dist /srv/
CMD node index.js
