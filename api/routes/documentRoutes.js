"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const documentController_1 = __importDefault(require("../controllers/documentController"));
const router = (0, express_1.Router)();
router.post("/add", (req, res) => {
    const { namespaceId } = req.query;
    if (typeof namespaceId === "string" && namespaceId.startsWith("default")) {
        return res.status(400).json({ error: "Invalid namespaceId, you cannot edit the demo workspace" });
    }
    console.log("Namespace ID outer: ", namespaceId);
    documentController_1.default.addDocuments(req, res);
});
router.delete("/workspace/:namespaceId", documentController_1.default.deleteWorkspace);
router.get("/files/:namespaceId", documentController_1.default.listFilesInNamespace);
router.get("/files/:namespaceId/:documentId/(*)", documentController_1.default.serveDocument);
router.delete("/files/delete/:namespaceId/:documentId", documentController_1.default.deleteDocument);
exports.default = router;
//# sourceMappingURL=documentRoutes.js.map