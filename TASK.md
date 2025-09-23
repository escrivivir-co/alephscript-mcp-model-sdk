Objetivo
--------

-   Aceptar un preset MCP (selección de tools/resources/prompts por servidor) en las llamadas a POST `/ai`.
-   Activar/desactivar el uso del preset mediante variables de entorno.
-   Hacer que ambos handlers MCP respeten el preset filtrando las funciones MCP:
    -   [llama_functions_mcp_handler.mjs]() (híbrido)
    -   [node_llama_cpp_mcp_handler.mjs]() (nativo)
-   Mantener el comportamiento actual cuando no hay preset activo.

Variables de entorno (control de comportamiento)
------------------------------------------------

-   USE_PRESET=true
    -   Si está "true", ambos handlers filtrarán las funciones MCP según el preset activo.
-   SCAN_FULL_MCP_SERVER=true
    -   Si está "true", se ignora el preset y se expone el catálogo completo de funciones MCP (comportamiento actual).
-   Resolución/precedencia:
    -   Si USE_PRESET=true → aplicar preset.
    -   Si USE_PRESET no está en true y SCAN_FULL_MCP_SERVER=true → exponer catálogo completo.
    -   Si ninguna está en true → por defecto catálogo completo (compatibilidad).
-   Opcional: PRESET_DEFAULT_NAME
    -   Si existe y el request no trae un nombre de preset, usar este por defecto.

Nota: Acepta ambos flags para flexibilidad. Documenta que USE_PRESET tiene prioridad.

Flujo de datos entre UI y /ai
-----------------------------

-   La UI guarda presets con POST `/ai/ui/mcp/set`, persistidos in-memory por [mcp_ui_routes.mjs]().
-   El cliente de inferencia envía:
    -   POST `/ai` con "input" y opcionalmente uno de los alias para el preset:
        -   mcpPresetName, presetName, preset, mcpPreset.
-   El backend debe:
    -   Resolver el preset con el singleton [mcpUIRoutes]() (método `getPreset(name)`).
    -   Pasar el preset a los handlers como parte de las "options" en la llamada de chat.
    -   Exponer en la respuesta el nombre del preset usado y un conteo de elementos para observabilidad.

Estructura de preset (ya definida en MCP UI):

-   name: string
-   items: Array<{ serverName: string, type: 'tool'|'resource'|'prompt', name: string }>
-   itemsCount: { tools, resources, prompts, total }
-   createdAt: ISO string

Cambios a realizar por fichero (sin código, especificación)
-----------------------------------------------------------

1.  [api_bridge.mjs]()

-   Extraer el nombre del preset desde el body del request con estos alias: mcpPresetName | presetName | preset | mcpPreset.
-   Resolver el preset:
    -   Importar dinámico de [mcp_ui_routes.mjs]() y usar [mcpUIRoutes.getPreset(name)]().
    -   Si no viene en request y está definida PRESET_DEFAULT_NAME, resolverla.
-   Preparar "options" para handlers:
    -   options.mcpPresetName = el nombre del preset recibido o por defecto, o null
    -   options.mcpPreset = el objeto preset resuelto (o null si no existe)
    -   options.usePreset = booleano calculado con lógica de env (USE_PRESET/SCAN_FULL_MCP_SERVER)
-   Llamar al handler.chat con un tercer parámetro "options" (no rompe compatibilidad: los handlers pueden ignorarlo).
-   En la respuesta incluir:
    -   payload.mcpPresetName
    -   payload.mcpPresetCounts (si preset resuelto)
    -   payload.usePreset (para depuración)

1.  [node_llama_cpp_mcp_handler.mjs]()

-   Contexto actual:
    -   Aplica [mixMCPMixin(this)]() para routing MCP.
    -   Registra MCP functions en [_addMCPFunctions()]() a partir de [_buildMCPFunctionMapping()]() (del mixin).
    -   Registra cada función mediante [registerMCPFunction(...)](), cuyo handler llama `this.executeMCPFunction(...)`.
