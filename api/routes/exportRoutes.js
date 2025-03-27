"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const exportController_1 = __importDefault(require("../controllers/exportController"));
const router = (0, express_1.Router)();
router.post('', exportController_1.default.createExport);
router.delete('', exportController_1.default.deleteExport);
exports.default = router;
//# sourceMappingURL=exportRoutes.js.map