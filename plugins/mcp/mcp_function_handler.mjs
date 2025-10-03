import { MCPToolsExtractor } from './mcp_tools_extractor.mjs';
import { MCPSchemaTransformer } from './mcp_schema_transformer.mjs';

export class MCPFunctionHandler {
  constructor() {
    this.extractors = new Map(); // serverName -> MCPToolsExtractor
    this.transformers = new Map(); // serverName -> MCPSchemaTransformer  
    this.functionConfigs = new Map(); // serverName -> config
    this.isInitialized = false;
  }

  async registerServer(serverName, serverConfig, transportType = 'http') {
    try {
      const extractor = new MCPToolsExtractor();
      await extractor.connectToServer(serverConfig, transportType, serverName);

      const metadata = await extractor.extractCompleteMetadata();

      // Use the original configured server name instead of derived name
      const actualServerName = serverName;
      const transformer = new MCPSchemaTransformer(actualServerName);

      const { functionConfig } = transformer.transformCompleteMetadata(metadata);

      this.extractors.set(actualServerName, extractor);
      this.transformers.set(actualServerName, transformer);
      this.functionConfigs.set(actualServerName, functionConfig);

      console.log(`✅ Registered server: ${actualServerName} (${metadata.tools.length} tools)`);

      return {
        serverName: actualServerName,
        toolsCount: metadata.tools.length,
        functionConfig: functionConfig[actualServerName]
      };

    } catch (error) {
      console.error(`❌ Error registrando servidor ${serverName}:`, error);
      throw error;
    }
  }

  getAllFunctions() {
    const allFunctions = {};

    for (const [serverName, config] of this.functionConfigs) {

      const serverFunctions = { ...config[serverName] };

      for (const [toolName, functionDef] of Object.entries(serverFunctions)) {

        functionDef.handler = async (params) => {
          return await this.executeFunction(serverName, toolName, params);
        };
      }

      allFunctions[serverName] = serverFunctions;
    }

    return allFunctions;
  }

  async executeFunction(serverName, toolName, parameters = {}) {
    try {
      const extractor = this.extractors.get(serverName);
      if (!extractor) {
        throw new Error(`Servidor no registrado: ${serverName}`);
      }

      if (!extractor.isConnected) {
        throw new Error(`Servidor desconectado: ${serverName}`);
      }

      // Ejecutar la tool en el servidor MCP
      console.log(`🔧 Execute ${serverName}.${toolName} with params:`, parameters);

      const result = await extractor.callTool(toolName, parameters);

      console.log(`✅ Back from ${serverName}.${toolName}!`);

      // Formatear resultado para node-llama-cpp
      return this.formatResult(result);

    } catch (error) {
      console.error(`❌ Error ejecutando ${serverName}.${toolName}:`, error);

      // Retornar error formateado
      return {
        error: true,
        message: error.message,
        tool: `${serverName}.${toolName}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Parse from MPC Server (generic) to node-llama-cpp format
   */
  formatResult(mcpResult) {
    if (!mcpResult || mcpResult.length === 0) {
      return { success: true, result: null };
    }

    if (Array.isArray(mcpResult)) {
      const firstResult = mcpResult[0];

      if (firstResult?.type === 'text') {
        return { success: true, result: firstResult.text };
      }

      if (firstResult?.type === 'resource') {
        return {
          success: true,
          result: firstResult.resource,
          type: 'resource'
        };
      }

      return { success: true, result: mcpResult };
    }

    return { success: true, result: mcpResult };
  }

  getServersStatus() {
    const status = {};

    for (const [serverName, extractor] of this.extractors) {
      const config = this.functionConfigs.get(serverName);
      const toolCount = config ? Object.keys(config[serverName] || {}).length : 0;

      status[serverName] = {
        connected: extractor.isConnected,
        toolsCount: toolCount,
        serverInfo: extractor.serverInfo
      };
    }

    return status;
  }

  async disconnectServer(serverName) {
    const extractor = this.extractors.get(serverName);
    if (extractor) {
      await extractor.disconnect();
      this.extractors.delete(serverName);
      this.transformers.delete(serverName);
      this.functionConfigs.delete(serverName);
      console.log(`🔌 Desconected server ${serverName}!`);
    }
  }

  async disconnectAll() {
    const disconnectPromises = [];

    for (const [serverName, extractor] of this.extractors) {
      disconnectPromises.push(extractor.disconnect());
    }

    await Promise.all(disconnectPromises);

    this.extractors.clear();
    this.transformers.clear();
    this.functionConfigs.clear();

    console.log('🔌 All MCP servers disconnected!');
  }

  exportConfiguration() {
    const config = {
      servers: {},
      functions: this.getAllFunctions(),
      metadata: {
        serversCount: this.extractors.size,
        totalFunctions: 0,
        exportedAt: new Date().toISOString()
      }
    };

    for (const serverFunctions of Object.values(config.functions)) {
      config.metadata.totalFunctions += Object.keys(serverFunctions).length;
    }

    for (const [serverName, extractor] of this.extractors) {
      config.servers[serverName] = {
        serverInfo: extractor.serverInfo,
        connected: extractor.isConnected
      };
    }

    return config;
  }
}

// singleton 
let mcpFunctionHandler = null;

export function getMCPFunctionHandler() {
  if (!mcpFunctionHandler) {
    mcpFunctionHandler = new MCPFunctionHandler();
  }
  return mcpFunctionHandler;
}