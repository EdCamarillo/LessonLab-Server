"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDbConnection = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs")); // Import the fs module to read the CA certificate
const process = __importStar(require("node:process"));
dotenv_1.default.config();
async function getDbConnection() {
    try {
        const port = process.env.DBPORT ? parseInt(process.env.DBPORT, 10) : 3306;
        console.log('Connecting to MySQL...');
        // Read the CA certificate from the environment or a fixed path
        const ca = process.env.CA_CERT ? fs_1.default.readFileSync(process.env.CA_CERT) : undefined;
        let sslOptions = undefined;
        if (process.env.HOST !== 'localhost') {
            sslOptions = {
                rejectUnauthorized: true, // Ensure that the server certificate is verified
                ca: ca // Include the CA certificate
            };
        }
        return await promise_1.default.createConnection({
            host: process.env.HOST,
            port: port,
            user: process.env.DBUSER,
            password: process.env.PASSWORD,
            database: process.env.DATABASE,
            ssl: sslOptions,
        });
    }
    catch (error) {
        console.error('Error creating DB connection:', error);
        throw new Error('DB connection error');
    }
}
exports.getDbConnection = getDbConnection;
//# sourceMappingURL=database.js.map