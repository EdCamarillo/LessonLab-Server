"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/node/src/index.ts
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
require("reflect-metadata");
const http_1 = __importDefault(require("http"));
const expressApp_1 = __importDefault(require("./expressApp"));
const socketServer_1 = __importDefault(require("./socketServer"));
dotenv_1.default.config();
class Server {
    constructor() {
        // Create the HTTP server
        this.server = http_1.default.createServer();
        // Initialize the Express application and attach it to the server
        this.expressApp = new expressApp_1.default();
        this.server.on('request', this.expressApp.app);
        // Initialize the SocketServer with the HTTP server
        this.socketServer = new socketServer_1.default(this.server);
        this.initialize();
    }
    static getInstance() {
        if (!Server.instance) {
            Server.instance = new Server();
        }
        return Server.instance;
    }
    initialize() {
        var memwatch = require("@airbnb/node-memwatch");
        const uploadsDir = path_1.default.join(__dirname, "..", "uploads");
        const exportsDir = path_1.default.join(__dirname, "..", "exports");
        if (process.env.NODE_ENV === "production") {
            console.log("Running in production mode");
            console.log = function () { };
        }
        else if (process.env.NODE_ENV === "profile") {
            memwatch.on("stats", function (stats) {
                console.log(stats);
            });
        }
        if (!fs_1.default.existsSync(uploadsDir)) {
            fs_1.default.mkdirSync(uploadsDir);
        }
        if (!fs_1.default.existsSync(exportsDir)) {
            fs_1.default.mkdirSync(exportsDir);
        }
        this.setupExpressHookRoutes();
        const PORT = process.env.PORT || 4001;
        this.server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    }
    setupExpressHookRoutes() {
        // Paymongo webhook endpoint for recieving transaction statuses
        this.expressApp.app.post('/api/webhooks/paymongo', (req, res) => {
            console.log('Received webhook:', req.body);
            const paymentStatus = req.body.data.attributes.type;
            const paymentIntentId = req.body.data.attributes.data.attributes.payment_intent_id;
            this.socketServer.io.in(paymentIntentId).emit("payment_message", {
                payment_status: paymentStatus,
                payment_intent_id: paymentIntentId
            });
            res.status(200).send('Webhook received');
        });
    }
}
// Initialize server singleton instance once.
Server.getInstance();
exports.default = Server;
//# sourceMappingURL=index.js.map