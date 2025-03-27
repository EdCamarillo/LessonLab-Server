"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const openai_1 = __importDefault(require("openai"));
const uuidv4_1 = require("uuidv4");
const assistantController_1 = __importDefault(require("../src/controllers/assistantController"));
const ai_utils_1 = require("./utils/ai/ai-utils");
const socketServer_1 = require("./socketServer");
const moduleController_1 = __importDefault(require("./controllers/moduleController"));
const context_1 = require("./utils/context");
var MessageType;
(function (MessageType) {
    MessageType["Standard"] = "standard";
    MessageType["Action"] = "action";
})(MessageType || (MessageType = {}));
class AISocketHandler {
    constructor(client, options = {
        verbose: false,
        chat: { model: 'gpt-4o-mini' },
        initMessages: [
            { role: 'system', content: 'You are a helpful assistant.' },
        ],
    }, 
    // public clients: Map<string, Client>,
    workspaceMessagesBufferProxy, workspaceModulesBufferProxy) {
        this.client = client;
        this.options = options;
        this.workspaceMessagesBufferProxy = workspaceMessagesBufferProxy;
        this.workspaceModulesBufferProxy = workspaceModulesBufferProxy;
        this.openai = new openai_1.default(this.options.client);
        // Standard user-assistant message events handling
        client.on('new-message', async (message, userId, workspaceId, chatHistory) => {
            try {
                await this.onNewMessage(client, message, workspaceId, userId, chatHistory);
            }
            catch (error) {
                console.log("Error processing message to assistant: ", error);
            }
        });
        // TODO: Modify this so that all AI assistant operations over a workspace ID is terminated
        client.on('abort', () => {
            if (client.data.currentChatStream) {
                client.data.currentChatStream.controller.abort();
                client.data.currentChatStream = undefined;
            }
        });
        client.on('module-outline-generation', async (confirmation, workspaceId, subject, context_instructions) => {
            if (confirmation) {
                try {
                    const userMessageId = (0, uuidv4_1.uuid)();
                    const actionNotificationDirective = `::action_notification{actionMessage="Module Outline Creation Confirmed"}`;
                    client.emit('initialize-user-message', userMessageId, actionNotificationDirective, MessageType.Action, workspaceId, async ({ ack }) => {
                        if (ack === 'success') {
                            await assistantController_1.default.insertChatHistory({
                                role: 'user',
                                content: actionNotificationDirective,
                            }, userMessageId, MessageType.Action, workspaceId);
                            const assistantMessageId = (0, uuidv4_1.uuid)();
                            client.emit('initialize-assistant-message', assistantMessageId, MessageType.Action, workspaceId, async ({ ack }) => {
                                if (ack === 'success') {
                                    const moduleId = (0, uuidv4_1.uuid)();
                                    const moduleDirective = `:::module_outline{moduleId="${moduleId}" subject="${subject}" context_instructions="${context_instructions}"}\n:::`;
                                    client.emit('content', moduleDirective, moduleDirective, assistantMessageId, workspaceId);
                                    await assistantController_1.default.insertChatHistory({
                                        role: 'assistant',
                                        content: moduleDirective,
                                    }, assistantMessageId, MessageType.Action, workspaceId);
                                    client.emit('end', workspaceId);
                                }
                            });
                        }
                    });
                }
                catch (error) {
                    console.error("Error generating module outline: ", error);
                }
            }
            else {
                try {
                    const userMessageId = (0, uuidv4_1.uuid)();
                    const actionNotificationDirective = `::action_notification{actionMessage="Module Creation Confirmed"}`;
                    client.emit('initialize-user-message', userMessageId, actionNotificationDirective, MessageType.Action, workspaceId, async ({ ack }) => {
                        if (ack === 'success') {
                            client.emit('end', workspaceId);
                            await assistantController_1.default.insertChatHistory({
                                role: 'user',
                                content: actionNotificationDirective,
                            }, userMessageId, MessageType.Action, workspaceId);
                            // Handle direct module outline generation without user confirmation
                            let moduleOutlineData = await (0, ai_utils_1.generateModuleOutlineResponse)(this.openai, subject, context_instructions);
                            const result = await moduleController_1.default.createModuleCallback(moduleOutlineData.name, moduleOutlineData.description, workspaceId);
                            const rootNode = result.moduleId;
                            await Promise.all(moduleOutlineData.moduleNodes.map(async (node, index) => {
                                await (0, ai_utils_1.insertModuleNode)(rootNode, node, rootNode, index, 1);
                            }));
                            console.log("Module nodes of prev:", JSON.stringify(moduleOutlineData.moduleNodes, null, 2));
                            await (0, ai_utils_1.createModuleFromOutline)(client, moduleOutlineData, result, workspaceId, rootNode, subject, context_instructions, workspaceModulesBufferProxy, this.openai);
                        }
                    });
                }
                catch (error) {
                    console.error("Error generating module: ", error);
                }
            }
        });
        client.on('module-outline-inject-content', async (workspaceId, assistantMessageId, moduleId, subject, context_instructions) => {
            console.log('User requested to generate module outline');
            client.removeAllListeners('directive-ready');
            // Function to handle the directive-ready event
            const handleDirectiveReady = async (receivedAssistantMessageId, receivedWorkspaceId) => {
                if (receivedAssistantMessageId === assistantMessageId && receivedWorkspaceId === workspaceId) {
                    // clearTimeout(timeoutId); // Clear the timeout since the correct event was received
                    let moduleOutlineData = await (0, ai_utils_1.generateModuleOutlineResponse)(this.openai, subject, context_instructions);
                    client.emit('module-outline-data', assistantMessageId, workspaceId, moduleId, JSON.stringify(moduleOutlineData));
                    client.removeAllListeners('directive-ready');
                    client.emit('end', workspaceId);
                    // attachConfirmModuleReponseListener(receivedAssistantMessageId, receivedWorkspaceId, handleDirectiveReady);
                }
                else {
                    console.warn('Received directive-ready event with mismatched assistantMessageId or workspaceId');
                    // client.once('directive-ready', handleDirectiveReady);
                }
            };
            client.once('directive-ready', handleDirectiveReady);
        });
        client.on('confirm-module-outline-response', async (action, workspaceId, moduleId, module, subject, context_instructions) => {
            if (action === 'submit') {
                try {
                    console.log('User accepted the module outline');
                    const userMessageId = (0, uuidv4_1.uuid)();
                    const actionNotificationDirective = `::action_notification{actionMessage="Module Outline Accepted by User"}`;
                    client.emit('initialize-user-message', userMessageId, actionNotificationDirective, MessageType.Action, workspaceId, async ({ ack }) => {
                        if (ack === 'success') {
                            await assistantController_1.default.insertChatHistory({
                                role: 'user',
                                content: actionNotificationDirective,
                            }, userMessageId, MessageType.Action, workspaceId);
                            const result = await moduleController_1.default.createModuleCallback(module.name, module.description, workspaceId, moduleId);
                            const rootNode = result.moduleId;
                            await Promise.all(module.nodes.map(async (node, index) => {
                                await (0, ai_utils_1.insertModuleNode)(rootNode, node, rootNode, index, 1);
                            }));
                            // Generate the Module
                            await (0, ai_utils_1.createModule)(client, moduleId, workspaceId, module, subject, context_instructions, workspaceModulesBufferProxy, this.openai);
                        }
                    });
                }
                catch (error) {
                    console.error("Error generating module: ", error);
                }
            }
            else if (action === 'cancel') {
                try {
                    console.log('User canceled the module outline generation');
                    const userMessageId = (0, uuidv4_1.uuid)();
                    const actionNotificationDirective = `::action_notification{actionMessage="Module Outline Rejected by User"}`;
                    client.emit('initialize-user-message', userMessageId, actionNotificationDirective, MessageType.Action, workspaceId, async ({ ack }) => {
                        if (ack == 'success') {
                            await assistantController_1.default.insertChatHistory({
                                role: 'user',
                                content: actionNotificationDirective,
                            }, userMessageId, MessageType.Action, workspaceId);
                            // End assistant message sequence
                            client.emit('end', workspaceId);
                        }
                    });
                }
                catch (error) {
                    console.error("Unexpected error in cancelling module outline generation: ", error);
                }
            }
        });
    }
    async onNewMessage(client, message, workspaceId, userId, chatHistory) {
        if (typeof message === 'object') {
            chatHistory.push(message);
        }
        else {
            const userTokens = await (0, ai_utils_1.calculateTokens4o_mini)(message);
            const userMessageId = (0, uuidv4_1.uuid)();
            client.emit('initialize-user-message', userMessageId, message, MessageType.Standard, workspaceId, async ({ ack }) => {
                console.log("Ack user message: ", ack);
                if (ack === 'success') {
                    try {
                        chatHistory.push({
                            role: 'user',
                            content: message,
                        });
                        await assistantController_1.default.insertChatHistory({
                            role: 'user',
                            content: message,
                        }, userMessageId, MessageType.Standard, workspaceId);
                        await this.processMessagePipeline(client, message, workspaceId, userTokens, chatHistory);
                    }
                    catch (error) {
                        console.error("Error processing pipeline: ", error);
                        throw error;
                    }
                }
            });
        }
    }
    async processMessagePipeline(client, message, workspaceId, userTokens, chatHistory) {
        const intentDecompositionCompletion = await (0, ai_utils_1.intentDecomposition)(this.openai, message);
        switch (intentDecompositionCompletion.parsed?.intent_type) {
            case ai_utils_1.IntentTypeEnum.Values.query:
                console.log("query pipeline");
                let context;
                try {
                    context = await (0, context_1.getContext)(intentDecompositionCompletion.parsed.subject, workspaceId);
                    if (context?.length === 0) {
                        const assistantMessageId = (0, uuidv4_1.uuid)();
                        client.emit('initialize-assistant-message', assistantMessageId, MessageType.Action, workspaceId, async ({ ack }) => {
                            if (ack === 'success') {
                                const notificationDirective = `::rag_empty_context_notification{notificationMessage="No relevant information found about topic within the workspace. Assistant response information may be inaccurate. Try adding files to the workspace that contains relevant information."}`;
                                client.emit('content', notificationDirective, notificationDirective, assistantMessageId, workspaceId);
                                client.emit('end', workspaceId);
                                assistantController_1.default.insertChatHistory({
                                    role: 'assistant',
                                    content: notificationDirective,
                                }, assistantMessageId, MessageType.Action, workspaceId);
                            }
                        });
                    }
                    else {
                        console.log(context);
                        const systemPrompt = `You are an AI agent that's answers the user's query. You will be given relevant context information from a RAG pipeline in regards to the query. If no context information is supplied , ust answer normally based on your available knowledge. Otherwise, base your response on the information within the context block.

              subject: ${intentDecompositionCompletion.parsed.subject}
              context_instructions: ${intentDecompositionCompletion.parsed.context_instructions}
      
              CONTEXT INFORMATION BLOCK:
              ---
              ${context}
              ---
              `;
                        const systemPromptParam = [{ role: 'system', content: systemPrompt }];
                        try {
                            await this.processNewMessage(client, systemPromptParam, workspaceId, chatHistory, userTokens);
                        }
                        catch (error) {
                            console.error("Error generating query response:", error);
                            throw error;
                        }
                    }
                }
                catch (error) {
                    console.error("Error getting context:", error);
                    throw error;
                }
                break;
            case ai_utils_1.IntentTypeEnum.Values.command:
                console.log("command pipeline");
                const commandTypeCompletion = await (0, ai_utils_1.commandDecomposition)(this.openai, intentDecompositionCompletion.parsed?.context_instructions);
                console.log("Command type:", commandTypeCompletion.parsed?.command_type);
                try {
                    await this.commandPipelineProcessing(client, commandTypeCompletion.parsed?.command_type, intentDecompositionCompletion.parsed.subject, intentDecompositionCompletion.parsed.context_instructions, workspaceId, chatHistory, userTokens);
                }
                catch (error) {
                    console.error("Error generating query response:", error);
                    throw error;
                }
                break;
            case ai_utils_1.IntentTypeEnum.Values.informative:
                console.log("informative pipeline");
                // this.processNewMessage(client, workspaceId, chatHistory, userTokens);
                break;
            case ai_utils_1.IntentTypeEnum.Values.conversational:
                console.log("conversational pipeline");
                const conversationalSystemPrompt = [{ role: 'system', content: "The user has given a simple greeting/started a conversation. Give a polite response." }];
                try {
                    await this.processNewMessage(client, conversationalSystemPrompt, workspaceId, chatHistory, userTokens);
                }
                catch (error) {
                    console.error("Error generating query response:", error);
                    throw error;
                }
                break;
            default:
                console.log("misc pipeline");
                const miscSystemPrompt = [{ role: 'system', content: "The user has given a nonsensical/incoherent/out-of-context query as input. Please kindly ask what their intention was politely, or guide them." }];
                try {
                    await this.processNewMessage(client, miscSystemPrompt, workspaceId, chatHistory, userTokens);
                }
                catch (error) {
                    console.error("Error generating query response:", error);
                    throw error;
                }
                break;
        }
    }
    async processNewMessage(client, systemPromptParam, workspaceId, chatHistory, userTokens) {
        console.log("Processing new message for: ", workspaceId);
        console.log("System prompt: \n", systemPromptParam[0].content);
        const assistantMessageId = (0, uuidv4_1.uuid)();
        const tupleKey = [assistantMessageId, workspaceId];
        const serializedKey = (0, socketServer_1.serializeTuple)(tupleKey);
        // Hacky bandaid fix for weird callback behavior via proxy. Do not modify until socket.io is patched. 
        this.workspaceMessagesBufferProxy.emit(serializedKey, 'initialize-assistant-message', assistantMessageId, MessageType.Standard, workspaceId, async ({ ack }) => { });
        client.emit('initialize-assistant-message', assistantMessageId, MessageType.Standard, workspaceId, async ({ ack }) => {
            console.log("Ack assistant message: ", ack);
            if (ack === 'success') {
                const stream = this.openai.beta.chat.completions.stream({
                    model: "gpt-4o-mini",
                    messages: [...systemPromptParam, ...chatHistory],
                });
                const streamHandlers = {
                    content: (contentDelta, contentSnapshot) => {
                        this.workspaceMessagesBufferProxy.set(serializedKey, [contentDelta, JSON.stringify(contentSnapshot)]);
                    },
                    finalContent: (contentSnapshot) => this.workspaceMessagesBufferProxy.emit(serializedKey, 'finalContent', contentSnapshot, workspaceId),
                    chunk: (chunk, snapshot) => this.workspaceMessagesBufferProxy.emit(serializedKey, 'chunk', chunk, snapshot, workspaceId),
                    chatCompletion: async (completion) => {
                        const assistantTokens = await (0, ai_utils_1.calculateTokens4o_mini)(completion.choices[0].message.content);
                        const usage = {
                            prompt_tokens: userTokens,
                            completion_tokens: assistantTokens,
                            total_tokens: userTokens + assistantTokens,
                        };
                        const completionWithUsage = {
                            ...completion,
                            usage: usage
                        };
                        this.workspaceMessagesBufferProxy.emit(serializedKey, 'chatCompletion', completionWithUsage, workspaceId);
                    },
                    finalChatCompletion: async (completion) => {
                        const assistantTokens = await (0, ai_utils_1.calculateTokens4o_mini)(completion.choices[0].message.content);
                        const usage = {
                            prompt_tokens: userTokens,
                            completion_tokens: assistantTokens,
                            total_tokens: userTokens + assistantTokens,
                        };
                        const completionWithUsage = {
                            ...completion,
                            usage: usage
                        };
                        this.workspaceMessagesBufferProxy.emit(serializedKey, 'finalChatCompletion', completionWithUsage, workspaceId);
                    },
                    message: (message) => this.workspaceMessagesBufferProxy.emit(serializedKey, 'message', message, workspaceId),
                    finalMessage: async (message) => {
                        this.workspaceMessagesBufferProxy.emit(serializedKey, 'finalMessage', message, workspaceId);
                        try {
                            await assistantController_1.default.insertChatHistory(message, assistantMessageId, MessageType.Standard, workspaceId);
                        }
                        catch (error) {
                            throw error;
                        }
                    },
                    functionCall: (functionCall) => this.workspaceMessagesBufferProxy.emit(serializedKey, 'functionCall', functionCall, workspaceId),
                    finalFunctionCall: (finalFunctionCall) => this.workspaceMessagesBufferProxy.emit(serializedKey, 'finalFunctionCall', finalFunctionCall, workspaceId),
                    functionCallResult: (finalFunctionCallResult) => this.workspaceMessagesBufferProxy.emit(serializedKey, 'finalFunctionCallResult', finalFunctionCallResult, workspaceId),
                    finalFunctionCallResult: (finalFunctionCallResult, workspaceId) => this.workspaceMessagesBufferProxy.emit(serializedKey, 'finalFunctionCallResult', finalFunctionCallResult, workspaceId),
                    error: (error) => {
                        this.workspaceMessagesBufferProxy.emit(serializedKey, 'error', error, workspaceId);
                    },
                    end: () => {
                        this.workspaceMessagesBufferProxy.emit(serializedKey, 'end', workspaceId);
                        this.workspaceMessagesBufferProxy.emit(serializedKey, 'debug-log', JSON.stringify({ debug: "Intermediate response ended." }));
                    },
                };
                Object.entries(streamHandlers).forEach(([event, handler]) => {
                    stream.on(event, async (...args) => {
                        await handler(...args);
                    });
                });
            }
        });
    }
    async intermediateResponse(client, subject, context_instructions, piplineStatus, workspaceId, chatHistory, userTokens) {
        console.log("Generating intermediate response...");
        const assistantMessageId = (0, uuidv4_1.uuid)();
        const tupleKey = [assistantMessageId, workspaceId];
        const serializedKey = (0, socketServer_1.serializeTuple)(tupleKey);
        let finalIntermediateResponse = '';
        return new Promise((resolve, reject) => {
            // Hacky bandaid fix for weird callback behavior via proxy. Do not modify until socket.io is patched. 
            this.workspaceMessagesBufferProxy.emit(serializedKey, 'initialize-assistant-message', assistantMessageId, MessageType.Standard, workspaceId, async ({ ack }) => { });
            client.emit('initialize-assistant-message', assistantMessageId, MessageType.Standard, workspaceId, async ({ ack }) => {
                console.log("Ack intermediate response: ", ack);
                if (ack === 'success') {
                    const systemPrompt = `You are an AI agent that's part of a user input processing pipeline who's main task is to give short, intermediate responses to the user depending on the [subject] and the [context_instructions] if applicable. Give your responses as if you are reassuring the user that their request is being processed.
      
          pipelineStatus: ${piplineStatus}
          subject: ${subject}
          context_instructions: ${context_instructions}`;
                    const systemPromptParam = [{ role: 'system', content: systemPrompt }];
                    const stream = this.openai.beta.chat.completions.stream({
                        model: "gpt-4o-mini",
                        messages: [...systemPromptParam, ...chatHistory],
                    });
                    const streamHandlers = {
                        content: (contentDelta, contentSnapshot) => {
                            this.workspaceMessagesBufferProxy.set(serializedKey, [contentDelta, JSON.stringify(contentSnapshot)]);
                        },
                        finalContent: (contentSnapshot) => this.workspaceMessagesBufferProxy.emit(serializedKey, 'finalContent', contentSnapshot, workspaceId),
                        chunk: (chunk, snapshot) => this.workspaceMessagesBufferProxy.emit(serializedKey, 'chunk', chunk, snapshot, workspaceId),
                        chatCompletion: async (completion) => {
                            const assistantTokens = await (0, ai_utils_1.calculateTokens4o_mini)(completion.choices[0].message.content);
                            const usage = {
                                prompt_tokens: userTokens,
                                completion_tokens: assistantTokens,
                                total_tokens: userTokens + assistantTokens,
                            };
                            const completionWithUsage = {
                                ...completion,
                                usage: usage
                            };
                            this.workspaceMessagesBufferProxy.emit(serializedKey, 'chatCompletion', completionWithUsage, workspaceId);
                        },
                        finalChatCompletion: async (completion) => {
                            const assistantTokens = await (0, ai_utils_1.calculateTokens4o_mini)(completion.choices[0].message.content);
                            const usage = {
                                prompt_tokens: userTokens,
                                completion_tokens: assistantTokens,
                                total_tokens: userTokens + assistantTokens,
                            };
                            const completionWithUsage = {
                                ...completion,
                                usage: usage
                            };
                            this.workspaceMessagesBufferProxy.emit(serializedKey, 'finalChatCompletion', completionWithUsage, workspaceId);
                        },
                        message: (message) => this.workspaceMessagesBufferProxy.emit(serializedKey, 'message', message, workspaceId),
                        finalMessage: async (message) => {
                            this.workspaceMessagesBufferProxy.emit(serializedKey, 'finalMessage', message, workspaceId);
                            finalIntermediateResponse = message.content;
                            try {
                                await assistantController_1.default.insertChatHistory(message, assistantMessageId, MessageType.Standard, workspaceId).then(() => resolve(finalIntermediateResponse));
                            }
                            catch (error) {
                                throw error;
                            }
                        },
                        functionCall: (functionCall) => this.workspaceMessagesBufferProxy.emit(serializedKey, 'functionCall', functionCall, workspaceId),
                        finalFunctionCall: (finalFunctionCall) => this.workspaceMessagesBufferProxy.emit(serializedKey, 'finalFunctionCall', finalFunctionCall, workspaceId),
                        functionCallResult: (finalFunctionCallResult) => this.workspaceMessagesBufferProxy.emit(serializedKey, 'finalFunctionCallResult', finalFunctionCallResult, workspaceId),
                        finalFunctionCallResult: (finalFunctionCallResult, workspaceId) => this.workspaceMessagesBufferProxy.emit(serializedKey, 'finalFunctionCallResult', finalFunctionCallResult, workspaceId),
                        error: (error) => {
                            this.workspaceMessagesBufferProxy.emit(serializedKey, 'error', error, workspaceId);
                        },
                        end: () => {
                            this.workspaceMessagesBufferProxy.emit(serializedKey, 'end', workspaceId);
                            this.workspaceMessagesBufferProxy.emit(serializedKey, 'debug-log', JSON.stringify({ debug: "Intermediate response ended." }));
                        },
                    };
                    Object.entries(streamHandlers).forEach(([event, handler]) => {
                        stream.on(event, async (...args) => {
                            await handler(...args);
                        });
                    });
                    // Wait until the stream is finished before returning the final response
                    // stream.on('end', () => {
                    //   resolve(finalIntermediateResponse);
                    // });
                    stream.on('error', (error) => {
                        reject(error);
                    });
                }
            });
        });
    }
    async commandPipelineProcessing(client, commandTypeCompletion, subject, context_instructions, workspaceId, chatHistory, userTokens) {
        switch (commandTypeCompletion) {
            case ai_utils_1.commandTypeEnum.Values.create_module:
                try {
                    const intermediateResponseMessage = await this.intermediateResponse(client, subject, context_instructions, `The user needs to confirm if the wants to generate the module outline first or directly generate the module and let the system decide the outline directly without confirmation.`, workspaceId, chatHistory.slice(-1), userTokens);
                    console.log("Intermediate reponse:", intermediateResponseMessage);
                    if (intermediateResponseMessage) {
                        console.log("Generating assistant message...");
                        const assistantMessageId = (0, uuidv4_1.uuid)();
                        client.emit('initialize-assistant-message', assistantMessageId, MessageType.Action, workspaceId, async ({ ack }) => {
                            if (ack === 'success') {
                                const moduleOutlineConfirmDirective = `\n\n::module_outline_generation_confirm{subject="${subject}" context_instructions="${context_instructions}"}\n\n`;
                                client.emit('content', moduleOutlineConfirmDirective, moduleOutlineConfirmDirective, assistantMessageId, workspaceId);
                                client.emit('end', workspaceId);
                                await assistantController_1.default.insertChatHistory({
                                    role: 'assistant',
                                    content: moduleOutlineConfirmDirective,
                                }, assistantMessageId, MessageType.Action, workspaceId);
                            }
                        });
                        // Go to `module-outline-generation` listener for pipeline flow continuation
                    }
                }
                catch (error) {
                    console.error("Error generating intermediate response: ", error);
                }
                break;
            case ai_utils_1.commandTypeEnum.Values.create_assessment:
                break;
            case ai_utils_1.commandTypeEnum.Values.reorganize_module:
                break;
            case ai_utils_1.commandTypeEnum.Values.reorganize_assessment:
                break;
            case ai_utils_1.commandTypeEnum.Values.rewrite_module_page:
                break;
            case ai_utils_1.commandTypeEnum.Values.rewrite_module_page_section:
                break;
            default:
                break;
        }
    }
    logger(message) {
        console.debug(`[AISocketHandler] ${message}`);
    }
}
exports.default = AISocketHandler;
//# sourceMappingURL=ai.js.map