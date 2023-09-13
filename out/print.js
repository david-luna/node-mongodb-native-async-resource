// Prints the spans written in the output files showing the
// hierarchy between them.
// Files are:
// - otel.log
// - elastic.log
//
// The result wiil be like
// trace 56c64b
// `- span 644d5d "GET unknown route" (14.34ms, GET http://localhost:3000/getAll -> 200)
//    `- span 1ce507 "trace-mongodb-cats.cats.find" (2ms, mongodb)
//    `- span 1ce507 "trace-mongodb-cats.cats.find" (2ms, mongodb)
//    `- span 1dd593 "trace-mongodb-cats.cats.find" (2ms, mongodb)
//    `- span b40f9f "trace-mongodb-cats.cats.find" (1ms, mongodb)
//    `- span ef6ea9 "trace-mongodb-cats.cats.find" (3ms, mongodb)
// trace 132291
// `- span 8a7eea "GET unknown route" (5.677ms, GET http://localhost:3000/getAll -> 200)
//    `- span 097c3f "trace-mongodb-cats.cats.find" (4ms, mongodb)
// trace 42f476
// `- span f6a01a "GET unknown route" (9.788ms, GET http://localhost:3000/getAll -> 200)
//    `- span 250202 "trace-mongodb-cats.cats.find" (1ms, mongodb)
//    `- span 250202 "trace-mongodb-cats.cats.find" (1ms, mongodb)
//    `- span 447a95 "trace-mongodb-cats.cats.find" (3ms, mongodb)
//    `- span 208cea "trace-mongodb-cats.cats.find" (1ms, mongodb)

const { existsSync, readFileSync } = require('fs');
const path = require('path');

const fileName = process.argv[2]; // must be 'elastic' or 'otel'

if (fileName !== 'elastic' && fileName !== 'otel') {
  console.error(`APM name invalid (${fileName}). Accepted values are elastic or otel.`)
  process.exit(-1);
}

const LOG_PATH = path.resolve(path.join(__dirname, `./${fileName}.log`));

if (!existsSync(LOG_PATH)) {
  console.warn(`There is no log file to process. Start the server and send some requests 1st`);
  process.exit(0);
}

const fileContent = readFileSync(LOG_PATH, { encoding: 'utf-8' });
const spanList = getObjects(fileContent);
const parentSpans = [];
const childSpans = {};

for (const span of spanList) {
  const parentId = span.parentId || span.parent_id;
  if (parentId) {
    childSpans[parentId] = childSpans[parentId] || [];
    childSpans[parentId].push(span);
  } else {
    parentSpans.push(span);
  }
}

for (const parent of parentSpans) {
  const traceId = (parent.traceId || parent.trace_id).substring(6);
  console.log(`trace ${traceId}`);
  printSpan(parent);
  
  const children = childSpans[parent.id] || [];
  for (const child of children) {
    printSpan(child, '   ');
  }
}

function printSpan(span, indent = '') {
  const isOtelSpan = !!span.kind;
  const isHttpSpan = span.kind === 1 || span.type === 'request';
  const isDbSpan = span.kind === 2 || span.type === 'db';
  const spanId = span.id.substring(6);
  const spanName = span.name;

  if (isHttpSpan) {
    const spanUrl = isOtelSpan ? span.attributes['http.url'] : span.context.request.url.full;
    const spanStatus = isOtelSpan ? span.attributes['http.status_code'] : span.context.response.status_code;

    console.log(`${indent}\`- span ${spanId} "${spanName}" (${spanUrl} -> ${spanStatus})`);
  } else if (isDbSpan) {
    const dbSystem = isOtelSpan ? span.attributes['db.system'] : span.subtype;

    console.log(`${indent}\`- span ${spanId} "${spanName}" (${dbSystem})`);
  }
}


function getObjects(content) {
  const lines = content.split('\n');
  const spans = [];
  let text = '';

  for (const line of lines) {
    if (line === '{') {
      try {
        spans.push(JSON.parse(text))
      } catch (err) {
        // We may end here if there is a previous log like
        // `Server listening on port 3000`
        // before the console exporters start printing
        // console.error(err);
      }
      text = '{';
      continue;
    }
    
    // Only treat defined properties
    if (line.indexOf(': undefined') === -1) {
      // ecape double quotes
      let res = line.replace(/"/g, '\\"');
      // single quote to double
      res = res.replace(/'/g, '"');
      // properties must be quoted
      res = res.replace(/([\w_]+): /g, (m, g) => `"${g}":`);
      text += res;
    }
  }
  return spans;
}
