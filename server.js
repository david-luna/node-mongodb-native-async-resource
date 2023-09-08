const http = require('http');
const MongoClient = require('mongodb').MongoClient;

const DB_NAME = 'trace-mongodb-cats';
const url = 'mongodb://localhost:27017';

async function bootstrap() {
  const client = new MongoClient(url, { monitorCommands: true });

  try {
    await client.connect();
    const database = client.db(DB_NAME);
    const collection = database.collection('cats');
    const server = http.createServer(function (req, res) {
      // console.log('incoming request: %s %s %s', req.method, req.url, req.headers);
      req.resume();
      req.on('end', function () {
        const pathname = req.url;
        let prom = Promise.resolve('');
        if (pathname === '/create') {
          prom = collection.insertOne({ name: 'kitty' }).then(() => 'Meow');
        } else if (pathname === '/getAll') {
          prom = collection.find().toArray().then(JSON.stringify);
        }
        prom.then((body) => {
          res.writeHead(200, {
            server: 'trace-mongodb-cats-server',
            'content-type': 'text/plain',
            'content-length': Buffer.byteLength(body),
          });
          res.end(body);
        })
      });
    });

    server.listen(3000);
    server.on('close', async function () {
      await client.close();
    });
  } catch (err) {
    console.log('bootstrap error', err);
  }
}

bootstrap();
