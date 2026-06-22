const { MongoMemoryServer } = require('mongodb-memory-server');
(async () => {
  const mongod = await MongoMemoryServer.create({
    binary: { version: '7.0.14' },
    instance: { port: 27017, dbName: 'agenthire' }
  });
  console.log('READY MONGO_URI=' + mongod.getUri());
  setInterval(()=>{}, 1<<30);
})().catch(e=>{ console.error('ERR', e.message); process.exit(1); });
