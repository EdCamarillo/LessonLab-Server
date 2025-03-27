"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const transactionController_1 = __importDefault(require("../controllers/transactionController"));
const router = (0, express_1.Router)();
router.post('/purchase_tokens', transactionController_1.default.createTokenPurchaseCheckoutSession);
router.get('/checkout_status/:sessionId', transactionController_1.default.getTokenPurchaseCheckoutSessionStatus);
exports.default = router;
//# sourceMappingURL=transactionRoutes.js.map