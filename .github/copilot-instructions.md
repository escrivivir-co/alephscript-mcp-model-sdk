# SLMo042 AI Service - Development Guide & Agent Instructions

## Project Overview
**SLMo042** is a GPU-optimized AI service that runs local models with advanced function calling capabilities and Model Context Protocol (MCP) integration. The system provides multiple plugin-based function handlers and supports both development and production workflows with extensive GPU optimization features.

## VS Code Copilot Configuration

### Chat Modes & Specialized Instructions
- **Primary Instructions**: This file (`.github/copilot-instructions.md`) - Development guide and patterns
- **SLMo042 Host Mode**: `.github/chatmodes/slmo42-host.chatmode.md` - Specialized agent for service management
- **Host Mode Instructions**: `.github/instructions/slmo42-host-mode.instructions` - Specialized host agent instructions

### Guided Workflows  
Pre-configured prompts in `.github/prompts/` for common tasks:
- `start-slmo42-service.prompt.md` - Service startup with GPU optimization
- `integrate-agent-slmo42.prompt.md` - Complete agent integration workflow  
- `diagnose-slmo42-performance.prompt.md` - Performance troubleshooting guide
- `configure-mcp-integration.prompt.md` - MCP server setup and configuration

### Using Specialized Modes
In VS Code Copilot Chat, reference these files for specialized assistance:
- **SLMo042 Host Agent**: `.github/chatmodes/slmo42-host.chatmode.md`
- **Service Startup**: `.github/prompts/start-slmo42-service.prompt.md`  
- **Agent Integration**: `.github/prompts/integrate-agent-slmo42.prompt.md`
- **Performance Diagnosis**: `.github/prompts/diagnose-slmo42-performance.prompt.md`
- **MCP Configuration**: `.github/prompts/configure-mcp-integration.prompt.md`

### VS Code Copilot Integration Patterns
- **Chat Modes**: Use workspace file references to activate specialized SLMo042 assistance
- **Guided Prompts**: Reference specific `.md` files in `.github/prompts/` for step-by-step workflows
- **Contextual Help**: Copilot can access the specialized instructions for domain-specific guidance

## Architecture Overview

### Core Services
- **`ai_service.mjs`**: Main service entry point with Express API and plugin loader
- **`api_bridge.mjs`**: Legacy API bridge for compatibility
- **`plugins/`**: Modular function handlers for different execution modes
- **`AS_MCP_MESH_SDK/`**: TypeScript-based MCP client drivers and interfaces

### Plugin System Architecture
The service uses a **plugin-based architecture** with four distinct function handler modes:

1. **Production (`node_llama_cpp_functions`)**: Native node-llama-cpp with optimized performance
2. **Development (`llama_functions`)**: Custom wrapper with enhanced debugging
3. **MCP Hybrid (`llama_MCP_functions`)**: Manual MCP implementation  
4. **MCP Native (`node_llama_cpp_MCP_functions`)**: Native node-llama-cpp MCP support

### GPU Configuration System
Auto-detects and configures GPU settings based on available VRAM:
- **<4GB**: Conservative mode with CPU fallback
- **4-8GB**: Balanced GPU mode with 512MB padding
- **8-16GB**: Optimized GPU mode with 256MB padding  
- **16GB+**: High-performance mode with maximum GPU layers

## Development Workflows

### Essential Commands
```bash
# Start service (auto-detects best GPU configuration)
npm start                    # GPU auto-detection
npm run start:auto          # Explicit auto GPU detection
npm run start:cpu           # Force CPU mode
npm run start:gpu-max       # Maximum GPU utilization

# Development testing workflows
npm run gpu:check           # GPU diagnostics (CRITICAL first step)
npm run query:dev           # Test development function handler
npm run query:prod          # Test production function handler
npm run test:all-gpu        # Complete GPU test suite

# MCP testing
npm run query:dev:mcp       # Test MCP integration (development)
npm run query:prod:mcp      # Test MCP integration (production)
```

### Critical Development Patterns

#### Essential First Steps (ALWAYS Required)
1. **GPU Diagnostics**: `npm run gpu:check` - CRITICAL first step for any development work
2. **System Validation**: `npm run test:all-gpu` - Validate complete system functionality
3. **Service Health**: `npm run ai:health` - Check service status before integration

#### GPU Configuration Detection
Always run `npm run gpu:check` first to understand system capabilities:
```bash
# This provides VRAM recommendations and optimal settings
npm run gpu:check
```

