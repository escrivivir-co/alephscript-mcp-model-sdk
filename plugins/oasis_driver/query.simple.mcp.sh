#!/bin/bash
PORT=${PORT:-4001}

echo "🧪 Testing MCP Implementation..."
echo "=================================================="

echo "=== Test 1: /ai oasis chat ==="
curl -X POST http://localhost:${PORT}/ai \
  -H "Content-Type: application/json" \
  -d '{ 
  "input": "I did the final tune. More tunes done. Check now, please. Gather some info from my server", 
  "context": "[CONTEXT][/CONTEXT]\nConsulta específica: \"I did the final tune. More tunes done. Check now, please. Gather some info from my server\"\nPalabras clave: final, tune., more, tunes, done.",
  "prompt": "Provide an informative and precise response."
  }' 
echo ""

echo "🧪 MCP Implementation tests completed!"

