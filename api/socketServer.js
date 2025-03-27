"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deserializeTuple = exports.serializeTuple = void 0;
const socket_io_1 = require("socket.io");
const config_1 = require("./config");
const ai_1 = __importDefault(require("./ai"));
const database_1 = require("./utils/storage/database");
const charge_1 = require("./utils/charge");
function serializeTuple(ids) {
    return `${ids[0]}|${ids[1]}`;
}
exports.serializeTuple = serializeTuple;
function deserializeTuple(serializedKey) {
    const parts = serializedKey.split('|');
    if (parts.length !== 2) {
        throw new Error('Invalid serialized tuple format');
    }
    return [parts[0], parts[1]];
}
exports.deserializeTuple = deserializeTuple;
class SocketServer {
    constructor(server) {
        this.server = server;
        /**
         * Socket server clients.
         */
        this.clients = new Map();
        /**
         * Buffer for storing messages in case user disconnects or connection errors happen.
         */
        this.workspaceMessagesBuffer = new Map();
        /**
         * Buffer for storing modules in case user disconnects or connection errors happen.
         */
        this.workspaceModulesBuffer = new Map();
        /**
         * Proxy handler for emitting SocketIO events (message buffer events).
         */
        this.socketEmitMessageBufferHandler = (io) => ({
            get(target, prop) {
                if (prop === 'emit') {
                    return async (serializedKey, event, ...args) => {
                        const [assistantMessageId, workspaceId] = deserializeTuple(serializedKey);
                        const connection = await (0, database_1.getDbConnection)();
                        (0, charge_1.chargeUserByWorkspaceId)(connection, '--------', workspaceId);
                        console.log('>>> message emit get');
                        await connection.end();
                        if (event === 'initialize-assistant-message') {
                            console.log("Emitting event: ", event, ...args);
                        }
                        else { // Hacky bandaid fix for weird callback behavior via proxy. Do not modify until socket.io is patched. 
                            const socket = io.in(workspaceId); // Get the socket room by workspaceId
                            if (socket) {
                                // console.log("Emitting event: ", event, ...args);
                                socket.emit(event, ...args); // Emit the event with all provided arguments
                            }
                            if (event === 'end') {
                                target.delete(workspaceId); // Delete the entry from the map on 'end' event
                            }
                        }
                    };
                }
                // Override default callback for `set`.
                const callback = Reflect.get(target, prop);
                if (prop === 'set' && typeof callback === 'function') {
                    return async (serializedKey, content) => {
                        const [assistantMessageId, workspaceId] = deserializeTuple(serializedKey);
                        const connection = await (0, database_1.getDbConnection)();
                        (0, charge_1.chargeUserByWorkspaceId)(connection, '-------', workspaceId);
                        console.log('>>> set get');
                        await connection.end();
                        const result = callback.call(target, serializedKey, content);
                        const socket = io.in(workspaceId);
                        if (socket) {
                            socket.emit('content', content[0], content[1], assistantMessageId, workspaceId);
                            // console.log(content)
                        }
                        return result;
                    };
                }
                // Handle other methods or properties
                return typeof callback === 'function' ? callback.bind(target) : callback;
            }
        });
        /**
         * Proxy handler for emitting SocketIO events (module buffer events).
         */
        this.socketEmitModuleBufferHandler = (io) => ({
            get(target, prop) {
                let contentCost = 0;
                if (prop === 'emit') {
                    return async (serializedKey, event, ...args) => {
                        const [moduleId, workspaceId] = deserializeTuple(serializedKey);
                        // console.log("Key values in buffer handler", moduleId, workspaceId)
                        const connection = await (0, database_1.getDbConnection)();
                        (0, charge_1.chargeUserByWorkspaceId)(connection, '-------', workspaceId);
                        console.log('>>> module emit');
                        await connection.end();
                        const socket = io.in(workspaceId); // Get the socket room by workspaceId
                        if (socket) {
                            socket.emit(event, ...args); // Emit the event with all provided arguments
                        }
                        if (event === 'update-module-node') {
                            const [moduleId, moduleNodeId, workspaceId, contentDelta, contentSnapshot] = args;
                            // console.log("Serialized key in update buffer callback", serializedKey);
                            // Retrieve the module using Reflect.get(target, 'get')
                            const getCallback = this.get(target, 'get');
                            const module = getCallback(serializedKey);
                            if (!module) {
                                console.log("Serialized key:", serializedKey);
                                console.error(`Module with id ${moduleId} not found in buffer.`);
                                return;
                            }
                            // console.log("Module node id inside callback:", moduleNodeId);
                            // console.log("Module get inside callback:", JSON.stringify(module, null, 2));
                            // Recursive function to find the node by id
                            const findNodeById = (nodes, nodeId) => {
                                for (const node of nodes) {
                                    if (node.id === nodeId) {
                                        return node;
                                    }
                                    if (node.children && node.children.length > 0) {
                                        const foundNode = findNodeById(node.children, nodeId);
                                        if (foundNode) {
                                            return foundNode;
                                        }
                                    }
                                }
                                return null;
                            };
                            // Find the node recursively
                            const moduleNode = findNodeById(module.nodes, moduleNodeId);
                            if (!moduleNode) {
                                console.error(`Module node with id ${moduleNodeId} not found in module ${moduleId}.`);
                                return;
                            }
                            // console.log("Module node inside callback:", moduleNode);
                            // Update the content of the found module node
                            moduleNode.content = contentSnapshot;
                        }
                        if (event === 'end') {
                            console.log("Deleting buffer item", serializedKey);
                            const deleteCallback = this.get(target, 'delete');
                            deleteCallback(serializedKey);
                            // target.delete(workspaceId); // Delete the entry from the map on 'end' event
                        }
                    };
                }
                // Default callbacks (get, set, etc.)
                const callback = Reflect.get(target, prop);
                return typeof callback === 'function' ? callback.bind(target) : callback;
            }
        });
        this.io = new socket_io_1.Server(server, {
            cors: config_1.corsOptions
        });
        this.workspaceMessagesBufferProxy = new Proxy(this.workspaceMessagesBuffer, this.socketEmitMessageBufferHandler(this.io));
        this.workspaceModulesBufferProxy = new Proxy(this.workspaceModulesBuffer, this.socketEmitModuleBufferHandler(this.io));
        this.io.of("/").adapter.on("create-room", (room) => {
            console.log(`room ${room} was created`);
        });
        this.io.of("/").adapter.on("join-room", (room, id) => {
            console.log(`client ${id} has joined room ${room}`);
        });
        this.io.of("/").adapter.on("leave-room", (room, id) => {
            console.log(`client ${id} has left room ${room}`);
        });
        this.io.of("/").adapter.on("delete-room", (room) => {
            console.log(`room ${room} was deleted`);
        });
        this.io.on('connection', (client) => {
            const { id } = client;
            const data = client.handshake.query['userId'];
            console.log("Query data:", data);
            this.logger(`Client connected: ${id}`);
            client.on('request-ack', (userId, callback) => {
                if (userId) {
                    console.log(`Acknowledging connection for user: ${userId}`);
                    callback('success'); // Acknowledge successful connection
                }
                else {
                    callback('error'); // Send an error acknowledgment
                }
            });
            // client.join(data as string);
            this.clients.set(id, client);
            client.on('join-room', (roomId) => client.join(roomId));
            client.on('leave-room', (roomId) => client.leave(roomId));
            client.on('leave-all-rooms', () => {
                client.rooms.forEach((room) => {
                    if (room !== client.id) {
                        console.log(`Leaving ${room}.`);
                        client.leave(room);
                    }
                });
            });
            client.on('send-data', (roomId) => { this.io.in(roomId).emit("message", roomId); });
            client.on('disconnecting', () => { });
            client.on('disconnect', () => {
                const { id } = client;
                this.clients.delete(id);
                console.log("Rooms disconnect:", client.rooms);
                client.rooms.forEach((room) => {
                    console.log(`Room ${room} is being deleted after user disconnect.`);
                    client.leave(room);
                });
                this.logger(`Client disconnected: ${id}`);
            });
            // Add handler for joining workspace room for token updates
            client.on('join-room', (workspaceId) => {
                client.join(workspaceId);
                console.log(`Client ${client.id} joined workspace room ${workspaceId}`);
            });
            // Add handler for leaving workspace room
            client.on('leave-room', (workspaceId) => {
                client.leave(workspaceId);
                console.log(`Client ${client.id} left workspace room ${workspaceId}`);
            });
            new ai_1.default(client, {
                verbose: false,
                chat: { model: 'gpt-4o-mini' },
                initMessages: [
                    { role: 'system', content: 'You are a helpful assistant.' },
                ],
            }, 
            // this.clients,
            this.workspaceMessagesBufferProxy, this.workspaceModulesBufferProxy);
        });
    }
    // onDisconnect(socket: Client): void {
    //   const { id } = socket;
    //   this.clients.delete(id);
    //   console.log("Rooms disconnect:", socket.rooms);
    //   socket.rooms.forEach((room) => {
    //     console.log(`Room ${room} is being deleted after user disconnect.`);
    //     socket.leave(room);
    //   });
    //   this.logger(`Client disconnected: ${id}`);
    // }
    // leaveAllRooms(socket: Client): void {
    //   socket.rooms.forEach((room) => {
    //     if (room !== socket.id) {
    //       console.log(`Leaving ${room}.`);
    //       socket.leave(room);
    //     }
    //   });
    // }
    /**
     *  Logs a message if the verbose option is set to true.
     * @param {string} message
     * @returns {void}
     */
    logger(message) {
        console.debug(`[Socket] ${message}`);
    }
}
exports.default = SocketServer;
//# sourceMappingURL=socketServer.js.map