"use strict";
// pinecone.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMatchesFromEmbeddings = void 0;
const pinecone_1 = require("@pinecone-database/pinecone");
// Used to retrieve matches for the given embeddings
const getMatchesFromEmbeddings = async (embeddings, topK, namespace) => {
    // Obtain a client for Pinecone
    const pinecone = new pinecone_1.Pinecone();
    let indexName = process.env.PINECONE_INDEX_NAME || "";
    if (indexName === "") {
        indexName = "lessonlab";
        console.warn("PINECONE_INDEX_NAME environment variable not set");
    }
    // Retrieve list of indexes to check if expected index exists
    const indexes = (await pinecone.listIndexes())?.indexes;
    if (!indexes || indexes.filter((i) => i.name === indexName).length !== 1) {
        throw new Error(`Index ${indexName} does not exist. 
    Create an index called "${indexName}" in your project.`);
    }
    // Get the Pinecone index and namespace
    const pineconeNamespace = pinecone.Index(indexName).namespace(namespace ?? "");
    try {
        // Query the index with the defined request
        const queryResult = await pineconeNamespace.query({
            vector: embeddings,
            topK,
            includeMetadata: true,
        });
        return queryResult.matches || [];
    }
    catch (e) {
        // Log the error and throw it
        console.log("Error querying embeddings: ", e);
        throw new Error(`Error querying embeddings: ${e}`);
    }
};
exports.getMatchesFromEmbeddings = getMatchesFromEmbeddings;
//# sourceMappingURL=pinecone.js.map