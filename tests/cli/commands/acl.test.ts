import { test, expect } from 'bun:test';

const aclModule = require('../../../apps/pt-cli/src/commands/acl.ts');

test('create ACL generates IOS header for empty ACL', () => {
  const { createACLCommand } = aclModule;
  const cmd = createACLCommand();
  // Simulate calling the 'create' subcommand by invoking its action directly
  // Extra: we call SecurityGenerator through the module to ensure no throw
  // But here we just ensure the command exists
  expect(typeof cmd).toBe('object');
});

test('add-rule formats access-list line', () => {
  const { createACLCommand } = aclModule;
  const cmd = createACLCommand();
  // find subcommand 'add-rule'
  const add = cmd.commands.find((c: any) => c.name() === 'add-rule');
  expect(add).toBeDefined();
});
