@echo off
echo 🎯 Starting Oasis AI Service with conservative GPU settings...
set GPU_ENABLED=true
set GPU_LAYERS=20
set VRAM_PADDING=1500
set USE_PRESET=true
set PRESET_DEFAULT_NAME=PRESET_DEFAUL_ALL
node ./ai_service.mjs