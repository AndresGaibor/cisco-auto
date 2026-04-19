// Validador de compatibilidad ES5 para código Qt Script / Packet Tracer

export interface ES5ValidationError {
  line?: number;
  column?: number;
  message: string;
  pattern?: string;
  severity: 'error' | 'warning';
}

export interface ES5ValidationResult {
  valid: boolean;
  errors: ES5ValidationError[];
  warnings: string[];
}

const PATTERNS_ES6_PLUS: Array<{
  regex: RegExp;
  mensaje: string;
  pattern: string;
}> = [
  {
    regex: /^import\s/m,
    mensaje: 'import syntax no es compatible con ES5/Qt Script',
    pattern: 'import',
  },
  {
    regex: /^export\s/m,
    mensaje: 'export syntax no es compatible con ES5/Qt Script',
    pattern: 'export',
  },
  {
    regex: /\bclass\s+\w+/,
    mensaje: 'class keyword no es compatible con ES5/Qt Script',
    pattern: 'class',
  },
  {
    regex: /\b(let|const)\s+/,
    mensaje: 'let/const no son compatibles con ES5 (usar var)',
    pattern: 'let/const',
  },
  {
    regex: /=>\s*/,
    mensaje: 'arrow functions (=>) no son compatibles con ES5',
    pattern: 'arrow function',
  },
  {
    regex: /`[^`]*\$\{[^}]+\}[^`]*`/,
    mensaje: 'template literals con ${} no son compatibles con ES5',
    pattern: 'template literal',
  },
  {
    regex: /`[^`]*`/,
    mensaje: 'backticks (`) no son compatibles con ES5',
    pattern: 'backtick',
  },
  {
    regex: /\basync\s+(function|\()/,
    mensaje: 'async keyword no es compatible con ES5',
    pattern: 'async',
  },
  {
    regex: /\bawait\s+/,
    mensaje: 'await keyword no es compatible con ES5',
    pattern: 'await',
  },
  {
    regex: /\bfunction\s*\*/,
    mensaje: 'generator functions (function*) no son compatibles con ES5',
    pattern: 'function*',
  },
  {
    regex: /\byield\s+/,
    mensaje: 'yield keyword no es compatible con ES5',
    pattern: 'yield',
  },
  {
    regex: /\?\.[\w]/,
    mensaje: 'optional chaining (?.) no es compatible con ES5',
    pattern: '?.',
  },
  {
    regex: /\?\?/,
    mensaje: 'nullish coalescing (??) no es compatible con ES5',
    pattern: '??',
  },
  {
    regex: /\bPromise\s*\(/,
    mensaje: 'Promise no es un global disponible en ES5/Qt Script',
    pattern: 'Promise',
  },
  {
    regex: /\b(Map|Set|WeakMap|WeakSet)\s*\(/,
    mensaje: 'Map/Set/WeakMap/WeakSet no son disponibles en ES5/Qt Script',
    pattern: 'Map/Set',
  },
  {
    regex: /\bfor\s*\(\s*[^;]+;\s*\w+\s+of\s+/,
    mensaje: 'for-of loops no son compatibles con ES5',
    pattern: 'for-of',
  },
  {
    regex: /\.\.\.[\w]/,
    mensaje: 'spread operator (...) no es compatible con ES5',
    pattern: 'spread',
  },
  {
    regex: /\.\.\.[\w]/,
    mensaje: 'rest parameters (...) no son compatibles con ES5',
    pattern: 'rest',
  },
  {
    regex: /(const|let|var)\s*\{[^}]+\}\s*=/,
    mensaje: 'destructuring en declarations no es compatible con ES5',
    pattern: 'destructuring',
  },
  {
    regex: /(const|let|var)\s*\[[^\]]+\]\s*=/,
    mensaje: 'destructuring array en declarations no es compatible con ES5',
    pattern: 'array destructuring',
  },
  {
    regex: /\bsuper\s*\(/,
    mensaje: 'super keyword no es compatible con ES5',
    pattern: 'super',
  },
  {
    regex: /new\.target/,
    mensaje: 'new.target no es compatible con ES5',
    pattern: 'new.target',
  },
  {
    regex: /\bnew\s+(Proxy|Reflect)\s*\(/,
    mensaje: 'Proxy/Reflect no son disponibles en ES5/Qt Script',
    pattern: 'Proxy/Reflect',
  },
];

export function validateES5(code: string): ES5ValidationResult {
  const errores: ES5ValidationError[] = [];
  const advertencias: string[] = [];

  for (const patron of PATTERNS_ES6_PLUS) {
    const regex = new RegExp(patron.regex.source, 'g');
    let match;

    while ((match = regex.exec(code)) !== null) {
      const indice = match.index;
      const linea = obtenerNumeroLinea(code, indice);
      const columna = obtenerColumna(code, indice);

      errores.push({
        line: linea,
        column: columna,
        message: patron.mensaje,
        pattern: patron.pattern,
        severity: 'error',
      });
    }
  }

  const lineas = code.split('\n');
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    const numeroLinea = i + 1;

    if (/^\s*\basync\s+(?!function|\()/m.test(linea)) {
      advertencias.push(`Linea ${numeroLinea}: 'async' usado como identifier puede causar problemas`);
    }
  }

  if (/\/\*[^]*?\*\/[^]*?\/\*/.test(code)) {
    advertencias.push('Nested block comments no son recomendados');
  }

  return {
    valid: errores.length === 0,
    errors: errores,
    warnings: advertencias,
  };
}

function obtenerNumeroLinea(codigo: string, indice: number): number {
  return codigo.substring(0, indice).split('\n').length;
}

function obtenerColumna(codigo: string, indice: number): number {
  const subcadena = codigo.substring(0, indice);
  const ultimaLinea = subcadena.lastIndexOf('\n');
  return indice - ultimaLinea;
}
