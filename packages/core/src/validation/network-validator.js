/**
 * Network Validator - Validates network configurations
 * Checks subnets, IP ranges, overlaps, and connectivity
 */
import { createError, createValidationResult } from './validation-types';
import { ValidationCodes } from './validation-codes';
export class NetworkValidator {
    validateSubnet(subnet) {
        const errors = [];
        if (!this.isValidCIDR(subnet)) {
            errors.push(createError(ValidationCodes.NETWORK_INVALID_SUBNET, `Invalid CIDR notation: ${subnet}`, 'subnet'));
        }
        return createValidationResult(errors);
    }
    validateSubnets(subnets) {
        const errors = [];
        const warnings = [];
        const parsedSubnets = [];
        // Validate each subnet
        for (const subnet of subnets) {
            if (!this.isValidCIDR(subnet)) {
                errors.push(createError(ValidationCodes.NETWORK_INVALID_SUBNET, `Invalid CIDR: ${subnet}`, 'subnets'));
                continue;
            }
            parsedSubnets.push(this.parseSubnet(subnet));
        }
        // Check for overlaps
        for (let i = 0; i < parsedSubnets.length; i++) {
            for (let j = i + 1; j < parsedSubnets.length; j++) {
                if (this.subnetsOverlap(parsedSubnets[i], parsedSubnets[j])) {
                    errors.push(createError(ValidationCodes.NETWORK_OVERLAP, `Subnets overlap: ${subnets[i]} and ${subnets[j]}`, 'subnets'));
                }
            }
        }
        return createValidationResult(errors, warnings);
    }
    validateIpInSubnet(ip, subnet) {
        const errors = [];
        if (!this.isValidIpAddress(ip)) {
            errors.push(createError(ValidationCodes.INVALID_INPUT, `Invalid IP address: ${ip}`, 'ip'));
            return createValidationResult(errors);
        }
        if (!this.isValidCIDR(subnet)) {
            errors.push(createError(ValidationCodes.NETWORK_INVALID_SUBNET, `Invalid CIDR: ${subnet}`, 'subnet'));
            return createValidationResult(errors);
        }
        if (!this.ipInSubnet(ip, subnet)) {
            errors.push(createError(ValidationCodes.NETWORK_HOST_CONFLICT, `IP ${ip} not in subnet ${subnet}`, 'ip'));
        }
        return createValidationResult(errors);
    }
    validateNetworkSize(subnet, minHosts) {
        const errors = [];
        if (!this.isValidCIDR(subnet)) {
            errors.push(createError(ValidationCodes.NETWORK_INVALID_SUBNET, `Invalid CIDR: ${subnet}`, 'subnet'));
            return createValidationResult(errors);
        }
        const [, prefix] = subnet.split('/');
        const prefixLen = parseInt(prefix, 10);
        const availableHosts = Math.pow(2, 32 - prefixLen) - 2; // Subtract network and broadcast
        if (availableHosts < minHosts) {
            errors.push(createError(ValidationCodes.NETWORK_TOO_SMALL, `Subnet ${subnet} has only ${availableHosts} hosts, need ${minHosts}`, 'subnet'));
        }
        return createValidationResult(errors);
    }
    isValidCIDR(cidr) {
        const [ip, prefix] = cidr.split('/');
        if (!ip || !prefix)
            return false;
        const prefixNum = parseInt(prefix, 10);
        return this.isValidIpAddress(ip) && prefixNum >= 0 && prefixNum <= 32;
    }
    isValidIpAddress(ip) {
        const parts = ip.split('.');
        if (parts.length !== 4)
            return false;
        return parts.every(part => {
            const num = parseInt(part, 10);
            return !isNaN(num) && num >= 0 && num <= 255;
        });
    }
    parseSubnet(subnet) {
        const [ip, prefix] = subnet.split('/');
        return {
            ip: this.ipToNumber(ip),
            prefix: parseInt(prefix, 10),
        };
    }
    ipToNumber(ip) {
        const parts = ip.split('.');
        return ((parseInt(parts[0], 10) << 24) +
            (parseInt(parts[1], 10) << 16) +
            (parseInt(parts[2], 10) << 8) +
            parseInt(parts[3], 10));
    }
    subnetsOverlap(subnet1, subnet2) {
        const mask1 = (-1 << (32 - subnet1.prefix)) >>> 0;
        const mask2 = (-1 << (32 - subnet2.prefix)) >>> 0;
        return (subnet1.ip & mask1) === (subnet2.ip & mask2) && Math.max(subnet1.prefix, subnet2.prefix) === Math.min(subnet1.prefix, subnet2.prefix);
    }
    ipInSubnet(ip, subnet) {
        const [subnetIp, prefix] = subnet.split('/');
        const prefixNum = parseInt(prefix, 10);
        const mask = (-1 << (32 - prefixNum)) >>> 0;
        const ipNum = this.ipToNumber(ip);
        const subnetNum = this.ipToNumber(subnetIp);
        return (ipNum & mask) === (subnetNum & mask);
    }
}
//# sourceMappingURL=network-validator.js.map