

# Configure MCP Server Integration

Set up and configure Model Context Protocol (MCP) server integration with SLMo042 for external service connectivity.

## MCP Overview

MCP allows SLMo042 to connect with external services and tools beyond local functions. The system supports both manual hybrid integration and native node-llama-cpp MCP support.

## Available MCP Modes

### 1. Manual Hybrid (`llama_MCP_functions`)
- Combines local functions with MCP server functions  
- More flexible but requires manual configuration
- Best for development and testing

### 2. Native Integration (`node_llama_cpp_MCP_functions`)  
- Uses node-llama-cpp built-in MCP support
- More efficient and stable
- Recommended for production use

## Configuration Steps

### Step 1: Check Available MCP Servers
```bash
# List current MCP servers and capabilities
curl -s http://localhost:4001/ai/ui/mcp/list | jq .

# Alternative: Direct browser access
# Open http://localhost:4001/ai/ui/mcp/list
```

### Step 2: Configure MCP Server
```javascript
// Register a new MCP server
const mcpConfig = {
  name: 'custom-service',
  url: 'http://localhost:3003',
  transport: 'http',
  capabilities: ['tools', 'resources', 'prompts']
};

const response = await fetch('http://localhost:4001/ai/ui/mcp/set', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    presetName: 'custom-integration',
    mcpServers: [mcpConfig],
    description: 'Custom MCP server integration',
    settings: {
      timeout: 30000,
      retryAttempts: 3,
      enableCaching: true
    }
  })
});

const result = await response.json();
console.log('✅ MCP server configured:', result);
```

### Step 3: Test MCP Integration

#### Test Manual Hybrid Mode
```javascript
// Test with llama_MCP_functions mode
async function testMCPHybrid() {
  const response = await fetch('{{SLMO42_URL}}/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: 'List available tools from the MCP server',
      llama_MCP_functions: true,
      mcpServerUrl: '{{MCP_SERVER_URL}}',
      presetName: '{{PRESET_NAME}}'
    })
  });
  
  const result = await response.json();
  console.log('Hybrid MCP Result:', result);
  return result;
}
```

#### Test Native MCP Mode
```javascript
// Test with node_llama_cpp_MCP_functions mode
async function testMCPNative() {
  const response = await fetch('{{SLMO42_URL}}/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: 'Execute a tool from the external MCP server',
      node_llama_cpp_MCP_functions: true,
      mcpServerUrl: '{{MCP_SERVER_URL}}',
      presetName: '{{PRESET_NAME}}'
    })
  });
  
  const result = await response.json();
  console.log('Native MCP Result:', result);
  return result;
}
```

### Step 4: Verify MCP Server Connectivity
```javascript
// Check MCP server health and capabilities
async function verifyMCPServer() {
  try {
    console.log('🔍 Checking MCP server connectivity...');
    
    // Test direct connection to MCP server
    const healthResponse = await fetch('{{MCP_SERVER_URL}}/health');
    const health = await healthResponse.json();
    console.log('MCP Server Health:', health);
    
    // Get available tools from SLMo042's perspective
    const toolsResponse = await fetch('{{SLMO42_URL}}/ai/ui/mcp/list');
    const tools = await toolsResponse.json();
    console.log('Available MCP Tools:', tools);
    
    return { health, tools };
  } catch (error) {
    console.error('❌ MCP server verification failed:', error.message);
    throw error;
  }
}
```

## Advanced MCP Configuration

### Multi-Server Setup
```javascript
// Configure multiple MCP servers
const multiServerConfig = {
  presetName: 'multi-service-{{PRESET_NAME}}',
  description: 'Multiple MCP servers integration',
  mcpServers: [
    {
      name: 'database-service',
      url: 'http://localhost:3003',
      transport: 'http',
      capabilities: ['tools'],
      priority: 1
    },
    {
      name: 'file-service', 
      url: 'http://localhost:3004',
      transport: 'http',
      capabilities: ['resources'],
      priority: 2
    },
    {
      name: 'api-service',
      url: 'http://localhost:3005',
      transport: 'http', 
      capabilities: ['tools', 'prompts'],
      priority: 3
    }
  ],
  settings: {
    timeout: 45000,
    retryAttempts: 2,
    enableCaching: true,
    loadBalancing: 'round-robin'
  }
};

// Register multi-server configuration
const response = await fetch('{{SLMO42_URL}}/ai/ui/mcp/set', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(multiServerConfig)
});
```

