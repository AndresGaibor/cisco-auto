import { generateSecurityCommands, type SecurityConfigInput } from "@cisco-auto/kernel/plugins/security";
import {
  type AclCreateInput,
  type AclCreateResult,
  type AclAddRuleInput,
  type AclAddRuleResult,
  type AclApplyInput,
  type AclApplyResult,
  type AclUseCaseOutput,
  type AclControllerPort,
  type AclType,
  parseAclType as parseAclTypeImpl,
  validateAclName as validateAclNameImpl,
  validateDirection as validateDirectionImpl,
  validateInterface as validateInterfaceImpl,
} from "./acl-types";

export function parseAclType(raw: string): AclType {
  return parseAclTypeImpl(raw);
}

export function validateAclName(name: string): boolean {
  return validateAclNameImpl(name);
}

export function validateDirection(dir: string): boolean {
  return validateDirectionImpl(dir);
}

export function validateInterface(interfaceName: string): boolean {
  return validateInterfaceImpl(interfaceName);
}

export function buildAclCreateCommands(name: string, type: "standard" | "extended"): string[] {
  if (!validateAclName(name)) {
    throw new Error("Nombre de ACL inválido");
  }

  try {
    const securityInput: SecurityConfigInput = {
      deviceName: "temp",
      acls: [{ name, type, rules: [] }],
    };

    const commands = generateSecurityCommands(securityInput);
    if (commands.length > 0) return commands;
  } catch {
    // Fallback si el schema requiere reglas
  }

  return [`ip access-list ${type} ${name}`];
}

export function buildAclRuleCommand(aclName: string, rule: string): string {
  return `access-list ${aclName} ${rule}`;
}

export function buildAclApplyCommands(aclName: string, interfaceName: string, direction: "in" | "out"): string[] {
  if (!validateDirection(direction)) {
    throw new Error("Dirección inválida. Use 'in' o 'out'");
  }

  if (!validateInterface(interfaceName)) {
    throw new Error(`Interfaz inválida: ${interfaceName}`);
  }

  return [
    `interface ${interfaceName}`,
    `ip access-group ${aclName} ${direction}`,
  ];
}

export async function executeAclCreate(
  _controller: AclControllerPort,
  input: AclCreateInput,
): Promise<AclUseCaseOutput<AclCreateResult>> {
  try {
    const type = parseAclType(input.type);
    const commands = buildAclCreateCommands(input.name, type);

    return {
      ok: true,
      data: {
        name: input.name,
        type,
        commands,
        commandsGenerated: commands.length,
      },
      advice: ["Usa pt acl add-rule para agregar reglas"],
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export async function executeAclAddRule(
  _controller: AclControllerPort,
  input: AclAddRuleInput,
): Promise<AclUseCaseOutput<{ acl: string; command: string }>> {
  try {
    if (!validateAclName(input.aclName)) {
      return {
        ok: false,
        error: { message: "Nombre de ACL inválido" },
      };
    }

    if (!input.rule || input.rule.trim().length === 0) {
      return {
        ok: false,
        error: { message: "Regla no puede estar vacía" },
      };
    }

    const command = buildAclRuleCommand(input.aclName, input.rule);

    return {
      ok: true,
      data: {
        acl: input.aclName,
        command,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export async function executeAclApply(
  controller: AclControllerPort,
  input: AclApplyInput,
): Promise<AclUseCaseOutput<AclApplyResult>> {
  try {
    if (!validateDirection(input.direction)) {
      return {
        ok: false,
        error: { message: "Dirección inválida. Use 'in' o 'out'" },
      };
    }

    if (!validateInterface(input.interface)) {
      return {
        ok: false,
        error: { message: `Interfaz inválida: ${input.interface}` },
      };
    }

    const commands = buildAclApplyCommands(input.aclName, input.interface, input.direction);

    await controller.start();
    try {
      await controller.configIos(input.deviceName, commands);
      return {
        ok: true,
        data: {
          acl: input.aclName,
          device: input.deviceName,
          interface: input.interface,
          direction: input.direction,
          commands,
          commandsGenerated: commands.length,
        },
        advice: [`Usa pt show run-config ${input.deviceName} para verificar`],
      };
    } finally {
      await controller.stop();
    }
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}