import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  getLlama,
  LlamaChatSession,
  ChatWrapper,
  LlamaText,
  ChatModelFunctionsDocumentationGenerator,
} from "node-llama-cpp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const NODE_LLAMA_CPP_CONFIGS = {
  fruits: {
    getFruitPrice: {
      description: "Get the price of a fruit",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The name of the fruit",
          },
        },
        required: ["name"],
      },
      handler: async (params) => {
        const name = params.name.toLowerCase();
        const fruitPrices = {
          apple: "$6",
          banana: "$4",
          orange: "$3",
          grape: "$8",
        };

        if (fruitPrices[name]) {
          return { name, price: fruitPrices[name] };
        }
        return `Unrecognized fruit "${params.name}"`;
      },
    },
  },

  system: {
    getCurrentTime: {
      description: "Get the current date and time",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      handler: async () => {
        return {
          timestamp: new Date().toISOString(),
          formatted: new Date().toLocaleString(),
        };
      },
    },

    getWeather: {
      description: "Get weather information for a location",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The location to get weather for",
          },
        },
        required: ["location"],
      },
      handler: async (params) => {
        // Simulado - en producción conectarías a una API real
        return {
          location: params.location,
          temperature: "22°C",
          condition: "Sunny",
          humidity: "65%",
        };
      },
    },

    getOasisStats: {
      description: "Get statistics about the Oasis network",
      parameters: {
        type: "object",
        properties: {
          metric: {
            type: "string",
            description: "The metric to retrieve (users, posts, tribes)",
          },
        },
        required: ["metric"],
      },
      handler: async (params) => {
        const stats = {
          users: "1,247 active users",
          posts: "15,623 posts this month",
          tribes: "89 active tribes",
        };

        return stats[params.metric] || `No data for metric: ${params.metric}`;
      },
    },
  },
};

class MyCustomChatWrapper extends ChatWrapper {
  wrapperName = "MyCustomChat";
  userContext = "";
  systemContext = "";
  settings = {
    ...ChatWrapper.defaultSettings,
    supportsSystemMessages: true,
    functions: {
      call: {
        optionalPrefixSpace: true,
        prefix: "[[call: ",
        paramsPrefix: "(",
        suffix: ")]]",
      },
      result: {
        prefix: " [[result: ",
        suffix: "]]",
      },
    },
  };

  generateContextState({
    chatHistory,
    availableFunctions,
    documentFunctionParams,
  }) {
    console.log("Called generateContextState. User Context size:", this.userContext.length, "System Context size:", this.systemContext.length);

    // Modificar el sistema base para ser más directo con las funciones
    const baseSystemMessage =
      availableFunctions && Object.keys(availableFunctions).length > 0
        ? "You are a function-calling assistant. You MUST use the provided functions to answer questions. Never provide general responses when a function can provide specific information."
        : "You are a helpful, respectful and honest assistant. Always answer as helpfully as possible.";

    const historyWithFunctions =
      this.addAvailableFunctionsSystemMessageToHistory(
        chatHistory,
        availableFunctions,
        {
          documentParams: documentFunctionParams,
        }
      );

    // Modificar el primer mensaje del sistema si hay funciones disponibles
    if (
      historyWithFunctions.length > 0 &&
      historyWithFunctions[0].type === "system"
    ) {
      historyWithFunctions[0].text = baseSystemMessage;
    }

    const texts = historyWithFunctions.map((item, index) => {
      if (item.type === "system") {
        if (index === 0) return LlamaText([LlamaText.fromJSON(item.text)]);
        return LlamaText(["### System\n", LlamaText.fromJSON(item.text)]);
      } else if (item.type === "user")
        return LlamaText(["### Human\n", item.text]);
      else if (item.type === "model")
        return LlamaText([
          "### Assistant\n",
          this.generateModelResponseText(item.response),
        ]);

      return item;
    });

    // Add user context if available
    if (this.userContext && this.userContext.trim()) {
      texts.push(LlamaText(["### Context\n", this.userContext]));
    }

    const context = {
      contextText: LlamaText.joinValues("\n\n", texts),
      stopGenerationTriggers: [LlamaText(["### Human\n"])],
    };

    // console.log("With context", context);
    return context;
  }

  generateAvailableFunctionsSystemText(
    availableFunctions,
    { documentParams = true }
  ) {
    console.log("Called generateContextState. User Context size:", this.userContext.length, "System Context size:", this.systemContext.length);
    const functionsDocumentationGenerator =
      new ChatModelFunctionsDocumentationGenerator(availableFunctions);

    if (!functionsDocumentationGenerator.hasAnyFunctions) return LlamaText([]);

    const llamaT = LlamaText.joinValues("\n", [
      "CRITICAL: You MUST use the provided functions to answer questions. Do NOT provide general responses.",
      "",
      "When asked about prices, weather, time, or specific information, you MUST call the appropriate function.",
      "",
      "Available functions:",
      "```typescript",
      functionsDocumentationGenerator.getTypeScriptFunctionSignatures({
        documentParams,
      }),
      "```",
      "",
      "EXACT FORMAT REQUIRED - Use this format exactly:",
      '[[call: getFruitPrice({"name": "apple"})]]',
      "",
      "EXAMPLES:",
      "User: What is the price of an apple?",
      'Assistant: [[call: getFruitPrice({"name": "apple"})]]',
      "",
      "User: What time is it?",
      "Assistant: [[call: getCurrentTime({})]]",
      "",
      "RULES:",
      "1. ALWAYS use functions for specific information",
      '2. Use EXACT format: [[call: functionName({"param": "value"})]]',
      "3. Do NOT explain what you're doing",
      "4. Do NOT provide general answers",
      "5. Call the function IMMEDIATELY when relevant information is requested",
    ]);

    // console.log("with llamaT", llamaT);
    return llamaT;
  }
}

