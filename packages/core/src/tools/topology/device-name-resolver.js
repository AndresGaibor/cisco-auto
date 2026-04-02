// Resolver de nombres de dispositivos cuando Packet Tracer los modifica automáticamente
// Ej: "Router1" -> "Router1(1)"
// Provee una función para reconciliar un TopologyPlan generado con la topología
// actual consultada al bridge de Packet Tracer.
// ============================================================================
// Utilidades
// ============================================================================
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function normalizeName(s) {
    return s.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}
// ============================================================================
// Lógica principal
// ============================================================================
/**
 * Reconcilia los nombres del plan original con la topología actual consultada.
 *
 * - Si Packet Tracer renombró dispositivos (p. ej. Router1 -> Router1(1)),
 *   esta función intentará mapear los nombres originales a los nombres actuales.
 * - Actualiza también los deviceName dentro de los links del plan.
 */
export function resolveDeviceNames(originalPlan, currentTopology) {
    // Clonar plan (no mutar entrada)
    const plan = JSON.parse(JSON.stringify(originalPlan));
    const nameMap = {};
    const usedCurrent = new Set();
    // Índice de topología actual por nombre y por tipo
    const currentByName = new Map();
    const currentList = currentTopology || [];
    for (const d of currentList) {
        currentByName.set(String(d.name), d);
    }
    // Helper: buscar candidato actual para un device original
    function findCandidate(original) {
        const originalName = String(original.name);
        // 1) Búsqueda exacta (case-sensitive y luego case-insensitive)
        const exact = currentList.find(c => c.name === originalName);
        if (exact)
            return exact;
        const ci = currentList.find(c => c.name.toLowerCase() === originalName.toLowerCase());
        if (ci)
            return ci;
        // 2) Prefiere candidatos del mismo tipo (router/switch/pc/server)
        const desiredType = original.model?.type;
        // 3) Búsqueda por patrón frecuente: "Name(number)" p.ej Router1 -> Router1(1)
        const pattern = new RegExp(`^${escapeRegex(originalName)}\\(\\d+\\)$`, 'i');
        let candidates = currentList.filter(c => pattern.test(String(c.name)));
        if (candidates.length > 0) {
            if (desiredType) {
                const matchByType = candidates.find(c => c.type === desiredType);
                if (matchByType)
                    return matchByType;
            }
            return candidates[0];
        }
        // 4) Sufijos comunes: Name_1, Name-1, Name1
        const sufPattern = new RegExp(`^${escapeRegex(originalName)}[_\-]?(\\d+)$`, 'i');
        candidates = currentList.filter(c => sufPattern.test(String(c.name)));
        if (candidates.length > 0) {
            if (desiredType) {
                const m = candidates.find(c => c.type === desiredType);
                if (m)
                    return m;
            }
            return candidates[0];
        }
        // 5) Normalización y comparación (quita símbolos y compara startsWith)
        const origNorm = normalizeName(originalName);
        const normCandidates = currentList
            .map(c => ({ c, norm: normalizeName(String(c.name)) }))
            .filter(x => x.norm.includes(origNorm) || origNorm.includes(x.norm));
        if (normCandidates.length > 0) {
            // preferir mismo tipo
            if (desiredType) {
                const m = normCandidates.map(x => x.c).find(c => c.type === desiredType);
                if (m)
                    return m;
            }
            return normCandidates[0].c;
        }
        // 6) Intención débil: buscar por número al final (Router2 -> cualquier que contenga '2')
        const trailingNumberMatch = originalName.match(/(\d+)$/);
        if (trailingNumberMatch) {
            const num = trailingNumberMatch[1];
            const numCandidates = currentList.filter(c => String(c.name).includes(num));
            if (numCandidates.length === 1)
                return numCandidates[0];
            if (numCandidates.length > 1 && desiredType) {
                return numCandidates.find(c => c.type === desiredType);
            }
        }
        return undefined;
    }
    // Resolver dispositivos uno a uno; marcar current usados para evitar duplicados
    for (const device of plan.devices) {
        const originalName = String(device.name);
        const candidate = findCandidate(device);
        if (candidate && !usedCurrent.has(candidate.name)) {
            nameMap[originalName] = candidate.name;
            usedCurrent.add(candidate.name);
            device.name = candidate.name;
        }
        else {
            // No encontrado: dejar nombre original y marcar como no emparejado (will be reported)
            // nameMap no tendrá entrada para este nombre
        }
    }
    // Actualizar deviceName en links según los nombres resueltos por deviceId
    const deviceNameById = new Map();
    for (const d of plan.devices) {
        deviceNameById.set(d.id, d.name);
    }
    for (const link of plan.links) {
        if (link.from)
            link.from.deviceName = deviceNameById.get(link.from.deviceId) || link.from.deviceName;
        if (link.to)
            link.to.deviceName = deviceNameById.get(link.to.deviceId) || link.to.deviceName;
    }
    const unmatchedOriginalNames = plan.devices.filter(d => !nameMap[d.name] && !Array.from(usedCurrent).includes(d.name)).map(d => d.name);
    const unusedCurrentNames = currentList.map(c => c.name).filter(n => !usedCurrent.has(n));
    return {
        plan,
        nameMap,
        unmatchedOriginalNames,
        unusedCurrentNames
    };
}
export default resolveDeviceNames;
//# sourceMappingURL=device-name-resolver.js.map