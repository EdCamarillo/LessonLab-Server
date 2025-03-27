"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
require("reflect-metadata");
const assistantRoutes_1 = __importDefault(require("./routes/assistantRoutes"));
const documentRoutes_1 = __importDefault(require("./routes/documentRoutes"));
const contextRoutes_1 = __importDefault(require("./routes/contextRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const workspaceRoutes_1 = __importDefault(require("./routes/workspaceRoutes"));
const moduleRoutes_1 = __importDefault(require("./routes/moduleRoutes"));
const transactionRoutes_1 = __importDefault(require("./routes/transactionRoutes"));
const exportRoutes_1 = __importDefault(require("./routes/exportRoutes"));
const config_1 = require("./config");
class ExpressApp {
    constructor(app = (0, express_1.default)()) {
        this.app = app;
        app.options("*", (0, cors_1.default)(config_1.corsOptions));
        app.use((0, cors_1.default)(config_1.corsOptions));
        app.use((0, cookie_parser_1.default)());
        app.use(body_parser_1.default.json());
        app.set("trust proxy", 1);
        app.use("/api/assistant", assistantRoutes_1.default);
        app.use("/api/documents", documentRoutes_1.default);
        app.use("/api/context", contextRoutes_1.default);
        app.use('/api/users', userRoutes_1.default);
        app.use('/api/workspaces', workspaceRoutes_1.default);
        app.use('/api/workspaces/modules', moduleRoutes_1.default);
        app.use('/api/transactions', transactionRoutes_1.default);
        app.use('/api/exports', exportRoutes_1.default);
        app.use((req, res, next) => {
            res.header("Access-Control-Allow-Origin", "https://lesson-lab-client.vercel.app");
            res.header("Access-Control-Allow-Credentials", "true");
            res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
            next();
        });
    }
}
exports.default = ExpressApp;
//# sourceMappingURL=expressApp.js.map