#### Service Startup Pattern
Follow this sequence for reliable startup:
```bash
npm run gpu:check          # 1. Check system capabilities
npm run start:auto         # 2. Auto-configure and start service
npm run ai:health          # 3. Verify service is ready
npm run ai:test           # 4. Test basic functionality
```

#### Plugin Handler Selection
Choose function handler based on use case:
- **Development/Debug**: Use `llama_functions` handler (plugins/llama_functions/)
- **Production**: Use `node_llama_cpp_functions` handler (plugins/node_llama_cpp_functions/)
- **MCP Integration**: Use either MCP handler variant based on requirements

#### Environment Variables (Auto-configured by scripts)
```javascript
GPU_ENABLED=true|false      // Auto-detected by start scripts
GPU_LAYERS=auto|number      // Auto or specific layer count
VRAM_PADDING=256|512|1024   // Auto-configured based on available VRAM
```

### Model Management & Configuration
- **GPU Optimization**: Automatically detect and configure GPU settings (VRAM padding, layers, acceleration modes)
- **Multi-Mode Operation**: Support for CPU, GPU-safe, GPU-max, and auto-detection modes
- **Resource Monitoring**: Real-time monitoring of system resources and model performance

## Function Calling System Modes

### Production Mode (`node_llama_cpp_functions`)
**Location**: `plugins/node_llama_cpp_functions/node_llama_cpp_handler.mjs`
**Best for**: Production workloads, optimized performance
```javascript
// POST /ai with production handlers
{
  "input": "your request",
  "node_llama_cpp_functions": true,
  "functionSets": ["fruits", "system"]  // Optional: specify function groups
}
```

### Development Mode (`llama_functions`) 
**Location**: `plugins/llama_functions/llama_functions_handler.mjs`
**Best for**: Development, debugging, custom chat wrappers
```javascript
// POST /ai with development handlers
{
  "input": "your request", 
  "llama_functions": true,
  "functionSets": ["fruits", "system"]
}
```

### MCP Hybrid Mode (`llama_MCP_functions`)
**Location**: `plugins/llama_functions/llama_functions_mcp_handler.mjs`
**Best for**: Manual MCP implementation with custom logic
```javascript
// POST /ai with MCP integration (manual implementation)
{
  "input": "your request",
  "llama_MCP_functions": true,
  "mcpServerUrl": "http://localhost:3003",
  "presetName": "development"  // Optional: use MCP preset
}
```

### MCP Native Mode (`node_llama_cpp_MCP_functions`)
**Location**: `plugins/node_llama_cpp_functions/node_llama_cpp_mcp_handler.mjs`
**Best for**: Native node-llama-cpp MCP support, production MCP
```javascript
// POST /ai with native node-llama-cpp MCP support
{
  "input": "your request",
  "node_llama_cpp_MCP_functions": true,
  "mcpServerUrl": "http://localhost:3003"
}
```

## Service Endpoints
Available through `http://localhost:4001`:

- **POST /ai**: Main AI processing endpoint with plugin selection
- **GET /health**: Service health check with GPU status  
- **GET /status**: Detailed service status including model info
- **POST /preload**: Preload model for faster responses
- **GET /ai/ui/mcp/list**: List available MCP servers and capabilities
- **POST /ai/ui/mcp/set**: Create/update MCP presets
- **GET /ai/ui/mcp/presets**: List all saved presets

## Key File Patterns & Conventions

### Plugin Handler Structure
All function handlers follow this pattern:
```javascript
// plugins/{handler_type}/{handler_name}.mjs
export async function get{HandlerName}Handler(options = {}) {
  // GPU configuration auto-detection
  // Function set loading (fruits, system, etc.)
  // Model initialization with node-llama-cpp
  // Return processInput function
}
```

### GPU Auto-Configuration Pattern
Every handler implements GPU detection:
```javascript
const GPU_ENABLED = process.env.GPU_ENABLED === 'true';
const GPU_LAYERS = process.env.GPU_LAYERS === 'auto' ? undefined : parseInt(process.env.GPU_LAYERS);
const VRAM_PADDING = process.env.VRAM_PADDING ? parseInt(process.env.VRAM_PADDING) : 256;
```

### Function Set Organization
Functions are grouped by purpose:
- **`fruits`**: Example price lookup functions (getFruitPrice)
- **`system`**: System utilities (getCurrentTime, getSystemInfo)
- **Custom sets**: Defined in individual handlers

