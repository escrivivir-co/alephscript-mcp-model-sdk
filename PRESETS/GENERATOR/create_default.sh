curl -s -X POST http://localhost:4001/ai/ui/mcp/set \
  -H "Content-Type: application/json" \
  -d @tmp_preset_all.json

# Add this to your env so it activates default prest
# export USE_PRESET=true
# export PRESET_DEFAULT_NAME=PRESET_DEFAUL_ALL
# opcional: asegúrate de no forzar catálogo completo
# unset SCAN_FULL_MCP_SERVER