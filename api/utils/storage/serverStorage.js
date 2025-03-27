"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerStorage = void 0;
// serverStorage.ts
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./database");
class ServerStorage {
    constructor() {
        this.uploadDir = "uploads";
    }
    async saveFile(file, fileKey) {
        const [namespaceId, documentId, ...rest] = fileKey.split("/");
        const fileName = rest.join("/");
        // const documentDirectory = path.join(
        //   this.uploadDir,
        //   namespaceId,
        //   documentId
        // );
        // if (!fs.existsSync(documentDirectory)) {
        //   fs.mkdirSync(documentDirectory, { recursive: true });
        // }
        // const destinationPath = path.join(documentDirectory, fileName);
        // await fs.promises.rename(file.path, destinationPath);
        console.log("Save file SQL params: ", [file.buffer, file.mimetype, fileName, documentId, namespaceId]);
        const connection = await (0, database_1.getDbConnection)();
        await connection.execute("INSERT INTO `Documents` (`DocumentData`, `DocumentType`, `DocumentName`, `DocumentID`, `WorkspaceID`) VALUES (?, ?, ?, ?, ?)", [file.buffer, file.mimetype, fileName, documentId, namespaceId]);
        await connection.end();
    }
    constructFileUrl(fileKey) {
        const domain = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 4001}`;
        return `${domain}/api/documents/files/${fileKey}`;
    }
    async getFilePath(fileKey) {
        const filePath = path_1.default.join(this.uploadDir, fileKey);
        const files = await fs_1.default.promises.readdir(filePath);
        const firstFile = files[0];
        return path_1.default.join(filePath, firstFile);
    }
    async deleteWorkspaceFiles(namespaceId) {
        const namespaceDirectory = path_1.default.join(this.uploadDir, namespaceId);
        if (fs_1.default.existsSync(namespaceDirectory)) {
            fs_1.default.rmdirSync(namespaceDirectory, { recursive: true });
        }
    }
    async deleteFileFromWorkspace(namespaceId, documentId) {
        try {
            const connection = await (0, database_1.getDbConnection)();
            // Delete the document from the database
            await connection.execute("DELETE FROM `Documents` WHERE `WorkspaceID` = ? AND `DocumentID` = ?", [namespaceId, documentId]);
            // Delete the file from the storage (if you still want to handle local deletion)
            const documentDirectory = path_1.default.join(this.uploadDir, namespaceId, documentId);
            if (fs_1.default.existsSync(documentDirectory)) {
                fs_1.default.rmdirSync(documentDirectory, { recursive: true });
            }
            await connection.end();
        }
        catch (error) {
            console.error("Failed to delete file from server storage:", error);
            throw error;
        }
    }
    async listFilesInNamespace(namespaceId) {
        const connection = await (0, database_1.getDbConnection)();
        try {
            const [rows] = await connection.execute("SELECT `DocumentID`, `DocumentName` FROM `Documents` WHERE `WorkspaceID` = ?", [namespaceId]);
            await connection.end();
            if (rows.length === 0) {
                return []; // Return an empty array if no files are found
            }
            const allFiles = rows.map((row) => ({
                documentId: row.DocumentID,
                name: row.DocumentName,
                url: this.constructFileUrl(`${namespaceId}/${row.DocumentID}/${row.DocumentName}`),
            }));
            return allFiles;
        }
        catch (error) {
            console.error("Failed to list files in namespace from server storage:", error);
            await connection.end();
            throw error;
        }
    }
}
exports.ServerStorage = ServerStorage;
//# sourceMappingURL=serverStorage.js.map