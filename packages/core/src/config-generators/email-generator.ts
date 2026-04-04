/**
 * EMAIL GENERATOR
 * 
 * Genera configuración de Email para Server-PT en Packet Tracer
 */

export interface EmailSpec {
  enabled: boolean;
  emailDomain?: string;
  smtpPort?: number;
  pop3Port?: number;
  imapPort?: number;
  mailboxes?: EmailMailbox[];
}

export interface EmailMailbox {
  username: string;
  password?: string;
  fullName?: string;
  emailAddress: string;
}

export class EmailGenerator {
  /**
   * Genera configuración de email para un dispositivo
   */
  static generate(spec: EmailSpec): string[] {
    const commands: string[] = [];

    if (!spec.enabled) return commands;

    commands.push('! Email Service Configuration');
    commands.push('! (Configured on Server-PT device)');

    if (spec.emailDomain) {
      commands.push(`ip domain-name ${spec.emailDomain}`);
    }

    if (spec.smtpPort && spec.smtpPort !== 25) {
      commands.push(`ip smtp port ${spec.smtpPort}`);
    }

    if (spec.pop3Port && spec.pop3Port !== 110) {
      commands.push(`ip pop3 port ${spec.pop3Port}`);
    }

    if (spec.imapPort && spec.imapPort !== 143) {
      commands.push(`ip imap port ${spec.imapPort}`);
    }

    if (spec.mailboxes?.length) {
      commands.push('! Mailbox Configuration');
      for (const mb of spec.mailboxes) {
        commands.push(`username ${mb.username} privilege 0 secret ${mb.password ?? 'cisco'}`);
        commands.push(`email address ${mb.emailAddress}`);
        if (mb.fullName) {
          commands.push(`email fullname ${mb.fullName}`);
        }
      }
    }

    return commands;
  }

  /**
   * Valida la configuración de email
   */
  static validate(spec: EmailSpec): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (spec.smtpPort && (spec.smtpPort < 1 || spec.smtpPort > 65535)) {
      errors.push(`SMTP port out of range: ${spec.smtpPort} (must be 1-65535)`);
    }

    if (spec.pop3Port && (spec.pop3Port < 1 || spec.pop3Port > 65535)) {
      errors.push(`POP3 port out of range: ${spec.pop3Port} (must be 1-65535)`);
    }

    if (spec.imapPort && (spec.imapPort < 1 || spec.imapPort > 65535)) {
      errors.push(`IMAP port out of range: ${spec.imapPort} (must be 1-65535)`);
    }

    if (spec.enabled && !spec.emailDomain) {
      warnings.push('Email domain not configured, may affect mail delivery');
    }

    if (spec.enabled && spec.smtpPort === 25 && spec.pop3Port === 25) {
      errors.push('SMTP and POP3 ports cannot be the same');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Genera un ejemplo de configuración de email
   */
  static generateExample(): string[] {
    return EmailGenerator.generate({
      enabled: true,
      emailDomain: 'lab.local',
      smtpPort: 25,
      pop3Port: 110,
      mailboxes: [
        {
          username: 'admin',
          password: 'cisco123',
          fullName: 'Administrator',
          emailAddress: 'admin@lab.local',
        },
      ],
    });
  }
}