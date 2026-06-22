const fs = require('fs');
const out = (m) => fs.appendFileSync('/tmp/dbtest.out', m + '\n');
fs.writeFileSync('/tmp/dbtest.out', '');
const URI = 'mongodb://127.0.0.1:27017/agenthire';
(async () => {
  try {
    const { MongoClient } = require('mongodb');
    const c = await MongoClient.connect(URI, { serverSelectionTimeoutMS: 4000 });
    await c.db().command({ ping: 1 });
    out('RAW mongodb: OK');
    await c.close();
  } catch (e) { out('RAW mongodb: FAIL ' + e.message); }
  try {
    const mongoose = require('mongoose');
    await mongoose.connect(URI, { serverSelectionTimeoutMS: 4000 });
    out('MONGOOSE: OK v' + mongoose.version);
    await mongoose.disconnect();
  } catch (e) { out('MONGOOSE: FAIL ' + e.message); }
  process.exit(0);
})();
setTimeout(() => { out('HARD TIMEOUT'); process.exit(1); }, 12000);
