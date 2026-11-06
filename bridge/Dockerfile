FROM node:26-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
RUN mkdir /data && chown node:node /data
USER node
ENV BRIDGE_AUTH_DIR=/data/auth \
    NPM_CONFIG_UPDATE_NOTIFIER=false
CMD ["node", "src/index.ts"]
