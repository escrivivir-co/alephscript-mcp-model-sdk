

# Start SLMo042 Service

Configure and start the SLMo042 AI service with optimal settings based on system capabilities.

## Task Steps

1. **Check GPU Status**
   ```bash
   npm run gpu:check
   ```

2. **Choose Start Mode Based on VRAM**
   - **Low VRAM (<4GB)**: `npm run start:cpu`  
   - **Medium VRAM (4-8GB)**: `npm run start:gpu-safe`
   - **High VRAM (8-16GB)**: `npm run start:gpu`  
   - **Excellent VRAM (>16GB)**: `npm run start:gpu-max`
   - **Auto-detect**: `npm run start:auto` (recommended)

3. **Verify Service Health**
   ```bash
   npm run ai:health
   ```

4. **Test Basic Functionality**
   ```bash
   npm run ai:test
   ```

## Expected Results

- Service running on `http://localhost:4001`
- Health endpoint returning `{"status": "ok", "ready": true}`
- GPU acceleration enabled (if available)
- Model preloaded and ready for requests

## Configuration Options

### Environment Variables
- `GPU_ENABLED=true/false` - Force GPU on/off
- `GPU_LAYERS=auto` - Number of layers to load on GPU
- `VRAM_PADDING=256` - MB of VRAM to reserve
- `PORT=4001` - Service port

### Function Modes Available
- Default: Basic text generation
- `node_llama_cpp_functions`: Production function calling
- `llama_functions`: Development function calling  
- `llama_MCP_functions`: MCP hybrid integration
- `node_llama_cpp_MCP_functions`: Native MCP support

## Troubleshooting

- **Port already in use**: Change PORT environment variable
- **GPU not detected**: Check CUDA installation and drivers
- **Model not found**: Ensure `models/oasis-42-1-chat.Q4_K_M.gguf` exists
- **Memory errors**: Reduce VRAM_PADDING or use CPU mode