"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fileFilter = (req, file, callback) => {
    const allowedExtensions = ['.pdf'];
    const extension = path_1.default.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(extension)) {
        callback(null, true);
    }
    else {
        callback(new Error('Invalid file type. Only PDF files are allowed.'));
    }
};
const storage = multer_1.default.memoryStorage();
exports.upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 25 * 1024 * 1024 },
}).fields([
    { name: 'files', maxCount: 20 },
]);
//# sourceMappingURL=multer.js.map