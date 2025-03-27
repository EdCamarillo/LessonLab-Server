"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const contextController_1 = __importDefault(require("../controllers/contextController"));
const router = (0, express_1.Router)();
router.post('/fetch', contextController_1.default.fetchContext);
router.post('/quiz', contextController_1.default.fetchQuizContext);
exports.default = router;
//# sourceMappingURL=contextRoutes.js.map