/**
 * Preset Service - Simplified MCP Preset Manager
 * 
 * This is a stripped-down version of ai_service.mjs that ONLY handles:
 * - MCP server catalog listing
 * - Preset management (CRUD)
 * - Health/status endpoints
 * 
 * NO inference, NO GPU, NO LLM models.
 * 
 * Integration branch: integration/beta/scriptorium
 * Date: 2025-12-30
 */

import express from 'express';
import cors from 'cors';

const PORT = process.env.PORT || 4001;

console.log('🚀 Preset Service Configuration:');
console.log(`   Mode: Preset Management Only (No AI Inference)`);
console.log(`   Port: ${PORT}`);
console.log('');

// MCP UI Routes import
let mcpUIRoutes = null;
try {
  const { mcpUIRoutes: mcpRoutes } = await import('./plugins/mcp/mcp_ui_routes.mjs');
  mcpUIRoutes = mcpRoutes;
  console.log('✅ MCP UI Routes loaded successfully');
} catch (error) {
  console.error('❌ MCP UI Routes not available:', error.message);
}

const app = express();
app.use(cors());
app.use(express.json());

let ready = true;
let lastError = null;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    ready: ready,
    mode: 'preset-service',
    error: lastError?.message || null,
    timestamp: Date.now()
  });
});

// Status endpoint
app.get('/status', (req, res) => {
  res.json({
    status: ready ? 'ready' : 'initializing',
    mode: 'preset-service',
    mcpUIRoutes: !!mcpUIRoutes,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Legacy /ai endpoint - Returns informational response (no inference)
app.post('/ai', async (req, res) => {
  console.log("POST /ai received - Preset Service mode (no inference)");
  
  res.json({
    answer: "This service is running in Preset Service mode. AI inference is disabled. Use /ai/ui/mcp/* endpoints for preset management.",
    mode: 'preset-service',
    availableEndpoints: [
      'GET /ai/ui/mcp/list - List MCP servers and capabilities',
      'POST /ai/ui/mcp/set - Create/update a preset',
      'GET /ai/ui/mcp/presets - List all saved presets',
      'GET /ai/ui/mcp/preset/:name - Get specific preset'
    ],
    success: true,
    timestamp: new Date().toISOString()
  });
});

// Register MCP UI routes if available
if (mcpUIRoutes) {
  mcpUIRoutes.registerRoutes(app);
}

app.listen(PORT, () => {
  console.log(`🚀 Preset Service starting on port ${PORT}`);
  console.log(`   Branch: integration/beta/scriptorium`);

  console.log('\n📋 Core Endpoints:');
  console.log('  • POST /ai: Info response (no inference)');
  console.log('  • GET /health: Service health check');
  console.log('  • GET /status: Detailed service status');

  if (mcpUIRoutes) {
    console.log('\n🔧 MCP UI Endpoints (Active):');
    console.log('  • GET /ai/ui/mcp/list: List MCP servers and capabilities');
    console.log('  • POST /ai/ui/mcp/set: Create/update a preset');
    console.log('  • GET /ai/ui/mcp/presets: List all saved presets');
    console.log('  • GET /ai/ui/mcp/preset/:name: Get specific preset');
  } else {
    console.log('\n⚠️ MCP UI Routes not available - preset features disabled');
  }

  console.log('\n✅ Preset Service ready!');
  console.log('   Zeus can now connect to http://localhost:' + PORT + '/ai/ui/mcp/list');
  
}).on('error', (err) => {
  console.error('❌ Failed to start Preset Service:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
  process.exit(1);
});
