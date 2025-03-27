"use strict";
// storage.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = void 0;
const serverStorage_1 = require("./serverStorage");
const spacesStorage_1 = require("./spacesStorage");
const useSpaces = process.env.DO_SPACES_ACCESS_KEY_ID &&
    process.env.DO_SPACES_SECRET_ACCESS_KEY;
exports.storageService = useSpaces
    ? new spacesStorage_1.SpacesStorage()
    : new serverStorage_1.ServerStorage();
//# sourceMappingURL=storage.js.map