### Preset Management
```javascript
// List all existing presets
async function listMCPPresets() {
  const response = await fetch('{{SLMO42_URL}}/ai/ui/mcp/presets');
  const presets = await response.json();
  
  console.log('📋 Available MCP Presets:');
  presets.forEach(preset => {
    console.log(`• ${preset.name}: ${preset.description}`);
    console.log(`  Servers: ${preset.mcpServers.length}`);
  });
  
  return presets;
}

// Update existing preset
async function updateMCPPreset(presetName, updates) {
  const response = await fetch('{{SLMO42_URL}}/ai/ui/mcp/set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      presetName,
      ...updates,
      updateExisting: true
    })
  });
  
  return response.json();
}

// Delete preset
async function deleteMCPPreset(presetName) {
  const response = await fetch('{{SLMO42_URL}}/ai/ui/mcp/presets/${presetName}', {
    method: 'DELETE'
  });
  
  return response.json();
}
```

## MCP Server Development

### Create Custom MCP Server
```javascript
// Example minimal MCP server using @modelcontextprotocol/sdk
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

class CustomMCPServer {
  constructor() {
    this.server = new Server({
      name: 'custom-mcp-server',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      }
    });
    
    this.setupTools();
    this.setupResources();
  }
  
  setupTools() {
    // Register custom tools
    this.server.setRequestHandler('tools/list', async () => ({
      tools: [
        {
          name: 'custom_tool',
          description: 'A custom tool for demonstration',
          inputSchema: {
            type: 'object',
            properties: {
              message: { type: 'string' }
            }
          }
        }
      ]
    }));
    
    this.server.setRequestHandler('tools/call', async (request) => {
      if (request.params.name === 'custom_tool') {
        return {
          content: [{
            type: 'text',
            text: `Custom tool executed: ${request.params.arguments.message}`
          }]
        };
      }
      throw new Error('Unknown tool');
    });
  }
  
  setupResources() {
    // Register resources
    this.server.setRequestHandler('resources/list', async () => ({
      resources: [
        {
          uri: 'custom://data',
          name: 'Custom Data',
          mimeType: 'application/json'
        }
      ]
    }));
    
    this.server.setRequestHandler('resources/read', async (request) => {
      if (request.params.uri === 'custom://data') {
        return {
          contents: [{
            uri: 'custom://data',
            mimeType: 'application/json',
            text: JSON.stringify({ message: 'Hello from custom MCP server!' })
          }]
        };
      }
      throw new Error('Resource not found');
    });
  }
  
  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('🚀 Custom MCP server started');
  }
}

// Start the server
const server = new CustomMCPServer();
server.start().catch(console.error);
```

