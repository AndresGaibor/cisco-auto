/**
 * TOOL: pt_explain_plan
 *
 * Genera una explicación detallada de un plan de topología de red,
 * incluyendo Overview, Devices, Connections, IPScheme, Routing y Recommendations.
 */
const TEXTS_ES = {
    overview: 'Resumen',
    devices: 'Dispositivos',
    connections: 'Conexiones',
    ipScheme: 'Esquema IP',
    routing: 'Enrutamiento',
    recommendations: 'Recomendaciones',
    resumen: 'Resumen general de la topología',
    dispositivos: 'Explicación de cada dispositivo y su rol',
    conexiones: 'Explicación de los enlaces entre dispositivos',
    esquemaIp: 'Explicación del direccionamiento IP',
    protocoloRouting: 'Explicación del protocolo de enrutamiento',
    recomendacion: 'Recomendaciones para mejorar la topología'
};
const TEXTS_EN = {
    overview: 'Overview',
    devices: 'Devices',
    connections: 'Connections',
    ipScheme: 'IP Scheme',
    routing: 'Routing',
    recommendations: 'Recommendations',
    resumen: 'General topology overview',
    dispositivos: 'Explanation of each device and its role',
    conexiones: 'Explanation of links between devices',
    esquemaIp: 'IP addressing explanation',
    protocoloRouting: 'Routing protocol explanation',
    recomendacion: 'Recommendations to improve the topology'
};
/**
 * Obtiene los textos según el idioma
 */
function getTexts(language) {
    return language === 'es' ? TEXTS_ES : TEXTS_EN;
}
/**
 * Tipos de red en texto
 */
const NETWORK_TYPE_TEXT = {
    single_lan: { es: 'LAN simple', en: 'Single LAN' },
    multi_lan: { es: 'LAN múltiple', en: 'Multi-LAN' },
    multi_lan_wan: { es: 'LAN múltiple con WAN', en: 'Multi-LAN with WAN' },
    star: { es: 'Topología estrella', en: 'Star topology' },
    hub_spoke: { es: 'Topología hub-spoke', en: 'Hub-Spoke topology' },
    router_on_a_stick: { es: 'Router-on-a-stick', en: 'Router-on-a-stick' },
    triangle: { es: 'Topología triángulo', en: 'Triangle topology' },
    custom: { es: 'Topología personalizada', en: 'Custom topology' }
};
/**
 * Protocolos de routing en texto
 */
const ROUTING_PROTOCOL_TEXT = {
    ospf: { es: 'OSPF (Open Shortest Path First)', en: 'OSPF (Open Shortest Path First)' },
    eigrp: { es: 'EIGRP (Enhanced Interior Gateway Routing Protocol)', en: 'EIGRP (Enhanced Interior Gateway Routing Protocol)' },
    bgp: { es: 'BGP (Border Gateway Protocol)', en: 'BGP (Border Gateway Protocol)' },
    static: { es: 'Enrutamiento estático', en: 'Static routing' },
    none: { es: 'Sin enrutamiento', en: 'No routing' }
};
/**
 * Tipos de cable en texto
 */
const CABLE_TYPE_TEXT = {
    'straight-through': { es: 'Cable directo', en: 'Straight-through cable' },
    'crossover': { es: 'Cable cruzado', en: 'Crossover cable' },
    'fiber': { es: 'Cable de fibra', en: 'Fiber cable' },
    'serial': { es: 'Cable serial', en: 'Serial cable' },
    'console': { es: 'Cable de consola', en: 'Console cable' },
    'auto': { es: 'Cable automático', en: 'Auto cable' }
};
/**
 * Genera la sección de resumen
 */
function generateOverview(plan, texts, language) {
    const networkType = NETWORK_TYPE_TEXT[plan.params.networkType]?.[language] || plan.params.networkType;
    const deviceSummary = plan.devices.reduce((acc, d) => {
        const type = d.model.type;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});
    const deviceList = Object.entries(deviceSummary)
        .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
        .join(', ');
    const content = language === 'es'
        ? `Esta topología "${plan.name}" es una ${networkType} que contiene ${plan.devices.length} dispositivo(s): ${deviceList}. La red tiene ${plan.links.length} enlace(s) configurado(s).`
        : `This topology "${plan.name}" is a ${networkType} containing ${plan.devices.length} device(s): ${deviceList}. The network has ${plan.links.length} configured link(s).`;
    return {
        title: texts.overview,
        content
    };
}
/**
 * Genera la sección de dispositivos
 */
