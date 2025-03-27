"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const workspaceController_1 = __importDefault(require("../controllers/workspaceController"));
const router = (0, express_1.Router)();
router.post('/create', workspaceController_1.default.createWorkspace);
router.get('/:workspaceId', workspaceController_1.default.getWorkspace);
router.get('', workspaceController_1.default.getWorkspaces);
router.patch('/:workspaceId/:workspaceName', workspaceController_1.default.updateWorkspace);
router.delete('/:workspaceId', workspaceController_1.default.deleteWorkspace);
// TODO: Refactor this into new file
router.get('/specifications/:workspaceId', workspaceController_1.default.getSpecifications);
router.post('/specifications', workspaceController_1.default.insertSpecification);
router.delete('/specifications/:WorkspaceID/:SpecificationID', workspaceController_1.default.deleteSpecification);
router.patch('/specifications/update/name', workspaceController_1.default.updateSpecificationName);
router.patch('/specifications/update/topic', workspaceController_1.default.updateSpecificationTopic);
router.patch('/specifications/update/comprehensionlevel', workspaceController_1.default.updateSpecificationComprehensionLevel);
router.patch('/specifications/update/writinglevel', workspaceController_1.default.updateSpecificationWritingLevel);
router.get('/specifications/additionalspecifications/:SpecificationID', workspaceController_1.default.getAdditionalSpecifications);
router.post('/specifications/additionalspecifications', workspaceController_1.default.insertAdditionalSpecification);
router.patch('/specifications/additionalspecifications', workspaceController_1.default.updateAdditionalSpecification);
router.delete('/specifications/additionalspecifications/:AdditionalSpecID', workspaceController_1.default.removeAdditionalSpecification);
exports.default = router;
//# sourceMappingURL=workspaceRoutes.js.map