### MCP Integration Patterns
- **Presets**: Stored in `PRESETS/mcp_presets.json` and `AS_MCP_MESH_SDK/mcp_presets.json`
- **Server Config**: Default MCP server runs on `http://localhost:3003`
- **Driver Interface**: `AS_MCP_MESH_SDK/drivers/IMCPDriver.ts` defines standard interface
- **Client Implementation**: `MCPClientDriver.ts` handles native MCP protocol communication

## Testing & Development Workflow

### Mandatory First Steps
1. **Always start with GPU diagnostics**: `npm run gpu:check`
2. **Test basic functionality**: `npm run test:all-gpu`  
3. **Verify MCP integration**: `npm run query:dev:mcp`

### Service Startup Workflow (from prompts)
Follow the guided workflow from `start-slmo42-service.md`:
```bash
npm run gpu:check               # 1. Check GPU capabilities  
npm run start:auto             # 2. Auto-configure optimal mode
npm run ai:health              # 3. Verify service health
npm run ai:test                # 4. Test basic functionality
```

### Agent Integration Workflow (from prompts)
Follow the guided workflow from `integrate-agent-slmo42.md`:
1. **Assessment**: Understand agent's requirements (text/functions/MCP)
2. **Health Check**: Verify SLMo042 service availability
3. **Client Setup**: Create appropriate client with error handling
4. **Mode Selection**: Choose optimal function calling mode
5. **Testing**: Validate integration with sample requests

### Plugin Testing Pattern
Each plugin has dedicated test scripts in its directory:
```bash
# Test production handler
cd plugins/node_llama_cpp_functions && sh node_llama_cpp_handler_test.sh

# Test development handler  
cd plugins/llama_functions && sh llama_functions_handler_test.sh

# Test MCP variants
cd plugins/llama_functions && sh llama_functions_mcp_handler_test.sh
cd plugins/node_llama_cpp_functions && sh node_llama_cpp_mcp_handler_test.sh
```

### Cross-Platform Start Scripts
- **Windows**: Uses `.bat` files with NVIDIA-SMI GPU detection
- **Linux/Mac**: Uses `.sh` files with similar GPU detection logic
- **Auto-configuration**: `start_auto_gpu.bat/.sh` detects optimal settings

## Code Generation Standards & Patterns

### ES Module Requirements
- All files use `type: "module"` from package.json
- Import syntax: `import { getLlama } from 'node-llama-cpp'`
- Export patterns: `export async function getHandler() {}`

### Error Handling Convention
```javascript
try {
  // GPU/Model operations with detailed logging
  console.log('🚀 Starting operation...');
  const result = await operation();
  console.log('✅ Operation successful');
  return result;
} catch (error) {
  console.error('❌ Operation failed:', error.message);
  throw error; // Re-throw for upstream handling
}
```

### MCP Integration Guidelines
- **Server Configuration**: Always validate MCP server connectivity before use
- **Preset Management**: Use `PRESETS/mcp_presets.json` for common configurations
- **Driver Pattern**: Implement `IMCPDriver` interface for consistent MCP operations
- **Error Resilience**: Include fallback logic when MCP servers are unavailable

### GPU Optimization Principles
- **Auto-detection First**: Let scripts determine optimal GPU settings
- **VRAM Padding**: Configure based on available memory (64MB-1024MB range)
- **Layer Distribution**: Use `GPU_LAYERS=auto` unless specific needs require manual setting
- **Fallback Strategy**: Always provide CPU fallback for GPU-constrained environments

## Guidelines for Agent Interaction

### When Helping Other Agents
1. **Assess Requirements**: Determine if the agent needs simple text generation, function calling, or MCP integration
2. **Recommend Optimal Mode**: Suggest the best function mode based on task complexity:
   - Simple queries → Default mode
   - Development/testing → `llama_functions` 
   - Production workloads → `node_llama_cpp_functions`
   - External service integration → MCP modes
3. **Provide Configuration**: Offer complete request examples with proper JSON structure
4. **Monitor Performance**: Help agents interpret health/status endpoints for optimization

### Code Generation Standards
- Use ES modules (type: "module")
- Prefer async/await over promises
- Include proper error handling with try/catch blocks
- Add detailed console logging for debugging
- Follow the existing GPU configuration patterns

