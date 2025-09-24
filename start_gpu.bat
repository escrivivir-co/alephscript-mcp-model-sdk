@echo off
echo 🎯 Starting Oasis AI Service with GPU optimization...
set GPU_ENABLED=true
set GPU_LAYERS=auto
set VRAM_PADDING=256
set USE_PRESET=true
set PRESET_DEFAULT_NAME=PRESET_DEFAUL_ALL
node ./ai_service.mjs