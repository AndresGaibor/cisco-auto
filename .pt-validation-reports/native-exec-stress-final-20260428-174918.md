# native exec stress final

Fecha: Tue Apr 28 17:49:18 -05 2026


## round 1 show version
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show version" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show version" --json
{
  "schemaVersion": "1.0",
  "ok": false,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show version",
  "output": "",
  "rawOutput": "",
  "status": null,
  "warnings": [
    "Se filtró el eco del comando (1 línea/s).",
    "Topología virtual aún no materializada; la verificación de estado puede ser incompleta."
  ],
  "error": {
    "code": "IOS_EXEC_FAILED",
    "message": "Error en ejecución de comando IOS"
  },
  "nextSteps": [
    "pt doctor",
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ]
}
⏱ pt cmd · 12.4s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

## round 1 show running-config
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show running-config" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show running-config" --json
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show running-config",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "rawOutput": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "warnings": [
    "El comando \"show running-config\" activó paginación"
  ],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777416572967,
      "resultSeenAt": 1777416573847,
      "receivedAt": 1777416573847,
      "waitMs": 880,
      "completedAtMs": 1777416573839
    }
  },
  "timings": {
    "sentAt": 1777416572967,
    "resultSeenAt": 1777416573847,
    "receivedAt": 1777416573847,
    "waitMs": 880,
    "completedAtMs": 1777416573839
  }
}
⏱ pt cmd · 1.2s
```

## round 2 show version
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show version" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show version" --json
{
  "schemaVersion": "1.0",
  "ok": false,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show version",
  "output": "",
  "rawOutput": "",
  "status": null,
  "warnings": [
    "Se filtró el eco del comando (1 línea/s).",
    "Topología virtual aún no materializada; la verificación de estado puede ser incompleta."
  ],
  "error": {
    "code": "IOS_EXEC_FAILED",
    "message": "Error en ejecución de comando IOS"
  },
  "nextSteps": [
    "pt doctor",
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ]
}
⏱ pt cmd · 12.3s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

## round 2 show running-config
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show running-config" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show running-config" --json
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show running-config",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "rawOutput": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "warnings": [
    "El comando \"show running-config\" activó paginación"
  ],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777416587324,
      "resultSeenAt": 1777416588245,
      "receivedAt": 1777416588245,
      "waitMs": 921,
      "completedAtMs": 1777416588230
    }
  },
  "timings": {
    "sentAt": 1777416587324,
    "resultSeenAt": 1777416588245,
    "receivedAt": 1777416588245,
    "waitMs": 921,
    "completedAtMs": 1777416588230
  }
}
⏱ pt cmd · 1.2s
```

## round 3 show version
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show version" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show version" --json
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show version",
  "output": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "rawOutput": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "status": 0,
  "warnings": [
    "El comando \"show version\" activó paginación"
  ],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777416589287,
      "resultSeenAt": 1777416589850,
      "receivedAt": 1777416589850,
      "waitMs": 563,
      "completedAtMs": 1777416589839
    }
  },
  "timings": {
    "sentAt": 1777416589287,
    "resultSeenAt": 1777416589850,
    "receivedAt": 1777416589850,
    "waitMs": 563,
    "completedAtMs": 1777416589839
  }
}
⏱ pt cmd · 0.8s
```

## round 3 show running-config
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show running-config" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show running-config" --json
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show running-config",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "rawOutput": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "warnings": [
    "El comando \"show running-config\" activó paginación"
  ],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777416590523,
      "resultSeenAt": 1777416591446,
      "receivedAt": 1777416591446,
      "waitMs": 923,
      "completedAtMs": 1777416591437
    }
  },
  "timings": {
    "sentAt": 1777416590523,
    "resultSeenAt": 1777416591446,
    "receivedAt": 1777416591446,
    "waitMs": 923,
    "completedAtMs": 1777416591437
  }
}
⏱ pt cmd · 1.2s
```

## round 4 show version
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show version" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show version" --json
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show version",
  "output": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "rawOutput": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "status": 0,
  "warnings": [
    "El comando \"show version\" activó paginación"
  ],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777416592148,
      "resultSeenAt": 1777416592644,
      "receivedAt": 1777416592644,
      "waitMs": 496,
      "completedAtMs": 1777416592633
    }
  },
  "timings": {
    "sentAt": 1777416592148,
    "resultSeenAt": 1777416592644,
    "receivedAt": 1777416592644,
    "waitMs": 496,
    "completedAtMs": 1777416592633
  }
}
⏱ pt cmd · 0.8s
```

## round 4 show running-config
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show running-config" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show running-config" --json
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show running-config",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "rawOutput": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "warnings": [
    "El comando \"show running-config\" activó paginación"
  ],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777416593546,
      "resultSeenAt": 1777416594419,
      "receivedAt": 1777416594419,
      "waitMs": 873,
      "completedAtMs": 1777416594370
    }
  },
  "timings": {
    "sentAt": 1777416593546,
    "resultSeenAt": 1777416594419,
    "receivedAt": 1777416594419,
    "waitMs": 873,
    "completedAtMs": 1777416594370
  }
}
⏱ pt cmd · 1.2s
```

