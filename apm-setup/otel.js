// From: https://opentelemetry.io/docs/instrumentation/js/getting-started/nodejs/

// Require dependencies
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-node');
const {
  getNodeAutoInstrumentations,
} = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  traceExporter: new ConsoleSpanExporter(),
  instrumentations: [getNodeAutoInstrumentations({
    // To reduce noise in the console since we just want
    // http and mongodb spans
    "@opentelemetry/instrumentation-fs": {
      enabled: false,
    },
    "@opentelemetry/instrumentation-connect": {
      enabled:false,
    },
    "@opentelemetry/instrumentation-net": {
      enabled: false,
    },
    "@opentelemetry/instrumentation-dns": {
      enabled: false,
    }
  })],
});

sdk.start();
