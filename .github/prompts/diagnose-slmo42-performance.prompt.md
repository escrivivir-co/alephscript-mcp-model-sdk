

# Diagnose SLMo042 Performance Issues

Systematically diagnose and resolve performance issues with the SLMo042 AI service.

## Diagnostic Workflow

### Step 1: System Health Check
```bash
# Quick GPU diagnostics - ALWAYS RUN FIRST
npm run gpu:check

# Full system diagnostic  
npm run diagnostic

# Service health status
npm run ai:health && npm run ai:status
```

### Step 2: Performance Baseline
```bash
# Run performance benchmarks
npm run benchmark

# Test GPU performance specifically
npm run verify-gpu

# Test function calling performance  
npm run test:functions
```

### Step 3: Resource Monitoring
```javascript
// Check detailed service status
async function getDetailedStatus() {
  const response = await fetch('http://localhost:4001/status');
  const status = await response.json();
  
  console.log('Service Status:', {
    ready: status.status === 'ready',
    modelLoaded: status.modelLoaded,
    sessionReady: status.sessionReady,
    uptime: `${Math.floor(status.uptime / 60)}m ${Math.floor(status.uptime % 60)}s`,
    memory: {
      rss: `${Math.floor(status.memory.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.floor(status.memory.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.floor(status.memory.external / 1024 / 1024)}MB`
    }
  });
  
  return status;
}

// Monitor real-time performance
async function monitorPerformance(duration = 60000) {
  console.log('📊 Starting performance monitoring...');
  
  const metrics = [];
  const startTime = Date.now();
  
  while (Date.now() - startTime < duration) {
    const status = await getDetailedStatus();
    metrics.push({
      timestamp: new Date().toISOString(),
      memory: status.memory,
      ready: status.status === 'ready'
    });
    
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5s intervals
  }
  
  return metrics;
}
```

### Step 4: GPU Performance Analysis
```javascript
// GPU utilization checker
async function checkGPUUtilization() {
  // This requires nvidia-ml-py or similar GPU monitoring
  try {
    const { exec } = require('child_process');
    
    return new Promise((resolve, reject) => {
      exec('nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.free --format=csv,noheader,nounits', (error, stdout) => {
        if (error) {
          console.warn('❌ GPU monitoring not available:', error.message);
          return resolve(null);
        }
        
        const [gpuUtil, memUsed, memFree] = stdout.trim().split(', ').map(Number);
        
        const gpuStatus = {
          utilization: `${gpuUtil}%`,
          memoryUsed: `${memUsed}MB`,
          memoryFree: `${memFree}MB`,
          memoryTotal: `${memUsed + memFree}MB`,
          memoryUsage: `${((memUsed / (memUsed + memFree)) * 100).toFixed(1)}%`
        };
        
        console.log('🖥️ GPU Status:', gpuStatus);
        resolve(gpuStatus);
      });
    });
  } catch (error) {
    console.warn('❌ GPU monitoring error:', error.message);
    return null;
  }
}
```

## Performance Issue Patterns

### Issue 1: Slow Response Times
**Symptoms**: Queries taking >10 seconds
**Diagnosis**:
```bash
# Check if GPU is properly utilized
npm run gpu:check

# Test different modes
npm run query:prod    # Production mode
npm run query:dev     # Development mode
```

**Solutions**:
1. **GPU not utilized**: Check CUDA installation and GPU_ENABLED environment variable
2. **Insufficient VRAM**: Reduce GPU_LAYERS or increase VRAM_PADDING
3. **Model not preloaded**: Use `/preload` endpoint before queries

### Issue 2: Memory Leaks
**Symptoms**: Memory usage increasing over time
**Diagnosis**:
```javascript
async function memoryLeakTest() {
  const initialStatus = await getDetailedStatus();
  console.log('Initial memory:', initialStatus.memory);
  
  // Run multiple queries
  for (let i = 0; i < 50; i++) {
    await fetch('{{SLMO42_URL}}/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: `Test query ${i}` })
    });
  }
  
  const finalStatus = await getDetailedStatus();
  console.log('Final memory:', finalStatus.memory);
  
  const memoryGrowth = finalStatus.memory.heapUsed - initialStatus.memory.heapUsed;
  console.log(`Memory growth: ${memoryGrowth / 1024 / 1024}MB`);
  
  if (memoryGrowth > 100 * 1024 * 1024) { // 100MB
    console.warn('⚠️ Potential memory leak detected!');
  }
}
```

**Solutions**:
1. **Context accumulation**: Restart service periodically
2. **Plugin memory leaks**: Check specific function handlers
3. **Session cleanup**: Ensure proper session disposal

### Issue 3: GPU Memory Errors
**Symptoms**: CUDA out of memory errors
**Diagnosis**:
```bash
# Check available GPU memory
nvidia-smi

# Test with different VRAM settings
GPU_ENABLED=true VRAM_PADDING=512 npm start
GPU_ENABLED=true VRAM_PADDING=1024 npm start
```

**Solutions**:
1. **Increase VRAM padding**: Set higher VRAM_PADDING value
2. **Reduce GPU layers**: Set lower GPU_LAYERS value
3. **Use CPU fallback**: Set GPU_ENABLED=false

### Issue 4: Function Calling Failures
**Symptoms**: Functions not being called or errors in function execution
**Diagnosis**:
```bash
# Test specific function modes
npm run query:prod    # Test production functions
npm run query:dev     # Test development functions
npm run query:dev:mcp # Test MCP functions
```

**Solutions**:
1. **Function set configuration**: Check functionSets parameter
2. **Handler initialization**: Verify plugin loading in service logs
3. **MCP server connectivity**: Check MCP server status

## Automated Performance Testing

### Performance Test Suite
```javascript
class SLMo042PerformanceTestSuite {
  constructor(baseUrl = 'http://localhost:4001') {
    this.baseUrl = baseUrl;
    this.results = [];
  }
  
  async runFullSuite() {
    console.log('🚀 Starting comprehensive performance tests...');
    
    const tests = [
      { name: 'Health Check', test: () => this.testHealth() },
      { name: 'Basic Query', test: () => this.testBasicQuery() },
      { name: 'Function Calling', test: () => this.testFunctionCalling() },
      { name: 'Concurrent Queries', test: () => this.testConcurrentQueries() },
      { name: 'Memory Stress', test: () => this.testMemoryStress() },
      { name: 'GPU Utilization', test: () => this.testGPUUtilization() }
    ];
    
    for (const { name, test } of tests) {
      console.log(`\n📊 Running ${name} test...`);
      try {
        const result = await test();
        this.results.push({ name, status: 'PASS', ...result });
        console.log(`✅ ${name}: PASSED`);
      } catch (error) {
        this.results.push({ name, status: 'FAIL', error: error.message });
        console.error(`❌ ${name}: FAILED - ${error.message}`);
      }
    }
    
    return this.generateReport();
  }
  
  async testHealth() {
    const startTime = Date.now();
    const response = await fetch(`${this.baseUrl}/health`);
    const health = await response.json();
    const responseTime = Date.now() - startTime;
    
    if (health.status !== 'ok') {
      throw new Error('Service not healthy');
    }
    
    return { responseTime, health };
  }
  
  async testBasicQuery() {
    const startTime = Date.now();
    const response = await fetch(`${this.baseUrl}/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'Hello, test query' })
    });
    
    const result = await response.json();
    const responseTime = Date.now() - startTime;
    
    if (!result.answer) {
      throw new Error('No answer received');
    }
    
    return { responseTime, answerLength: result.answer.length };
  }
  
  async testFunctionCalling() {
    const startTime = Date.now();
    const response = await fetch(`${this.baseUrl}/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        input: 'What is the price of an apple?',
        node_llama_cpp_functions: true,
        functionSets: ['fruits']
      })
    });
    
    const result = await response.json();
    const responseTime = Date.now() - startTime;
    
    if (!result.hadFunctionCalls) {
      throw new Error('Function calls not executed');
    }
    
    return { responseTime, hadFunctionCalls: result.hadFunctionCalls };
  }
  
  async testConcurrentQueries() {
    const concurrentCount = 5;
    const startTime = Date.now();
    
    const promises = Array.from({ length: concurrentCount }, (_, i) =>
      fetch(`${this.baseUrl}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: `Concurrent query ${i + 1}` })
      }).then(r => r.json())
    );
    
    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    
    const successCount = results.filter(r => r.answer).length;
    
    return {
      totalTime,
      averageTime: totalTime / concurrentCount,
      successRate: (successCount / concurrentCount) * 100,
      concurrentCount
    };
  }
  
  async testMemoryStress() {
    const initialStatus = await fetch(`${this.baseUrl}/status`).then(r => r.json());
    const queryCount = 20;
    
    for (let i = 0; i < queryCount; i++) {
      await fetch(`${this.baseUrl}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: `Memory stress test query ${i}` })
      });
    }
    
    const finalStatus = await fetch(`${this.baseUrl}/status`).then(r => r.json());
    
    const memoryGrowth = finalStatus.memory.heapUsed - initialStatus.memory.heapUsed;
    const memoryGrowthMB = memoryGrowth / 1024 / 1024;
    
    return {
      queryCount,
      memoryGrowthMB: Math.round(memoryGrowthMB * 100) / 100,
      initialMemoryMB: Math.round(initialStatus.memory.heapUsed / 1024 / 1024),
      finalMemoryMB: Math.round(finalStatus.memory.heapUsed / 1024 / 1024)
    };
  }
  
  async testGPUUtilization() {
    const gpuStatus = await checkGPUUtilization();
    
    if (!gpuStatus) {
      return { available: false, message: 'GPU monitoring not available' };
    }
    
    return { available: true, ...gpuStatus };
  }
  
  generateReport() {
    const passCount = this.results.filter(r => r.status === 'PASS').length;
    const totalCount = this.results.length;
    
    const report = {
      summary: {
        total: totalCount,
        passed: passCount,
        failed: totalCount - passCount,
        successRate: `${((passCount / totalCount) * 100).toFixed(1)}%`
      },
      tests: this.results,
      recommendations: this.generateRecommendations()
    };
    
    console.log('\n📊 PERFORMANCE REPORT');
    console.log('====================');
    console.log(`✅ Passed: ${report.summary.passed}/${report.summary.total}`);
    console.log(`❌ Failed: ${report.summary.failed}/${report.summary.total}`);
    console.log(`📈 Success Rate: ${report.summary.successRate}`);
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS');
      console.log('==================');
      report.recommendations.forEach(rec => console.log(`• ${rec}`));
    }
    
    return report;
  }
  
  generateRecommendations() {
    const recommendations = [];
    
    // Check response times
    const responseTimes = this.results
      .filter(r => r.responseTime)
      .map(r => r.responseTime);
    
    if (responseTimes.length > 0) {
      const avgResponseTime = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
      
      if (avgResponseTime > 5000) {
        recommendations.push('Response times are high (>5s). Consider GPU optimization or model preloading');
      }
      
      if (avgResponseTime > 10000) {
        recommendations.push('CRITICAL: Response times >10s. Check GPU configuration and VRAM settings');
      }
    }
    
    // Check memory growth
    const memoryTest = this.results.find(r => r.name === 'Memory Stress');
    if (memoryTest && memoryTest.memoryGrowthMB > 50) {
      recommendations.push(`Memory growth detected (${memoryTest.memoryGrowthMB}MB). Monitor for potential leaks`);
    }
    
    // Check function calling
    const functionTest = this.results.find(r => r.name === 'Function Calling');
    if (functionTest && functionTest.status === 'FAIL') {
      recommendations.push('Function calling is not working. Check plugin configuration and function sets');
    }
    
    // Check concurrent performance
    const concurrentTest = this.results.find(r => r.name === 'Concurrent Queries');
    if (concurrentTest && concurrentTest.successRate < 100) {
      recommendations.push(`Concurrent query success rate is ${concurrentTest.successRate}%. Consider connection pooling`);
    }
    
    return recommendations;
  }
}

// Run the test suite
async function runDiagnostics() {
  const testSuite = new SLMo042PerformanceTestSuite();
  const report = await testSuite.runFullSuite();
  return report;
}
```

## Quick Fix Commands

### GPU Issues
```bash
# Reset GPU configuration
GPU_ENABLED=true GPU_LAYERS=auto VRAM_PADDING=512 npm start

# Force CPU mode if GPU issues persist
npm run start:cpu

# Check GPU drivers and CUDA
nvidia-smi
```

### Memory Issues
```bash
# Restart service
pkill -f "node.*ai_service"
npm start

# Check system memory
free -h    # Linux
wmic OS get TotalVisibleMemorySize,FreePhysicalMemory    # Windows
```

### Service Issues
```bash
# Full diagnostic check
npm run diagnostic

# Verify all components
npm run test:all-gpu

# Check logs for errors
npm run ai:logs    # If using Docker
```

Run this diagnostic guide step by step to identify and resolve SLMo042 performance issues! 🔧