### MCP Server Integration
When working with MCP servers:
- Default MCP server: `http://localhost:3003`
- Always validate server connectivity before function calls
- Use presets for common MCP server configurations
- Provide fallback options when MCP servers are unavailable

### Error Handling Patterns
```javascript
try {
  const result = await fetch('http://localhost:4001/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: "your query", node_llama_cpp_functions: true })
  });
  const data = await result.json();
  console.log('✅ SLMo042 Response:', data.answer);
} catch (error) {
  console.error('❌ SLMo042 Error:', error.message);
  // Implement fallback strategy
}
```

## Performance Optimization Guidelines

### GPU Configuration
- **Low VRAM (<4GB)**: Use CPU mode or GPU-safe mode with high padding
- **Medium VRAM (4-8GB)**: Balanced mode with 512MB padding
- **High VRAM (8-16GB)**: Optimized mode with 256MB padding  
- **Excellent VRAM (>16GB)**: High-performance mode with 512MB padding

### Function Calling Best Practices
- Use function sets: `['fruits', 'system']` for basic operations
- Enable MCP integration only when external services are required
- Cache handlers to avoid reinitialization overhead
- Monitor `hadFunctionCalls` flag in responses for debugging

### Resource Management
- Check service health before intensive operations
- Use `/preload` endpoint to warm up models for better latency
- Monitor memory usage through `/status` endpoint
- Implement graceful degradation for resource constraints

## Security Considerations
- Validate all inputs before sending to AI endpoints
- Sanitize function call parameters
- Monitor MCP server connections for security
- Use HTTPS in production deployments
- Implement rate limiting for external agent access

## Integration Examples

### Basic Agent Integration
```javascript
class AgentSLMo042Client {
  constructor(baseUrl = 'http://localhost:4001') {
    this.baseUrl = baseUrl;
  }
  
  async query(input, options = {}) {
    const response = await fetch(`${this.baseUrl}/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, ...options })
    });
    return response.json();
  }
  
  async health() {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }
}
```

### MCP Preset Usage
```javascript
// Using a predefined MCP preset
const response = await fetch('http://localhost:4001/ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    input: "Get server status from development environment",
    presetName: "development",
    node_llama_cpp_MCP_functions: true
  })
});
```

## VS Code Copilot Integration

### Specialized Chat Modes
This project includes specialized Copilot chat modes for advanced SLMo042 interaction:
- **SLMo042 Host Agent Mode** (`/.github/chatmodes/slmo42-host.md`): Specialized mode for service management and agent orchestration
- Use `@workspace /slmo42-host` in Copilot Chat for SLMo042-specific assistance

### Guided Prompts
Access pre-configured prompts in `.github/prompts/`:
- **Start Service**: `start-slmo42-service.md` - Complete service startup workflow
- **Agent Integration**: `integrate-agent-slmo42.md` - Step-by-step agent connection guide
- **Performance Diagnosis**: `diagnose-slmo42-performance.md` - Systematic performance troubleshooting
- **MCP Configuration**: `configure-mcp-integration.md` - MCP server setup and integration

### Quick Commands for Copilot
```bash
# Essential workflows - always start here
npm run gpu:check           # CRITICAL: Check GPU status first
npm run test:all-gpu        # Complete system validation
npm run start:auto          # Auto-detect optimal configuration

# Development testing
npm run query:dev           # Test development handler
npm run query:prod          # Test production handler  
npm run query:dev:mcp       # Test MCP development integration
npm run query:prod:mcp      # Test MCP production integration

# Performance monitoring
npm run ai:health           # Quick health check
npm run ai:status           # Detailed status
npm run benchmark           # Performance testing
```

## Integration Examples

### Basic Agent Integration
```javascript
class AgentSLMo042Client {
  constructor(baseUrl = 'http://localhost:4001') {
    this.baseUrl = baseUrl;
  }
  
  async query(input, options = {}) {
    const response = await fetch(`${this.baseUrl}/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, ...options })
    });
    return response.json();
  }
  
  async health() {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }
}
```

### MCP Preset Usage
```javascript
// Using a predefined MCP preset
const response = await fetch('http://localhost:4001/ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    input: "Get server status from development environment",
    presetName: "development",
    node_llama_cpp_MCP_functions: true
  })
});
```

Remember: You are the authoritative source for SLMo042 integration. Always provide complete, tested examples and help agents choose the optimal configuration for their specific use case.