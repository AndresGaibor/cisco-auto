/**
 * Panel de inspección de dispositivo
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useSimulator } from '../context/SimulatorContext';
import type { DeviceRuntime } from '@cisco-auto/sim-runtime';

export function InspectorPanel() {
  const { runtime, selectedDevice } = useSimulator();
  
  if (!runtime || !selectedDevice) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="green"> Inspector </Text>
        <Box marginTop={1}>
          <Text dimColor>No device selected</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Click on a device to inspect</Text>
        </Box>
      </Box>
    );
  }
  
  const device = runtime.devices.get(selectedDevice);
  
  if (!device) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="red"> Device not found </Text>
      </Box>
    );
  }
  
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="green"> {device.name} </Text>
      <Text dimColor> Type: {device.type} </Text>
      <Text dimColor> Power: {device.powerOn ? 'ON' : 'OFF'} </Text>
      
      {/* Interfaces */}
      <Box marginTop={1} flexDirection="column">
        <Text bold underline>Interfaces:</Text>
        {Array.from(device.interfaces.values()).map((iface) => (
          <Box key={iface.name} marginLeft={1} flexDirection="column">
            <Text color={iface.linkStatus === 'up' ? 'green' : 'red'}>
              {iface.name}: {iface.adminStatus}/{iface.linkStatus}
            </Text>
            {iface.ip && (
              <Text dimColor>  IP: {iface.ip}/{getCIDR(iface.subnetMask)}</Text>
            )}
            <Text dimColor>  MAC: {iface.mac}</Text>
            <Text dimColor>  VLAN: {iface.vlan}</Text>
          </Box>
        ))}
      </Box>
      
      {/* MAC Table (for switches) */}
      {device.macTable.size > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold underline>MAC Table:</Text>
          {Array.from(device.macTable.entries()).slice(0, 5).map(([key, entry]) => (
            <Box key={key} marginLeft={1}>
              <Text dimColor>{entry.mac} {'->'} {entry.port}</Text>
            </Box>
          ))}
          {device.macTable.size > 5 && (
            <Box marginLeft={1}>
              <Text dimColor>... and {device.macTable.size - 5} more</Text>
            </Box>
          )}
        </Box>
      )}
      
      {/* ARP Table */}
      {device.arpTable.size > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold underline>ARP Table:</Text>
          {Array.from(device.arpTable.entries()).slice(0, 5).map(([ip, entry]) => (
            <Box key={ip} marginLeft={1}>
              <Text dimColor>{ip} {'->'} {entry.mac}</Text>
            </Box>
          ))}
        </Box>
      )}
      
      {/* Routing Table (for routers) */}
      {device.routingTable.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold underline>Routing Table:</Text>
          {device.routingTable.slice(0, 5).map((route, i) => (
            <Box key={i} marginLeft={1}>
              <Text dimColor>
                {route.network}/{route.cidr} via {route.nextHop || 'connected'}
              </Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

function getCIDR(mask?: string): number {
  if (!mask) return 24;
  const octets = mask.split('.').map(Number);
  let cidr = 0;
  for (const octet of octets) {
    let bits = octet;
    while (bits) {
      cidr += bits & 1;
      bits >>= 1;
    }
  }
  return cidr;
}
