import { getMCPFunctionHandler } from './mcp_function_handler.mjs';
import fs from 'fs';
import path from 'path';

/**
 * Manejo de rutas UI para MCP - Gestor de servidores, tools, resources y prompts
 * Este objeto será importado e integrado en ai_service.mjs
 */
export class MCPUIRoutes {
  constructor() {
    this.mcpHandler = getMCPFunctionHandler();
    this.presets = new Map(); // Almacenamiento temporal de presets seleccionados
    this.initialized = false;
    this.knownServers = new Map(); // name -> { url, transport }
  }

  /**
   * GET /ai/ui/mcp/list - Devolver catálogo completo de servidores MCP
   */
  async listMCPCatalog(req, res) {
    try {
      console.log('🔍 MCPUIRoutes: Solicitando catálogo MCP...');

      // Asegurar servidores cargados (lazy init)
      await this.ensureServersLoaded();

      const catalog = await this.buildMCPCatalog();
      
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        catalog,
        serversCount: catalog.length,
        totalTools: catalog.reduce((sum, server) => sum + server.tools.length, 0),
        totalResources: catalog.reduce((sum, server) => sum + server.resources.length, 0),
        totalPrompts: catalog.reduce((sum, server) => sum + server.prompts.length, 0)
      });

    } catch (error) {
      console.error('❌ MCPUIRoutes: Error obteniendo catálogo MCP:', error);
      res.status(500).json({
        success: false,
        error: 'Error retrieving MCP catalog',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Cargar servidores MCP desde configuración si aún no hay ninguno
   */
  async ensureServersLoaded() {
    try {
      // Si ya hay servidores conectados, no hacer nada
      if (this.mcpHandler.extractors && this.mcpHandler.extractors.size > 0) {
        this.initialized = true;
        return;
      }

      if (this.initialized) return;

      // Intentar cargar desde archivo de configuración
      const configPath = path.resolve(process.cwd(), 'AS_MCP_MESH_SDK', 'mcp.json');
      if (!fs.existsSync(configPath)) {
        console.warn(`⚠️ MCPUIRoutes: Archivo de configuración no encontrado: ${configPath}`);
        return;
      }

      const raw = fs.readFileSync(configPath, 'utf-8');
      let cfg;
      try {
        cfg = JSON.parse(raw);
      } catch (e) {
        console.error('❌ MCPUIRoutes: Error parseando mcp.json:', e.message);
        return;
      }

      const servers = cfg.servers || {};
      const entries = Object.entries(servers);
      if (entries.length === 0) {
        console.warn('⚠️ MCPUIRoutes: No hay servidores definidos en mcp.json');
        return;
      }

      console.log(`🔧 MCPUIRoutes: Registrando ${entries.length} servidores MCP desde mcp.json...`);

      const registrations = entries.map(async ([name, conf]) => {
        const transport = conf.type || conf.transport || 'http';
        const serverConfig = conf.url || conf; // permitir url directo o objeto
        try {
          return await this.mcpHandler.registerServer(name, serverConfig, transport);
        } catch (err) {
          console.error(`❌ MCPUIRoutes: Error registrando servidor ${name}:`, err.message);
          return null;
        }
      });

      const results = await Promise.all(registrations);
      const ok = results.filter(Boolean).length;
      console.log(`✅ MCPUIRoutes: Servidores registrados: ${ok}/${entries.length}`);
      this.initialized = true;
    } catch (error) {
      console.error('❌ MCPUIRoutes: Error en ensureServersLoaded:', error);
    }
  }

  /**
   * POST /ai/ui/mcp/set - Configurar preset de tools/resources/prompts seleccionados
   */
  async setMCPPreset(req, res) {
    try {
      console.log('⚙️ MCPUIRoutes: Configurando preset MCP...');

      const { presetName, selectedItems } = req.body;

      if (!presetName || !selectedItems) {
        return res.status(400).json({
          success: false,
          error: 'presetName and selectedItems are required',
          timestamp: new Date().toISOString()
        });
      }

      // Validar formato de selectedItems
      const validationResult = this.validateSelectedItems(selectedItems);
      if (!validationResult.valid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid selectedItems format',
          details: validationResult.errors,
          timestamp: new Date().toISOString()
        });
      }

      // Almacenar preset temporalmente
      const preset = {
        name: presetName,
        items: selectedItems,
        createdAt: new Date().toISOString(),
        itemsCount: this.countPresetItems(selectedItems)
      };

      this.presets.set(presetName, preset);

      console.log(`✅ MCPUIRoutes: Preset '${presetName}' configurado con ${preset.itemsCount.total} elementos`);

      res.json({
        success: true,
        preset: {
          name: presetName,
          itemsCount: preset.itemsCount,
          createdAt: preset.createdAt
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ MCPUIRoutes: Error configurando preset MCP:', error);
      res.status(500).json({
        success: false,
        error: 'Error setting MCP preset',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /ai/ui/mcp/presets - Listar presets guardados
   */
  async listMCPPresets(req, res) {
    try {
      const presets = Array.from(this.presets.values()).map(preset => ({
        name: preset.name,
        itemsCount: preset.itemsCount,
        createdAt: preset.createdAt
      }));

      res.json({
        success: true,
        presets,
        totalPresets: presets.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ MCPUIRoutes: Error listando presets:', error);
      res.status(500).json({
        success: false,
        error: 'Error listing presets',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /ai/ui/mcp/preset/:name - Obtener preset específico
   */
  async getMCPPreset(req, res) {
    try {
      const { name } = req.params;
      const preset = this.presets.get(name);

      if (!preset) {
        return res.status(404).json({
          success: false,
          error: `Preset '${name}' not found`,
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        preset,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ MCPUIRoutes: Error obteniendo preset:', error);
      res.status(500).json({
        success: false,
        error: 'Error getting preset',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Construir catálogo completo de servidores MCP con sus capabilities
   */
  async buildMCPCatalog() {
    try {
      const catalog = [];

      // Obtener todos los extractors registrados
      const extractors = this.mcpHandler.extractors;
      const functionConfigs = this.mcpHandler.functionConfigs;

      for (const [serverName, extractor] of extractors) {
        try {
          console.log(`🔄 Extrayendo metadata de servidor: ${serverName}`);

          // Obtener metadata completa del servidor
          const metadata = await extractor.extractCompleteMetadata();

          const serverEntry = {
            serverName,
            serverInfo: metadata.serverInfo || { name: serverName },
            isConnected: extractor.isConnected,
            extractedAt: metadata.extractedAt,
            tools: this.formatTools(metadata.tools || []),
            resources: this.formatResources(metadata.resources || []),
            prompts: this.formatPrompts(metadata.prompts || [])
          };

          catalog.push(serverEntry);

        } catch (serverError) {
          console.warn(`⚠️ Error extrayendo metadata de ${serverName}:`, serverError.message);
          
          // Incluir servidor con error en el catálogo
          catalog.push({
            serverName,
            serverInfo: { name: serverName, error: true },
            isConnected: false,
            error: serverError.message,
            tools: [],
            resources: [],
            prompts: []
          });
        }
      }

      // Incluir servidores conocidos que no lograron conectar
      for (const [name, conf] of this.knownServers) {
        if (!Array.from(extractors.keys()).includes(name)) {
          catalog.push({
            serverName: name,
            serverInfo: { name, url: conf.url },
            isConnected: false,
            error: 'not connected',
            tools: [],
            resources: [],
            prompts: []
          });
        }
      }

      return catalog;

    } catch (error) {
      console.error('❌ Error construyendo catálogo MCP:', error);
      throw error;
    }
  }

  /**
   * Formatear tools para la respuesta JSON
   */
  formatTools(tools) {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description || 'No description available',
      parameters: tool.inputSchema || {},
      type: 'tool'
    }));
  }

  /**
   * Formatear resources para la respuesta JSON
   */
  formatResources(resources) {
    return resources.map(resource => ({
      name: resource.name,
      description: resource.description || 'No description available',
      uri: resource.uri,
      mimeType: resource.mimeType,
      type: 'resource'
    }));
  }

  /**
   * Formatear prompts para la respuesta JSON
   */
  formatPrompts(prompts) {
    return prompts.map(prompt => ({
      name: prompt.name,
      description: prompt.description || 'No description available',
      arguments: prompt.arguments || [],
      type: 'prompt'
    }));
  }

  /**
   * Validar formato de selectedItems
   */
  validateSelectedItems(selectedItems) {
    const errors = [];

    if (!Array.isArray(selectedItems)) {
      errors.push('selectedItems must be an array');
      return { valid: false, errors };
    }

    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];

      if (!item.serverName) {
        errors.push(`Item ${i}: serverName is required`);
      }

      if (!item.type || !['tool', 'resource', 'prompt'].includes(item.type)) {
        errors.push(`Item ${i}: type must be 'tool', 'resource', or 'prompt'`);
      }

      if (!item.name) {
        errors.push(`Item ${i}: name is required`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Contar elementos en preset
   */
  countPresetItems(selectedItems) {
    const counts = {
      tools: 0,
      resources: 0,
      prompts: 0,
      total: selectedItems.length
    };

    selectedItems.forEach(item => {
      if (item.type === 'tool') counts.tools++;
      else if (item.type === 'resource') counts.resources++;
      else if (item.type === 'prompt') counts.prompts++;
    });

    return counts;
  }

  /**
   * Obtener preset para uso interno (por ejemplo, en la ruta /ai)
   */
  getPreset(presetName) {
    return this.presets.get(presetName);
  }

  /**
   * Verificar si un preset existe
   */
  hasPreset(presetName) {
    return this.presets.has(presetName);
  }

  /**
   * Registrar las rutas en Express app
   */
  registerRoutes(app) {
    // Bind context para mantener 'this' correcto
    app.get('/ai/ui/mcp/list', this.listMCPCatalog.bind(this));
    app.post('/ai/ui/mcp/set', this.setMCPPreset.bind(this));
    app.get('/ai/ui/mcp/presets', this.listMCPPresets.bind(this));
    app.get('/ai/ui/mcp/preset/:name', this.getMCPPreset.bind(this));

    console.log('📋 MCPUIRoutes: UI routes registered (list/set/presets/preset/:name)');

    // Disparar carga en segundo plano sin bloquear el arranque
    this.ensureServersLoaded().catch(() => {});
  }
}

// Exportar instancia singleton
export const mcpUIRoutes = new MCPUIRoutes();