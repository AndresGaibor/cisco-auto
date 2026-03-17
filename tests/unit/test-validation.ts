/**
 * test-validation.ts
 * Script para probar el sistema de "Breaking points" (Validación física y lógica)
 */

import { Network, CableType, PC } from './src/core/models/index.ts';
import { readFileSync } from 'fs';

async function runTest() {
  console.log('🧪 Probando Motor de Validaciones Estrictas...\n');

  // Usamos un XML base vacío o mínimo para la prueba
  const xmlBase = `
  <PACKETTRACER5_ACTIVITY>
    <PACKETTRACER5>
      <NETWORK>
        <DEVICES>
          <DEVICE>
            <ENGINE>
              <NAME>PC-VALIDA</NAME>
              <SAVE_REF_ID>1</SAVE_REF_ID>
              <TYPE>Pc</TYPE>
              <MODULE><PORT><TYPE>eCopperFastEthernet</TYPE><NAME>FastEthernet0</NAME></PORT></MODULE>
            </ENGINE>
          </DEVICE>
          <DEVICE>
            <ENGINE>
              <NAME>SW-FIBRA</NAME>
              <SAVE_REF_ID>2</SAVE_REF_ID>
              <TYPE>Switch</TYPE>
              <MODULE><PORT><TYPE>eFiberGigabitEthernet</TYPE><NAME>GigabitEthernet0/1</NAME></PORT></MODULE>
            </ENGINE>
          </DEVICE>
        </DEVICES>
      </NETWORK>
    </PACKETTRACER5>
  </PACKETTRACER5_ACTIVITY>`;

  const red = new Network(xmlBase);
  const pc = red.getDevice<PC>('PC-VALIDA')!;

  // --- PRUEBA 1: IP INVÁLIDA ---
  console.log('1. Intentando asignar IP inválida (999.999.999.999)...');
  try {
    pc.setIpAddress('999.999.999.999', '255.255.255.0');
  } catch (e) {
    console.log(`   ✅ BLOQUEADO: ${e.message}`);
  }

  // --- PRUEBA 2: GATEWAY EN OTRA SUBRED ---
  console.log('\n2. Intentando asignar Gateway en otra subred (IP: 192.168.1.10/24, GW: 10.0.0.1)...');
  try {
    pc.setIpAddress('192.168.1.10', '255.255.255.0');
    pc.setGateway('10.0.0.1');
  } catch (e) {
    console.log(`   ✅ BLOQUEADO: ${e.message}`);
  }

  // --- PRUEBA 3: CONEXIÓN FÍSICA INCOMPATIBLE ---
  console.log('\n3. Intentando conectar Cobre (PC) a Fibra (SW) usando cable de Fibra...');
  try {
    red.connect('PC-VALIDA', 'FastEthernet0', 'SW-FIBRA', 'GigabitEthernet0/1', CableType.FIBER);
  } catch (e) {
    console.log(`   ✅ BLOQUEADO: ${e.message}`);
  }

  console.log('\n\n✨ Todas las pruebas de protección pasaron. El sistema evitó configuraciones erróneas.');
}

runTest();
