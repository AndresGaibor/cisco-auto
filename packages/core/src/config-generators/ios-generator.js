import { BaseGenerator } from './base-generator.js';
import { VlanGenerator } from './vlan-generator.js';
import { RoutingGenerator } from './routing-generator.js';
import { SecurityGenerator } from './security-generator.js';
import { validateGeneratedConfig } from './output-validator.js';
/**
 * Orden predeterminado de secciones IOS (best practice Cisco)
 */
export const DEFAULT_SECTION_ORDER = [
    'basic', // hostname, banner, service password-encryption
    'vlans', // VLAN database
    'vtp', // VTP configuration
    'interfaces', // Physical and logical interfaces
    'routing', // Routing protocols (OSPF, EIGRP, BGP)
    'security', // ACLs, NAT
    'lines' // Console, VTY lines
];
/**
 * Orden personalizado de secciones IOS
 * Permite reordenar las secciones según preferencias del usuario
 */
export class SectionOrderConfig {
    /**
     * Genera configuración IOS con orden personalizado de secciones
     * @param device - Especificación del dispositivo
     * @param sectionOrder - Orden de secciones (default: DEFAULT_SECTION_ORDER)
     */
    static generate(device, sectionOrder = DEFAULT_SECTION_ORDER) {
        const sections = {
            'basic': BaseGenerator.generateBasic(device),
            'interfaces': VlanGenerator.generateInterfaces(device),
            'vlans': device.vlans ? VlanGenerator.generateVLANs(device.vlans, device.vtp) : [],
            'vtp': device.vtp ? VlanGenerator.generateVTP(device.vtp) : [],
            'routing': device.routing ? RoutingGenerator.generateRouting(device.routing) : [],
            // Security: canonical uses device.security.acls and device.security.nat
            'security': device.security ? SecurityGenerator.generateSecurity(device.security) : [],
            'lines': device.lines ? BaseGenerator.generateLines(device.lines) : []
        };
        const commands = [];
        commands.push('!');
        commands.push(`! Configuración generada por cisco-auto`);
        commands.push(`! Dispositivo: ${device.name}`);
        commands.push(`! Tipo: ${device.type}`);
        commands.push('!');
        commands.push('');
        // Usar orden personalizado o el default
        const order = sectionOrder.length > 0 ? sectionOrder : DEFAULT_SECTION_ORDER;
        for (const sectionName of order) {
            const sectionCommands = sections[sectionName];
            if (sectionCommands && sectionCommands.length > 0) {
                commands.push(`! --- ${sectionName.toUpperCase()} ---`);
                commands.push(...sectionCommands);
                commands.push('');
            }
        }
        // Agregar secciones no listadas en el orden (por seguridad)
        const listedSections = new Set(order);
        for (const [name, sectionCommands] of Object.entries(sections)) {
            if (!listedSections.has(name) && sectionCommands.length > 0) {
                commands.push(`! --- ${name.toUpperCase()} (unlisted) ---`);
                commands.push(...sectionCommands);
                commands.push('');
            }
        }
        // Validación ligera del output (no lanza, solo añade comentarios)
        const validation = validateGeneratedConfig(commands);
        if (!validation.valid) {
            commands.push('! CONFIG VALIDATION ERRORS:');
            for (const err of validation.errors) {
                commands.push(`! [${err.code}] line ${err.line}: ${err.message}`);
            }
        }
        commands.push('! Guardar configuración');
        commands.push('end');
        commands.push('write memory');
        return {
            hostname: device.hostname || device.name,
            commands,
            sections
        };
    }
    /**
     * Valida que un orden de secciones sea válido
     */
    static validateOrder(sectionOrder) {
        const errors = [];
        const warnings = [];
        const validSections = new Set(DEFAULT_SECTION_ORDER);
        for (const section of sectionOrder) {
            if (!validSections.has(section)) {
                warnings.push(`Unknown section: '${section}'. Will be ignored if not generated`);
            }
        }
        // Verificar secciones duplicadas
        const seen = new Set();
        for (const section of sectionOrder) {
            if (seen.has(section)) {
                errors.push(`Duplicate section: '${section}'`);
            }
            seen.add(section);
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
    /**
     * Obtiene el orden predeterminado
     */
    static getDefaultOrder() {
        return [...DEFAULT_SECTION_ORDER];
    }
    /**
     * Crea un orden personalizado moviendo secciones específicas
     * @param moves - Objeto con secciones a mover { sectionName: newIndex }
     */
    static customizeOrder(moves) {
        const customOrder = [...DEFAULT_SECTION_ORDER];
        for (const [section, newIndex] of Object.entries(moves)) {
            const currentIndex = customOrder.indexOf(section);
            if (currentIndex !== -1) {
                // Remover y colocar en nueva posición
                customOrder.splice(currentIndex, 1);
                const clampedIndex = Math.min(Math.max(0, newIndex), customOrder.length);
                customOrder.splice(clampedIndex, 0, section);
            }
        }
        return customOrder;
    }
}
export class IOSGenerator {
    static generate(device) {
        return SectionOrderConfig.generate(device, DEFAULT_SECTION_ORDER);
    }
    static formatCommands(commands) {
        return commands.join('\n');
    }
}
export function generateIOS(device) {
    return IOSGenerator.generate(device);
}
//# sourceMappingURL=ios-generator.js.map