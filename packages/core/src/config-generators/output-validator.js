/**
 * Validación ligera de configuración IOS generada.
 * No intenta validar toda la sintaxis, solo errores comunes.
 */
export function validateGeneratedConfig(lines) {
    const warnings = [];
    const errors = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;
        if (/["\t]/.test(line)) {
            warnings.push({
                line: lineNum,
                content: line,
                message: 'Tabs or quotes in config line may cause IOS parsing issues',
                code: 'PUNCTUATION',
            });
        }
        if (/[\x00-\x1F\x7F]/.test(line)) {
            errors.push({
                line: lineNum,
                content: line,
                message: 'Non-printable control characters detected',
                code: 'CONTROL_CHARS',
            });
        }
        const ipMatch = line.match(/ip address\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)/);
        if (ipMatch) {
            const ip = ipMatch[1];
            const mask = ipMatch[2];
            if (!isValidIPv4(ip)) {
                errors.push({
                    line: lineNum,
                    content: line,
                    message: `Invalid IP address: ${ip}`,
                    code: 'INVALID_IP',
                });
            }
            if (!isValidSubnetMask(mask)) {
                errors.push({
                    line: lineNum,
                    content: line,
                    message: `Invalid subnet mask: ${mask}`,
                    code: 'INVALID_MASK',
                });
            }
        }
        const vlanMatch = line.match(/^vlan\s+(\d+)/);
        if (vlanMatch) {
            const vlanId = parseInt(vlanMatch[1], 10);
            if (vlanId < 1 || vlanId > 4094) {
                errors.push({
                    line: lineNum,
                    content: line,
                    message: `VLAN ID ${vlanId} out of range (1-4094)`,
                    code: 'VLAN_OUT_OF_RANGE',
                });
            }
        }
    }
    return {
        valid: errors.length === 0,
        lines: lines.length,
        warnings,
        errors,
    };
}
function isValidIPv4(ip) {
    const parts = ip.split('.');
    if (parts.length !== 4)
        return false;
    return parts.every((p) => {
        const n = Number(p);
        return Number.isInteger(n) && n >= 0 && n <= 255;
    });
}
function isValidSubnetMask(mask) {
    const parts = mask.split('.');
    if (parts.length !== 4)
        return false;
    const octets = parts.map((p) => Number(p));
    if (octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255))
        return false;
    const binary = octets.map((o) => o.toString(2).padStart(8, '0')).join('');
    return /^1*0*$/.test(binary);
}
//# sourceMappingURL=output-validator.js.map