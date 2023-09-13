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

// XXX
const OTEL_FILE = path.resolve(path.join(__dirname, './elastic.log'));

if (existsSync(OTEL_FILE)) {
  const fileContent = readFileSync(OTEL_FILE, { encoding: 'utf-8' });
  const fileLines = fileContent.split('\n').filter(l => l);
  const quotedContent = fileLines.map(quoteProps).join('\n');
  const spanList = JSON.parse(`[${quotedContent}]`);
  const children = {};
  const parents = [];

  for (const span of spanList) {
    if (span.parentId) {
      children[span.parentId] = children[span.parentId] || [];
      children[span.parentId].push(span);
    } else {
      parents.push(span);
    }
  }

  for (const p of parents) {
    // TODO: accept either OTel or Elastic property names.
    console.log(`trace ${p.traceId.substring(6)}`);
    console.log(`\`- span ${p.id.substring(6)} "${p.name}" (${p.attributes['http.url']} -> ${p.attributes['http.status_code']})`);
    if (children[p.id]) {
      for (const c of children[p.id]) {
        console.log(`   \`- span ${c.id.substring(6)} "${c.name}" (${c.attributes['db.system']})`);
      }
    }
  }
}


function quoteProps(str, index, arr) {
  if (index === arr.length - 1) {
    return str;
  }
  if (str === '}') {
    return '},';
  }
  if (str.indexOf('undefined,') !== -1) {
    return '';
  }

  let res = str.replace(/"/g, '\\"');
  res = res.replace(/'/g, '"');
  res = res.replace(/([\w_]+): /g, (m, g) => `"${g}":`);

  return res;
}
