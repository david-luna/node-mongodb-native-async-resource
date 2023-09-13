const apm = require('elastic-apm-node').start({
  serviceName: 'cats-service',
  metricsInterval: '0s',
  logLevel: 'off',
  apiRequestTime: '3s', // XXX for local usage of mockapmserver.js
  disableSend: true, // for the ones not having a mock APM server
});

apm.addFilter((thing) => {
  console.dir(thing, {depth: 5});
  return thing;
})
