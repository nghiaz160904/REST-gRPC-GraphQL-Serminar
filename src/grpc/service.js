const client = require('prom-client'); // Import prom-client

const grpcLatencyHistogram = new client.Histogram({
    name: 'grpc_article_request_duration_seconds',
    help: 'Duration of gRPC getArticle requests in seconds',
    labelNames: ['method', 'status_code'],
    buckets: [0.1, 0.5, 1, 1.5, 2, 5]
});

module.exports = () => {
    const grpc = require('@grpc/grpc-js');
    const protoLoader = require('@grpc/proto-loader');
    const getArticle = require('./rpc/getArticle');

    const PROTO_PATH = __dirname + '/proto/schema.proto';
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    });
    const proto = grpc.loadPackageDefinition(packageDefinition).example;

    const server = new grpc.Server();

    server.addService(proto.Main.service, {
        getArticle: (call, callback) => {
            const end = grpcLatencyHistogram.startTimer();
            // getArticle là async, nên bắt cả lỗi ngoại lệ
            getArticle(call, (err, res) => {
                end({ method: 'getArticle', status_code: err ? (err.code ?? 'ERROR') : 0 });
                callback(err, res);
            }).catch(e => {
                // Lỗi ngoài luồng promise
                end({ method: 'getArticle', status_code: e.code ?? 'ERROR' });
                callback({
                    code: grpc.status.INTERNAL,
                    message: e.message || 'Internal error'
                });
            });
        }
        // Các method khác không thu thập metric
    });

    server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
        server.start();
    });
};