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
exports.corsOptions = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const process = __importStar(require("node:process"));
dotenv_1.default.config();
const config = {
    pineconeApiKey: process.env.PINECONE_API_KEY || "",
    pineconeIndexName: process.env.PINECONE_INDEX_NAME || "namespace-notes",
    openAiApiKey: process.env.OPENAI_API_KEY || "",
    openAiOrganizationId: process.env.OPENAI_ORGANIZATION_ID || ""
};
exports.default = config;
exports.corsOptions = {
    origin: process.env.NODE_ENV === "production" // Set deployment env var to production
        ? "https://lesson-lab-client.vercel.app"
        : "http://localhost:4000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};
console.log("LOADED NODE_ENV: ", process.env.NODE_ENV);
//# sourceMappingURL=config.js.map