export class NodeLLamaCppHandler {
  constructor(config = {}) {
    this.llamaInstance = null;
    this.model = null;
    this.context = null;
    this.session = null;
    this.ready = false;
    this.modelPath = config.modelPath;
    this.functions = new Map();
    this.functionSets = config.functionSets;
    this.gpu = config.gpu !== false; 
    this.gpuLayers = config.gpuLayers; // Undefined = automático
    this.vramPadding = config.vramPadding || 256; 
  }

  async initialize() {
    if (this.model) {
      console.log("Local model already initialized");
      return;
    }

    if (!fs.existsSync(this.modelPath)) {
      throw new Error(`Model file not found at: ${this.modelPath}`);
    }

    if (!this.llamaInstance) {
      await this.initializeLlamaInstance();
    }

    if (!this.llamaInstance) {
      throw new Error("Failed to initialize llama instance");
    }

    this.initInternalFunctions();

    if (this.model) {
      console.log(`Context size: ${this.context.contextSize}`);
      console.log(`Threads: ${this.context.threadCount || 'auto'}`);

      try {
        await this.model.tokenize("test");
        console.log("✅ Tokenizer working correctly");
      } catch (error) {
        console.warn("⚠️ Tokenizer issue:", error.message);
      }
    }
  }

  async initializeLlamaInstance() {
    console.log("Initializing local model...");
    console.log(`GPU enabled: ${this.gpu}`);
    console.log(`GPU layers: ${this.gpuLayers || 'auto'}`);
    console.log(`VRAM padding: ${this.vramPadding}MB`);

    this.llamaInstance = await getLlama({
      gpu: this.gpu,
      vramPadding: this.vramPadding,
      // � DEFINITIVO: Prohibir compilación completamente
      build: "never",  // NUNCA compilar - solo usar binarios existentes
      usePrebuiltBinaries: true,  // Usar binarios precompilados
      skipDownload: false,  // Permitir descarga de binarios precompilados
      progressLogs: false,  // Silenciar logs de compilación
      logger: {
        log: (level, message) => console.log(`[Llama ${level}]`, message),
      }
    });

    this.model = await this.llamaInstance.loadModel({
      modelPath: this.modelPath,
      gpuLayers: this.gpuLayers, // undefined = automático, 0 = solo CPU, >0 = cantidad específica
    });

    if (!this.model) {
      throw new Error("Failed to load model");
    }

    this.context = await this.model.createContext({
      threads: this.gpu ? 1 : 4, // Menos hilos para GPU, más para CPU
      contextSize: 4096, // Aumentado para mejor contexto
    });

    if (!this.context) {
      throw new Error("Failed to create context");
    }

    this.wrapper = new MyCustomChatWrapper();

    // Create context sequence first
    const contextSequence = this.context.getSequence();
    console.log("🔍 Debug - Context sequence created:", !!contextSequence);

    this.session = new LlamaChatSession({
      contextSequence: contextSequence,
      chatWrapper: this.wrapper,
      autoDisposeSequence: false, // Evitar disposal automático
    });

    if (!this.session) {
      throw new Error("Failed to create chat session");
    }

    console.log("🔍 Debug - Session created successfully:", !!this.session);

    this.ready = true;
    console.log("Local model initialized successfully");
    console.log(`Model loaded with GPU: ${this.gpu ? 'YES' : 'NO'}`);
  }

  initInternalFunctions() {

    this.functionSets.forEach((setName) => {
      if (NODE_LLAMA_CPP_CONFIGS[setName]) {
        this.configureInternalFunctions(NODE_LLAMA_CPP_CONFIGS[setName]);
      } else {
        console.warn(`Local function set '${setName}' not found`);
      }
    });
    /* console.log(
      "ROUTE FOR node_llama_cpp_handler.mjs",
      "initialize",
      "Functions",
      this.functions
    ); */
  }