## round 5 show version
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show version" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show version" --json
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show version",
  "output": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "rawOutput": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "status": 0,
  "warnings": [
    "El comando \"show version\" activó paginación"
  ],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777416595166,
      "resultSeenAt": 1777416595655,
      "receivedAt": 1777416595655,
      "waitMs": 489,
      "completedAtMs": 1777416595599
    }
  },
  "timings": {
    "sentAt": 1777416595166,
    "resultSeenAt": 1777416595655,
    "receivedAt": 1777416595655,
    "waitMs": 489,
    "completedAtMs": 1777416595599
  }
}
⏱ pt cmd · 0.8s
```

## round 5 show running-config
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show running-config" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show running-config" --json
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show running-config",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "rawOutput": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "warnings": [
    "El comando \"show running-config\" activó paginación"
  ],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777416596545,
      "resultSeenAt": 1777416597516,
      "receivedAt": 1777416597516,
      "waitMs": 971,
      "completedAtMs": 1777416597503
    }
  },
  "timings": {
    "sentAt": 1777416596545,
    "resultSeenAt": 1777416597516,
    "receivedAt": 1777416597516,
    "waitMs": 971,
    "completedAtMs": 1777416597503
  }
}
⏱ pt cmd · 1.2s
```

## round 6 show version
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show version" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show version" --json
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show version",
  "output": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "rawOutput": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "status": 0,
  "warnings": [
    "El comando \"show version\" activó paginación"
  ],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777416598292,
      "resultSeenAt": 1777416598763,
      "receivedAt": 1777416598763,
      "waitMs": 471,
      "completedAtMs": 1777416598752
    }
  },
  "timings": {
    "sentAt": 1777416598292,
    "resultSeenAt": 1777416598763,
    "receivedAt": 1777416598763,
    "waitMs": 471,
    "completedAtMs": 1777416598752
  }
}
⏱ pt cmd · 0.7s
```

## round 6 show running-config
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show running-config" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show running-config" --json
{
  "schemaVersion": "1.0",
  "ok": false,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show running-config",
  "output": "",
  "rawOutput": "",
  "status": null,
  "warnings": [
    "Se filtró el eco del comando (1 línea/s).",
    "Topología virtual aún no materializada; la verificación de estado puede ser incompleta."
  ],
  "error": {
    "code": "IOS_EXEC_FAILED",
    "message": "Error en ejecución de comando IOS"
  },
  "nextSteps": [
    "pt doctor",
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ]
}
⏱ pt cmd · 12.2s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

## round 7 show version
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show version" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show version" --json
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show version",
  "output": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "rawOutput": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "status": 0,
  "warnings": [
    "El comando \"show version\" activó paginación"
  ],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777416613019,
      "resultSeenAt": 1777416613520,
      "receivedAt": 1777416613520,
      "waitMs": 501,
      "completedAtMs": 1777416613473
    }
  },
  "timings": {
    "sentAt": 1777416613019,
    "resultSeenAt": 1777416613520,
    "receivedAt": 1777416613520,
    "waitMs": 501,
    "completedAtMs": 1777416613473
  }
}
⏱ pt cmd · 0.9s
```

## round 7 show running-config
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show running-config" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show running-config" --json
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show running-config",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "rawOutput": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "warnings": [
    "El comando \"show running-config\" activó paginación"
  ],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777416614426,
      "resultSeenAt": 1777416615327,
      "receivedAt": 1777416615327,
      "waitMs": 901,
      "completedAtMs": 1777416615302
    }
  },
  "timings": {
    "sentAt": 1777416614426,
    "resultSeenAt": 1777416615327,
    "receivedAt": 1777416615327,
    "waitMs": 901,
    "completedAtMs": 1777416615302
  }
}
⏱ pt cmd · 1.2s
```

## round 8 show version
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show version" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show version" --json
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show version",
  "output": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "rawOutput": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "status": 0,
  "warnings": [
    "El comando \"show version\" activó paginación"
  ],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777416616427,
      "resultSeenAt": 1777416616923,
      "receivedAt": 1777416616923,
      "waitMs": 496,
      "completedAtMs": 1777416616880
    }
  },
  "timings": {
    "sentAt": 1777416616427,
    "resultSeenAt": 1777416616923,
    "receivedAt": 1777416616923,
    "waitMs": 496,
    "completedAtMs": 1777416616880
  }
}
⏱ pt cmd · 0.8s
```

