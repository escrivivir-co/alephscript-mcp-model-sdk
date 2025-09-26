### 🤖 **SLMo42** - Servicio de Inferencia + Proxy MCP

-   **Puerto**: 4001
-   **Propósito**: Doble función - inferencia conversacional + proxy REST para MCPGaia
-   **Estado**: ✅ Corriendo - GPU optimization enabled
-   **Características**:
    -   **Inferencia**: node-llama-cpp con modelo Oasis42
    -   **Proxy MCP**: Rutas REST para que Zeus obtenga el catálogo
    -   **UI Routes**: `/ai/ui/mcp/*` (list/set/presets/preset/:name)
    -   **Presets**: 1 preset cargado ("PRESET_DEFAUL_ALL")