  async chat(prompt, context, functions = null) {
    if (!this.ready) {
      await this.initialize();
    }

    if (!this.session) {
      throw new Error("Chat session not initialized");
    }
    
    if (!this.model) {
      throw new Error("Model not initialized");
    }
    
    if (!this.context) {
      throw new Error("Context not initialized");
    }

    console.log("🔍 Debug - Model available:", !!this.model);
    console.log("🔍 Debug - Context available:", !!this.context);
    console.log("🔍 Debug - Session available:", !!this.session);

    this.wrapper.userContext = context || "";

    this.lastFunctionResults = [];

    // Allow third argument to be either a functions map or an options-like object.
    // If an options object (e.g., { mcpPresetName, mcpPreset, usePreset }) is passed here by callers,
    // do NOT treat it as the functions map; instead, ignore and use default registered functions.
    let usingFunctions;
    const isOptionsLike = (
      functions && typeof functions === 'object' && !Array.isArray(functions) && (
        Object.prototype.hasOwnProperty.call(functions, 'usePreset') ||
        Object.prototype.hasOwnProperty.call(functions, 'mcpPreset') ||
        Object.prototype.hasOwnProperty.call(functions, 'mcpPresetName')
      )
    );

    if (isOptionsLike) {
      console.log('⚠️  Detected options object passed as third argument to chat(); ignoring as functions map.');
      usingFunctions = this.getFunctionsForNodeLlamaWithInterception();
    } else {
      usingFunctions = functions || this.getFunctionsForNodeLlamaWithInterception();
    }

    console.log("\nFinal prompt", prompt, "Functions: ", Object.keys(usingFunctions));
    console.log("\n\n Going to local model");

    try {
      // Usar prompt simple sin funciones primero para debug
      if (Object.keys(usingFunctions).length === 0) {
        const result = await this.session.prompt(prompt);
        return {
          answer: result || "No response generated",
          hadFunctionCalls: false,
        };
      }

      // Try without functions first to see if basic chat works
      console.log("🔍 Debug - Attempting basic chat without functions...");
      const basicResult = await this.session.prompt("Hello");
      console.log("🔍 Debug - Basic chat result:", basicResult);

      // Con funciones
      console.log("🔍 Debug - Attempting chat with functions...");
      const result = await this.session.prompt(prompt, {
        functions: usingFunctions,
        maxTokens: 100, // Limitar para evitar timeouts
        temperature: 0.7,
      });

      console.log("\n\nBack from local model. Raw", result.trim().substring(0, 300) + (result.length > 300 ? "..." : ""));
      console.log("\n\nBack from local model. Raw------------------------------------------------------------------");
      // console.log("Function results captured:", this.lastFunctionResults);

      // ✅ Si hay resultados de función, generar respuesta natural
      if (this.lastFunctionResults.length > 0) {
        const naturalResponse = this.generateNaturalResponseFromResults();
        return {
          answer: naturalResponse,
          hadFunctionCalls: true,
        };
      }

      return {
        answer: typeof result === "object" ? JSON.stringify(result) || "No response generated" : result,
        hadFunctionCalls: Object.keys(usingFunctions).length > 0,
      };
    } catch (error) {
      console.error("Error in chat:", error.message);
      throw error;
    }
  }

  getFunctionsForNodeLlamaWithInterception() {
    const functionsObj = {};
    this.functions.forEach((func, name) => {
      functionsObj[name] = {
        ...func,
        handler: async (params) => {

          console.log(`🔧 Function called: ${name}`, params);
          const result = await func.handler(params);

          this.lastFunctionResults.push({
            name,
            params,
            result,
          });

          console.log(`✅ Function calling succeeded: ${name}`/*, result*/);
          return result;
        },
      };
    });
    return functionsObj;
  }

  generateNaturalResponseFromResults() {
    const lastResult =
      this.lastFunctionResults[this.lastFunctionResults.length - 1];

    if (!lastResult) return "Function executed successfully.";

    const { name, params, result } = lastResult;

    console.log("Natural response for", name, params, result);

    // Format the result based on the function type
    if (name === 'getFruitPrice' && result && typeof result === 'object') {
      return `The price of ${result.name} is ${result.price}.`;
    } else if (name === 'getCurrentTime' && result && typeof result === 'object') {
      return `The current time is ${result.formatted}.`;
    } else if (name === 'getWeather' && result && typeof result === 'object') {
      return `The weather in ${result.location} is ${result.condition} with temperature ${result.temperature}.`;
    } else if (typeof result === 'string') {
      return result;
    } else if (typeof result === 'object') {
      return JSON.stringify(result, null, 2);
    }

    return String(result);
  }

  addInternalFunctionsToMap(name, config) {
    // parse to node-llama-cpp format
    const nodeLlamaFunction = {
      description: config.description,
      params: config.parameters,
      handler: config.handler,
    };

    this.functions.set(name, nodeLlamaFunction);
    console.log(`Local function registered: ${name}`);
  }

  configureInternalFunctions(functionsConfig) {
    Object.entries(functionsConfig).forEach(([name, config]) => {
      this.addInternalFunctionsToMap(name, config);
    });
  }

  getFunctionsForNodeLlama() {
    const functionsObj = {};
    this.functions.forEach((func, name) => {
      functionsObj[name] = func;
    });
    return functionsObj;
  }
}

// Instancia singleton
let localModelHandler = null;

export async function getNodeLlamaCppHandler(config = {}) {
  if (!localModelHandler) {
    localModelHandler = new NodeLLamaCppHandler(config);
  }
  return localModelHandler;
}
