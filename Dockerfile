FROM node:8.9.3


RUN mkdir -p /project/node-test-server
 


# Copy app source
COPY . /project/node-test-server
WORKDIR /project/node-test-server
RUN npm install

ENV PORT=8080
ENV DEBUG_PORT=9229

ENV DS_API_HOST=http://eng-task.pxchk.net
ENV REDIS_URI=redis://redis:6379

ENV CACHE_TTL_IN_SECS=3600

EXPOSE ${PORT} ${DEBUG_PORT}

 