// ============================================================================
// PT Control V2 - Doctor Command
// ============================================================================
// Comprehensive diagnostic tool for PT Control CLI issues.

import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import pc from 'picocolors';
import { BaseCommand } from '../../base-command.js';

interface DoctorIssue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  hint?: string;
}

interface DoctorResult {
  healthy: boolean;
  issues: DoctorIssue[];
  checks: Record<string, { ok: boolean; detail: string }>;
}

export default class Doctor extends BaseCommand {
  static override description = 'Diagnose PT Control setup and runtime issues';

  static override examples = [
    '<%= config.bin %> doctor',
    '<%= config.bin %> doctor --dev-dir ~/my-pt-dev',
    '<%= config.bin %> doctor --verbose',
  ];

  static override flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const verbose = this.globalFlags.verbose;
    const result = await this.runDiagnostics();

    this.print(pc.bold(`\nPT Control Doctor\n`));
    this.print(`${pc.gray('dev-dir:')} ${this.devDir}\n`);

    const checks = Object.entries(result.checks);
    for (const [name, check] of checks) {
      const icon = check.ok ? pc.green('✓') : pc.red('✗');
      this.print(`  ${icon} ${name}: ${check.detail}`);
    }

    if (verbose && result.issues.length > 0) {
      this.print(`\n${pc.bold('Issues:')}`);
      for (const issue of result.issues) {
        const icon = issue.severity === 'error' ? pc.red('✗')
          : issue.severity === 'warning' ? pc.yellow('⚠')
          : pc.gray('ℹ');
        this.print(`  ${icon} [${issue.category}] ${issue.message}`);
        if (issue.hint) {
          this.print(`    ${pc.gray('→')} ${pc.cyan(issue.hint)}`);
        }
      }
    }

