const http = require('http');
const express = require('express');
const app = express();
const httpServer = http.createServer(app);
const client = require('prom-client'); // Import prom-client
client.register.clear();
require('./mongoose.js');
const bodyParser = require('body-parser');
const rest = require('./rest/index.js');
const jwt = require('express-jwt');
const cors = require('cors');
const restMiddleware = require('./rest/restMiddleware'); // Import middleware riêng
const seedState = require('../src/seedState'); // điều chỉnh đường dẫn nếu cần

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
});

app.get('/ready', (req, res) => {
  if (seedState.seeding) return res.status(503).send('seeding');
  res.status(200).send('ok');
});

app.get('/status', (req, res) => {
  res.json({
    seeding: seedState.seeding,
    target: seedState.target,
    done: seedState.done,
  });
});

app.use(restMiddleware);

app.use(bodyParser.json());
app.use(jwt({ secret: process.env.ACCESS_TOKEN_SECRET, algorithms: ['HS256'], credentialsRequired: false }));
app.use(cors({ origin: process.env.CORS_ALLOWED_DOMAIN }));

// Áp dụng middleware riêng cho tất cả các route REST

// Sử dụng các module REST
app.use('/articles', rest.article);
app.use('/distances', rest.distance);
app.use('/videos', rest.video);
app.use('/clients', rest.client);
require('./graphql/graphql')(app, httpServer);

const PORT = 4000;

httpServer.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}`);
    console.log(`🚀 Subscriptions ready at ws://localhost:${PORT}`);
});
require('./grpc/service')();