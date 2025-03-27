"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = __importDefault(require("../controllers/userController"));
const multer_1 = __importDefault(require("multer"));
const database_1 = require("../utils/storage/database");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)(); // accepts form-data instead of raw json payloads
router.get('/tokens', async (req, res) => {
    try {
        const connection = await (0, database_1.getDbConnection)();
        const [rows] = await connection.execute('SELECT Tokens FROM Users WHERE UserID = ?', [req.query.userId]);
        await connection.end();
        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ tokens: rows[0].Tokens });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'DB connection error' });
    }
});
router.post('/login', upload.none(), userController_1.default.login);
router.post('/auto-login', userController_1.default.authenticateAutoLogin, async (req, res) => {
    // const user = req.body.user;
    // console.log('>>> LOG: user: ', user)
    // const connection = await getDbConnection();
    // const [rows]: any = await connection.execute(`SELECT Tokens FROM Users WHERE UserID=?`, [user.userId])
    // await connection.end();
    // const tokens = rows[0].Tokens;
    // console.log('>>> LOG: tokens: ', tokens)
    // const returnUser = { ...user, tokens }
    // console.log('>>> LOG: returnUser: ', returnUser)
    const user = req.body.user;
    res.status(200).json({ user });
});
router.post('/logout', userController_1.default.authenticateLogout, userController_1.default.logout);
router.post('/register', upload.none(), userController_1.default.register);
router.get('/:userId', userController_1.default.getUser);
router.get('', userController_1.default.getUsers);
router.patch('/:userId', upload.none(), userController_1.default.updateUser);
router.delete('/:userId', userController_1.default.deleteUser);
exports.default = router;
//# sourceMappingURL=userRoutes.js.map