## round 8 show running-config
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show running-config" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show running-config" --json
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show running-config",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "rawOutput": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "warnings": [
    "El comando \"show running-config\" activó paginación"
  ],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777416617611,
      "resultSeenAt": 1777416618522,
      "receivedAt": 1777416618522,
      "waitMs": 911,
      "completedAtMs": 1777416618481
    }
  },
  "timings": {
    "sentAt": 1777416617611,
    "resultSeenAt": 1777416618522,
    "receivedAt": 1777416618522,
    "waitMs": 911,
    "completedAtMs": 1777416618481
  }
}
⏱ pt cmd · 1.1s
```

## round 9 show version
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show version" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show version" --json
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show version",
  "output": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "rawOutput": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "status": 0,
  "warnings": [
    "El comando \"show version\" activó paginación"
  ],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777416619225,
      "resultSeenAt": 1777416619724,
      "receivedAt": 1777416619724,
      "waitMs": 499,
      "completedAtMs": 1777416619687
    }
  },
  "timings": {
    "sentAt": 1777416619225,
    "resultSeenAt": 1777416619724,
    "receivedAt": 1777416619724,
    "waitMs": 499,
    "completedAtMs": 1777416619687
  }
}
⏱ pt cmd · 0.8s
```

## round 9 show running-config
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show running-config" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show running-config" --json
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show running-config",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "rawOutput": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "warnings": [
    "El comando \"show running-config\" activó paginación"
  ],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777416620430,
      "resultSeenAt": 1777416621322,
      "receivedAt": 1777416621322,
      "waitMs": 892,
      "completedAtMs": 1777416621281
    }
  },
  "timings": {
    "sentAt": 1777416620430,
    "resultSeenAt": 1777416621322,
    "receivedAt": 1777416621322,
    "waitMs": 892,
    "completedAtMs": 1777416621281
  }
}
⏱ pt cmd · 1.2s
```

## round 10 show version
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show version" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show version" --json
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show version",
  "output": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "rawOutput": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "status": 0,
  "warnings": [
    "El comando \"show version\" activó paginación"
  ],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777416622216,
      "resultSeenAt": 1777416622746,
      "receivedAt": 1777416622746,
      "waitMs": 530,
      "completedAtMs": 1777416622736
    }
  },
  "timings": {
    "sentAt": 1777416622216,
    "resultSeenAt": 1777416622746,
    "receivedAt": 1777416622746,
    "waitMs": 530,
    "completedAtMs": 1777416622736
  }
}
⏱ pt cmd · 0.7s
```

## round 10 show running-config
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show running-config" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show running-config" --json
{
  "schemaVersion": "1.0",
  "ok": false,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show running-config",
  "output": "",
  "rawOutput": "",
  "status": null,
  "warnings": [
    "Se filtró el eco del comando (1 línea/s).",
    "Topología virtual aún no materializada; la verificación de estado puede ser incompleta."
  ],
  "error": {
    "code": "IOS_EXEC_FAILED",
    "message": "Error en ejecución de comando IOS"
  },
  "nextSteps": [
    "pt doctor",
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ]
}
⏱ pt cmd · 12.3s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

## final terminal state
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-800)
});
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-800)
});
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 295,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\nreturn JSON.stringify({\n  prompt: String(t.getPrompt()),\n  mode: String(t.getMode()),\n  input: String(t.getCommandInput()),\n  tail: String(t.getOutput()).slice(-800)\n});\n})()",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"bly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST#\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018789",
      "seq": 18789,
      "type": "omni.evaluate.raw",
      "startedAt": 1777416636717,
      "completedAt": 1777416636798,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"bly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST#\"}"
      },
      "timings": {
        "sentAt": 1777416636568,
        "resultSeenAt": 1777416636821,
        "receivedAt": 1777416636821,
        "waitMs": 253,
        "completedAtMs": 1777416636798
      }
    }
  },
  "confidence": 1,
  "nextSteps": [
    "pt omni inspect env --json",
    "pt omni topology physical --json"
  ]
}
⏱ pt omni raw · 0.3s
```
