"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.charge = exports.chargeUserByModuleId = exports.chargeUserByWorkspaceId = void 0;
const index_1 = __importDefault(require("../index"));
async function chargeUserByWorkspaceId(connection, content, workspaceId) {
    try {
        const [user] = await connection.execute(`SELECT UserID FROM Workspaces WHERE WorkspaceID = ?`, [workspaceId]);
        const userId = user[0].UserID;
        const [tokenRow] = await connection.execute(`SELECT Tokens FROM Users WHERE UserID = ?`, [userId]);
        const tokens = tokenRow[0].Tokens;
        const newToken = charge(content, tokens);
        await connection.execute(`UPDATE Users SET Tokens = ? WHERE UserID = ?`, [newToken, userId]);
        // Emit token update event
        index_1.default.getInstance().socketServer.io.to(workspaceId).emit('token-update', newToken);
        return newToken;
    }
    catch (error) {
        console.error(error);
    }
}
exports.chargeUserByWorkspaceId = chargeUserByWorkspaceId;
async function chargeUserByModuleId(connection, content, moduleId) {
    try {
        const [workspace] = await connection.execute(`SELECT WorkspaceID FROM module_Modules WHERE ModuleID = ?`, [moduleId]);
        const [user] = await connection.execute(`SELECT UserID FROM Workspaces WHERE WorkspaceID = ?`, [workspace[0].WorkspaceID]);
        const userId = user[0].UserID;
        const [tokenRow] = await connection.execute(`SELECT Tokens FROM Users WHERE UserID = ?`, [userId]);
        const tokens = tokenRow[0].Tokens;
        const newToken = charge(content, tokens);
        await connection.execute(`UPDATE Users SET Tokens = ? WHERE UserID = ?`, [newToken, userId]);
        // Emit token update event
        index_1.default.getInstance().socketServer.io.to(workspace[0].WorkspaceID).emit('token-update', newToken);
        return newToken;
    }
    catch (error) {
        console.error(error);
    }
}
exports.chargeUserByModuleId = chargeUserByModuleId;
function charge(content, tokens) {
    const tok = tokens - content.length;
    if (tok < 0)
        return 0;
    return tok;
}
exports.charge = charge;
//# sourceMappingURL=charge.js.map