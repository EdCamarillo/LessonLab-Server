"use strict";
//embeddings.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.embedChunks = void 0;
const openai_1 = __importDefault(require("openai"));
const config_1 = __importDefault(require("../config"));
/**
 * Embed a piece of text using an embedding model or service.
 * This is a placeholder and needs to be implemented based on your embedding solution.
 *
 * @param text The text to embed.
 * @returns The embedded representation of the text.
 */
async function embedChunks(chunks) {
    // You can use any embedding model or service here.
    // In this example, we use OpenAI's text-embedding-3-small model.
    const openai = new openai_1.default({
        apiKey: config_1.default.openAiApiKey,
        organization: config_1.default.openAiOrganizationId,
    });
    try {
        const response = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: chunks,
            encoding_format: "float",
            dimensions: 1536,
        });
        return response.data;
    }
    catch (error) {
        console.error("Error embedding text with OpenAI:", error);
        throw error;
    }
}
exports.embedChunks = embedChunks;
//# sourceMappingURL=embeddings.js.map