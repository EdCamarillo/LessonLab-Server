"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzePdfLayout = void 0;
const stream_1 = require("stream");
const dotenv_1 = __importDefault(require("dotenv"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const form_data_1 = __importDefault(require("form-data"));
dotenv_1.default.config();
function bufferToStream(buffer) {
    const readable = new stream_1.Readable();
    readable.push(buffer);
    readable.push(null); // End the stream
    return readable;
}
async function analyzePdfLayout(pdfData, pdfName) {
    try {
        const formData = new form_data_1.default();
        formData.append('file', bufferToStream(pdfData), { filename: pdfName, contentType: 'application/pdf' });
        formData.append('fast', 'true');
        const response = await (0, node_fetch_1.default)(`${process.env.DOCUMENT_ANALYSIS_SERVER_URL}`, {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders()
        });
        if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
        }
        // Parse and return the JSON response
        const jsonResponse = await response.json();
        return jsonResponse;
    }
    catch (error) {
        console.error('Error analyzing PDF layout:', error);
        throw error; // You can customize how you handle the error (e.g., return a custom error message)
    }
}
exports.analyzePdfLayout = analyzePdfLayout;
//# sourceMappingURL=document-analysis.js.map