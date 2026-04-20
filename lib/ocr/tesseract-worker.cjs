'use strict';

const { parentPort } = require('worker_threads');
const worker = require('./worker-runtime/index.cjs');
const getCore = require('./worker-runtime/node/getCore.cjs');
const gunzip = require('./worker-runtime/node/gunzip.cjs');
const cache = require('./worker-runtime/node/cache.cjs');
const fetch = global.fetch || require('node-fetch');

parentPort.on('message', (packet) => {
  worker.dispatchHandlers(packet, (obj) => parentPort.postMessage(obj));
});

worker.setAdapter({
  getCore,
  gunzip,
  fetch,
  ...cache,
});