function generateDevicesSection(plan, texts, language) {
    const deviceDescriptions = plan.devices.map(device => {
        const configuredInterfaces = device.interfaces.filter(i => i.configured && i.ip);
        const interfaceInfo = configuredInterfaces.length > 0
            ? configuredInterfaces.map(i => `${i.name}: ${i.ip}/${i.subnetMask || 'N/A'}`).join(', ')
            : (language === 'es' ? 'Sin interfaces configuradas' : 'No configured interfaces');
        const vlansInfo = device.vlans && device.vlans.length > 0
            ? `, VLANs: ${device.vlans.map(v => `${v.id} (${v.name})`).join(', ')}`
            : '';
        const dhcpInfo = device.dhcp && device.dhcp.length > 0
            ? `, DHCP pools: ${device.dhcp.map(d => d.poolName).join(', ')}`
            : '';
        const routingInfo = device.routing
            ? `, Routing: ${ROUTING_PROTOCOL_TEXT[device.routing.protocol]?.[language] || device.routing.protocol}`
            : '';
        const description = language === 'es'
            ? `${device.name} (${device.model.name}) - ${device.model.type.toUpperCase()}. Interfaces: ${interfaceInfo}${vlansInfo}${dhcpInfo}${routingInfo}`
            : `${device.name} (${device.model.name}) - ${device.model.type.toUpperCase()}. Interfaces: ${interfaceInfo}${vlansInfo}${dhcpInfo}${routingInfo}`;
        return `- ${description}`;
    }).join('\n');
    return {
        title: texts.devices,
        content: deviceDescriptions
    };
}
/**
 * Genera la sección de conexiones
 */
function generateConnectionsSection(plan, texts, language) {
    const connectionDescriptions = plan.links.map(link => {
        const fromDevice = plan.devices.find(d => d.id === link.from.deviceId);
        const toDevice = plan.devices.find(d => d.id === link.to.deviceId);
        const fromName = fromDevice?.name || link.from.deviceId;
        const toName = toDevice?.name || link.to.deviceId;
        const cableText = CABLE_TYPE_TEXT[link.cableType]?.[language] || link.cableType;
        const description = language === 'es'
            ? `${fromName} [${link.from.port}] <--(${cableText})--> ${toName} [${link.to.port}]`
            : `${fromName} [${link.from.port}] <--(${cableText})--> ${toName} [${link.to.port}]`;
        return `- ${description}`;
    }).join('\n');
    return {
        title: texts.connections,
        content: connectionDescriptions
    };
}
/**
 * Genera la sección de esquema IP
 */
function generateIPSchemeSection(plan, texts, language) {
    const allIps = [];
    for (const device of plan.devices) {
        for (const iface of device.interfaces) {
            if (iface.ip && iface.configured) {
                allIps.push({
                    device: device.name,
                    interface: iface.name,
                    ip: iface.ip,
                    mask: iface.subnetMask || '255.255.255.0'
                });
            }
        }
    }
    if (allIps.length === 0) {
        return {
            title: texts.ipScheme,
            content: language === 'es'
                ? 'No hay direcciones IP configuradas en esta topología.'
                : 'There are no IP addresses configured in this topology.'
        };
    }
    const ipDescriptions = allIps.map(ip => {
        return language === 'es'
            ? `- ${ip.device} (${ip.interface}): ${ip.ip}/${ip.mask}`
            : `- ${ip.device} (${ip.interface}): ${ip.ip}/${ip.mask}`;
    }).join('\n');
    const baseNetworkInfo = plan.params.baseNetwork
        ? (language === 'es'
            ? `\nRed base: ${plan.params.baseNetwork}/${plan.params.subnetMask || '255.255.255.0'}`
            : `\nBase network: ${plan.params.baseNetwork}/${plan.params.subnetMask || '255.255.255.0'}`)
        : '';
    return {
        title: texts.ipScheme,
        content: ipDescriptions + baseNetworkInfo
    };
}
/**
 * Genera la sección de routing
 */
