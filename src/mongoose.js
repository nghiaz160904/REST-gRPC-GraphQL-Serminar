const mongoose = require('mongoose');
const createArticles = require('./db');
const seedState = require('./seedState');

const {
  MONGO_URL,
  MONGO_HOST = 'mongodb:27017',
  MONGO_DB = 'metricsdemo',
} = process.env;

const uri = MONGO_URL || `mongodb://${MONGO_HOST}/${MONGO_DB}?retryWrites=true&w=majority`;
const options = { useNewUrlParser: true, useUnifiedTopology: true };

const SEED_ON_STARTUP = (process.env.SEED_ON_STARTUP || 'true') === 'true';
const SEED_ARTICLES_COUNT = parseInt(process.env.SEED_ARTICLES_COUNT || '300000', 10);
const SEED_RESET = (process.env.SEED_RESET || 'false') === 'true';

mongoose
  .connect(uri, options)
  .then(async () => {
    console.log('[mongoose] connected');
    if (SEED_ON_STARTUP) {
      const db = mongoose.connection.db;
      const articlesCol = db.collection('articles');
      const commentsCol = db.collection('comments');
      let existing = await articlesCol.estimatedDocumentCount();

      if (SEED_RESET) {
        console.log('[mongoose] dropping articles and comments collections before reseed...');
        await Promise.all([
          articlesCol.drop().catch(err => {
            if (err.codeName !== 'NamespaceNotFound') throw err;
          }),
          commentsCol.drop().catch(err => {
            if (err.codeName !== 'NamespaceNotFound') throw err;
          }),
        ]);
        existing = 0;
      }

      if (existing < SEED_ARTICLES_COUNT) {
        const missing = SEED_ARTICLES_COUNT - existing;
        console.log(`[mongoose] seeding ${missing} articles (existing ${existing} -> target ${SEED_ARTICLES_COUNT})...`);

        seedState.seeding = true;
        seedState.target = missing;
        seedState.done = 0;

        await createArticles(
          missing,
          (n) => {
            seedState.done = n;
            if (n % 10000 === 0) {
              console.log(`[mongoose] seeded ${n}/${missing}`);
            }
          }
        );

        seedState.seeding = false;
        console.log('[mongoose] seeding done');
      } else {
        console.log(`[mongoose] skip seeding (existing: ${existing} >= target: ${SEED_ARTICLES_COUNT})`);
      }
    }
  })
  .catch((error) => {
    console.error('[mongoose] connection error:', error);
    process.exit(1);
  });
