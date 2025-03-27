"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promptCreation_1 = require("../utils/promptCreation");
class ContextController {
    /**
     * Constructs a new instance of DocumentsController.
     */
    constructor() {
        this.fetchContext = this.fetchContext.bind(this);
        this.fetchQuizContext = this.fetchQuizContext.bind(this);
    }
    /**
     * Generates the context for normal chats
     * @param req - The request object.
     * @param res - The response object.
     * @returns A promise that resolves to the added document.
     */
    async fetchContext(req, res) {
        try {
            const { namespaceId, specifications, messages, isLesson, items } = req.body;
            if (!namespaceId || !messages) {
                return res.status(400).send({ message: "Missing required fields" });
            }
            // if (isLesson === true) {
            //   const context = await createPrompt(messages, namespaceId, specifications);
            // } else {
            //   const context = await createQuizPrompt(items, namespaceId, specifications);
            // }
            const context = await (0, promptCreation_1.createPrompt)(messages, namespaceId, specifications);
            res.status(200).send({ query: messages[messages.length - 1], context });
        }
        catch (error) {
            console.error("Error fetching context:", error);
            res.status(500).send({ message: "Failed to fetch context" });
        }
    }
    /**
     * Fetches context for quiz.
     * @param req - The request object.
     * @param res - The response object.
     * @returns A promise that resolves to the added document.
     */
    async fetchQuizContext(req, res) {
        try {
            const { namespaceId, specifications, items } = req.body;
            console.log('------>', namespaceId);
            console.log('------>', specifications);
            console.log('------>', items);
            if (!namespaceId) {
                return res.status(400).send({ message: "Missing required fields" });
            }
            let context;
            try {
                context = await (0, promptCreation_1.createQuizPrompt)(items, namespaceId, specifications);
            }
            catch (error) {
                return res.status(500).send({ message: "Failed to connect to Pinecone API" });
            }
            console.log("Server: Context value:", context);
            res.status(200).send({ context: context });
        }
        catch (error) {
            console.error("Error fetching context:", error);
            res.status(500).send({ message: "Failed to fetch context" });
        }
    }
}
exports.default = new ContextController();
//# sourceMappingURL=contextController.js.map