    this.print('');
    if (result.healthy) {
      this.printSuccess('All checks passed. PT Control is ready.');
    } else {
      const errors = result.issues.filter(i => i.severity === 'error').length;
      const warnings = result.issues.filter(i => i.severity === 'warning').length;
      if (errors > 0) {
        this.printWarning(`${errors} error(s), ${warnings} warning(s) found.`);
      } else {
        this.printWarning(`${warnings} warning(s) found.`);
      }
    }
  }

  private async runDiagnostics(): Promise<DoctorResult> {
    const issues: DoctorIssue[] = [];
    const checks: DoctorResult['checks'] = {};

    const devDir = this.devDir;
    const devDirExists = existsSync(devDir);

    checks['dev-dir exists'] = {
      ok: devDirExists,
      detail: devDirExists ? devDir : pc.red('Directory does not exist'),
    };

    if (!devDirExists) {
      issues.push({
        severity: 'error',
        category: 'setup',
        message: `dev-dir does not exist: ${devDir}`,
        hint: `Create the directory or use --dev-dir to point to a valid PT development directory.`,
      });
      return { healthy: false, issues, checks };
    }

    const checkFile = (relPath: string, label: string): boolean => {
      const fullPath = join(devDir, relPath);
      const exists = existsSync(fullPath);
      checks[label] = {
        ok: exists,
        detail: exists ? relPath : pc.red(`MISSING: ${relPath}`),
      };
      if (!exists) {
        issues.push({
          severity: 'error',
          category: 'files',
          message: `Missing required file: ${relPath}`,
          hint: relPath === 'main.js'
            ? 'Run: pt runtime build --deploy'
            : relPath === 'runtime.js'
            ? 'Run: pt runtime generate'
            : undefined,
        });
      }
      return exists;
    };

    const mainJsOk = checkFile('main.js', 'main.js');
    checkFile('runtime.js', 'runtime.js (generated)');
    checkFile('state.json', 'state.json');
    checkFile('command.json', 'command.json (v1 bridge)');
    checkFile(join('logs', 'events.current.ndjson'), 'events log (v2)');

    checkFile(join('commands', '000000000000-snapshot.json'), 'commands/ queue dir');
    this.checkLease(devDir, checks, issues);
    await this.checkSnapshot(devDir, checks, issues);
    this.checkPendingResults(devDir, checks, issues);
    this.checkEventLog(devDir, checks, issues);
    this.checkBridgeHealth(devDir, checks, issues);

    const hasErrors = issues.some(i => i.severity === 'error');
    return { healthy: !hasErrors, issues, checks };
  }

  private checkLease(devDir: string, checks: Record<string, { ok: boolean; detail: string }>, issues: DoctorIssue[]): void {
    const leasePath = join(devDir, 'bridge-lease.json');
    const exists = existsSync(leasePath);

    if (!exists) {
      checks['bridge lease'] = { ok: false, detail: pc.yellow('No lease file (bridge not running or V1 mode)') };
      issues.push({
        severity: 'info',
        category: 'lease',
        message: 'No bridge-lease.json found',
        hint: 'The bridge (V2) may not be active. This is normal if using V1 or if PT is not running.',
      });
      return;
    }

    try {
      const content = readFileSync(leasePath, 'utf-8');
      const lease = JSON.parse(content);
      const ageMs = Date.now() - (lease.timestamp || 0);
      const isRecent = ageMs < 30000;

      checks['bridge lease'] = {
        ok: isRecent,
        detail: isRecent
          ? `Active (${Math.round(ageMs / 1000)}s old)`
          : pc.yellow(`Stale (${Math.round(ageMs / 60000)}m old)`),
      };

      if (!isRecent) {
        issues.push({
          severity: 'warning',
          category: 'lease',
          message: `Bridge lease is stale (${Math.round(ageMs / 60000)}m old)`,
          hint: 'PT may have crashed or the bridge process died. Restart PT.',
        });
      }
    } catch {
      checks['bridge lease'] = { ok: false, detail: pc.red('Could not read lease file') };
      issues.push({ severity: 'error', category: 'lease', message: 'Corrupt bridge-lease.json' });
    }
  }

  private async checkSnapshot(devDir: string, checks: Record<string, { ok: boolean; detail: string }>, issues: DoctorIssue[]): Promise<void> {
    const statePath = join(devDir, 'state.json');

    if (!existsSync(statePath)) {
      checks['snapshot'] = { ok: false, detail: pc.red('No state.json') };
      issues.push({
        severity: 'warning',
        category: 'snapshot',
        message: 'No state.json found',
        hint: 'Run "pt snapshot save" or wait for PT to write state.json.',
      });
      return;
    }

    try {
      const stats = statSync(statePath);
      const ageMs = Date.now() - stats.mtimeMs;
      const ageMin = Math.round(ageMs / 60000);
      const isRecent = ageMs < 300000;

      let detail = `${ageMin}m old`;
      if (ageMs < 60000) detail = `${Math.round(ageMs / 1000)}s old`;
      detail += isRecent ? '' : pc.yellow(' (old)');

      checks['snapshot age'] = { ok: isRecent, detail };

      if (!isRecent) {
        issues.push({
          severity: 'warning',
          category: 'snapshot',
          message: `state.json is ${ageMin}m old`,
          hint: 'Snapshot may be stale. Run "pt snapshot save" to refresh.',
        });
      }

      const content = readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);

      if (state.devices && state.links) {
        const deviceCount = Object.keys(state.devices).length;
        const linkCount = Object.keys(state.links).length;

        checks['snapshot content'] = {
          ok: true,
          detail: `${deviceCount} device(s), ${linkCount} link(s)`,
        };

        if (deviceCount === 0 && linkCount === 0) {
          issues.push({
            severity: 'warning',
            category: 'snapshot',
            message: 'state.json is empty (no devices or links)',
            hint: 'PT may not have initialized the topology yet.',
          });
        }
      } else {
        checks['snapshot content'] = { ok: false, detail: pc.red('Invalid format (missing devices/links)') };
        issues.push({
          severity: 'error',
          category: 'snapshot',
          message: 'state.json has invalid format',
          hint: 'The file may be corrupted. Delete it and wait for PT to regenerate.',
        });
      }
    } catch (e) {
      const err = e as Error;
      checks['snapshot'] = { ok: false, detail: pc.red(`Error: ${err.message}`) };
      issues.push({
        severity: 'error',
        category: 'snapshot',
        message: `Failed to read state.json: ${err.message}`,
      });
    }
  }

  private checkPendingResults(devDir: string, checks: Record<string, { ok: boolean; detail: string }>, issues: DoctorIssue[]): void {
    const resultsDir = join(devDir, 'results');

    if (!existsSync(resultsDir)) {
      checks['pending results'] = { ok: true, detail: 'No results dir (normal)' };
      return;
    }

    try {
      const files = readdirSync(resultsDir).filter(f => f.endsWith('.json'));
      checks['pending results'] = {
        ok: files.length === 0,
        detail: files.length === 0
          ? 'No pending results'
          : pc.yellow(`${files.length} result file(s) may be orphaned`),
      };

      if (files.length > 0) {
        issues.push({
          severity: 'warning',
          category: 'results',
          message: `${files.length} result file(s) in results/ may not have been consumed`,
          hint: 'This can happen after a crash. They should be cleaned up automatically.',
        });
      }
    } catch {
      checks['pending results'] = { ok: false, detail: pc.red('Could not read results/') };
    }
  }

  private checkEventLog(devDir: string, checks: Record<string, { ok: boolean; detail: string }>, issues: DoctorIssue[]): void {
    const v2Log = join(devDir, 'logs', 'events.current.ndjson');
    const v1Log = join(devDir, 'events.ndjson');

    const hasV2 = existsSync(v2Log);
    const hasV1 = existsSync(v1Log);

    if (hasV2) {
      try {
        const stats = statSync(v2Log);
        const ageMs = Date.now() - stats.mtimeMs;
        const isRecent = ageMs < 60000;
        checks['event log'] = {
          ok: isRecent,
          detail: `V2 active (${Math.round(ageMs / 1000)}s old)`,
        };
      } catch {
        checks['event log'] = { ok: false, detail: pc.red('V2 log exists but unreadable') };
      }
    } else if (hasV1) {
      checks['event log'] = {
        ok: true,
        detail: pc.yellow('V1 events.ndjson found (legacy mode)'),
      };
      issues.push({
        severity: 'info',
        category: 'events',
        message: 'Using legacy V1 event log path',
        hint: 'V2 writes to logs/events.current.ndjson. Check that your runtime supports V2.',
      });
    } else {
      checks['event log'] = { ok: false, detail: pc.yellow('No event log found') };
      issues.push({
        severity: 'warning',
        category: 'events',
        message: 'No event log found',
        hint: 'PT runtime may not be emitting events yet.',
      });
    }
  }

  private checkBridgeHealth(devDir: string, checks: Record<string, { ok: boolean; detail: string }>, issues: DoctorIssue[]): void {
    const statePath = join(devDir, 'state.json');
    const commandPath = join(devDir, 'command.json');
    const v2CommandDir = join(devDir, 'commands');

    const hasV2Paths = existsSync(v2CommandDir);
    const hasV1Command = existsSync(commandPath);

    checks['bridge mode'] = {
      ok: hasV2Paths,
      detail: hasV2Paths
        ? 'V2 queue mode'
        : hasV1Command
        ? 'V1 single-file mode'
        : pc.yellow('No command path detected'),
    };

    if (!hasV2Paths && !hasV1Command) {
      issues.push({
        severity: 'warning',
        category: 'bridge',
        message: 'Neither V1 (command.json) nor V2 (commands/) bridge paths detected',
        hint: 'PT runtime may not be writing commands.',
      });
    }
  }
}
