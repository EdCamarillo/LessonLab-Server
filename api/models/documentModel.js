"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentModel = void 0;
const pinecone_1 = require("@pinecone-database/pinecone");
const config_1 = __importDefault(require("../config"));
const pc = new pinecone_1.Pinecone({
    apiKey: config_1.default.pineconeApiKey,
});
const index = pc.index(config_1.default.pineconeIndexName);
/**
 * Represents a model for managing documents in a namespace.
 */
class DocumentModel {
    /**
     * Upserts a document into the specified Pinecone namespace.
     * @param document - The document to upsert.
     * @param namespaceId - The ID of the namespace.
     */
    async upsertDocument(document, namespaceId) {
        // Adjust to use namespaces if you're organizing data that way
        const namespace = index.namespace(namespaceId);
        const vectors = document.chunks.map((chunk) => ({
            id: chunk.id,
            values: chunk.values,
            metadata: {
                text: chunk.text,
                // referenceURL: document.documentUrl,
            },
        }));
        // Batch the upsert operation
        const batchSize = 200;
        for (let i = 0; i < vectors.length; i += batchSize) {
            const batch = vectors.slice(i, i + batchSize);
            await namespace.upsert(batch);
        }
    }
    /**
     * Lists the chunk IDs for a document in the specified namespace.
     * @param documentId - The ID of the document.
     * @param namespaceId - The ID of the namespace.
     * @param limit - The maximum number of chunk IDs to retrieve.
     * @param paginationToken - The pagination token for the next page (optional).
     * @returns A promise that resolves to the list of chunk IDs and pagination token.
     */
    async listDocumentChunks(documentId, namespaceId, limit, paginationToken) {
        try {
            const namespace = index.namespace(namespaceId);
            const listResult = await namespace.listPaginated({
                prefix: `${documentId}:`,
                limit: limit,
                paginationToken: paginationToken,
            });
            const chunks = listResult.vectors?.map((vector) => ({ id: vector.id || "" })) || [];
            return { chunks, paginationToken: listResult.pagination?.next };
        }
        catch (error) {
            console.error(`Failed to list document chunks for document ${documentId}: ${error}`);
            throw error;
        }
    }
    /**
     * Deletes the specified chunk IDs from the namespace.
     * @param chunkIds - The IDs of the chunks to delete.
     * @param namespaceId - The ID of the namespace.
     */
    async deleteDocumentChunks(chunkIds, namespaceId) {
        console.log("Deleting Document Chunks");
        const namespace = index.namespace(namespaceId);
        await namespace.deleteMany(chunkIds);
    }
    /**
     * Deletes a Pinecone namespace.
     *
     * @param namespaceId - The ID of the namespace to delete.
     * @returns A Promise that resolves when the namespace is deleted successfully.
     */
    async deletePineconeNamespace(namespaceId) {
        console.log("Deleting Workspace");
        const namespace = index.namespace(namespaceId);
        await namespace.deleteAll();
        console.log("Workspace deleted from Pinecone successfully");
    }
}
exports.DocumentModel = DocumentModel;
//# sourceMappingURL=documentModel.js.map