-   Especificación de filtrado con preset:
    -   Al inicio de cada [chat()]() (o punto de entrada equivalente) del handler base: almacenar en `this.activeMCPPreset` y `this.activeUsePreset` el preset y el flag resueltos desde options. Si no hay chat() en este handler, hacerlo en el flujo que prepara la conversación (p.ej., un método "preChat" o justo antes de invocar node-llama-cpp).
    -   Filtrado de exposición (UI/modelo):
        -   Cuando generes documentación de funciones o listado para el modelo (si este handler inyecta docs/func-list a los prompts del modelo), genera la lista visible solo con las que estén en preset si this.activeUsePreset es true. Si no existe infraestructura explícita de doc en este handler, omite esta parte (ver "Enforcement" más abajo).
    -   Enforcement (crítico): en cada [mcpHandler]() (closure creado en [registerMCPFunction]()):
        -   Verificar si `this.activeUsePreset` es true. Si no lo es, permitir todo (comportamiento actual).
        -   Si `this.activeUsePreset` es true, comprobar si el nombre registrado de la función (shortFunctionName) está permitida por el preset (convertir selectedItems del preset a un conjunto de funciones permitidas, p.ej. por serverName+toolName → short name usando el prefijo corto del mixin).
        -   Si no está permitida, devolver un error controlado o una respuesta clara ("function not allowed by active preset").
    -   Nota: Esto evita tener que reconstruir el mapa de funciones por request; solo gatea en runtime y opcionalmente esconde funciones en documentación si la hay.

1.  [llama_functions_mcp_handler.mjs]()

-   Contexto actual:
    -   Usa [MCPMixin]() y combina funciones locales + MCP en [_buildCombinedFunctions()]() (cacheado en `this.functionsCache`), y procesa llamadas de funciones con [processFunctionCalls(...)](), detectando `[[call: ...]]`.
-   Especificación de filtrado con preset:
    -   Al inicio de [chat(userInput, systemContext, options)](): almacenar en `this.activeMCPPreset` y `this.activeUsePreset` el preset y flag de options.
    -   Filtrado de exposición:
        -   Cuando prepare la lista de "availableFunctions" para construir el prompt (documentación/ejemplos), filtrar por preset si `this.activeUsePreset` es true. Así el modelo solo ve/deseará llamar a las funciones permitidas.
    -   Enforcement:
        -   En [processFunctionCalls(text)](), antes de ejecutar la función:
            -   Si es MCP (`this.isMCPFunction(functionName)`), comprobar si está permitida por el preset activo (si `this.activeUsePreset` es true).
            -   Si no está permitida, sustituir con un resultado controlado (p. ej. [[result: "Function not allowed by preset"]]) y continuar, o cancelar según estrategia.
    -   Notas:
        -   Evitar reconstruir `this.functionsCache` por request. El gating per-request asegura performance y simplicidad.
        -   Si quieres un hard-filter a nivel de registro (eliminar funciones del mapa), solo hazlo si invalidas y reconstruyes cache por request, lo cual es más costoso y no recomendado.

1.  [mcp_ui_routes.mjs]() (sin cambios funcionales requeridos)

-   Ya provee:
    -   GET `/ai/ui/mcp/list`: catálogo y lazy init desde [mcp.json]().
    -   POST `/ai/ui/mcp/set`: guardar preset in-memory.
    -   GET `/ai/ui/mcp/presets` y `/ai/ui/mcp/preset/:name`: consulta de presets.
-   Considera añadir un helper (opcional) para mapear [selectedItems]() a shortFunctionNames del mixin (prefijos). Si no, los handlers pueden resolverlo al vuelo usando [functionToServerMap]() del mixin.

1.  [ai_service.mjs]()

-   No necesita cambios directos si [api_bridge.mjs]() encapsula la lógica.
-   Mantener import y registro de [mcp_ui_routes.mjs]().

Reglas de filtrado (cómo convertir preset → funciones permitidas)
-----------------------------------------------------------------

-   Cada selectedItem con type 'tool' define una función MCP permitida en el par (serverName, toolName).

-   El mixin [MCPMixin]() genera short names con [_generateShortPrefix(serverName)]() + '_' + toolName, y mantiene `this.functionToServerMap` con mapeo short → { originalServerName, toolName, ... }.

