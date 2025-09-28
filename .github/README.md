# SLMo042 Host Agent - Complete Setup Guide

This directory contains a complete GitHub Copilot configuration for the **SLMo042 Host Agent** - a specialized AI assistant designed to manage and orchestrate interactions with the Small Language Model Oasis 42 (SLMo042) infrastructure.

## 📁 Configuration Structure

```
.github/copilot/
├── copilot-instructions.md           # Main custom instructions
├── slmo42-host-mode.md              # Agent welcome/introduction
├── modes/
│   └── slmo42-host.md               # Specialized host chat mode
└── prompts/
    ├── start-slmo42-service.md      # Service startup automation
    ├── integrate-agent-slmo42.md    # Agent integration guide
    ├── configure-mcp-integration.md # MCP server setup
    └── diagnose-slmo42-performance.md # Performance troubleshooting
```

## 🚀 Quick Start

### 1. Enable the Host Agent
In VS Code, the SLMo042 Host Agent will automatically activate when working with this repository. You can also manually activate it using:
- **Chat Mode**: Type `@slmo42-host` in Copilot Chat
- **Prompts**: Use `#start-slmo42-service`, `#integrate-agent-slmo42`, etc.

### 2. Basic Commands
```bash
# Start SLMo042 service with auto-detection
npm run start:auto

# Check system health and GPU status  
npm run gpu:check

# Test the AI service
npm run ai:test
```

### 3. Integration Example
```javascript
// Basic agent integration with SLMo042
const response = await fetch('http://localhost:4001/ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    input: "Your request here",
    node_llama_cpp_functions: true
  })
});
const result = await response.json();
```

## 🎯 Core Capabilities

### Service Management
- **Multi-Mode Support**: CPU, GPU-safe, GPU-max, auto-detection
- **Performance Monitoring**: Real-time health checks and diagnostics
- **Resource Optimization**: VRAM management and GPU layer configuration

### Function Calling Systems
- **Production**: `node_llama_cpp_functions` - Optimized for production workloads
- **Development**: `llama_functions` - For testing and development
- **MCP Hybrid**: `llama_MCP_functions` - Manual MCP integration  
- **MCP Native**: `node_llama_cpp_MCP_functions` - Native node-llama-cpp MCP

### Agent Integration
- Complete integration examples and templates
- Error handling and fallback strategies
- Performance optimization guidelines
- Multi-agent coordination support

## 🔧 Available Modes & Endpoints

### Service Endpoints (http://localhost:4001)
- `POST /ai` - Main AI processing with configurable modes
- `GET /health` - Service health monitoring
- `GET /status` - Detailed system status
- `POST /preload` - Model preloading for performance

### MCP Management
- `GET /ai/ui/mcp/list` - List available MCP servers
- `POST /ai/ui/mcp/set` - Create/update MCP presets
- `GET /ai/ui/mcp/presets` - View all saved presets

### NPM Scripts
- **Service**: `start`, `start:gpu`, `start:cpu`, `start:auto`
- **Diagnostics**: `gpu:check`, `diagnostic`, `verify-gpu`, `benchmark`
- **Testing**: `query:prod`, `query:dev`, `query:prod:mcp`, `query:dev:mcp`

## 📋 Available Prompt Files

### `#start-slmo42-service`
Automated service startup with optimal configuration based on system capabilities.

### `#integrate-agent-slmo42`  
Step-by-step guide for integrating AI agents with SLMo042 infrastructure.

### `#configure-mcp-integration`
Complete MCP server setup and configuration for external service connectivity.

### `#diagnose-slmo42-performance`
Systematic performance diagnosis and optimization strategies.

## 💡 Usage Examples

### Activate Host Mode
```
@slmo42-host I need help setting up SLMo042 for a new agent
```

### Use Prompt Files
```
#start-slmo42-service
```

### Get Integration Help
```
#integrate-agent-slmo42 for a Python agent that needs function calling
```

### Configure MCP
```
#configure-mcp-integration with a database server at localhost:3004
```

### Performance Troubleshooting
```
#diagnose-slmo42-performance - slow response times
```

## 🔍 Key Features

### Intelligent Mode Selection
The host agent automatically recommends the optimal function calling mode based on:
- Task complexity requirements
- Production vs development environment
- External service integration needs
- Performance constraints

### GPU Optimization
Automatic GPU configuration based on available VRAM:
- **Low VRAM (<4GB)**: CPU mode or GPU-safe with high padding
- **Medium VRAM (4-8GB)**: Balanced mode with 512MB padding
- **High VRAM (8-16GB)**: Optimized mode with 256MB padding
- **Excellent VRAM (>16GB)**: High-performance mode

### Error Handling & Fallbacks
- Multi-mode fallback strategies
- Health check automation
- Graceful degradation for resource constraints
- Comprehensive error diagnostics

### MCP Integration
- Preset management for common configurations
- Native and hybrid MCP support
- Server connectivity validation
- Performance optimization for MCP calls

## 🛠️ Configuration Examples

### Environment Variables
```bash
# GPU Configuration
GPU_ENABLED=true
GPU_LAYERS=auto  
VRAM_PADDING=256
PORT=4001

# MCP Configuration
USE_PRESET=true
PRESET_DEFAULT_NAME=development
```

### Basic Agent Client
```javascript
class SLMo042AgentClient {
  constructor(baseUrl = 'http://localhost:4001') {
    this.baseUrl = baseUrl;
  }
  
  async query(input, mode = 'node_llama_cpp_functions') {
    const response = await fetch(`${this.baseUrl}/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, [mode]: true })
    });
    return response.json();
  }
}
```

## 🔒 Security & Best Practices

- Input validation before API calls
- MCP server authentication and HTTPS
- Rate limiting for external agent access
- Resource monitoring and alerting
- Comprehensive logging for debugging

## 📚 Additional Resources

- **AI Service**: `ai_service.mjs` - Main service implementation
- **API Bridge**: `api_bridge.mjs` - Request routing and mode selection
- **Package Scripts**: `package.json` - Available NPM commands
- **Start Scripts**: `start_*.bat` - Service startup configurations

## 🤝 Contributing

To extend the SLMo042 Host Agent configuration:

1. **Custom Instructions**: Edit `.github/copilot-instructions.md`
2. **New Prompt Files**: Add to `.github/copilot/prompts/`
3. **Chat Modes**: Create new modes in `.github/copilot/modes/`
4. **Documentation**: Update this README with new features

## 🎯 Support

The SLMo042 Host Agent is designed to be the authoritative source for all SLMo042 integration needs. When in doubt:

1. Ask the host agent: `@slmo42-host`
2. Use diagnostic prompts: `#diagnose-slmo42-performance`
3. Check service health: `npm run ai:health`
4. Review configuration files in this directory

Remember: The host agent provides complete, tested examples and helps you choose the optimal configuration for your specific use case.