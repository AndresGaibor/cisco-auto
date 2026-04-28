# native exec timeout result dump

Fecha: Tue Apr 28 17:51:39 -05 2026

## result files 18749 onwards
```json

----- /Users/andresgaibor/pt-dev/results/cmd_000000018749.json -----
{
  "id": "cmd_000000018749",
  "seq": 18749,
  "type": "inspectDeviceFast",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "device": {
    "name": "SW-SRV-DIST",
    "model": "2960-24TT",
    "type": 1,
    "power": true,
    "hasCommandLine": true
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018751.json -----
{
  "id": "cmd_000000018751",
  "seq": 18751,
  "type": "inspectDeviceFast",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "device": {
    "name": "SW-SRV-DIST",
    "model": "2960-24TT",
    "type": 1,
    "power": true,
    "hasCommandLine": true
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018752.json -----
{
  "id": "cmd_000000018752",
  "seq": 18752,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 5,
    "elapsedMs": 761
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018753.json -----
{
  "id": "cmd_000000018753",
  "seq": 18753,
  "type": "inspectDeviceFast",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "device": {
    "name": "SW-SRV-DIST",
    "model": "2960-24TT",
    "type": 1,
    "power": true,
    "hasCommandLine": true
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018755.json -----
{
  "id": "cmd_000000018755",
  "seq": 18755,
  "type": "inspectDeviceFast",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "device": {
    "name": "SW-SRV-DIST",
    "model": "2960-24TT",
    "type": 1,
    "power": true,
    "hasCommandLine": true
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018756.json -----
{
  "id": "cmd_000000018756",
  "seq": 18756,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 5,
    "elapsedMs": 789
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018757.json -----
{
  "id": "cmd_000000018757",
  "seq": 18757,
  "type": "inspectDeviceFast",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "device": {
    "name": "SW-SRV-DIST",
    "model": "2960-24TT",
    "type": 1,
    "power": true,
    "hasCommandLine": true
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018758.json -----
{
  "id": "cmd_000000018758",
  "seq": 18758,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 1,
    "elapsedMs": 429
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018759.json -----
{
  "id": "cmd_000000018759",
  "seq": 18759,
  "type": "inspectDeviceFast",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "device": {
    "name": "SW-SRV-DIST",
    "model": "2960-24TT",
    "type": 1,
    "power": true,
    "hasCommandLine": true
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018760.json -----
{
  "id": "cmd_000000018760",
  "seq": 18760,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 5,
    "elapsedMs": 758
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018761.json -----
{
  "id": "cmd_000000018761",
  "seq": 18761,
  "type": "inspectDeviceFast",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "device": {
    "name": "SW-SRV-DIST",
    "model": "2960-24TT",
    "type": 1,
    "power": true,
    "hasCommandLine": true
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018762.json -----
{
  "id": "cmd_000000018762",
  "seq": 18762,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 1,
    "elapsedMs": 355
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018763.json -----
{
  "id": "cmd_000000018763",
  "seq": 18763,
  "type": "inspectDeviceFast",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "device": {
    "name": "SW-SRV-DIST",
    "model": "2960-24TT",
    "type": 1,
    "power": true,
    "hasCommandLine": true
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018764.json -----
{
  "id": "cmd_000000018764",
  "seq": 18764,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 5,
    "elapsedMs": 726
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018765.json -----
{
  "id": "cmd_000000018765",
  "seq": 18765,
  "type": "inspectDeviceFast",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "device": {
    "name": "SW-SRV-DIST",
    "model": "2960-24TT",
    "type": 1,
    "power": true,
    "hasCommandLine": true
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018766.json -----
{
  "id": "cmd_000000018766",
  "seq": 18766,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 1,
    "elapsedMs": 314
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018767.json -----
{
  "id": "cmd_000000018767",
  "seq": 18767,
  "type": "inspectDeviceFast",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "device": {
    "name": "SW-SRV-DIST",
    "model": "2960-24TT",
    "type": 1,
    "power": true,
    "hasCommandLine": true
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018768.json -----
{
  "id": "cmd_000000018768",
  "seq": 18768,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 5,
    "elapsedMs": 825
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018769.json -----
{
  "id": "cmd_000000018769",
  "seq": 18769,
  "type": "inspectDeviceFast",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "device": {
    "name": "SW-SRV-DIST",
    "model": "2960-24TT",
    "type": 1,
    "power": true,
    "hasCommandLine": true
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018770.json -----
{
  "id": "cmd_000000018770",
  "seq": 18770,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 1,
    "elapsedMs": 338
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018771.json -----
{
  "id": "cmd_000000018771",
  "seq": 18771,
  "type": "inspectDeviceFast",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "device": {
    "name": "SW-SRV-DIST",
    "model": "2960-24TT",
    "type": 1,
    "power": true,
    "hasCommandLine": true
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018773.json -----
{
  "id": "cmd_000000018773",
  "seq": 18773,
  "type": "inspectDeviceFast",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "device": {
    "name": "SW-SRV-DIST",
    "model": "2960-24TT",
    "type": 1,
    "power": true,
    "hasCommandLine": true
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018774.json -----
{
  "id": "cmd_000000018774",
  "seq": 18774,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 1,
    "elapsedMs": 330
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018775.json -----
{
  "id": "cmd_000000018775",
  "seq": 18775,
  "type": "inspectDeviceFast",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "device": {
    "name": "SW-SRV-DIST",
    "model": "2960-24TT",
    "type": 1,
    "power": true,
    "hasCommandLine": true
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018776.json -----
{
  "id": "cmd_000000018776",
  "seq": 18776,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 5,
    "elapsedMs": 762
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018777.json -----
{
  "id": "cmd_000000018777",
  "seq": 18777,
  "type": "inspectDeviceFast",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "device": {
    "name": "SW-SRV-DIST",
    "model": "2960-24TT",
    "type": 1,
    "power": true,
    "hasCommandLine": true
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018778.json -----
{
  "id": "cmd_000000018778",
  "seq": 18778,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 1,
    "elapsedMs": 339
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018779.json -----
{
  "id": "cmd_000000018779",
  "seq": 18779,
  "type": "inspectDeviceFast",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "device": {
    "name": "SW-SRV-DIST",
    "model": "2960-24TT",
    "type": 1,
    "power": true,
    "hasCommandLine": true
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018780.json -----
{
  "id": "cmd_000000018780",
  "seq": 18780,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 5,
    "elapsedMs": 747
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018781.json -----
{
  "id": "cmd_000000018781",
  "seq": 18781,
  "type": "inspectDeviceFast",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "device": {
    "name": "SW-SRV-DIST",
    "model": "2960-24TT",
    "type": 1,
    "power": true,
    "hasCommandLine": true
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018782.json -----
{
  "id": "cmd_000000018782",
  "seq": 18782,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 1,
    "elapsedMs": 336
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018783.json -----
{
  "id": "cmd_000000018783",
  "seq": 18783,
  "type": "inspectDeviceFast",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "device": {
    "name": "SW-SRV-DIST",
    "model": "2960-24TT",
    "type": 1,
    "power": true,
    "hasCommandLine": true
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018784.json -----
{
  "id": "cmd_000000018784",
  "seq": 18784,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 5,
    "elapsedMs": 751
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018785.json -----
{
  "id": "cmd_000000018785",
  "seq": 18785,
  "type": "inspectDeviceFast",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "device": {
    "name": "SW-SRV-DIST",
    "model": "2960-24TT",
    "type": 1,
    "power": true,
    "hasCommandLine": true
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018786.json -----
{
  "id": "cmd_000000018786",
  "seq": 18786,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 1,
    "elapsedMs": 395
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018787.json -----
{
  "id": "cmd_000000018787",
  "seq": 18787,
  "type": "inspectDeviceFast",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "device": {
    "name": "SW-SRV-DIST",
    "model": "2960-24TT",
    "type": 1,
    "power": true,
    "hasCommandLine": true
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018789.json -----
{
  "id": "cmd_000000018789",
  "seq": 18789,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"bly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST#\"}"
}
```

