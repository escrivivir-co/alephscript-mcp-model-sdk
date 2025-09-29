
let mcpUIRoutes = null;
try {
    mcpUIRoutes = (await import('./plugins/mcp/mcp_ui_routes.mjs')).default;
} catch (e) {
    console.log('MCP UI routes module not found, preset features will be disabled.');
}


export default async function apiBridge(req, res, functionsPlugin, getFunctionHandler) {

    const promptData = {
        input: String(req.body.input || '').trim(),
        prompt: req.body.prompt || '',
        context: req.body.context || '',
        mode: "none",
        payload: null
    }

    // Detectar modo de funciones desde request o config
    let functionMode = req.body.functionMode ||
        (req.body.llama_MCP_functions ? 'llama_MCP_functions' :
            req.body.node_llama_cpp_MCP_functions ? 'node_llama_cpp_MCP_functions' :
                req.body.node_llama_cpp_functions ? 'node_llama_cpp_functions' :
                    req.body.llama_functions ? 'llama_functions' :
                        req.body.useFunctions === false ? 'none' :
                            'none'); // Por defecto sin funciones para compatibilidad

    const fallbackMode = 'node_llama_cpp_MCP_functions';
    if (functionMode === 'none') {
        console.log(`⚠️ AI Service: Modo de funciones no especificado activando ${fallbackMode}!`);
        functionMode = fallbackMode;
    } else {
        console.log(`🔍 AI Service: Modo de funciones detectado: ${functionMode}`);
    }

    promptData.mode = functionMode;

    // --- MCP Preset Handling ---
    const usePresetEnv = process.env.USE_PRESET === 'true';
    const scanFullMcpServerEnv = process.env.SCAN_FULL_MCP_SERVER === 'true';

    let usePreset = false;
    if (usePresetEnv) {
        usePreset = true;
    } else if (scanFullMcpServerEnv) {
        usePreset = false;
    }

    const presetNameAlias = req.body.mcpPresetName || req.body.presetName || req.body.preset || req.body.mcpPreset;
    const mcpPresetName = presetNameAlias || process.env.PRESET_DEFAULT_NAME || null;
    let mcpPreset = null;

    if (mcpPresetName && mcpUIRoutes) {
        mcpPreset = mcpUIRoutes.getPreset(mcpPresetName);
        if (mcpPreset) {
            console.log(`✅ AI Service: Using MCP preset '${mcpPresetName}'.`);
        } else {
            console.log(`⚠️ AI Service: MCP preset '${mcpPresetName}' not found.`);
        }
    }
    // --- End MCP Preset Handling ---

    // Si hay modo de funciones disponible, usar el plugin
    if (functionMode !== 'none' && functionsPlugin) {
        console.log(`🚀 AI Service: Iniciando modo '${functionMode}'!`);
        const handler = await getFunctionHandler(functionMode);
        if (handler) {
            const userInput = promptData.input;
            let userContext = '';
            try {
                userContext = req.body.context || '';
            } catch (err) {
                console.log("⚠️ AI Service: Error extrayendo contexto:", err.message)
            }

            const options = {
                mcpPresetName,
                mcpPreset,
                usePreset
            };

            console.log(`📨 AI Service: Procesando input con handler ${functionMode}: "${promptData.input}"`);
            const result = await handler.chat(promptData.input, userContext, options);
            console.log(`✅ AI Service: Respuesta generada con handler ${functionMode}, result.answer:`, result.answer);
            console.log(`✅ AI Service: Respuesta generada con handler ${functionMode}`, "--------------------------");

            const promptPayload = {
                answer: result.answer || result,
                snippets: userContext ? userContext.split('\n').slice(0, 50) : [],
                hadFunctionCalls: result.hadFunctionCalls || false,
                mode: functionMode,
                mcpPresetName: usePreset ? mcpPresetName : null,
                mcpPresetCounts: usePreset && mcpPreset ? mcpPreset.itemsCount : undefined,
                usePreset: usePreset
            }

            promptData.payload = promptPayload;

        } else {
            promptData.payload = {
                error: `❌ AI Service: No se pudo obtener handler para modo '${functionMode}'`
            }

        }
    }

    return promptData;

}