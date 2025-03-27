"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateModuleOutlineResponse = exports.createModuleOutline = exports.generateModuleNodeContent = exports.createModuleFromOutline = exports.createModule = exports.insertModuleNode = exports.commandDecomposition = exports.intentDecomposition = exports.calculateTokens4o = exports.calculateTokens4o_mini = exports.encoding4o = exports.encoding4o_mini = exports.ModuleOutlineSchema = exports.ModuleNodeOutlineSchema = exports.CommandProcessingSchema = exports.commandTypeEnum = exports.IntentProcessingSchema = exports.IntentTypeEnum = void 0;
const tiktoken_1 = require("tiktoken");
const zod_1 = require("zod");
const zod_2 = require("openai/helpers/zod");
const uuidv4_1 = require("uuidv4");
const moduleController_1 = __importDefault(require("../../controllers/moduleController"));
const socketServer_1 = require("../../socketServer");
const documentController_1 = __importDefault(require("../../controllers/documentController"));
const documentProcessor_1 = require("../documentProcessor");
//////////////////////////////////////
/// AI Response format definitions ///
//////////////////////////////////////
exports.IntentTypeEnum = zod_1.z.enum([
    "query",
    "command",
    "informative",
    "conversational",
    "miscellaneous",
]);
exports.IntentProcessingSchema = zod_1.z.object({
    subject: zod_1.z
        .string()
        .describe("The core subject matter, the focus, or main semantic idea of the prompt. This is the area of interest that the user has provided.")
        .optional(),
    intent_type: exports.IntentTypeEnum
        .describe("The intent type of the prompt as a whole. This is a single word output that describes the prompt concisely."),
    context_instructions: zod_1.z
        .string()
        .describe("The context in which the subject matter is encapsulated in. This includes what the user has instructed to you, the system. This must be as elaborate but concise as possible so that the most important parts of the prompt is captured within the least amount of words as possible."),
}).strict();
exports.commandTypeEnum = zod_1.z.enum([
    "create_module",
    "create_assessment",
    "reorganize_module",
    "reorganize_assessment",
    "rewrite_module_page",
    "rewrite_module_page_section",
    "miscellaneous"
]);
exports.CommandProcessingSchema = zod_1.z.object({
    command_type: zod_1.z.string().describe("The command type of the prompt as a whole. This is a single word output that describes the prompt concisely."),
}).strict();
exports.ModuleNodeOutlineSchema = zod_1.z.lazy(() => zod_1.z.object({
    title: zod_1.z
        .string()
        .describe("The title of the node, representing a section, sub-section, or sub-subsection within the module."),
    description: zod_1.z
        .string()
        .describe("A brief description of the node's content, explaining the focus of the section or sub-section."),
    children: zod_1.z
        .array(zod_1.z.lazy(() => exports.ModuleNodeOutlineSchema))
        .describe("An optional array of child nodes, representing sub-sections or further subdivisions of the content.")
        .optional(),
})).describe("A structure representing a node within a module outline, which can be a section, sub-section, or sub-subsection.");
exports.ModuleOutlineSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .describe("The name of the module, encapsulating the entire tree structure. This name differentiates it from other modules."),
    description: zod_1.z
        .string()
        .describe("A detailed description of the module as a whole, providing an overview of the content covered by the module."),
    moduleNodes: zod_1.z
        .array(exports.ModuleNodeOutlineSchema)
        .describe("An array of top-level nodes, each representing a major section of the module. These nodes can have their own sub-sections, sub-subsections, and so on."),
}).describe("The overall structure of a module, encapsulating multiple sections. Each section is represented by a top-level node that may contain nested sub-sections.");
//////////////////////////////////////
/////// Token Usage calculators //////
//////////////////////////////////////
exports.encoding4o_mini = (0, tiktoken_1.encoding_for_model)("gpt-4o-mini");
exports.encoding4o = (0, tiktoken_1.encoding_for_model)("gpt-4o");
async function calculateTokens4o_mini(message) {
    if (!message)
        return 0;
    return exports.encoding4o_mini.encode(message).length;
}
exports.calculateTokens4o_mini = calculateTokens4o_mini;
async function calculateTokens4o(message) {
    if (!message)
        return 0;
    return exports.encoding4o.encode(message).length;
}
exports.calculateTokens4o = calculateTokens4o;
//////////////////////////////////////
/// User Input Processing Pipeline ///
//////////////////////////////////////
async function intentDecomposition(openai, message) {
    try {
        const intentDecompositionSystemPrompt = `You are an AI agent that's part of a user input processing pipeline who's main task is to decompose the intent of the user. Given the prompt of the user, decompose the user's input into it's subject matter, and the intent type of the prompt in the required format, and the context instructions if applicable.

Information on the intent types are below.

Context instructions are required:
- query: The user's intent is a query type. The user is asking a question or wishes to acquire information.
- command: The user's intent is a command. The user is asking you, the system to perform a task.
- informative: The user's intent is informational. This means that the user is trying to inform you, the system, a piece of context or information.

No context instructions (output as "none"):
- conversational: The user is greeting the system, or there is no intrinsic subject or topic within the user's prompt.
- miscellaneous: If the user is prompting nonsensical inputs, just output the subject matter as "none" and the intent type as "miscellaneous".`;
        const intentDecompositionCompletion = await openai.beta.chat.completions.parse({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: intentDecompositionSystemPrompt },
                { role: "user", content: message },
            ],
            response_format: (0, zod_2.zodResponseFormat)(exports.IntentProcessingSchema, "intent-processing"),
        });
        const parsedIntentValues = intentDecompositionCompletion.choices[0].message;
        if (!parsedIntentValues)
            throw new Error("No intent decomposition completion generated.");
        return parsedIntentValues;
    }
    catch (error) {
        throw new Error(`Intent decomposition error: ${error}`);
    }
}
exports.intentDecomposition = intentDecomposition;
async function commandDecomposition(openai, message) {
    try {
        const commandDecompositionSystemPrompt = `You are an AI agent that's part of a user input processing pipeline who's main task is to decompose the command of the user. Decompose the user's input into it's subject matter, and the intent type of the prompt in the required format. 

Information on command types:

- create_module: If the command is to create educational reading materials, lessons, modules, etc.
- create_assessment: If the command is to create quizzes, assessments, examinations, etc.
- reorganize_module: If the command is to reorganize or rearrange the user's module, reading materials, lessons, etc. 
- reorganize_assessment: If the command is to reorganize or rearrange the user's quizzes, assessments, - examinations, etc.
- rewrite_module: If the command is to rewrite the user's entire module.
- rewrite_module_page: If the command is to rewrite the user's module page.
- rewrite_module_page_section:  If the command is to rewrite a section of the user's module page.
- miscellaneous: If the command does not fall into any of the aforementioned categories.`;
        const commandDecompositionCompletion = await openai.beta.chat.completions.parse({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: commandDecompositionSystemPrompt },
                { role: "user", content: message },
            ],
            response_format: (0, zod_2.zodResponseFormat)(exports.CommandProcessingSchema, "command-processing"),
        });
        const parsedCommandValues = commandDecompositionCompletion.choices[0].message;
        if (!parsedCommandValues)
            throw new Error("No command decomposition completion generated.");
        return parsedCommandValues;
    }
    catch (error) {
        throw new Error(`Command decomposition error: ${error}`);
    }
}
exports.commandDecomposition = commandDecomposition;
async function insertModuleNode(moduleId, nodes, ancestor, position = 0, depth = 1) {
    try {
        // Insert the current node with its depth and position
        await moduleController_1.default.insertChildToModuleNodeCallback(ancestor, moduleId, nodes.id, '', nodes.title, position, depth);
        // If there are no children, return
        if (!nodes.children || nodes.children.length === 0)
            return;
        // Use Promise.all to insert all child nodes in parallel
        await Promise.all(nodes.children.map(async (childNode, index) => {
            // Recursively insert the child node, increasing depth by 1
            await insertModuleNode(moduleId, childNode, nodes.id, index, depth + 1); // Await the recursive call
        }));
    }
    catch (error) {
        console.error("Error inserting module node: ", error);
    }
}
exports.insertModuleNode = insertModuleNode;
//////////////////////////////////////
//////      Module Creation     //////
//////////////////////////////////////
async function createModule(client, moduleId, workspaceId, module, subject, context_instructions, workspaceModulesBufferProxy, openai) {
    client.emit('create-module', moduleId, workspaceId, module.name, module.description, async (ack) => {
        if (ack === 'module-created') {
            // Proceed with the accepted module outline 
            console.log("Module outline data", module);
            const serializedKey = (0, socketServer_1.serializeTuple)([moduleId, workspaceId]);
            const moduleBuffer = {
                id: moduleId,
                name: module.name,
                description: module.description,
                nodes: module.nodes
            };
            workspaceModulesBufferProxy.set(serializedKey, moduleBuffer);
            let i = 0;
            for (const node of module.nodes) {
                const traverseModuleNodes = async (moduleId, workspaceId, node) => {
                    // Call generateModuleNodeContent for the current node sequentially
                    if (node.id) {
                        await generateModuleNodeContent(moduleId, node.id, workspaceId, node.title, node.description, subject, context_instructions, workspaceModulesBufferProxy, openai);
                    }
                    console.log("Iteration", i++);
                    // If this node has children, recursively call traverseModuleNodes for each child
                    if (node.children && node.children.length > 0) {
                        for (const childNode of node.children) {
                            await traverseModuleNodes(moduleId, workspaceId, childNode);
                        }
                    }
                };
                // Traverse each module node sequentially
                await traverseModuleNodes(moduleId, workspaceId, node);
            }
            workspaceModulesBufferProxy.emit(serializedKey, 'end');
        }
    });
}
exports.createModule = createModule;
async function createModuleFromOutline(client, moduleOutlineData, result, workspaceId, rootNode, subject, context_instructions, workspaceModulesBufferProxy, openai) {
    client.emit('create-module', rootNode, workspaceId, moduleOutlineData.name, moduleOutlineData.description, async (ack) => {
        if (ack === 'module-created') {
            console.log("Result", result);
            const serializedKey = (0, socketServer_1.serializeTuple)([result.moduleId, workspaceId]);
            console.log("Serialized key:", serializedKey);
            if (result.moduleId) {
                console.log("Creating module data");
                const serializedKey = (0, socketServer_1.serializeTuple)([result.moduleId, workspaceId]);
                const moduleNodes = moduleOutlineData.moduleNodes.map((moduleNodeOutline) => {
                    const mapModuleNodeOutlineToModuleNode = (nodeOutline, parentId) => {
                        return {
                            id: nodeOutline.id,
                            parent: parentId,
                            title: nodeOutline.title,
                            content: '',
                            description: nodeOutline.description,
                            children: nodeOutline.children
                                ? nodeOutline.children.map((childNode) => mapModuleNodeOutlineToModuleNode(childNode, nodeOutline.id))
                                : [], // Recursively map children, if any
                        };
                    };
                    return mapModuleNodeOutlineToModuleNode(moduleNodeOutline, moduleOutlineData.id); // Root-level parent id is moduleOutlineData.id
                });
                console.log("Module nodes:", JSON.stringify(moduleNodes, null, 2));
                const moduleBuffer = {
                    id: rootNode,
                    name: moduleOutlineData.name,
                    description: moduleOutlineData.description,
                    nodes: moduleNodes
                };
                workspaceModulesBufferProxy.set(serializedKey, moduleBuffer);
                let i = 0;
                for (const node of moduleNodes) {
                    const traverseModuleNodes = async (moduleId, workspaceId, node) => {
                        // Call generateModuleNodeContent for the current node sequentially
                        if (node.id) {
                            await generateModuleNodeContent(moduleId, node.id, workspaceId, node.title, node.description, subject, context_instructions, workspaceModulesBufferProxy, openai);
                        }
                        // workspaceModulesBufferProxy.emit(serializedKey, 'update-module-node', moduleId, node.id, workspaceId, node.description, node.description);
                        console.log("Iteration", i++);
                        // If this node has children, recursively call traverseModuleNodes for each child
                        if (node.children && node.children.length > 0) {
                            for (const childNode of node.children) {
                                await traverseModuleNodes(moduleId, workspaceId, childNode);
                            }
                        }
                    };
                    // Traverse each module node sequentially
                    await traverseModuleNodes(rootNode, workspaceId, node);
                }
                workspaceModulesBufferProxy.emit(serializedKey, 'end');
            }
        }
    });
}
exports.createModuleFromOutline = createModuleFromOutline;
async function generateModuleNodeContent(moduleId, moduleNodeId, workspaceId, title, description, subject, context_instructions, workspaceModulesBufferProxy, openai) {
    const tupleKey = [moduleId, workspaceId];
    const serializedKey = (0, socketServer_1.serializeTuple)(tupleKey);
    let finalIntermediateResponse = '';
    const systemPrompt = `You are an AI agent that's part of a user input processing pipeline who's main task is to generate content for a module. Focus on creating the actual content of the module node, not the outline, not the overview. Just focus on creating the content. That's all. Make sure it is well structured. Do not output the metadata as it is already displayed in another component.

  Here is the metadata for the module:

  Subject: ${subject}
  Module Title: ${title}
  Description: ${description}

  Consider the following context instructions inferred by the previous processes within the pipeline:

  Context Instructions: ${context_instructions}
  `;
    const systemPromptParam = [{ role: 'system', content: systemPrompt }];
    const stream = openai.beta.chat.completions.stream({
        model: "gpt-4o-mini",
        messages: [...systemPromptParam],
    });
    const streamHandlers = {
        content: (contentDelta, contentSnapshot) => {
            const trimmedContentSnapshot = JSON.stringify(contentSnapshot).slice(1, -1);
            workspaceModulesBufferProxy.emit(serializedKey, 'update-module-node', moduleId, moduleNodeId, workspaceId, contentDelta, trimmedContentSnapshot);
        },
        finalContent: async (contentSnapshot) => {
            workspaceModulesBufferProxy.emit(serializedKey, 'finalContent', contentSnapshot, workspaceId);
            moduleController_1.default.updateModuleNodeContentCallback(moduleNodeId, contentSnapshot);
        },
        chunk: (chunk, snapshot) => {
            // console.log("Generated chunk delta: ", chunk.choices[0].delta);
            // console.log("Generated chunk snapshot: ", snapshot.choices[0].message);
            // this.workspaceModulesBufferProxy.emit(serializedKey, 'chunk', chunk, snapshot, workspaceId)
        },
        chatCompletion: async (completion) => {
            console.log("Completion: ", completion.choices[0].message);
            // const assistantTokens = await calculateTokens4o_mini(completion.choices[0].message.content);
            // const usage = {
            //   prompt_tokens: userTokens,
            //   completion_tokens: assistantTokens,
            //   total_tokens: userTokens + assistantTokens,
            // };
            // const completionWithUsage = {
            //   ...completion,
            //   usage: usage
            // };
            // client.emit('chatCompletion', completionWithUsage, workspaceId);
        },
        finalChatCompletion: async (completion) => {
            console.log("Final chat completion: ", completion.choices[0].message);
            try {
                const { document } = await (0, documentProcessor_1.chunkAndEmbedFile)((0, uuidv4_1.uuid)(), completion.choices[0].message.content, '');
                console.log("Upserting new pinecone embedding document...");
                documentController_1.default.safeUpsertDocument(document, workspaceId);
            }
            catch (error) {
                console.error("Unable to embed module node: ", error);
            }
            // const assistantTokens = await calculateTokens4o_mini(completion.choices[0].message.content);
            // const usage = {
            //   prompt_tokens: userTokens,
            //   completion_tokens: assistantTokens,
            //   total_tokens: userTokens + assistantTokens,
            // };
            // const completionWithUsage = {
            //   ...completion,
            //   usage: usage
            // };
            // client.emit('finalChatCompletion', completionWithUsage, workspaceId);
        },
        message: (message) => workspaceModulesBufferProxy.emit(serializedKey, 'message', message, workspaceId),
        finalMessage: async (message) => {
            // this.workspaceModulesBufferProxy.emit(serializedKey, 'finalMessage', message, workspaceId);
            // finalIntermediateResponse = message.content as string;
            // try {
            //   await assistantController.insertChatHistory(
            //     message,
            //     uuid(),
            //     workspaceId
            //   );
            // } catch (error) {
            //   console.error('Error inserting chat history:', error);
            // }
        },
        functionCall: (functionCall) => workspaceModulesBufferProxy.emit(serializedKey, 'functionCall', functionCall, workspaceId),
        finalFunctionCall: (finalFunctionCall) => workspaceModulesBufferProxy.emit(serializedKey, 'finalFunctionCall', finalFunctionCall, workspaceId),
        functionCallResult: (finalFunctionCallResult) => workspaceModulesBufferProxy.emit(serializedKey, 'finalFunctionCallResult', finalFunctionCallResult, workspaceId),
        finalFunctionCallResult: (finalFunctionCallResult, workspaceId) => workspaceModulesBufferProxy.emit(serializedKey, 'finalFunctionCallResult', finalFunctionCallResult, workspaceId),
        error: (error) => {
            workspaceModulesBufferProxy.emit(serializedKey, 'error', error, workspaceId);
        },
        end: () => {
            // this.workspaceMessagesBufferProxy.emit(serializedKey, 'end');
        },
    };
    Object.entries(streamHandlers).forEach(([event, handler]) => {
        stream.on(event, async (...args) => {
            // this.logger(
            //   `Event: ${event}, Args: ${JSON.stringify(args, null, 2)}`,
            // );
            await handler(...args);
        });
    });
    // Wait until the stream is finished before returning the final response
    return new Promise((resolve, reject) => {
        stream.on('end', () => {
            resolve(finalIntermediateResponse);
        });
        stream.on('error', (error) => {
            reject(error);
        });
    });
}
exports.generateModuleNodeContent = generateModuleNodeContent;
//////////////////////////////////////
///// Command Processing Pipeline ////
//////////////////////////////////////
// Modules
async function createModuleOutline(openai, subject, context_instructions) {
    try {
        const createModuleOutlinePrompt = `You are an AI agent that's part of a command input processing pipeline who's main task is to create an outline for a module. Modules are learning material that have a recursive structure (like sections, sub-sections, etc.)

Make the module outline as detailed as possible to your available knowledge. Ensure the outline is comprehensive and semantically concrete. 

This is the subject for the module: ${subject}`;
        const createModuleOutlineCompletion = await openai.beta.chat.completions.parse({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: createModuleOutlinePrompt },
                { role: "assistant", content: context_instructions },
            ],
            response_format: (0, zod_2.zodResponseFormat)(exports.ModuleOutlineSchema, "module-outline"),
        });
        const parsedModuleOutlineValues = createModuleOutlineCompletion.choices[0].message;
        if (!parsedModuleOutlineValues)
            throw new Error("No module outline completion generated.");
        return parsedModuleOutlineValues;
    }
    catch (error) {
        throw new Error(`Module outline creation error: ${error}`);
    }
}
exports.createModuleOutline = createModuleOutline;
// Function to generate a module outline
async function generateModuleOutlineResponse(openai, subject, context_instructions) {
    const createModuleCompletion = await createModuleOutline(openai, subject, context_instructions);
    // Function to add unique IDs to the module and each node
    const attachIds = (module) => {
        // Assign IDs to each moduleNode and their children
        const assignNodeIds = (nodes) => {
            nodes.forEach(node => {
                node.id = (0, uuidv4_1.uuid)();
                if (node.children) {
                    assignNodeIds(node.children);
                }
            });
        };
        assignNodeIds(module.moduleNodes);
    };
    // Attach IDs to the module and its nodes
    attachIds(createModuleCompletion.parsed);
    console.log("Module outline:", createModuleCompletion.parsed);
    return createModuleCompletion.parsed;
}
exports.generateModuleOutlineResponse = generateModuleOutlineResponse;
//# sourceMappingURL=ai-utils.js.map