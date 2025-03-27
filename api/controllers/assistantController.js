"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../utils/storage/database");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const charge_1 = require("../../src/utils/charge");
class AssistantController {
    constructor() {
        this.getChatHistory = this.getChatHistory.bind(this);
        this.insertChatHistory = this.insertChatHistory.bind(this);
    }
    /**
     * Fetches the workspace's chat history with the assistant.
     *
     * @param req - The request object.
     * @param res - The response object.
     * @returns A promise that resolves to the added document.
     */
    async getChatHistory(req, res) {
        if (req.method !== 'GET') {
            return res.status(405).json({ message: 'Method Not Allowed' });
        }
        const token = req.cookies.authToken;
        if (!token) {
            return res.status(403).json({ message: 'No token provided' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET_KEY);
        if (!decoded) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        const { workspaceId } = req.params;
        if (!workspaceId) {
            return res.status(400).json({ message: 'Workspace ID is required' });
        }
        try {
            const connection = await (0, database_1.getDbConnection)();
            const [rows] = await connection.execute(`SELECT * FROM ChatHistory WHERE WorkspaceID = ? ORDER BY CreatedAt`, [workspaceId]);
            await connection.end();
            return res.status(200).json(rows);
        }
        catch (error) {
            console.error('Error fetching chat history:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }
    /**
     * Inserts a new message into the chat history. This function is for internal server use,
     * and not to be exposed to API route.
     *
     * @param message - The message object.
     * @param messageId - The message ID.
     * @param workspaceID - The workspace's ID to insert the chat history to.
     * @returns A promise that resolves to the operation's status or rejects with an error.
     */
    async insertChatHistory(message, messageId, messageType, workspaceID) {
        try {
            const connection = await (0, database_1.getDbConnection)();
            await connection.execute('INSERT INTO ChatHistory (`MessageID`, `Content`, `Role`, `Type`, `WorkspaceID`) VALUES (?, ?, ?, ?, ?)', [messageId, message.content, message.role, messageType, workspaceID]);
            await (0, charge_1.chargeUserByWorkspaceId)(connection, message.content?.toString() ?? '-----', workspaceID);
        }
        catch (error) {
            throw new Error('Failed to insert chat history: ' + error);
        }
    }
    /**
     * Updates a message's content in the chat history.
     *
     * @param req - The request object, expected to contain messageId and new content in the body.
     * @param res - The response object.
     */
    async updateChatMessage(req, res) {
        if (req.method !== 'PATCH') {
            return res.status(405).json({ message: 'Method Not Allowed' });
        }
        const token = req.cookies.authToken;
        if (!token) {
            return res.status(403).json({ message: 'No token provided' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET_KEY);
        if (!decoded) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        const { messageId, newContent } = req.body;
        if (!messageId || !newContent) {
            return res.status(400).json({ message: 'Message ID and new content are required' });
        }
        try {
            const connection = await (0, database_1.getDbConnection)();
            // Update the message content
            const [rows] = await connection.execute('UPDATE ChatHistory SET Content = ? WHERE MessageID = ?', [newContent, messageId]);
            await connection.end();
            if (!rows) {
                return res.status(404).json({ message: 'Message not found or no changes made' });
            }
            return res.status(200).json({ message: 'Message content updated successfully' });
        }
        catch (error) {
            console.error('Error updating chat message:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }
}
exports.default = new AssistantController();
//# sourceMappingURL=assistantController.js.map