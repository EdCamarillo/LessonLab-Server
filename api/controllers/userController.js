"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const database_1 = require("../utils/storage/database");
const auth_1 = require("../utils/auth");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const cookies_1 = __importDefault(require("cookies"));
const TOKEN_MAX_AGE = 60 * 60 * 1000 * 24; // 24 hour (change as needed)
class UsersController {
    constructor() {
        this.register = this.register.bind(this);
        this.login = this.login.bind(this);
        this.getUser = this.getUser.bind(this);
        this.getUsers = this.getUsers.bind(this);
        this.updateUser = this.updateUser.bind(this);
        this.deleteUser = this.deleteUser.bind(this);
    }
    async register(req, res) {
        if (req.method !== 'POST') {
            return res.status(405).json({ message: 'Method Not Allowed' });
        }
        const { username, password, userType, name, email } = req.body;
        const userId = (0, uuid_1.v4)(); // Generate a UUID for the UserID
        try {
            const connection = await (0, database_1.getDbConnection)();
            const [rows] = await connection.execute("SELECT `UserID` FROM `Users` WHERE `Username`=? OR `Email`=?", [username, email]);
            if (rows.length > 0) {
                await connection.end();
                return res.status(400).json({ message: 'This email is already in use. Please use another one.' });
            }
            const hashedPassword = (0, auth_1.generateHash)(password);
            await connection.execute('INSERT INTO Users (UserID, UserType, Name, Username, Password, Email) VALUES (?, ?, ?, ?, ?, ?)', [userId, userType, name, username, hashedPassword, email]);
            const token = (0, auth_1.createJwtToken)(userId, username, userType, name, email, TOKEN_MAX_AGE);
            await connection.end();
            res.cookie('authToken', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                maxAge: TOKEN_MAX_AGE,
                domain: process.env.ORIGIN
            });
            res.cookie('autoLoginToken', true, {
                secure: true,
                sameSite: 'none',
                maxAge: TOKEN_MAX_AGE,
                domain: process.env.ORIGIN
            });
            return res.status(201).json({
                user: {
                    UserID: userId,
                    UserType: userType,
                    Name: name,
                    Tokens: 0
                }
            });
        }
        catch (error) {
            console.log(error);
            return res.status(500).json({ error: 'DB error ' + error });
        }
    }
    async login(req, res) {
        if (req.method !== 'POST') {
            return res.status(405).json({ message: 'Method Not Allowed' });
        }
        const { identifier, password } = req.body; // Accept either username or email as "identifier"
        const isEmail = /\S+@\S+\.\S+/.test(identifier); // Check if the identifier is an email
        try {
            const connection = await (0, database_1.getDbConnection)();
            const query = isEmail
                ? 'SELECT * FROM Users WHERE Email = ?'
                : 'SELECT * FROM Users WHERE Username = ?';
            const [rows] = await connection.execute(query, [identifier]);
            if (rows.length === 0) {
                await connection.end();
                return res.status(401).json({ message: 'User not found' });
            }
            const user = rows[0];
            const isPasswordValid = (0, auth_1.checkPassword)(user.Password, password);
            if (!isPasswordValid) {
                await connection.end();
                return res.status(401).json({ message: 'Incorrect password' });
            }
            const token = (0, auth_1.createJwtToken)(user.UserID, user.Username, user.UserType, user.Name, user.Email, TOKEN_MAX_AGE);
            await connection.end();
            // Return user data excluding sensitive information
            res.cookie('authToken', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                maxAge: TOKEN_MAX_AGE,
                domain: process.env.ORIGIN
            });
            res.cookie('autoLoginToken', true, {
                secure: true,
                sameSite: 'none',
                maxAge: TOKEN_MAX_AGE,
                domain: process.env.ORIGIN
            });
            // Return user data excluding sensitive information
            const { UserID, UserType, Name, Email, Tokens } = user;
            return res.status(200).json({
                user: {
                    UserID,
                    UserType,
                    Name,
                    Email,
                    Tokens
                }
            });
        }
        catch (error) {
            console.log(error);
            return res.status(500).json({ message: 'DB connection error' });
        }
    }
    async getUser(req, res) {
        if (req.method !== 'GET') {
            return res.status(405).json({ message: 'Method Not Allowed' });
        }
        const userId = req.params.userId;
        try {
            const connection = await (0, database_1.getDbConnection)();
            const [rows] = await connection.execute('SELECT * FROM Users WHERE UserID = ?', [userId]);
            if (rows.length === 0) {
                await connection.end();
                return res.status(404).json({ message: "User not found" });
            }
            const user = rows[0];
            await connection.end();
            return res.status(200).json(user);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ message: "DB connection error" });
        }
    }
    async getUsers(req, res) {
        if (req.method !== 'GET') {
            return res.status(405).json({ message: 'Method Not Allowed' });
        }
        try {
            const connection = await (0, database_1.getDbConnection)();
            const [rows] = await connection.execute('SELECT * FROM Users');
            await connection.end();
            if (rows.length === 0) {
                return res.status(204).send();
            }
            return res.status(200).json(rows);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ message: "DB error " + error });
        }
    }
    async updateUser(req, res) {
        if (req.method !== 'PUT') {
            return res.status(405).json({ message: 'Method Not Allowed' });
        }
        const userId = req.params.userId;
        const { userType } = req.body;
        try {
            const connection = await (0, database_1.getDbConnection)();
            const [resultHeader] = await connection.execute('UPDATE Users SET UserType = ? WHERE UserID = ?', [userType, userId]);
            const header = resultHeader[0];
            if (header.changedRows !== 1) {
                await connection.end();
                return res.status(404).json({ message: 'User not found' });
            }
            const [userResult] = await connection.execute('SELECT * FROM Users WHERE UserID = ?', [userId]);
            const rows = userResult[0];
            if (rows.length === 0) {
                await connection.end();
                return res.status(500).json({ message: 'DB internal error' });
            }
            const user = rows[0];
            await connection.end();
            return res.status(200).json(user);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'DB error ' + error });
        }
    }
    async deleteUser(req, res) {
        if (req.method !== 'DELETE') {
            return res.status(405).json({ message: 'Method Not Allowed' });
        }
        const userId = req.params.userId;
        try {
            const connection = await (0, database_1.getDbConnection)();
            const [result] = await connection.execute('DELETE FROM Users WHERE UserID = ?', [userId]);
            await connection.end();
            const header = result[0];
            if (header.affectedRows === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            return res.status(204).send();
        }
        catch (error) {
            console.log(error);
            return res.status(500).json({ error: 'DB error ' + error });
        }
    }
    async authenticateAutoLogin(req, res, next) {
        const token = req.cookies.authToken;
        if (!token) {
            return res.status(403).json({ message: 'No token provided' });
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET_KEY);
            req.body.user = decoded; // Attach user information to the request object
            next();
        }
        catch (error) {
            return res.status(401).json({ message: 'Unauthorized: ' + error });
        }
    }
    async logout(req, res) {
        const cookies = new cookies_1.default(req, res);
        cookies.set('authToken', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'none', expires: new Date(0) });
        res.status(200).json({ message: 'Logged out successfully' });
    }
    async authenticateLogout(req, res, next) {
        const token = req.cookies.authToken;
        if (!token) {
            return res.status(403).json({ message: 'No token provided' });
        }
        try {
            jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET_KEY);
            next();
        }
        catch (error) {
            return res.status(401).json({ message: 'Unauthorized or token expired' });
        }
    }
}
exports.default = new UsersController();
//# sourceMappingURL=userController.js.map