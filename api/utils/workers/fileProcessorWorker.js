"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("worker_threads");
const documentProcessor_1 = require("../documentProcessor");
// import { analyzePdfLayout } from "../ai/document-analysis";
// import { processFlatJson, saveDebugJson } from "../rag/pdfSectionHierarchy";
// import { SectionNode } from "../../../src/models/documentModel";
async function processFileWorker() {
    const { documentData, documentType, documentName, documentId, documentUrl, materialId } = worker_threads_1.workerData;
    try {
        console.log("Document data:", [documentData, documentType, documentName, documentId, documentUrl, materialId]);
        // const response: SectionNode[] = await analyzePdfLayout(documentData, documentName);
        // console.log("PDF Layout Analyze result:", response);
        // const hierarchy = processFlatJson(response);
        // // console.log("Hierarchy", JSON.stringify(hierarchy, null, 2));
        // saveDebugJson(hierarchy, "../../../uploads/debug.json");
        const { confirmation, documentContent } = await (0, documentProcessor_1.processFile)(documentName, documentType, documentData, documentId, materialId);
        if (confirmation === "Success") {
            const { document } = await (0, documentProcessor_1.chunkAndEmbedFile)(documentId, documentContent, documentUrl);
            worker_threads_1.parentPort?.postMessage({ document, documentData });
        }
        else {
            throw new Error('Failed to process file!');
        }
        // parentPort?.postMessage({ error: "Debug mode"});
    }
    catch (error) {
        worker_threads_1.parentPort?.postMessage({ error: error.message });
    }
}
processFileWorker();
//# sourceMappingURL=fileProcessorWorker.js.map