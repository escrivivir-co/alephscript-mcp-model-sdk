import { MCPMixin } from './MCPMixin.mjs';

export function mixMCPMixin(target) {
    // Aplicar MCPMixin correctamente
    const mcpMixin = new MCPMixin();

    // Copiar todas las propiedades del mixin
    Object.assign(target, mcpMixin);

    // Copiar todos los métodos del prototype del mixin
    const mcpProto = Object.getPrototypeOf(mcpMixin);
    Object.getOwnPropertyNames(mcpProto).forEach(name => {
        if (name !== 'constructor' && typeof mcpProto[name] === 'function') {
            target[name] = mcpProto[name].bind(target);
        }
    });


}