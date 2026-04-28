// Validador de seguridad para codigo que se ejecutara en Packet Tracer

export interface PTSafeValidationError {
  line?: number;
  column?: number;
  message: string;
  pattern?: string;
  severity: 'error' | 'warning';
  category: 'node-global' | 'forbidden-api' | 'undefined-reference' | 'structural';
}

export interface PTSafeValidationResult {
  valid: boolean;
  errors: PTSafeValidationError[];
  warnings: string[];
}

export interface PTSafeOptions {
  allowGlobals?: string[];
  allowPrivilege?: boolean;
  runtimeFingerprint?: string;
}

const GLOBALES_PERMITIDOS_DEFAULT = [
  'ipc', 'dprint', 'fm', 'self', 'console', 'JSON', 'Math',
  'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'RegExp', 'Error',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI',
  'Base64', 'MD5', 'guid',
  '$putData', '$getData', '$removeData',
  '$ipc', '$ipcObject', '_ScriptModule', '_Parser',
  '$createHttpServer', '$createTcpServer', '$createTcpSocket', '$createUdpSocket', '$createWebSocket',
  '$se', '$sec', '$secexists', '$secreg', '$secunreg', '$seev',
  'AssessmentModel',
  'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
  'PT_DEVICE_TYPE', 'PT_CABLE_TYPE',
];

const PATTERNS_NODE_GLOBAL: Array<{
  regex: RegExp;
  mensaje: string;
  pattern: string;
}> = [
  { regex: /\bprocess\b/, mensaje: 'process no esta disponible en Packet Tracer', pattern: 'process' },
  { regex: /\bBuffer\b/, mensaje: 'Buffer no esta disponible en Packet Tracer', pattern: 'Buffer' },
  { regex: /\brequire\s*\(/, mensaje: 'require() no esta disponible en Packet Tracer', pattern: 'require' },
  { regex: /\bmodule\s*\./, mensaje: 'module no esta disponible en Packet Tracer', pattern: 'module' },
  { regex: /\bexports\s*[.=]/, mensaje: 'exports no esta disponible en Packet Tracer', pattern: 'exports' },
  { regex: /__dirname/, mensaje: '__dirname no esta disponible en Packet Tracer', pattern: '__dirname' },
  { regex: /__filename/, mensaje: '__filename no esta disponible en Packet Tracer', pattern: '__filename' },
  { regex: /\bglobal\s*\./, mensaje: 'global no esta disponible en Packet Tracer', pattern: 'global' },
  { regex: /\bthis\b/, mensaje: 'this no disponible en Packet Tracer', pattern: 'this' },
];

const PATTERNS_FORBIDDEN_API: Array<{
  regex: RegExp;
  mensaje: string;
  pattern: string;
}> = [
  { regex: /\bfs\s*\.\s*(readFile|writeFile|readdir|mkdir|unlink|rename|stat|existsSync)/, mensaje: 'fs directo no disponible en PT', pattern: 'fs direct' },
  { regex: /\breadFile\s*\(/, mensaje: 'readFile directo no disponible en PT', pattern: 'readFile' },
  { regex: /\bwriteFile\s*\(/, mensaje: 'writeFile directo no disponible en PT', pattern: 'writeFile' },
  { regex: /\beval\s*\([^)]*\+\s*[^)]*\)/, mensaje: 'eval con concatenacion dinamica es peligroso', pattern: 'eval dynamic' },
  { regex: /\bFunction\s*\(/, mensaje: 'Function constructor no disponible', pattern: 'Function()' },
];

const PATTERNS_STRUCTURAL: Array<{
  regex: RegExp;
  mensaje: string;
  pattern: string;
}> = [
  { regex: /\bwhile\s*\(\s*true\s*\)(?![\s\S]*?\bbreak\b)/, mensaje: 'while(true) sin break puede causar loop infinito', pattern: 'while true no break' },
  { regex: /\btry\s*\{[^}]*\}\s*catch\s*\([^)]*\)\s*\{\s*\}/, mensaje: 'catch vacio silenciara errores', pattern: 'empty catch' },
];