-   Lógica recomendada en handlers:

    -   Construir un Set con allowedShortNames resolviendo cada (serverName, toolName) a su short name según prefijo vigente. Si el prefijo no está precomputado, puedes:
        -   Buscar en `this.functionToServerMap` la entrada cuyo originalServerName y toolName coincidan y tomar el short key.
    -   Exponer solo allowedShortNames en docs/availableFunctions (exposición).
    -   En enforcement, comparar el shortFunctionName del llamado con el Set de allowedShortNames (cuando this.activeUsePreset).
-   Recursos y prompts:

    -   Hoy no se exponen como "funciones invocables" por el modelo. Mantenerlos en preset por coherencia, pero el filtrado aplica a tools (funciones MCP).
    -   Si en el futuro se mapean a funciones, aplica la misma regla.

Entrada/Salida de /ai
---------------------

Entrada (extensión):

-   Campos opcionales de preset:
    -   mcpPresetName | presetName | preset | mcpPreset
-   Sigue permitiendo "functionMode" o flags:
    -   llama_MCP_functions | node_llama_cpp_MCP_functions | node_llama_cpp_functions | llama_functions | useFunctions=false

Salida (extensión):

-   payload.mcpPresetName: string | null
-   payload.mcpPresetCounts: { tools, resources, prompts, total } | undefined
-   payload.usePreset: boolean (según env + request)

Criterios de aceptación
-----------------------

-   Con USE_PRESET=true y preset válido:
    -   El catálogo UI permanece igual.
    -   En inferencia, solo aparecen en la documentación/listado (cuando exista) las funciones MCP permitidas por el preset.
    -   Si el modelo intenta invocar una función MCP no permitida, el handler devuelve un resultado controlado ("not allowed by preset") y no revienta el flujo.
    -   Respuesta de /ai incluye mcpPresetName y mcpPresetCounts.
-   Con SCAN_FULL_MCP_SERVER=true (o sin USE_PRESET):
    -   Se conserva el comportamiento actual (sin filtro).
-   Si el preset no existe:
    -   Se ignora el filtrado (o se aplica PRESET_DEFAULT_NAME si está definido).
    -   La respuesta documenta que no se encontró preset.
-   Rendimiento:
    -   No se reconstruyen mapas de funciones por request.
    -   El gating es O(1) por invocación (Set lookup).
-   Compatibilidad:
    -   Ningún handler actual rompe si no se pasa "options" (tercer parámetro).
    -   Sin preset ni USE_PRESET, todo funciona como hoy.

Casos límite y errores
----------------------

-   Servidores no conectados: `/ai/ui/mcp/list` ya los muestra como isConnected=false; preset puede contener items de servidores caídos. En enforcement, resultará en error en [executeMCPFunction]() (ya gestionado), se retorna error formateado.
-   Tool renombrada o sin mapping: si no se encuentra un short name correspondiente, log de advertencia y se considera "no permitida" en enforcement; en exposición, no se incluye.
-   Flags contradictorios: si USE_PRESET=true y SCAN_FULL_MCP_SERVER=true, se prioriza USE_PRESET (documentado).
-   Multi-request: `this.activeMCPPreset` y `this.activeUsePreset` se resetean al comienzo de cada chat() para evitar contaminación de estado.

Archivos implicados
-------------------

-   [api_bridge.mjs](): resolución del preset y paso de "options" a [handler.chat]().
-   [node_llama_cpp_mcp_handler.mjs](): gating per-request mediante `this.activeMCPPreset` + enforcement en [registerMCPFunction]() (mcp handler).
-   [llama_functions_mcp_handler.mjs]():
    -   Filtrado de exposición en construcción de prompt/availableFunctions.
    -   Enforcement en [processFunctionCalls(...)]() antes de [executeMCPFunction]().
-   [mcp_ui_routes.mjs](): fuente de verdad de presets (ya implementado).
-   [MCPMixin.mjs](): provee mapping shortName ↔ server/tool (usado para resolver allowedShortNames).
-   [.env]() o entorno: define USE_PRESET, SCAN_FULL_MCP_SERVER, PRESET_DEFAULT_NAME (opcional).

