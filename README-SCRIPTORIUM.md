# Integración con ALEPH Scriptorium

> **Submódulo**: `mcp-model-sdk`  
> **Padre directo**: MCPGallery (Zeus MCP Presets Site)  
> **Rama de integración**: `integration/beta/scriptorium`  
> **Fecha**: 2025-12-30

---

## Propósito de Esta Rama

Esta rama simplifica mcp-model-sdk para servir **únicamente como fuente de autoridad de presets MCP**, eliminando toda la funcionalidad de inferencia AI (SLMo42).

### Funcionalidad INCLUIDA ✅

| Componente | Función |
|------------|---------|
| `/ai/ui/mcp/list` | Listar catálogo MCP completo |
| `/ai/ui/mcp/presets` | Listar presets guardados |
| `/ai/ui/mcp/preset/:name` | Obtener preset específico |
| `/ai/ui/mcp/set` | Crear/actualizar presets |
| `PRESETS/mcp_presets.json` | Almacén persistente de presets |
| `PRESETS/mcp_servers.json` | Configuración de servidores MCP |
| `plugins/mcp/mcp_ui_routes.mjs` | Rutas REST para gestión de presets |
| `/health`, `/status` | Health checks básicos |

### Funcionalidad EXCLUIDA ❌

| Componente | Razón |
|------------|-------|
| `node-llama-cpp` | Inferencia AI no requerida |
| GPU handlers | No hay modelo a ejecutar |
| `plugins/llama_functions/` | Handlers de funciones AI |
| `plugins/node_llama_cpp_functions/` | Handlers GPU/CPU |
| `plugins/oasis_driver/` | Driver Oasis (inferencia) |
| Scripts `start_gpu*.bat` | No hay modelo |

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCRIPTORIUM MONOREPO                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────┐     ┌──────────────────────────────┐    │
│  │   mcp-model-sdk    │     │      mcp-mesh-sdk            │    │
│  │   (Puerto 4001)    │     │      (Puerto 3003)           │    │
│  │                    │     │                              │    │
│  │ ┌────────────────┐ │     │ ┌──────────────────────────┐ │    │
│  │ │ Preset Service │ │────▶│ │   DevOps MCP Server      │ │    │
│  │ │  /ai/ui/mcp/*  │ │     │ │   + Plugins              │ │    │
│  │ └────────────────┘ │     │ └──────────────────────────┘ │    │
│  └────────────────────┘     └──────────────────────────────┘    │
│           ▲                              ▲                       │
│           │                              │                       │
│           │         ┌──────────────┐     │                       │
│           └─────────│     Zeus     │─────┘                       │
│                     │ (Puerto 3012)│                             │
│                     └──────────────┘                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Flujo de Datos

1. **Zeus (3012)** → Solicita catálogo MCP a **mcp-model-sdk (4001)**
2. **mcp-model-sdk** → Lee `PRESETS/mcp_servers.json` para servidores configurados
3. **mcp-model-sdk** → Conecta a **mcp-mesh-sdk (3003)** para obtener tools/resources/prompts
4. **mcp-model-sdk** → Retorna catálogo consolidado a Zeus
5. **Zeus** → Muestra catálogo en UI y permite gestionar presets

---

## Configuración de Servidores

### `PRESETS/mcp_servers.json`

```json
{
    "servers": {
        "devops-mcp-server": {
            "type": "http",
            "url": "http://localhost:3003"
        }
    }
}
```

---

## API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/status` | Estado del servicio |
| `GET` | `/ai/ui/mcp/list` | Catálogo MCP completo |
| `GET` | `/ai/ui/mcp/presets` | Listar presets |
| `GET` | `/ai/ui/mcp/preset/:name` | Obtener preset |
| `POST` | `/ai/ui/mcp/set` | Crear/actualizar preset |

---

## Scripts Disponibles

```bash
# Iniciar servicio de presets (simplificado)
npm start

# Health check
curl http://localhost:4001/health

# Listar catálogo MCP
curl http://localhost:4001/ai/ui/mcp/list

# Listar presets
curl http://localhost:4001/ai/ui/mcp/presets
```

---

## Dependencias Mínimas

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.18.1",
    "cors": "^2.8.5",
    "express": "^5.1.0"
  }
}
```

**Removidas**: `node-llama-cpp`, `ollama`, `commander` (CLI de inferencia)

---

## Changelog de Integración

| Fecha | Cambio | Commit |
|-------|--------|--------|
| 2025-12-30 | Crear rama integration/beta/scriptorium | ✅ |
| 2025-12-30 | Añadir README-SCRIPTORIUM.md | ✅ |
| 2025-12-30 | Simplificar a Preset Service | ✅ |
| 2025-12-30 | Sincronizar con MCPGallery v0.1.0 | ✅ |

---

## Estado de Integración

- ✅ Rama `integration/beta/scriptorium`
- ✅ README-SCRIPTORIUM.md documentado
- ✅ `preset_service.mjs` - Versión simplificada sin inferencia
- ✅ `package.json` con dependencias mínimas
- ⏳ Validar conexión Zeus → mcp-model-sdk → mcp-mesh-sdk
- ⏳ Tests E2E del flujo completo
