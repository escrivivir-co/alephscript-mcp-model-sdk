import { NodeLLamaCppHandler, NODE_LLAMA_CPP_CONFIGS } from './node_llama_cpp_handler.mjs';
import { mixMCPMixin } from '../mcp/mixer.mjs';

export class NodeLLamaCppMCPHandler extends NodeLLamaCppHandler {
  constructor(config = {}) {
    super(config);

    mixMCPMixin(this); // ???

  }

  async initialize() {

    await super.initialize();    
    this._addMCPFunctions();

  }

  _addMCPFunctions() {
    const mcpFunctionMap = this._buildMCPFunctionMapping();

    // For SLMs that needs listing the functions on prompts
    // all functions are prefixed with short server name
    for (const [shortFunctionName, functionDef] of Object.entries(mcpFunctionMap)) {
      const serverInfo = this.functionToServerMap.get(shortFunctionName);

      // Registrar función con interceptación MCP
      this.registerMCPFunction(shortFunctionName, {
        description: functionDef.description,
        parameters: functionDef.parameters,
        serverInfo: serverInfo
      });
    }

    console.log(`🔧 NodeLLamaCppMCPHandler: Added MCP functions`);
  }

 registerMCPFunction(name, config) {
    const { description, parameters, serverInfo } = config;

    const mcpHandler = async (params) => {
      console.log(`🔄 NodeLLamaCppMCPHandler: execute ${name} -> ${serverInfo.toolName} at ${serverInfo.serverName}`);

      try {
        // Mixing method
        const result = await this.executeMCPFunction(name, params);
        console.log(`✅ NodeLLamaCppMCPHandler: ${name} succeded!`);
        return result;
      } catch (error) {
        console.error(`❌ NodeLLamaCppMCPHandler: Error at ${name}:`, error);
        throw error;
      }
    };

    // Convertir al formato esperado por node-llama-cpp
    const nodeLlamaFunction = {
      description: description,
      params: parameters,
      handler: mcpHandler,
    };

    this.functions.set(name, nodeLlamaFunction);
    // console.log(`🔧 NodeLLamaCppMCPHandler: registered: ${name}`);
  }

  /**
   * Obtener estadísticas de funciones (local + MCP)
   */
  getFunctionStats() {
    const localCount = Array.from(this.functions.keys()).filter(name => !name.includes('_')).length;
    const mcpCount = Array.from(this.functions.keys()).filter(name => name.includes('_')).length;

    const mcpStats = this.getMCPStats();

    return {
      local: {
        count: localCount,
        functions: Array.from(this.functions.keys()).filter(name => !name.includes('_'))
      },
      mcp: {
        count: mcpCount,
        functions: Array.from(this.functions.keys()).filter(name => name.includes('_')),
        servers: mcpStats.servers
      },
      total: this.functions.size
    };
  }

  /**
   * Obtener configuración completa para exportar
   */
  async exportConfiguration() {
    const stats = this.getFunctionStats();
    const mcpConfig = this.exportMCPConfiguration();

    return {
      type: 'mcp-native',
      timestamp: new Date().toISOString(),
      stats,
      mcpConfiguration: mcpConfig
    };
  }

  /**
   * Cerrar todas las conexiones MCP
   */
  async cleanup() {
    try {
      await this.cleanupMCP();
      console.log('🧹 NodeLLamaCppMCPHandler: Limpieza completada');
    } catch (error) {
      console.error('❌ NodeLLamaCppMCPHandler: Error en limpieza:', error);
    }
  }

  async print() {
    const stats = this.getFunctionStats();
    console.log("📊 NodeLLamaCppMCPHandler Function Statistics:");
    console.log(`   Local functions: ${stats.local.count}`);
    console.log(`   MCP functions: ${stats.mcp.count}`);
    console.log(`   Total functions: ${stats.total}`);
    if (stats.mcp.servers && stats.mcp.servers.length > 0) {
      console.log(`   MCP servers: ${stats.mcp.servers.join(', ')}`);
    }
    const mcpStats = this.getMCPStats();
    if (mcpStats.lastResultsCount > 0) {
      console.log(`   Last MCP results: ${mcpStats.lastResultsCount}`);
    }
  }
}

/**
 * Factory function para crear handler MCP nativo preconfigurado
 */
async function createMCPModelHandler(config = {}) {
  console.log('🏭 CreateMCPModelHandler: config:', Object.keys(config));

  const {
    modelPath,
    functionSets = ['fruits', 'system'],
    mcpServers = [],
    ...llamaConfig
  } = config;

  console.log('🏭 CreateMCPModelHandler: NodeLLamaCppMCPHandler...');
  const handler = new NodeLLamaCppMCPHandler({
    modelPath,
    functionSets,
    ...llamaConfig
  });

  if (mcpServers.length > 0) {
    console.log(`🏭 CreateMCPModelHandler: MCP Servers ${mcpServers.length}...`);

    const mcpResult = await handler.registerMCPServers(mcpServers);
    console.log(`✅ CreateMCPModelHandler: Registered ${mcpResult.registered} MCP servers, ${mcpResult.errors} errors`);
  }

  console.log('🏭 CreateMCPModelHandler: initializing handler...');
  await handler.initialize();

  console.log(`✅ CreateMCPModelHandler: Handler MCP created with ${handler.getFunctionStats().total} functions`);

  return handler;
}

/**
 * Instancia singleton
 */
let mcpModelHandler = null;

export async function getNodeLlamaCppMCPHandler(config = {}) {
  if (!mcpModelHandler) {
    mcpModelHandler = await createMCPModelHandler(config);
  }
  return mcpModelHandler;
}

/**
 * Configuraciones predefinidas para diferentes escenarios
 */
export const MCP_MODEL_PRESETS = {
  // Con servidor MCP de desarrollo
  development: {
    functionSets: ['fruits', 'system'],
    mcpServers: [
      {
        name: 'localhost',
        url: 'http://localhost:3003',
        transport: 'http'
      }
    ]
  },

  // Configuración completa con múltiples servidores
  full: {
    functionSets: ['fruits', 'system'],
    mcpServers: [
      {
        name: 'devops-mcp',
        url: 'http://localhost:3003',
        transport: 'http'
      },
      {
        name: 'wiki-mcp',
        url: 'http://localhost:3004',
        transport: 'http'
      }
    ]
  }
};