### MCP Server Testing Suite
```javascript
class MCPServerTestSuite {
  constructor(serverUrl = '{{MCP_SERVER_URL}}') {
    this.serverUrl = serverUrl;
    this.slmo42Url = '{{SLMO42_URL}}';
  }
  
  async runFullTest() {
    console.log('🧪 Starting MCP server test suite...');
    
    const tests = [
      { name: 'Server Connectivity', test: () => this.testConnectivity() },
      { name: 'Tools Listing', test: () => this.testToolsListing() },
      { name: 'Tool Execution', test: () => this.testToolExecution() },
      { name: 'Resources Access', test: () => this.testResourcesAccess() },
      { name: 'Error Handling', test: () => this.testErrorHandling() },
      { name: 'Performance', test: () => this.testPerformance() }
    ];
    
    const results = [];
    
    for (const { name, test } of tests) {
      console.log(`\n📊 Running ${name} test...`);
      try {
        const result = await test();
        results.push({ name, status: 'PASS', ...result });
        console.log(`✅ ${name}: PASSED`);
      } catch (error) {
        results.push({ name, status: 'FAIL', error: error.message });
        console.error(`❌ ${name}: FAILED - ${error.message}`);
      }
    }
    
    return results;
  }
  
  async testConnectivity() {
    const startTime = Date.now();
    const response = await fetch(`${this.serverUrl}/health`);
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    
    const health = await response.json();
    return { responseTime, health };
  }
  
  async testToolsListing() {
    const response = await fetch(`${this.slmo42Url}/ai/ui/mcp/list`);
    const tools = await response.json();
    
    if (!Array.isArray(tools) || tools.length === 0) {
      throw new Error('No tools available from MCP server');
    }
    
    return { toolCount: tools.length, tools: tools.map(t => t.name) };
  }
  
  async testToolExecution() {
    const response = await fetch(`${this.slmo42Url}/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: 'Execute the first available MCP tool',
        node_llama_cpp_MCP_functions: true,
        mcpServerUrl: this.serverUrl
      })
    });
    
    const result = await response.json();
    
    if (!result.hadFunctionCalls) {
      throw new Error('No MCP tools were executed');
    }
    
    return { executed: true, result: result.answer };
  }
  
  async testResourcesAccess() {
    const response = await fetch(`${this.slmo42Url}/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: 'List available resources from MCP server',
        node_llama_cpp_MCP_functions: true,
        mcpServerUrl: this.serverUrl
      })
    });
    
    const result = await response.json();
    return { accessed: true, result: result.answer };
  }
  
  async testErrorHandling() {
    const response = await fetch(`${this.slmo42Url}/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: 'Execute a non-existent MCP tool',
        node_llama_cpp_MCP_functions: true,
        mcpServerUrl: this.serverUrl
      })
    });
    
    const result = await response.json();
    // Should handle errors gracefully without crashing
    return { gracefulFailure: true, result: result.answer };
  }
  
  async testPerformance() {
    const iterations = 5;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      await fetch(`${this.slmo42Url}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: `Performance test ${i + 1}`,
          node_llama_cpp_MCP_functions: true,
          mcpServerUrl: this.serverUrl
        })
      });
      
      times.push(Date.now() - startTime);
    }
    
    const avgTime = times.reduce((a, b) => a + b) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    return { avgTime, minTime, maxTime, iterations };
  }
}
```

## Troubleshooting Common MCP Issues

### Issue 1: MCP Server Not Found
```javascript
// Diagnostic steps
async function diagnoseMCPConnectivity() {
  console.log('🔍 Diagnosing MCP connectivity...');
  
  // Check if MCP server is running
  try {
    const response = await fetch('{{MCP_SERVER_URL}}/health');
    console.log('✅ MCP server is reachable');
  } catch (error) {
    console.error('❌ MCP server unreachable:', error.message);
    console.log('💡 Solutions:');
    console.log('  • Check if MCP server is running');
    console.log('  • Verify the server URL');
    console.log('  • Check firewall/network settings');
  }
  
  // Check SLMo042 MCP configuration
  try {
    const presets = await fetch('{{SLMO42_URL}}/ai/ui/mcp/presets');
    const presetsData = await presets.json();
    console.log('✅ SLMo042 MCP presets loaded:', presetsData.length);
  } catch (error) {
    console.error('❌ Failed to load MCP presets:', error.message);
  }
}
```

### Issue 2: Tools Not Available
```javascript
// Check tool registration
async function diagnoseToolAvailability() {
  try {
    const response = await fetch('{{SLMO42_URL}}/ai/ui/mcp/list');
    const tools = await response.json();
    
    if (tools.length === 0) {
      console.warn('⚠️ No MCP tools available');
      console.log('💡 Solutions:');
      console.log('  • Verify MCP server implements tools/list endpoint');
      console.log('  • Check server tool registration');
      console.log('  • Restart SLMo042 service');
    } else {
      console.log(`✅ Found ${tools.length} MCP tools`);
      tools.forEach(tool => console.log(`  • ${tool.name}: ${tool.description}`));
    }
  } catch (error) {
    console.error('❌ Failed to list MCP tools:', error.message);
  }
}
```

### Issue 3: Performance Problems
```javascript
// Performance optimization
const optimizedMCPConfig = {
  presetName: 'optimized-{{PRESET_NAME}}',
  mcpServers: [{
    name: 'optimized-server',
    url: '{{MCP_SERVER_URL}}',
    transport: 'http',
    capabilities: ['tools'],
    settings: {
      timeout: 15000,           // Reduced timeout
      retryAttempts: 1,         // Fewer retries
      enableCaching: true,      // Enable response caching
      connectionPoolSize: 5,    // Connection pooling
      keepAlive: true          // Persistent connections
    }
  }]
};
```

## Best Practices

1. **Always test connectivity before integration**
2. **Use appropriate timeouts for your use case**
3. **Implement proper error handling**
4. **Monitor MCP server performance**
5. **Use presets for consistent configurations**
6. **Cache frequently used tools and resources**
7. **Implement health checks for MCP servers**

Your MCP integration is now configured and ready! 🚀