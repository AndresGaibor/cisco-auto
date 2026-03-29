import { describe, expect, it } from 'bun:test';
import { ConfigDiffer } from './config-differ';

describe('ConfigDiffer', () => {
  const oldConfig = `
! --- BASIC ---
hostname OldRouter
ip domain-name old.local
banner motd #Old Banner#

! --- INTERFACES ---
interface GigabitEthernet0/0
 ip address 192.168.1.1 255.255.255.0
 no shutdown
 exit

interface GigabitEthernet0/1
 ip address 192.168.2.1 255.255.255.0
 shutdown
 exit

! --- ROUTING ---
router ospf 1
 router-id 1.1.1.1
 network 192.168.1.0 0.0.0.255 area 0
 exit
`.trim();

  const newConfig = `
! --- BASIC ---
hostname NewRouter
ip domain-name new.local
banner motd #New Banner#

! --- INTERFACES ---
interface GigabitEthernet0/0
 ip address 192.168.1.1 255.255.255.0
 no shutdown
 exit

interface GigabitEthernet0/1
 ip address 10.0.0.1 255.255.255.0
 no shutdown
 exit

interface GigabitEthernet0/2
 ip address 172.16.0.1 255.255.255.0
 no shutdown
 exit

! --- ROUTING ---
router ospf 1
 router-id 2.2.2.2
 network 192.168.1.0 0.0.0.255 area 0
 network 10.0.0.0 0.0.0.255 area 0
 exit
`.trim();

  describe('diff', () => {
    it('should detect added lines', () => {
      const diff = ConfigDiffer.diff(oldConfig, newConfig);

      expect(diff.added.length).toBeGreaterThan(0);
      expect(diff.added.some(l => l.includes('172.16.0.1'))).toBe(true);
      expect(diff.added.some(l => l.includes('10.0.0.0'))).toBe(true);
    });

    it('should detect removed lines', () => {
      const diff = ConfigDiffer.diff(oldConfig, newConfig);

      expect(diff.removed.length).toBeGreaterThan(0);
      expect(diff.removed.some(l => l.includes('192.168.2.1'))).toBe(true);
    });

    it('should identify affected sections', () => {
      const diff = ConfigDiffer.diff(oldConfig, newConfig);

      expect(diff.affectedSections).toContain('interfaces');
      expect(diff.affectedSections).toContain('routing');
      expect(diff.affectedSections).toContain('basic');
    });

    it('should handle array input', () => {
      const oldLines = ['hostname Old', 'interface Gi0/0'];
      const newLines = ['hostname New', 'interface Gi0/0'];

      const diff = ConfigDiffer.diff(oldLines, newLines);

      expect(diff.removed.some(l => l.includes('Old'))).toBe(true);
      expect(diff.added.some(l => l.includes('New'))).toBe(true);
    });

    it('should respect ignoreComments option', () => {
      const configWithComments = `
! This is a comment
hostname Router
! Another comment
interface Gi0/0
`;

      const diff = ConfigDiffer.diff(configWithComments, 'hostname Router\ninterface Gi0/0', {
        ignoreComments: true
      });

      expect(diff.added).toHaveLength(0);
      expect(diff.removed).toHaveLength(0);
    });

    it('should respect ignoreBlank option', () => {
      const configWithBlanks = `
hostname Router

interface Gi0/0

`;

      const diff = ConfigDiffer.diff(configWithBlanks, 'hostname Router\ninterface Gi0/0', {
        ignoreBlank: true
      });

      expect(diff.added).toHaveLength(0);
      expect(diff.removed).toHaveLength(0);
    });

    it('should respect ignoreCase option', () => {
      const diff = ConfigDiffer.diff('HOSTNAME Router', 'hostname router', {
        ignoreCase: true,
        ignoreComments: false,
        ignoreBlank: true
      });

      expect(diff.added).toHaveLength(0);
      expect(diff.removed).toHaveLength(0);
    });
  });

  describe('generateIncrementalCommands', () => {
    it('should generate commands to remove old config', () => {
      const diff = ConfigDiffer.diff(oldConfig, newConfig);
      const commands = ConfigDiffer.generateIncrementalCommands(diff);

      // Should have 'no' commands for removed lines
      const noCommands = commands.filter(c => c.startsWith('no '));
      expect(noCommands.length).toBeGreaterThan(0);
    });

    it('should generate commands to add new config', () => {
      const diff = ConfigDiffer.diff(oldConfig, newConfig);
      const commands = ConfigDiffer.generateIncrementalCommands(diff);

      // Should have commands for new lines
      expect(commands.length).toBeGreaterThan(0);
    });
  });

  describe('generateRollbackScript', () => {
    it('should generate rollback script', () => {
      const diff = ConfigDiffer.diff(oldConfig, newConfig);
      const rollback = ConfigDiffer.generateRollbackScript(diff);

      expect(rollback.some(l => l.includes('! Rollback script'))).toBe(true);
      expect(rollback.some(l => l.includes('end'))).toBe(true);
      expect(rollback.some(l => l.includes('write memory'))).toBe(true);
    });

    it('should reverse the changes', () => {
      const diff = ConfigDiffer.diff(oldConfig, newConfig);
      const rollback = ConfigDiffer.generateRollbackScript(diff);

      // Rollback should try to undo added lines
      const noCommands = rollback.filter(c => c.startsWith('no '));
      expect(noCommands.length).toBeGreaterThan(0);
    });
  });

  describe('formatDiff', () => {
    it('should format diff for display', () => {
      const diff = ConfigDiffer.diff(oldConfig, newConfig);
      const formatted = ConfigDiffer.formatDiff(diff);

      expect(formatted).toContain('=== Configuration Diff ===');
      expect(formatted).toContain('+ ADDED:');
      expect(formatted).toContain('- REMOVED:');
      expect(formatted).toContain('Affected sections:');
    });
  });

  describe('isRemovableLine', () => {
    it('should identify removable lines', () => {
      expect(ConfigDiffer['isRemovableLine']('ip address 1.1.1.1 255.255.255.0')).toBe(true);
      expect(ConfigDiffer['isRemovableLine']('shutdown')).toBe(true);
      expect(ConfigDiffer['isRemovableLine']('speed 100')).toBe(true);
    });

    it('should not identify structural lines as removable', () => {
      expect(ConfigDiffer['isRemovableLine']('interface Gi0/0')).toBe(false);
      expect(ConfigDiffer['isRemovableLine']('router ospf 1')).toBe(false);
      expect(ConfigDiffer['isRemovableLine']('vlan 10')).toBe(false);
      expect(ConfigDiffer['isRemovableLine']('line console 0')).toBe(false);
    });

    it('should not identify lines already with no as removable', () => {
      expect(ConfigDiffer['isRemovableLine']('no shutdown')).toBe(false);
      expect(ConfigDiffer['isRemovableLine']('no ip address')).toBe(false);
    });
  });
});
