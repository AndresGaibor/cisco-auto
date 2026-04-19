import { describe, expect, test } from 'bun:test';
import { validatePTSafe } from '../pt-safe-validator';

describe('PT Safe Validator', () => {
  describe('codigo valido para Packet Tracer', () => {
    test('acepta uso de ipc y dprint', () => {
      const codigo = `
        ipc.send('device', 'config');
        dprint('mensaje');
      `;
      const resultado = validatePTSafe(codigo);
      expect(resultado.valid).toBe(true);
      expect(resultado.errors).toHaveLength(0);
    });

    test('acepta uso de console', () => {
      const codigo = `
        console.log('debug');
        console.error('error');
      `;
      const resultado = validatePTSafe(codigo);
      expect(resultado.valid).toBe(true);
    });

    test('acepta Math y JSON', () => {
      const codigo = `
        var val = Math.floor(3.5);
        var obj = JSON.parse('{"a":1}');
      `;
      const resultado = validatePTSafe(codigo);
      expect(resultado.valid).toBe(true);
    });

    test('acepta funciones tradicionales', () => {
      const codigo = `
        function configurar() {
          var x = 10;
          return x;
        }
        configurar();
      `;
      const resultado = validatePTSafe(codigo);
      expect(resultado.valid).toBe(true);
    });

    test('acepta timers con delay entero', () => {
      const codigo = `
        setTimeout(function() { }, 1000);
        setInterval(function() { }, 500);
      `;
      const resultado = validatePTSafe(codigo);
      expect(resultado.valid).toBe(true);
    });
  });

  describe('rechaza globales de Node.js', () => {
    test('rechaza process', () => {
      const codigo = `process.exit();`;
      const resultado = validatePTSafe(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'process')).toBe(true);
      expect(resultado.errors[0]?.category).toBe('node-global');
    });

    test('rechaza Buffer', () => {
      const codigo = `var buf = Buffer.from('test');`;
      const resultado = validatePTSafe(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'Buffer')).toBe(true);
    });

    test('rechaza require', () => {
      const codigo = `var foo = require('./foo');`;
      const resultado = validatePTSafe(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'require')).toBe(true);
    });

    test('rechaza module.exports', () => {
      const codigo = `module.exports = {};`;
      const resultado = validatePTSafe(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'module')).toBe(true);
    });

    test('rechaza exports', () => {
      const codigo = `exports.foo = 1;`;
      const resultado = validatePTSafe(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'exports')).toBe(true);
    });

    test('rechaza __dirname', () => {
      const codigo = `var path = __dirname;`;
      const resultado = validatePTSafe(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === '__dirname')).toBe(true);
    });

    test('rechaza __filename', () => {
      const codigo = `var f = __filename;`;
      const resultado = validatePTSafe(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === '__filename')).toBe(true);
    });

    test('rechaza global', () => {
      const codigo = `global.console;`;
      const resultado = validatePTSafe(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'global')).toBe(true);
    });

    test('rechaza globalThis', () => {
      const codigo = `globalThis.console;`;
      const resultado = validatePTSafe(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'globalThis')).toBe(true);
    });
  });

  describe('rechaza APIs prohibidas', () => {
    test('rechaza fs.readFile directo', () => {
      const codigo = `fs.readFile('path');`;
      const resultado = validatePTSafe(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'fs direct')).toBe(true);
    });

    test('rechaza fs.writeFile directo', () => {
      const codigo = `fs.writeFile('path', data);`;
      const resultado = validatePTSafe(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'fs direct')).toBe(true);
    });

    test('rechaza readFile directo', () => {
      const codigo = `readFile('path');`;
      const resultado = validatePTSafe(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'readFile')).toBe(true);
    });

    test('rechaza writeFile directo', () => {
      const codigo = `writeFile('path', data);`;
      const resultado = validatePTSafe(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'writeFile')).toBe(true);
    });

    test('rechaza eval dinamico', () => {
      const codigo = 'eval("foo" + bar);';
      const resultado = validatePTSafe(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'eval dynamic')).toBe(true);
    });

    test('rechaza Function constructor', () => {
      const codigo = `var fn = new Function('x', 'return x');`;
      const resultado = validatePTSafe(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'Function()')).toBe(true);
    });
  });

  describe('rechaza patrones estructurales problematicos', () => {
    test('rechaza while(true) sin break', () => {
      const codigo = `
        while (true) {
          x++;
        }
      `;
      const resultado = validatePTSafe(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'while true no break')).toBe(true);
    });

    test('acepta while(true) con break', () => {
      const codigo = `
        while (true) {
          if (x > 10) break;
          x++;
        }
      `;
      const resultado = validatePTSafe(codigo);
      expect(resultado.valid).toBe(true);
    });

    test('rechaza catch vacio', () => {
      const codigo = `
        try {
          foo();
        } catch (e) {
        }
      `;
      const resultado = validatePTSafe(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'empty catch')).toBe(true);
    });

    test('acepta catch con manejo', () => {
      const codigo = `
        try {
          foo();
        } catch (e) {
          console.error(e);
        }
      `;
      const resultado = validatePTSafe(codigo);
      expect(resultado.valid).toBe(true);
    });
  });

  describe('warnings', () => {
    test('avisa sobre dprint con objetos complejos', () => {
      const codigo = `dprint({ a: 1, b: 2, c: { d: 3 } });`;
      const resultado = validatePTSafe(codigo);
      expect(resultado.warnings.some(w => w.includes('dprint'))).toBe(true);
    });

    test('avisa sobre concatenacion en loops', () => {
      const codigo = `
        for (var i = 0; i < 10; i++) {
          str += 'a';
        }
      `;
      const resultado = validatePTSafe(codigo);
      expect(resultado.warnings.some(w => w.includes('Concatenacion'))).toBe(true);
    });
  });

  describe('opciones de configuracion', () => {
    test('allowPrivilege permite privileged', () => {
      const codigo = `privileged.execute('cmd');`;
      const resultado = validatePTSafe(codigo, {
        allowPrivilege: true,
      });
      expect(resultado.valid).toBe(true);
    });

    test('sin allowPrivilege rechaza privileged', () => {
      const codigo = `privileged.execute('cmd');`;
      const resultado = validatePTSafe(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'privileged')).toBe(true);
    });
  });
});
