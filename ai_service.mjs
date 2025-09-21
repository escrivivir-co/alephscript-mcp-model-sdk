import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { getLlama, LlamaChatSession } from 'node-llama-cpp';
import apiBridge from './api_bridge';

const PORT = process.env.PORT || 4001;

const GPU_ENABLED = process.env.GPU_ENABLED === 'true' || process.env.GPU_ENABLED === '1';
const GPU_LAYERS = process.env.GPU_LAYERS === 'auto' ? undefined : (process.env.GPU_LAYERS ? parseInt(process.env.GPU_LAYERS) : undefined);
const VRAM_PADDING = process.env.VRAM_PADDING ? parseInt(process.env.VRAM_PADDING) : (GPU_ENABLED ? 128 : 64);

console.log('🚀 AI Service Configuration:');
console.log(`   GPU Enabled: ${GPU_ENABLED ? 'YES' : 'NO'}`);
console.log(`   GPU Layers: ${GPU_LAYERS || 'auto'}`);
console.log(`   VRAM Padding: ${VRAM_PADDING}MB`);
console.log('');

// Plugin imports - solo si están disponibles
let functionsPlugin = null;
try {
  const { getLLamaFunctionsHandler } = await import('./plugins/llama_functions/llama_functions_handler.mjs');
  const { getLLamaFunctionsMCPHandler, LLAMA_FUNCTIONS_PRESETS } = await import('./plugins/llama_functions/llama_functions_mcp_handler.mjs');
  const { getNodeLlamaCppHandler } = await import('./plugins/node_llama_cpp_functions/node_llama_cpp_handler.mjs');
  const { getNodeLlamaCppMCPHandler } = await import('./plugins/node_llama_cpp_functions/node_llama_cpp_mcp_handler.mjs');
  functionsPlugin = { getLLamaFunctionsHandler, getNodeLlamaCppHandler, getLLamaFunctionsMCPHandler, getNodeLlamaCppMCPHandler, LLAMA_FUNCTIONS_PRESETS };
} catch (error) {
  console.log('Functions plugin not available, running in basic mode');
}

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let llamaInstance, model, context, session;
let ready = false;
let lastError = null;

// Plugin handlers - inicializados cuando se necesiten
let functionHandlerProd = null;
let functionHandlerDev = null;
let functionHandlerMcp = null; // Manual implementation (hybrid)
let functionHandlerMcpNative = null; // Native node-llama-cpp implementation

async function initModel() {
  if (ready) {
    console.log("AI Service: Model already loaded, skipping initialization");
    return;
  }

  // Fallback to legacy mode if no functions plugin
  if (!functionsPlugin) {
    const modelPath = path.join(__dirname, 'models', 'oasis-42-1-chat.Q4_K_M.gguf');
    if (!fs.existsSync(modelPath)) {
      throw new Error(`Model file not found at: ${modelPath}`);
    }

    console.log("AI Service: Loading model from:", modelPath);
    console.log(`AI Service: GPU configuration - Enabled: ${GPU_ENABLED}, Layers: ${GPU_LAYERS || 'auto'}, VRAM Padding: ${VRAM_PADDING}MB`);

    llamaInstance = await getLlama({
      gpu: GPU_ENABLED,
      vramPadding: VRAM_PADDING,
      logger: GPU_ENABLED ? {
        log: (level, message) => console.log(`[Llama ${level}]`, message),
      } : undefined
    });

    model = await llamaInstance.loadModel({
      modelPath,
      gpuLayers: GPU_LAYERS
    });

    context = await model.createContext({
      threads: GPU_ENABLED ? 1 : 4, // Menos hilos para GPU
      contextSize: 4096,
    });

    session = new LlamaChatSession({
      contextSequence: context.getSequence(),
      autoDisposeSequence: false
    });

    console.log("AI Service: Model loaded and session initialized.");

    if (GPU_ENABLED) {
      console.log("🎯 GPU acceleration enabled for AI service!");
    }
    ready = true;
  }
}

