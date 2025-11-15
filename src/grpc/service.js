const client = require('prom-client'); // Import prom-client

const grpcLatencyHistogram = new client.Histogram({
    name: 'grpc_request_duration_seconds',
    help: 'Duration of gRPC requests in seconds',
    labelNames: ['method', 'status_code'],
    buckets: [0.1, 0.5, 1, 1.5, 2, 5]
});

module.exports = () => {
    const grpc = require('@grpc/grpc-js');
    const protoLoader = require('@grpc/proto-loader');

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
            // Logic xử lý gRPC
            callback(null, { /* response */ });
            end({ method: 'getArticle', status_code: 0 });
        },
        // Thêm các phương thức khác tương tự
    });

    server.bindAsync('127.0.0.1:50051', grpc.ServerCredentials.createInsecure(), () => {
        server.start();
    });
};