const client = require('prom-client'); // Import prom-client

const graphqlLatencyHistogram = new client.Histogram({
    name: 'graphql_article_request_duration_seconds', // chỉ đo /article(s)
    help: 'Duration of GraphQL article/operations in seconds',
    labelNames: ['operation', 'status_code'],
    buckets: [0.1, 0.5, 1, 1.5, 2, 5]
});

module.exports = (app, httpServer) => {
    // Middleware ghi metric CHỈ khi query có article / articles
    app.use('/graphql', (req, res, next) => {
        // Body chưa parse hoặc không phải operation GraphQL
        const query = req.body && req.body.query;
        if (!query) return next();

        // Kiểm tra có dùng trường article hoặc articles (regex đơn giản)
        if (!/\barticles?\b/.test(query)) return next();

        const end = graphqlLatencyHistogram.startTimer();
        res.on('finish', () => {
            end({
                operation: req.body.operationName || 'article',
                status_code: String(res.statusCode)
            });
        });
        next();
    });

    // Existing GraphQL setup
    const { ApolloServer } = require('apollo-server-express');
    const schema = require('./schema');
    const resolvers = require('./resolvers');

    const server = new ApolloServer({ typeDefs: schema, resolvers });
    server.applyMiddleware({ app });
};