// Plugin initialization functions
async function getFunctionHandler(mode) {
  if (!functionsPlugin) return null;

  console.log(`🔧 AI Service: Solicitando handler para modo: ${mode}`);
  const modelPath = path.join(__dirname, 'models', 'oasis-42-1-chat.Q4_K_M.gguf');
  
  switch (mode) {
    case 'node_llama_cpp_functions': {
      if (!functionHandlerProd) {
        console.log("🔧 AI Service: Creando handler PROD (node_llama_cpp_handler.mjs)");
        functionHandlerProd = await functionsPlugin.getNodeLlamaCppHandler({
          modelPath,
          functionSets: ['fruits', 'system'],
          gpu: GPU_ENABLED,
          gpuLayers: GPU_LAYERS,
          vramPadding: VRAM_PADDING
        });
        console.log("✅ AI Service: Handler PROD creado exitosamente");
      } else {
        console.log("♻️ AI Service: Reutilizando handler PROD existente");
      }
      return functionHandlerProd;
    }
    case 'llama_functions': {
      if (!functionHandlerDev) {
        console.log("🔧 AI Service: Creando handler DEV (llama_functions_handler.mjs)");
        functionHandlerDev = await functionsPlugin.getLLamaFunctionsHandler(modelPath, ['fruits', 'system'], {
          gpu: GPU_ENABLED,
          gpuLayers: GPU_LAYERS,
          vramPadding: VRAM_PADDING
        });
        console.log("🔧 AI Service: Inicializando handler DEV...");
        await functionHandlerDev.initialize();
        console.log("✅ AI Service: Handler DEV creado e inicializado exitosamente");
      } else {
        console.log("♻️ AI Service: Reutilizando handler DEV existente");
      }
      return functionHandlerDev;
    }
    case 'llama_MCP_functions': {
      if (!functionHandlerMcp) {
        console.log("🔧 AI Service: Creando handler MCP (llama_functions_mcp_handler.mjs)");
        console.log("🔧 AI Service: Registrando servidor MCP localhost:3003...");
        
        // ⚠️ CRÍTICO: getLLamaFunctionsMCPHandler YA inicializa el handler internamente
        // NO llamar initialize() después o se duplicará la inicialización
        functionHandlerMcp = await functionsPlugin.getLLamaFunctionsMCPHandler({
          modelPath,
          localFunctions: ['fruits', 'system'],
          mcpServers: [
            {
              name: 'localhost',
              url: 'http://localhost:3003',
              transport: 'http'
            }
          ],
          gpu: GPU_ENABLED,
          gpuLayers: GPU_LAYERS,
          vramPadding: VRAM_PADDING
        });
        console.log("✅ AI Service: Handler MCP creado e inicializado exitosamente");
      } else {
        console.log("♻️ AI Service: Reutilizando handler MCP existente");
      }
      return functionHandlerMcp;
    }
    case 'node_llama_cpp_MCP_functions': {
      if (!functionHandlerMcpNative) {
        console.log("🔧 AI Service: Creando handler MCP Native (node_llama_cpp_mcp_handler.mjs)");
        console.log("🔧 AI Service: Usando node-llama-cpp nativo para funciones MCP...");
        
        functionHandlerMcpNative = await functionsPlugin.getNodeLlamaCppMCPHandler({
          modelPath,
          functionSets: ['fruits', 'system'],
          mcpServers: [
            {
              name: 'localhost',
              url: 'http://localhost:3003',
              transport: 'http'
            }
          ],
          gpu: GPU_ENABLED,
          gpuLayers: GPU_LAYERS,
          vramPadding: VRAM_PADDING
        });
        console.log("✅ AI Service: Handler MCP Native creado e inicializado exitosamente");
      } else {
        console.log("♻️ AI Service: Reutilizando handler MCP Native existente");
      }
      return functionHandlerMcpNative;
    }
    default : {
      console.log(`❌ AI Service: Modo '${mode}' no reconocido`);
    }
  }

  return null;
}

