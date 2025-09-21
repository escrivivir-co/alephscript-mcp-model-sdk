(NOTE PROJECT CONTEXT: https://github.com/escrivivir-co/oasis-features-lab-no-official)
# Oasis AI Service - GPU Optimized

AI service for Oasis with GPU-optimized local models and function calling support.

## 🚀 Features

- **GPU Acceleration**: Optimized for NVIDIA GPUs with CUDA support
- **Local Models**: Run models locally with node-llama-cpp
- **Function Calling**: Built-in function calling capabilities
- **Performance Monitoring**: GPU diagnostics and benchmarking tools
- **GPU Optimized**: Specifically optimized for high-end GPUs

## 📋 Requirements

- Node.js 18+ with ES modules support
- NVIDIA GPU with driver 450.80.02+ (RTX series recommended)
- 8GB+ VRAM (24GB recommended for GPU)
- Windows 10/11 or Linux

## 🛠️ Installation

```bash
npm install
npm run setup
```

## 🎯 Available Scripts

### Core Services
- `npm start` - Start the AI service
- `npm run build` - Build the service
- `npm run setup` - Run installation setup

### GPU Diagnostics & Testing
- `npm run gpu:check` - **Check GPU status and get recommendations**
- `npm run diagnostic` - Same as gpu:check (alias)
- `npm run verify-gpu` - Full GPU verification (check + simple test)

### GPU Performance Tests
- `npm run gpu:test-simple` - Simple GPU performance test
- `npm run gpu:test-real` - Real model test with VRAM monitoring
- `npm run test:local-model` - Test local model loading (alias)

### Function Calling Tests
- `npm run gpu:test-functions` - Test functions with custom wrapper
- `npm run gpu:test-simple-functions` - Test functions without wrapper (recommended)
- `npm run test:functions` - Simple function tests (alias)

### Legacy Llama Tests
- `npm run llama:test-handler` - Test llama handler
- `npm run llama:test-functions` - Test llama functions
- `npm run llama:test-no-functions` - Test without functions

### Comprehensive Testing
- `npm run test:all-gpu` - Run all GPU tests (check + simple + functions)
- `npm run benchmark` - Performance benchmark (simple + functions)

## 🎮 Quick Start

1. **Check your GPU setup:**
   ```bash
   npm run gpu:check
   ```

2. **Run a simple test:**
   ```bash
   npm run gpu:test-simple
   ```

3. **Test with functions:**
   ```bash
   npm run test:functions
   ```

4. **Run comprehensive test:**
   ```bash
   npm run test:all-gpu
   ```

## 🔧 GPU Configuration

The service is optimized for GPU with these settings:

```javascript
const config = {
  gpu: true,              // GPU enabled by default
  gpuLayers: undefined,   // Auto - load maximum layers on GPU
  vramPadding: 256,       // 256MB padding for 24GB VRAM
};
```

For different GPUs, adjust `vramPadding`:
- **4GB VRAM**: 64MB padding
- **8GB VRAM**: 128MB padding  
- **16GB+ VRAM**: 256MB+ padding

## 📊 Performance Metrics

Expected performance on GPU:
- **Model Loading**: ~5-6GB VRAM usage
- **Inference Speed**: 200-500ms per response
- **Tokens/Second**: 15-30 (depending on model size)

## 🐛 Troubleshooting

### GPU Not Detected
```bash
npm run gpu:check
```
Check output for recommendations.

### Model Loading Issues
Ensure model file exists at:
```
src/AI/models/oasis-42-1-chat.Q4_K_M.gguf
```

### Function Calling Problems
Use simple functions test:
```bash
npm run test:functions
```

### Performance Issues
Run benchmark:
```bash
npm run benchmark
```

## 📁 File Structure

```
src/AI/
├── package.json
├── ai_service.mjs
├── models/
│   └── oasis-42-1-chat.Q4_K_M.gguf
└── plugins/
    ├── node_llama_cpp_handler.mjs     # Main model handler
    ├── llama_functions_handler.mjs   # Function calling handler
    ├── gpu_diagnostics.mjs         # GPU diagnostic tools
    ├── test_gpu_simple.mjs         # Simple GPU test
    ├── test_simple_functions.mjs   # Function test
    └── test_*.mjs                  # Various test files
```

## 🏆 GPU Optimization Results

✅ **GPU enabled and working**
✅ **5+ GB VRAM utilized** (model fully loaded on GPU)
✅ **Sub-second responses** (excellent performance)
✅ **GPU fully utilized** (maximum acceleration)

Your node-llama-cpp client is now GPU-optimized! 🚀