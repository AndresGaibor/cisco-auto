import { describe, expect, it } from 'bun:test';
import { SecurityGenerator } from './security-generator';
import type { ACLSpec } from '../canonical/device.spec';

describe('SecurityGenerator', () => {
  describe('generateACLs', () => {
    it('should generate standard numbered ACL', () => {
      const acls: ACLSpec[] = [
        {
          name: '10',
          type: 'standard',
          rules: [
            { action: 'permit', protocol: 'ip', source: '192.168.1.0', sourceWildcard: '0.0.0.255' },
            { action: 'deny', protocol: 'ip', source: 'any' },
          ],
        },
      ];

      const commands = SecurityGenerator.generateACLs(acls);
      expect(commands).toContain('access-list 10 permit 192.168.1.0 0.0.0.255');
      expect(commands).toContain('access-list 10 deny any');
    });

    it('should generate extended numbered ACL', () => {
      const acls: ACLSpec[] = [
        {
          name: '100',
          type: 'extended',
          rules: [
            {
              action: 'permit',
              protocol: 'tcp',
              source: '192.168.1.0',
              sourceWildcard: '0.0.0.255',
              destination: '10.0.0.0',
              destinationWildcard: '0.255.255.255',
              destinationPort: 80,
            },
          ],
        },
      ];

      const commands = SecurityGenerator.generateACLs(acls);
      expect(commands).toContain('access-list 100 permit tcp 192.168.1.0 0.0.0.255 10.0.0.0 0.255.255.255 eq 80');
    });

    it('should generate named standard ACL', () => {
      const acls: ACLSpec[] = [
        {
          name: 'ALLOWED_HOSTS',
          type: 'named',
          rules: [
            { action: 'permit', protocol: 'ip', source: '192.168.1.10' },
            { action: 'permit', protocol: 'ip', source: '192.168.1.11' },
            { action: 'deny', protocol: 'ip', source: 'any' },
          ],
        },
      ];

      const commands = SecurityGenerator.generateACLs(acls);
      expect(commands).toContain('! ACL: ALLOWED_HOSTS');
      expect(commands).toContain('ip access-list standard ALLOWED_HOSTS');
      expect(commands).toContain(' permit 192.168.1.10');
      expect(commands).toContain(' permit 192.168.1.11');
      expect(commands).toContain(' deny any');
      expect(commands).toContain(' exit');
    });

    it('should generate named extended ACL with ports', () => {
      const acls: ACLSpec[] = [
        {
          name: 'WEB_ACCESS',
          type: 'named',
          rules: [
            {
              action: 'permit',
              protocol: 'tcp',
              source: '192.168.0.0',
              sourceWildcard: '0.0.255.255',
              destination: 'any',
              destinationPort: 443,
            },
            {
              action: 'permit',
              protocol: 'tcp',
              source: '192.168.0.0',
              sourceWildcard: '0.0.255.255',
              destination: 'any',
              destinationPort: 80,
            },
          ],
        },
      ];

      const commands = SecurityGenerator.generateACLs(acls);
      expect(commands).toContain('ip access-list extended WEB_ACCESS');
      expect(commands).toContain(' permit tcp 192.168.0.0 0.0.255.255 any eq 443');
      expect(commands).toContain(' permit tcp 192.168.0.0 0.0.255.255 any eq 80');
    });

    it('should not include protocol in standard ACL rules', () => {
      const acls: ACLSpec[] = [
        {
          name: 'SIMPLE',
          type: 'named',
          rules: [
            // Use only source addresses without ports to get standard ACL
            { action: 'permit', protocol: 'ip', source: '10.0.0.1' },
          ],
        },
      ];

      const commands = SecurityGenerator.generateACLs(acls);
      // Standard ACLs should NOT include protocol - inferred from rules
      expect(commands).toContain('ip access-list standard SIMPLE');
      expect(commands).toContain(' permit 10.0.0.1');
    });

    it('should handle host keyword in source', () => {
      const acls: ACLSpec[] = [
        {
          name: 'HOST_ACL',
          type: 'named',
          rules: [
            { action: 'permit', protocol: 'ip', source: 'host 192.168.1.1' },
          ],
        },
      ];

      const commands = SecurityGenerator.generateACLs(acls);
      expect(commands).toContain(' permit host 192.168.1.1');
    });

    it('should handle log option', () => {
      const acls: ACLSpec[] = [
        {
          name: 'LOGGED_ACL',
          type: 'named',
          rules: [
            // Use tcp protocol to ensure it's inferred as extended
            { action: 'deny', protocol: 'tcp', source: 'any', destination: 'any', destinationPort: 22, log: true },
          ],
        },
      ];

      const commands = SecurityGenerator.generateACLs(acls);
      expect(commands).toContain('ip access-list extended LOGGED_ACL');
      expect(commands).toContain(' deny tcp any any eq 22 log');
    });
  });
});
