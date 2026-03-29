#!/usr/bin/env bun
/**
 * Script de QA para verificar el formateador de ToolResult
 */

import {
  formatToolResult,
  formatToolError,
  formatToolOutput,
  createToolResult,
  createToolError,
  type ToolOutputFormat,
} from '../../src/core/formatters/index.ts';

// Test 1: ToolResult con datos simples
console.log('=== Test 1: ToolResult simple (text) ===');
const result1 = createToolResult('pt_list_devices', [
  { name: 'Router-1', type: '2911', ip: '192.168.1.1' },
  { name: 'Switch-1', type: '2960', ip: '192.168.1.2' },
], 1500, { resourceName: 'lab-basic.yaml' });

console.log(formatToolResult(result1, { format: 'text' }));

// Test 2: ToolResult como JSON
console.log('\n=== Test 2: ToolResult JSON ===');
console.log(formatToolResult(result1, { format: 'json' }));

// Test 3: ToolResult como Table
console.log('\n=== Test 3: ToolResult Table ===');
console.log(formatToolResult(result1, { format: 'table' }));

// Test 4: ToolError
console.log('\n=== Test 4: ToolError (text) ===');
const error1 = createToolError(
  'pt_get_device_details',
  'No se pudo conectar al dispositivo',
  500,
  {
    code: 'CONNECTION_FAILED',
    rootCause: 'Timeout al intentar conectar a 192.168.1.1',
    suggestions: [
      'Verifica que el dispositivo esté accesible',
      'Verifica las credenciales',
      'Aumenta el timeout de conexión',
    ],
  }
);

console.log(formatToolError(error1, { format: 'text' }));

// Test 5: ToolError con verbose
console.log('\n=== Test 5: ToolError verbose ===');
console.log(formatToolError(error1, { format: 'text', verbose: true }));

// Test 6: ToolError JSON
console.log('\n=== Test 6: ToolError JSON ===');
console.log(formatToolError(error1, { format: 'json' }));

// Test 7: formatToolOutput (detecta automáticamente)
console.log('\n=== Test 7: formatToolOutput con éxito ===');
console.log(formatToolOutput(result1, { format: 'text' }));

console.log('\n=== Test 8: formatToolOutput con error ===');
console.log(formatToolOutput(error1, { format: 'text' }));

// Test 9: Sin colores
console.log('\n=== Test 9: Sin colores ===');
console.log(formatToolResult(result1, { format: 'table', colors: false }));

// Test 10: Con warnings
console.log('\n=== Test 10: Con warnings ===');
const resultWithWarnings = createToolResult('pt_plan_topology', {
  devices: ['router-1', 'switch-1'],
  connections: 3,
}, 2000, {
  warnings: [
    'VLAN 10 no está configurada en el switch',
    'Missing default gateway on PC1',
  ],
});

console.log(formatToolResult(resultWithWarnings, { format: 'text' }));

console.log('\n✅ Todos los tests completados');
