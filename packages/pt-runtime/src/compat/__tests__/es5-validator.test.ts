import { describe, expect, test } from 'bun:test';
import { validateES5 } from '../es5-validator';

describe('ES5 Validator', () => {
  describe('valid ES5 code', () => {
    test('acepta codigo ES5 basico', () => {
      const codigo = `
        function hola(nombre) {
          var mensaje = 'Hola ' + nombre;
          return mensaje;
        }
        var resultado = hola('mundo');
      `;
      const resultado = validateES5(codigo);
      expect(resultado.valid).toBe(true);
      expect(resultado.errors).toHaveLength(0);
    });

    test('acepta uso de var', () => {
      const codigo = `
        var x = 10;
        var obj = { a: 1, b: 2 };
        var arr = [1, 2, 3];
      `;
      const resultado = validateES5(codigo);
      expect(resultado.valid).toBe(true);
    });

    test('acepta for loops tradicionales', () => {
      const codigo = `
        for (var i = 0; i < 10; i++) {
          console.log(i);
        }
      `;
      const resultado = validateES5(codigo);
      expect(resultado.valid).toBe(true);
    });

    test('acepta JSON y Math', () => {
      const codigo = `
        var obj = JSON.parse('{"a":1}');
        var val = Math.floor(3.7);
        var str = String(val);
      `;
      const resultado = validateES5(codigo);
      expect(resultado.valid).toBe(true);
    });
  });

  describe('reject ES6+ features', () => {
    test('rechaza import syntax', () => {
      const codigo = `import { foo } from 'modulo';`;
      const resultado = validateES5(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'import')).toBe(true);
    });

    test('rechaza export syntax', () => {
      const codigo = `export var x = 10;`;
      const resultado = validateES5(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'export')).toBe(true);
    });

    test('rechaza class keyword', () => {
      const codigo = `
        class Persona {
          constructor(nombre) {
            this.nombre = nombre;
          }
        }
      `;
      const resultado = validateES5(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'class')).toBe(true);
    });

    test('rechaza let', () => {
      const codigo = `let x = 10;`;
      const resultado = validateES5(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'let/const')).toBe(true);
    });

    test('rechaza const', () => {
      const codigo = `const y = 20;`;
      const resultado = validateES5(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'let/const')).toBe(true);
    });

    test('rechaza arrow functions', () => {
      const codigo = `var fn = function(x) { return x * 2; };`;
      const resultado = validateES5(codigo);
      expect(resultado.valid).toBe(true);
    });

    test('rechaza arrow con =>', () => {
      const codigo = `var fn = (x) => x * 2;`;
      const resultado = validateES5(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'arrow function')).toBe(true);
    });

    test('rechaza template literals', () => {
      const codigo = 'var msg = `Hola ${nombre}`;';
      const resultado = validateES5(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'template literal')).toBe(true);
    });

    test('rechaza backticks sin template literal', () => {
      const codigo = 'var str = `simple`;';
      const resultado = validateES5(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'backtick')).toBe(true);
    });

    test('rechaza async keyword', () => {
      const codigo = `async function fetchData() {}`;
      const resultado = validateES5(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'async')).toBe(true);
    });

    test('rechaza await keyword', () => {
      const codigo = `var result = await fetch(url);`;
      const resultado = validateES5(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'await')).toBe(true);
    });

    test('rechaza generator functions', () => {
      const codigo = `function* generador() { yield 1; }`;
      const resultado = validateES5(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'function*')).toBe(true);
    });

    test('rechaza yield', () => {
      const codigo = `function gen() { yield 1; }`;
      const resultado = validateES5(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'yield')).toBe(true);
    });

    test('rechaza optional chaining', () => {
      const codigo = 'var val = obj?.prop;';
      const resultado = validateES5(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === '?.')).toBe(true);
    });

    test('rechaza nullish coalescing', () => {
      const codigo = `var val = foo ?? 'default';`;
      const resultado = validateES5(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === '??')).toBe(true);
    });

    test('rechaza Promise', () => {
      const codigo = `var p = new Promise(cb);`;
      const resultado = validateES5(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'Promise')).toBe(true);
    });

    test('rechaza Map', () => {
      const codigo = `var m = new Map();`;
      const resultado = validateES5(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'Map/Set')).toBe(true);
    });

    test('rechaza Set', () => {
      const codigo = `var s = new Set();`;
      const resultado = validateES5(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'Map/Set')).toBe(true);
    });

    test('rechaza spread operator en arrays', () => {
      const codigo = `var arr = [...oldArr];`;
      const resultado = validateES5(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'spread')).toBe(true);
    });

    test('rechaza rest parameters', () => {
      const codigo = `function fn(a, ...rest) { }`;
      const resultado = validateES5(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'rest')).toBe(true);
    });

    test('rechaza destructuring object', () => {
      const codigo = `var { a, b } = obj;`;
      const resultado = validateES5(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'destructuring')).toBe(true);
    });

    test('rechaza destructuring array', () => {
      const codigo = `var [x, y] = arr;`;
      const resultado = validateES5(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'array destructuring')).toBe(true);
    });

    test('rechaza super keyword', () => {
      const codigo = `class Hijo extends Padre { constructor() { super(); } }`;
      const resultado = validateES5(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'super')).toBe(true);
    });

    test('rechaza new.target', () => {
      const codigo = `if (new.target) { }`;
      const resultado = validateES5(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'new.target')).toBe(true);
    });

    test('rechaza Proxy', () => {
      const codigo = `var proxy = new Proxy(obj, {});`;
      const resultado = validateES5(codigo);
      expect(resultado.valid).toBe(false);
      expect(resultado.errors.some(e => e.pattern === 'Proxy/Reflect')).toBe(true);
    });
  });

  describe('error location', () => {
    test('reporta numero de linea correcto', () => {
      const codigo = `
function foo() {
  let x = 10;
  return x;
}
      `;
      const resultado = validateES5(codigo);
      expect(resultado.valid).toBe(false);
      const error = resultado.errors.find(e => e.pattern === 'let/const');
      expect(error).toBeDefined();
      expect(error?.line).toBe(3);
    });
  });
});
