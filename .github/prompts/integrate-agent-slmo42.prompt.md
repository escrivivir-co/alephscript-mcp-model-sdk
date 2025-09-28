

# Integrate Agent with SLMo042

Help an AI agent connect and integrate with SLMo042 infrastructure for local model capabilities.

## Integration Assessment

First, understand the agent's requirements:

1. **What type of tasks will the agent perform?**
   - Simple text generation → Default mode
   - Function calling → Production/Development modes  
   - External service integration → MCP modes
   - Multi-agent coordination → Shared resource planning

2. **What's the agent's technical context?**
   - Programming language (JavaScript, Python, etc.)
   - Execution environment (Node.js, browser, etc.)
   - Error handling capabilities
   - Async/await support

3. **What are the performance requirements?**
   - Response latency expectations
   - Concurrent request load
   - Resource usage constraints

## Integration Steps

### Step 1: Service Health Check
```javascript
async function checkSLMo042Health() {
  try {
    const response = await fetch('http://localhost:4001/health');
    const health = await response.json();
    
    if (health.status !== 'ok' || !health.ready) {
      throw new Error('SLMo042 service not ready');
    }
    
    console.log('✅ SLMo042 service is healthy');
    return true;
  } catch (error) {
    console.error('❌ SLMo042 health check failed:', error.message);
    return false;
  }
}
```

### Step 2: Create Agent Client
```javascript
class SLMo042AgentClient {
  constructor(baseUrl = 'http://localhost:4001') {
    this.baseUrl = baseUrl;
    this.defaultMode = 'node_llama_cpp_functions';
  }
  
  async query(input, options = {}) {
    const config = {
      input,
      [this.defaultMode]: true,
      ...options
    };
    
    try {
      const response = await fetch(`${this.baseUrl}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ SLMo042 query failed:', error.message);
      throw error;
    }
  }
  
  async health() {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }
  
  async status() {
    const response = await fetch(`${this.baseUrl}/status`);
    return response.json();
  }
}
```

### Step 3: Mode Selection Guide

#### Production Mode (Recommended)
```javascript
const client = new SLMo042AgentClient();
const response = await client.query("What is the price of an apple?", {
  node_llama_cpp_functions: true,
  functionSets: ["fruits", "system"]
});
```

#### Development Mode (For Testing)
```javascript
const response = await client.query("Test message", {
  llama_functions: true,
  functionSets: ["fruits", "system"]
});
```

#### MCP Integration Mode
```javascript
const response = await client.query("Get external data", {
  node_llama_cpp_MCP_functions: true,
  mcpServerUrl: "http://localhost:3003",
  presetName: "development"
});
```

### Step 4: Error Handling & Resilience
```javascript
class RobustSLMo042Client extends SLMo042AgentClient {
  constructor(baseUrl, options = {}) {
    super(baseUrl);
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
  }
  
  async queryWithRetry(input, options = {}) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        // Check service health first
        const health = await this.health();
        if (health.status !== 'ok') {
          throw new Error('Service not ready');
        }
        
        return await this.query(input, options);
      } catch (error) {
        lastError = error;
        console.warn(`❌ Attempt ${attempt} failed:`, error.message);
        
        if (attempt < this.retryAttempts) {
          console.log(`⏳ Retrying in ${this.retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }
    
    throw new Error(`All ${this.retryAttempts} attempts failed. Last error: ${lastError.message}`);
  }
}
```

### Step 5: Performance Monitoring
```javascript
class MonitoredSLMo042Client extends RobustSLMo042Client {
  constructor(baseUrl, options = {}) {
    super(baseUrl, options);
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      responseTimes: []
    };
  }
  
  async query(input, options = {}) {
    const startTime = Date.now();
    this.metrics.totalRequests++;
    
    try {
      const result = await super.query(input, options);
      this.metrics.successfulRequests++;
      
      const responseTime = Date.now() - startTime;
      this.metrics.responseTimes.push(responseTime);
      this.updateAverageResponseTime();
      
      console.log(`✅ Query completed in ${responseTime}ms`);
      return result;
    } catch (error) {
      this.metrics.failedRequests++;
      console.error(`❌ Query failed after ${Date.now() - startTime}ms`);
      throw error;
    }
  }
  
  updateAverageResponseTime() {
    const times = this.metrics.responseTimes;
    this.metrics.averageResponseTime = times.reduce((a, b) => a + b, 0) / times.length;
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      successRate: (this.metrics.successfulRequests / this.metrics.totalRequests) * 100
    };
  }
}
```

## Testing Integration

### Basic Functionality Test
```javascript
async function testBasicIntegration() {
  const client = new SLMo042AgentClient();
  
  console.log('🧪 Testing SLMo042 integration...');
  
  // Health check
  const health = await client.health();
  console.log('Health:', health);
  
  // Basic query
  const response = await client.query('Hello, are you working?');
  console.log('Response:', response.answer);
  
  // Function calling test
  const fruitPrice = await client.query('What is the price of an apple?', {
    node_llama_cpp_functions: true,
    functionSets: ['fruits']
  });
  console.log('Fruit price:', fruitPrice.answer);
  
  console.log('✅ All tests passed!');
}
```

### Performance Test
```javascript
async function testPerformance() {
  const client = new MonitoredSLMo042Client();
  
  console.log('⚡ Testing performance...');
  
  // Run multiple queries
  const promises = Array.from({ length: 10 }, (_, i) => 
    client.query(`Test query ${i + 1}`)
  );
  
  await Promise.all(promises);
  
  const metrics = client.getMetrics();
  console.log('Performance metrics:', metrics);
}
```

## Troubleshooting Guide

### Common Issues
1. **Connection refused**: Ensure SLMo042 service is running on correct port
2. **Service not ready**: Wait for model loading to complete
3. **Function calls not working**: Check function mode and sets configuration
4. **MCP errors**: Verify MCP server connectivity and presets

### Debug Commands
```bash
# Check service health
npm run ai:health

# Check detailed status  
npm run ai:status

# Test basic functionality
npm run ai:test

# Run diagnostics
npm run diagnostic
```

## Best Practices

1. **Always check health before queries**
2. **Implement retry logic for resilience**
3. **Monitor performance metrics**
4. **Use appropriate function modes for use case**
5. **Handle errors gracefully with fallbacks**
6. **Cache client instances to avoid reinitialization**

Your agent is now ready to integrate with SLMo042! 🚀