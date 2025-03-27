"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJwtToken = exports.checkPassword = exports.generateHash = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function generateHash(password) {
    return bcryptjs_1.default.hashSync(password, 10);
}
exports.generateHash = generateHash;
function checkPassword(hash, password) {
    return bcryptjs_1.default.compareSync(password, hash);
}
exports.checkPassword = checkPassword;
function createJwtToken(userId, username, userType, name, email, maxAge) {
    return jsonwebtoken_1.default.sign({ userId, username, userType, name, email }, process.env.JWT_SECRET_KEY, { expiresIn: maxAge });
}
exports.createJwtToken = createJwtToken;
//# sourceMappingURL=auth.js.map