## commands / in-flight / dead-letter
```json

### /Users/andresgaibor/pt-dev/commands
total 8
drwxr-xr-x@  3 andresgaibor  staff    96B Apr 28 17:50 .
drwxr-xr-x@ 28 andresgaibor  staff   896B Apr 28 17:50 ..
-rw-r--r--@  1 andresgaibor  staff     2B Apr 28 17:50 _queue.json

----- /Users/andresgaibor/pt-dev/commands/_queue.json -----
[]
### /Users/andresgaibor/pt-dev/in-flight
total 0
drwxr-xr-x@  2 andresgaibor  staff    64B Apr 28 17:50 .
drwxr-xr-x@ 28 andresgaibor  staff   896B Apr 28 17:50 ..

### /Users/andresgaibor/pt-dev/dead-letter
total 0
drwxr-xr-x@  2 andresgaibor  staff    64B Apr 28 13:41 .
drwxr-xr-x@ 28 andresgaibor  staff   896B Apr 28 17:50 ..
```

## terminal state now
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-1200)
});
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-1200)
});
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 296,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\nreturn JSON.stringify({\n  prompt: String(t.getPrompt()),\n  mode: String(t.getMode()),\n  input: String(t.getCommandInput()),\n  tail: String(t.getOutput()).slice(-1200)\n});\n})()",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\" (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST#\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018790",
      "seq": 18790,
      "type": "omni.evaluate.raw",
      "startedAt": 1777416703910,
      "completedAt": 1777416704026,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\" (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST#\"}"
      },
      "timings": {
        "sentAt": 1777416703823,
        "resultSeenAt": 1777416704073,
        "receivedAt": 1777416704073,
        "waitMs": 250,
        "completedAtMs": 1777416704026
      }
    }
  },
  "confidence": 1,
  "nextSteps": [
    "pt omni inspect env --json",
    "pt omni topology physical --json"
  ]
}
⏱ pt omni raw · 0.4s
```
