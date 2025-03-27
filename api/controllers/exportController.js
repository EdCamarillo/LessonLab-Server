"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
class ExportController {
    constructor() {
        this.createExport = this.createExport.bind(this);
        this.deleteExport = this.deleteExport.bind(this);
    }
    /**
     * Creates an export file in the filesystem
     * @param req The request body
     * @param res The response body
     * @returns The response data
     */
    async createExport(req, res) {
        const { data, filename } = req.body;
        try {
            fs_1.default.writeFile(__dirname + `/../../exports/` + `${filename}.gift`, data, () => { });
            return res.status(201).json({ fileName: `${filename}.gift`, data });
        }
        catch (error) {
            console.log(error);
            return res.status(500).json({ message: 'Write file error ' + error });
        }
    }
    /**
     * Deletes an export file in the filesystem
     * @param req The request body
     * @param res The response body
     * @returns The response data
     */
    async deleteExport(req, res) {
        const { filename } = req.body;
        try {
            fs_1.default.unlink(__dirname + `/../../exports/` + `${filename}.gift`, (error) => {
                if (error) {
                    return res.status(500).json({ message: 'Delete file error ' + error });
                }
            });
            console.log('LOG: File deleted');
            return res.status(204);
        }
        catch (error) {
            console.log(error);
            return res.status(500).json({ message: 'Delete file error ' + error });
        }
    }
}
exports.default = new ExportController();
//# sourceMappingURL=exportController.js.map