function generateRoutingSection(plan, texts, language) {
    const routingDevices = plan.devices.filter(d => d.routing);
    if (routingDevices.length === 0) {
        // Verificar si hay routers sin configuración de routing
        const routers = plan.devices.filter(d => d.model.type === 'router');
        if (routers.length > 0) {
            const protocol = ROUTING_PROTOCOL_TEXT[plan.params.routingProtocol || 'static']?.[language] || plan.params.routingProtocol;
            return {
                title: texts.routing,
                content: language === 'es'
                    ? `La topología utiliza ${protocol}. Los routers configurados son: ${routingDevices.map(d => d.name).join(', ') || 'ninguno aún'}.`
                    : `The topology uses ${protocol}. Configured routers are: ${routingDevices.map(d => d.name).join(', ') || 'none yet'}.`
            };
        }
        return {
            title: texts.routing,
            content: language === 'es'
                ? 'No hay configuración de enrutamiento en esta topología.'
                : 'There is no routing configuration in this topology.'
        };
    }
    const routingDescriptions = routingDevices.map(device => {
        const protocolText = ROUTING_PROTOCOL_TEXT[device.routing.protocol]?.[language] || device.routing.protocol;
        let details = '';
        if (device.routing.ospf) {
            const ospf = device.routing.ospf;
            details = language === 'es'
                ? `, Proceso: ${ospf.processId}, Áreas: ${ospf.areas.map(a => a.area).join(', ')}`
                : `, Process: ${ospf.processId}, Areas: ${ospf.areas.map(a => a.area).join(', ')}`;
        }
        else if (device.routing.eigrp) {
            const eigrp = device.routing.eigrp;
            details = language === 'es'
                ? `, AS: ${eigrp.asNumber}, Networks: ${eigrp.networks.join(', ')}`
                : `, AS: ${eigrp.asNumber}, Networks: ${eigrp.networks.join(', ')}`;
        }
        else if (device.routing.static) {
            details = language === 'es'
                ? `, Rutas estáticas: ${device.routing.static.length}`
                : `, Static routes: ${device.routing.static.length}`;
        }
        return language === 'es'
            ? `- ${device.name}: ${protocolText}${details}`
            : `- ${device.name}: ${protocolText}${details}`;
    }).join('\n');
    return {
        title: texts.routing,
        content: routingDescriptions
    };
}
/**
 * Genera la sección de recomendaciones
 */
function generateRecommendationsSection(plan, texts, language) {
    const recommendations = [];
    // Verificar si hay DHCP
    const hasDhcpConfig = plan.devices.some(d => d.dhcp && d.dhcp.length > 0);
    if (!hasDhcpConfig && plan.params.dhcpEnabled) {
        recommendations.push(language === 'es'
            ? '- Implementar DHCP para simplificar la gestión de IPs en los clientes.'
            : '- Implement DHCP to simplify IP management for clients.');
    }
    // Verificar si hay VLANs en switches
    const switches = plan.devices.filter(d => d.model.type === 'switch');
    const switchesWithoutVlan = switches.filter(d => !d.vlans || d.vlans.length === 0);
    if (switchesWithoutVlan.length > 0) {
        recommendations.push(language === 'es'
            ? `- Configurar VLANs en los switches (${switchesWithoutVlan.map(s => s.name).join(', ')}) para segmentar la red.`
            : `- Configure VLANs on switches (${switchesWithoutVlan.map(s => s.name).join(', ')}) to segment the network.`);
    }
    // Verificar si hay routers sin routing configurado
    const routersWithoutRouting = plan.devices.filter(d => d.model.type === 'router' && !d.routing);
    if (routersWithoutRouting.length > 0) {
        recommendations.push(language === 'es'
            ? `- Configurar protocolos de enrutamiento en routers (${routersWithoutRouting.map(r => r.name).join(', ')}).`
            : `- Configure routing protocols on routers (${routersWithoutRouting.map(r => r.name).join(', ')}).`);
    }
    // Verificar si hay credenciales configuradas
    const devicesWithoutCredentials = plan.devices.filter(d => !d.credentials);
    if (devicesWithoutCredentials.length > 0 && devicesWithoutCredentials.length < plan.devices.length) {
        recommendations.push(language === 'es'
            ? '- Configurar credenciales de acceso seguro en todos los dispositivos.'
            : '- Configure secure access credentials on all devices.');
    }
    // Verificar disponibilidad de puertos
    for (const device of plan.devices) {
        const availablePorts = device.interfaces.filter(i => !i.configured).length;
        if (availablePorts > device.interfaces.length * 0.7) {
            recommendations.push(language === 'es'
                ? `- ${device.name} tiene muchos puertos sin usar (${availablePorts}/${device.interfaces.length}). Considerar usar más puertos o un modelo más pequeño.`
                : `- ${device.name} has many unused ports (${availablePorts}/${device.interfaces.length}). Consider using more ports or a smaller model.`);
        }
    }
    // Recomendación por defecto si no hay específicas
    if (recommendations.length === 0) {
        recommendations.push(language === 'es'
            ? '- La topología está bien configurada. Continuar con las pruebas de conectividad.'
            : '- The topology is well configured. Continue with connectivity tests.');
    }
    return {
        title: texts.recommendations,
        content: recommendations.join('\n')
    };
}
/**
 * Genera la explicación completa del plan
 */