app.post('/ai', async (req, res) => {
  console.log("Call /ai", req.body)
  try {
    const userInput = String(req.body.input || '').trim();

    const promptData = await apiBridge(req, res);

    if (promptData.mode == 'node' || promptData.payload) {
      return res.json(promptData);
    }

    // Fallback: use shared handler or legacy mode
    console.log("AI Service: Processing request in fallback mode...");
    const systemContext = req.body.prompt || '';
    const userContext = req.body.context || '';

    // Try to use shared handler first
    if (llamaInstance) {
      console.log("AI Service: Using shared model handler...");
      const result = await llamaInstance.chat(userInput, systemContext + '\n' + userContext);
      return res.json({
        answer: result.answer || result,
        snippets: userContext ? userContext.split('\n').slice(0, 50) : [],
        hadFunctionCalls: result.hadFunctionCalls || false,
        mode: 'shared'
      });
    }

    // Ultimate fallback: legacy mode with session
    await initModel();
    console.log("AI Service: Using legacy session mode...");
    const userPrompt = req.body.prompt || 'Provide an informative and precise response.';

    let snippets = [];
    if (userContext) {
      snippets = userContext.split('\n').slice(0, 50);
    }

    const prompt = [
      'Context: You are an AI assistant called "42" in Oasis, a distributed, encrypted and federated social network.',
      userContext ? `User Data:\n${userContext}` : '',
      `Query: "${userInput}"`,
      userPrompt
    ].filter(Boolean).join('\n\n');

    console.log("AI Service: Generating answer...");
    const answer = await session.prompt(prompt);
    console.log("AI Service: Answer generated successfully");
    res.json({
      answer: String(answer || '').trim(),
      snippets,
      mode: 'legacy'
    });
  } catch (err) {
    lastError = err;
    console.error("AI Service Error:", err);
    res.status(500).json({ error: 'Internal Server Error', details: String(err.message || err) });
  }
});

app.post('/ai/train', async (req, res) => {
  res.json({ stored: true });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    ready: ready,
    error: lastError?.message || null,
    timestamp: Date.now()
  });
});

app.get('/status', (req, res) => {
  res.json({
    status: ready ? 'ready' : 'initializing',
    modelLoaded: !!model,
    sessionReady: !!session,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

app.post('/preload', async (req, res) => {
  try {
    console.log("AI Service: Preloading model...");
    await initModel();
    res.json({
      status: 'success',
      ready: ready,
      message: 'Model preloaded successfully'
    });
  } catch (err) {
    console.error("AI Service: Error preloading model:", err.message);
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
});

console.log(`🤖 Servicio AI Standalone iniciado en puerto ${PORT}`);
console.log('📋 Endpoints disponibles:');
console.log('  POST /ai - Procesar consulta AI');
console.log('  GET /health - Estado del servicio');
console.log('  GET /status - Estado detallado');
console.log('  POST /preload - Precargar modelo');

/* NO ACTIVAR EN PRODUCCIÓN, MUCHOS USUARIOS NO LO USARAN EN TODA LA SESION
// Precargar el modelo al inicio
console.log('🚀 Iniciando precarga del modelo...');
initModel().then(() => {
  console.log('✅ Modelo precargado exitosamente');
}).catch((err) => {
  console.error('❌ Error precargando modelo:', err.message);
});
*/

app.listen(PORT, () => {
  console.log(`🚀 AI Service starting on port ${PORT}`);
  console.log('📍 Available modes:');
  console.log('  • Default: POST /ai {"input": "question"}');
  console.log('  • Functions MCP Manual: POST /ai {"input": "question", "llama_MCP_functions": true}');
  console.log('  • Functions MCP Native: POST /ai {"input": "question", "node_llama_cpp_MCP_functions": true}');
  console.log('  • Functions Prod: POST /ai {"input": "question", "node_llama_cpp_functions": true}');
  console.log('  • Functions Dev: POST /ai {"input": "question", "llama_functions": true}');
  console.log('  • No Functions: POST /ai {"input": "question", "useFunctions": false}');
  if (!functionsPlugin) {
    console.log('⚠️  Functions plugin not loaded - only legacy mode available');
  }
}).on('error', (err) => {
  console.error('❌ Failed to start AI Service:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
  process.exit(1);
});