export function validatePTSafe(code: string, options?: PTSafeOptions): PTSafeValidationResult {
  const errores: PTSafeValidationError[] = [];
  const advertencias: string[] = [];

  const allowGlobals = options?.allowGlobals ?? GLOBALES_PERMITIDOS_DEFAULT;
  const allowPrivilege = options?.allowPrivilege ?? false;
  const globalesPermitidos = new Set(allowGlobals);

  const variablesDeclaradas = new Set<string>();
  const funcionesDeclaradas = new Set<string>();

  extraerDeclaraciones(code, variablesDeclaradas, funcionesDeclaradas);

  for (const patron of PATTERNS_NODE_GLOBAL) {
    let match;
    const regex = new RegExp(patron.regex.source, 'g');
    while ((match = regex.exec(code)) !== null) {
      const linea = obtenerLinea(code, match.index);
      errores.push({
        line: linea,
        message: patron.mensaje,
        pattern: patron.pattern,
        severity: 'error',
        category: 'node-global',
      });
    }
  }

  for (const patron of PATTERNS_FORBIDDEN_API) {
    let match;
    const regex = new RegExp(patron.regex.source, 'g');
    while ((match = regex.exec(code)) !== null) {
      const linea = obtenerLinea(code, match.index);
      errores.push({
        line: linea,
        message: patron.mensaje,
        pattern: patron.pattern,
        severity: 'error',
        category: 'forbidden-api',
      });
    }
  }

  for (const patron of PATTERNS_STRUCTURAL) {
    let match;
    const regex = new RegExp(patron.regex.source, 'g');
    while ((match = regex.exec(code)) !== null) {
      const linea = obtenerLinea(code, match.index);
      errores.push({
        line: linea,
        message: patron.mensaje,
        pattern: patron.pattern,
        severity: 'error',
        category: 'structural',
      });
    }
  }

  if (!allowPrivilege && /\bprivileged\s*\./.test(code)) {
    errores.push({
      message: 'Acceso a privileged sin permisos explicitos',
      pattern: 'privileged',
      severity: 'error',
      category: 'forbidden-api',
    });
  }

  if (/\bprivileged\s*\./.test(code) && allowPrivilege) {
  }

  if (/dprint\s*\(\s*\{[^}]+\}/.test(code)) {
    advertencias.push('dprint con objetos complejos puede tener comportamiento inesperado');
  }

  if (/\bfor\s*\([^)]*\)\s*\{[^}]*\+=\s*["']/.test(code)) {
    advertencias.push('Concatenacion de strings en loop es ineficiente (usar array.join())');
  }

  return {
    valid: errores.length === 0,
    errors: errores,
    warnings: advertencias,
  };
}

const RESERVED_WORDS = new Set([
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default',
  'break', 'continue', 'return', 'throw', 'try', 'catch', 'finally',
  'function', 'var', 'new', 'delete', 'typeof', 'instanceof',
  'in', 'void', 'this', 'true', 'false', 'null', 'undefined',
  'class', 'extends', 'super', 'import', 'export', 'from', 'as',
  'const', 'let', 'yield', 'async', 'await', 'static', 'get', 'set',
  'of', 'arguments', 'eval', 'constructor',
]);

function extraerDeclaraciones(code: string, variables: Set<string>, funciones: Set<string>): void {
  const funcDeclaration = /\bfunction\s+([A-Za-z_$][\w$]*)/g;
  let match;
  while ((match = funcDeclaration.exec(code)) !== null) {
    funciones.add(match[1]);
  }

  const varDeclaration = /\bvar\s+([A-Za-z_$][\w$]*)/g;
  while ((match = varDeclaration.exec(code)) !== null) {
    variables.add(match[1]);
  }
}

function obtenerLinea(codigo: string, indice: number): number {
  return codigo.substring(0, indice).split('\n').length;
}