Prompt para el agente que lo implementará
-----------------------------------------

Eres la persona encargada de habilitar el uso de presets MCP en las inferencias. Debes:

1.  Lectura del preset y opciones

-   En [api_bridge.mjs](), extrae el nombre del preset de estos alias del body: mcpPresetName | presetName | preset | mcpPreset. Si no viene y existe PRESET_DEFAULT_NAME en env, úsalo.
-   Resuelve el preset con [mcpUIRoutes.getPreset(name)]() desde [mcp_ui_routes.mjs]().
-   Calcula "usePreset" a partir de las vars de entorno:
    -   USE_PRESET=true → usar preset
    -   de lo contrario, si SCAN_FULL_MCP_SERVER=true → ignorar preset
    -   por defecto ignorar preset
-   Llama a [handler.chat(userInput, userContext, options)](), donde options incluye:
    -   mcpPresetName: string | null
    -   mcpPreset: objeto preset o null
    -   usePreset: boolean
-   En la respuesta, incluye mcpPresetName, mcpPresetCounts (si existe), y usePreset.

1.  Filtrado en Node MCP handler

-   Archivo: [node_llama_cpp_mcp_handler.mjs]().
-   Al inicio de chat (o un hook equivalente) setea `this.activeMCPPreset` y `this.activeUsePreset`.
-   Genera un Set de allowedShortNames desde el preset (solo type='tool'), resolviendo los short names con ayuda de `this.functionToServerMap` del mixin.
-   Exposición (si aplica): si generas documentación/lista de funciones para el modelo, filtra solo las permitidas.
-   Enforcement: en el closure de cada handler MCP registrado por [registerMCPFunction]():
    -   Si `this.activeUsePreset` es false → permitir.
    -   Si true → comprobar si el shortFunctionName está en allowedShortNames. Si no, retornar un error controlado ("function not allowed by preset") sin lanzar excepción fatal.

1.  Filtrado en Llama Functions MCP handler (híbrido)

-   Archivo: [llama_functions_mcp_handler.mjs]().
-   Al inicio de [chat(userInput, systemContext, options)]() setea `this.activeMCPPreset` y `this.activeUsePreset`.
-   Exposición: cuando construyas [availableFunctions]()/documentación/ejemplos para el modelo, si `this.activeUsePreset` es true, incluye solo las funciones MCP presentes en allowedShortNames (mismo cálculo).
-   Enforcement: en [processFunctionCalls(text)]():
    -   Antes de ejecutar, si `this.activeUsePreset` es true y la función es MCP, verificar en allowedShortNames. Si no está permitida, sustituir por resultado controlado y continuar el procesamiento.

1.  Mapeo preset → shortFunctionNames

-   Usa el [MCPMixin]() y su `this.functionToServerMap` para encontrar el shortFunctionName que corresponde a cada (serverName, toolName) del preset.
-   Si un item del preset no se mapea (tool inexistente), ignóralo y registra un warning.

1.  Validación

-   Escenarios:
    -   USE_PRESET=true con preset válido: solo se pueden llamar tools MCP del preset, se refleja en la respuesta.
    -   SCAN_FULL_MCP_SERVER=true: comportamiento actual (exposición y ejecución completas).
    -   Sin flags → comportamiento actual.
    -   Preset no encontrado: ignora preset (o usa PRESET_DEFAULT_NAME). Respuesta lo indica.
-   Rendimiento: no reconstruyas mapas por request; usa gating per-request.
-   Concurrencia: asegúrate de resetear `this.activeMCPPreset`/`this.activeUsePreset` al inicio de cada [chat()]() para que dos requests concurrentes no se contaminen.

1.  Documentación y logs

-   Añade logs claros al resolver preset y al enforcement de denegación (sin ruido excesivo).
-   Documenta en README/comentarios de los handlers el comportamiento de USE_PRESET/SCAN_FULL_MCP_SERVER y PRESET_DEFAULT_NAME.

Con esta especificación, el agente puede implementar el soporte de presets sin romper compatibilidad, con control por variables de entorno, en ambos handlers MCP, y con una estrategia robusta de filtrado tanto en exposición como en ejecución.

# CONTEXT