function explainTopologyPlan(plan, language) {
    const texts = getTexts(language);
    const sections = [
        generateOverview(plan, texts, language),
        generateDevicesSection(plan, texts, language),
        generateConnectionsSection(plan, texts, language),
        generateIPSchemeSection(plan, texts, language),
        generateRoutingSection(plan, texts, language),
        generateRecommendationsSection(plan, texts, language)
    ];
    // Generar explanation summary
    const explanation = language === 'es'
        ? `Topología "${plan.name}" con ${plan.devices.length} dispositivos y ${plan.links.length} conexiones.`
        : `Topology "${plan.name}" with ${plan.devices.length} devices and ${plan.links.length} connections.`;
    return {
        explanation,
        sections
    };
}
export const ptExplainPlanTool = {
    name: 'pt_explain_plan',
    description: 'Explica un plan de topología de red en detalle',
    longDescription: 'Genera una explicación detallada de un TopologyPlan incluyendo: resumen general, descripción de dispositivos, conexiones, esquema de direccionamiento IP, protocolo de enrutamiento y recomendaciones de mejora. Soporta español e inglés.',
    category: 'analysis',
    tags: ['analysis', 'topology', 'explain', 'network', 'documentation'],
    inputSchema: {
        type: 'object',
        properties: {
            plan: {
                type: 'object',
                description: 'Plan de topología a explicar'
            },
            language: {
                type: 'string',
                enum: ['es', 'en'],
                default: 'es',
                description: 'Idioma para la explicación (español o inglés)'
            }
        },
        required: ['plan']
    },
    handler: async (input) => {
        const plan = input.plan;
        const language = input.language || 'es';
        // Validación básica de estructura
        if (!plan || typeof plan !== 'object') {
            return {
                ok: false,
                error: language === 'es'
                    ? 'Se requiere un plan de topología válido'
                    : 'A valid topology plan is required',
                code: 'INVALID_INPUT'
            };
        }
        if (!plan.devices || !Array.isArray(plan.devices)) {
            return {
                ok: false,
                error: language === 'es'
                    ? 'El plan debe contener un array de devices'
                    : 'The plan must contain a devices array',
                code: 'INVALID_STRUCTURE'
            };
        }
        if (!plan.links || !Array.isArray(plan.links)) {
            return {
                ok: false,
                error: language === 'es'
                    ? 'El plan debe contener un array de links'
                    : 'The plan must contain a links array',
                code: 'INVALID_STRUCTURE'
            };
        }
        // Generar la explicación
        const result = explainTopologyPlan(plan, language);
        return {
            ok: true,
            data: result
        };
    }
};
//# sourceMappingURL=explain-plan.js.map