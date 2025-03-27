"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const moduleController_1 = __importDefault(require("../controllers/moduleController"));
const router = (0, express_1.Router)();
router.post('/create', moduleController_1.default.createModule);
router.post('/insert', moduleController_1.default.insertChildToModuleNode);
router.patch('/update/module-name/:workspaceId/:moduleId/:name', moduleController_1.default.updateModuleName);
router.delete('/delete/:moduleId', moduleController_1.default.deleteModule);
router.get('/:moduleId', moduleController_1.default.getModules);
router.get('/root/:moduleId', moduleController_1.default.getModuleTree);
router.get('/subtree/:moduleId/:moduleNodeId', moduleController_1.default.getSubtree);
router.get('/recursive-subtree/:moduleId/:moduleNodeId', moduleController_1.default.getSubtreeRecursively);
router.patch('/update/node/content', moduleController_1.default.updateModuleNodeContent);
router.patch('/update/node/title', moduleController_1.default.updateModuleNodeTitle);
router.delete('/delete/node/:moduleNodeId', moduleController_1.default.deleteModuleNode);
exports.default = router;
//# sourceMappingURL=moduleRoutes.js.map