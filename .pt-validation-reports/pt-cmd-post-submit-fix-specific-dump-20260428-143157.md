# pt cmd post submit fix specific dump

Fecha: Tue Apr 28 14:31:57 -05 2026

## suspicious result files
```json

----- /Users/andresgaibor/pt-dev/results/cmd_000000018387.json -----
<missing>

----- /Users/andresgaibor/pt-dev/results/cmd_000000018388.json -----
<missing>

----- /Users/andresgaibor/pt-dev/results/cmd_000000018390.json -----
{
  "protocolVersion": 2,
  "id": "cmd_000000018390",
  "seq": 18390,
  "type": "terminal.plan.run",
  "startedAt": 1777403598989,
  "completedAt": 1777403599084,
  "status": "completed",
  "ok": true,
  "value": {
    "ok": true,
    "deferred": true,
    "ticket": "cmd-6b733c54",
    "job": {
      "id": "cmd-6b733c54",
      "kind": "ios-session",
      "version": 1,
      "device": "SW-SRV-DIST",
      "plan": [
        {
          "type": "command",
          "kind": "command",
          "value": "show ip interface brief",
          "command": "show ip interface brief",
          "allowPager": true,
          "allowConfirm": false,
          "optional": false,
          "timeoutMs": 12000,
          "options": {
            "timeoutMs": 12000
          },
          "metadata": {}
        }
      ],
      "options": {
        "stopOnError": true,
        "commandTimeoutMs": 12000,
        "stallTimeoutMs": 15000
      },
      "payload": {
        "source": "terminal.plan.run",
        "metadata": {
          "deviceKind": "ios",
          "source": "pt-control.terminal-plan-builder",
          "lineCount": 1
        },
        "policies": {
          "autoBreakWizard": true,
          "autoAdvancePager": true,
          "maxPagerAdvances": 80,
          "maxConfirmations": 0,
          "abortOnPromptMismatch": false,
          "abortOnModeMismatch": true
        }
      }
    }
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018391.json -----
<missing>

----- /Users/andresgaibor/pt-dev/results/cmd_000000018393.json -----
{
  "protocolVersion": 2,
  "id": "cmd_000000018393",
  "seq": 18393,
  "type": "terminal.plan.run",
  "startedAt": 1777403630096,
  "completedAt": 1777403630193,
  "status": "completed",
  "ok": true,
  "value": {
    "ok": true,
    "deferred": true,
    "ticket": "cmd-bb2ff701",
    "job": {
      "id": "cmd-bb2ff701",
      "kind": "ios-session",
      "version": 1,
      "device": "SW-SRV-DIST",
      "plan": [
        {
          "type": "command",
          "kind": "command",
          "value": "show vlan brief",
          "command": "show vlan brief",
          "allowPager": true,
          "allowConfirm": false,
          "optional": false,
          "timeoutMs": 12000,
          "options": {
            "timeoutMs": 12000
          },
          "metadata": {}
        }
      ],
      "options": {
        "stopOnError": true,
        "commandTimeoutMs": 12000,
        "stallTimeoutMs": 15000
      },
      "payload": {
        "source": "terminal.plan.run",
        "metadata": {
          "deviceKind": "ios",
          "source": "pt-control.terminal-plan-builder",
          "lineCount": 1
        },
        "policies": {
          "autoBreakWizard": true,
          "autoAdvancePager": true,
          "maxPagerAdvances": 80,
          "maxConfirmations": 0,
          "abortOnPromptMismatch": false,
          "abortOnModeMismatch": true
        }
      }
    }
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018394.json -----
{
  "protocolVersion": 2,
  "id": "cmd_000000018394",
  "seq": 18394,
  "type": "__pollDeferred",
  "startedAt": 1777403630412,
  "completedAt": 1777403630485,
  "status": "completed",
  "ok": true,
  "value": {
    "ok": true,
    "deferred": true,
    "ticket": "cmd-bb2ff701",
    "done": false,
    "state": "waiting-command",
    "currentStep": 0,
    "totalSteps": 1,
    "stepType": "command",
    "stepValue": "show vlan brief",
    "outputTail": "",
    "lastPrompt": "",
    "lastMode": "unknown",
    "waitingForCommandEnd": true,
    "updatedAt": 1777403630139,
    "ageMs": 324,
    "idleMs": 324,
    "debug": [
      "1777403630212 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=73 idleMs=73",
      "1777403630231 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=92 idleMs=92",
      "1777403630387 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=248 idleMs=248",
      "1777403630451 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=312 idleMs=312",
      "1777403630459 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=320 idleMs=320"
    ],
    "stepResults": []
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018395.json -----
{
  "protocolVersion": 2,
  "id": "cmd_000000018395",
  "seq": 18395,
  "type": "__pollDeferred",
  "startedAt": 1777403630826,
  "completedAt": 1777403630895,
  "status": "completed",
  "ok": true,
  "value": {
    "done": true,
    "ok": true,
    "status": 0,
    "result": {
      "ok": true,
      "raw": "SW-SRV-DIST>show vlan brief\n\nVLAN Name                             Status    Ports\n---- -------------------------------- --------- -------------------------------\n1    default                          active    Fa0/6, Fa0/7, Fa0/8, Fa0/9\n                                                Fa0/10, Fa0/11, Fa0/12, Fa0/13\n                                                Fa0/14, Fa0/15, Fa0/16, Fa0/17\n                                                Fa0/18, Fa0/19, Fa0/20, Fa0/21\n                                                Fa0/22, Fa0/23, Fa0/24\n10   DIRECTIVOS                       active    \n15   JURIDICA                         active    \n20   FINANZAS                         active    \n25   TALENTO                          active    \n30   TIC                              active    \n40   TECNICA                          active    \n50   COMERCIAL                        active    \n60   SERV_GRAL                        active    \n70   SERVIDORES                       active    Fa0/1, Fa0/2, Fa0/3\n80   VOZ                              active    \n90   WIFI_DIRECTIVOS                  active    \n99   MGMT                             active    \n100  WIFI_EMPLEADOS                   active    \n110  WIFI_TIC                         active    \n120  WIFI_INVITADOS                   active    \n130  IOT                              active    \n999  NATIVA_TECNICA                   active    \n1002 fddi-default                     active    \n1003 token-ring-default               active    \n1004 fddinet-default                  active    \n1005 trnet-default                    active    \nSW-SRV-DIST>",
      "status": 0,
      "session": {
        "mode": "user-exec",
        "prompt": "SW-SRV-DIST>",
        "paging": false,
        "awaitingConfirm": false
      }
    },
    "raw": "SW-SRV-DIST>show vlan brief\n\nVLAN Name                             Status    Ports\n---- -------------------------------- --------- -------------------------------\n1    default                          active    Fa0/6, Fa0/7, Fa0/8, Fa0/9\n                                                Fa0/10, Fa0/11, Fa0/12, Fa0/13\n                                                Fa0/14, Fa0/15, Fa0/16, Fa0/17\n                                                Fa0/18, Fa0/19, Fa0/20, Fa0/21\n                                                Fa0/22, Fa0/23, Fa0/24\n10   DIRECTIVOS                       active    \n15   JURIDICA                         active    \n20   FINANZAS                         active    \n25   TALENTO                          active    \n30   TIC                              active    \n40   TECNICA                          active    \n50   COMERCIAL                        active    \n60   SERV_GRAL                        active    \n70   SERVIDORES                       active    Fa0/1, Fa0/2, Fa0/3\n80   VOZ                              active    \n90   WIFI_DIRECTIVOS                  active    \n99   MGMT                             active    \n100  WIFI_EMPLEADOS                   active    \n110  WIFI_TIC                         active    \n120  WIFI_INVITADOS                   active    \n130  IOT                              active    \n999  NATIVA_TECNICA                   active    \n1002 fddi-default                     active    \n1003 token-ring-default               active    \n1004 fddinet-default                  active    \n1005 trnet-default                    active    \nSW-SRV-DIST>",
    "output": "SW-SRV-DIST>show vlan brief\n\nVLAN Name                             Status    Ports\n---- -------------------------------- --------- -------------------------------\n1    default                          active    Fa0/6, Fa0/7, Fa0/8, Fa0/9\n                                                Fa0/10, Fa0/11, Fa0/12, Fa0/13\n                                                Fa0/14, Fa0/15, Fa0/16, Fa0/17\n                                                Fa0/18, Fa0/19, Fa0/20, Fa0/21\n                                                Fa0/22, Fa0/23, Fa0/24\n10   DIRECTIVOS                       active    \n15   JURIDICA                         active    \n20   FINANZAS                         active    \n25   TALENTO                          active    \n30   TIC                              active    \n40   TECNICA                          active    \n50   COMERCIAL                        active    \n60   SERV_GRAL                        active    \n70   SERVIDORES                       active    Fa0/1, Fa0/2, Fa0/3\n80   VOZ                              active    \n90   WIFI_DIRECTIVOS                  active    \n99   MGMT                             active    \n100  WIFI_EMPLEADOS                   active    \n110  WIFI_TIC                         active    \n120  WIFI_INVITADOS                   active    \n130  IOT                              active    \n999  NATIVA_TECNICA                   active    \n1002 fddi-default                     active    \n1003 token-ring-default               active    \n1004 fddinet-default                  active    \n1005 trnet-default                    active    \nSW-SRV-DIST>",
    "source": "terminal",
    "session": {
      "mode": "user-exec",
      "prompt": "SW-SRV-DIST>",
      "paging": false,
      "awaitingConfirm": false
    }
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018397.json -----
{
  "protocolVersion": 2,
  "id": "cmd_000000018397",
  "seq": 18397,
  "type": "terminal.plan.run",
  "startedAt": 1777403631548,
  "completedAt": 1777403631654,
  "status": "completed",
  "ok": true,
  "value": {
    "ok": true,
    "deferred": true,
    "ticket": "cmd-9dffcfc2",
    "job": {
      "id": "cmd-9dffcfc2",
      "kind": "ios-session",
      "version": 1,
      "device": "SW-SRV-DIST",
      "plan": [
        {
          "type": "ensure-mode",
          "kind": "ensure-mode",
          "value": "privileged-exec",
          "expectMode": "privileged-exec",
          "allowPager": true,
          "allowConfirm": false,
          "optional": false,
          "timeoutMs": 12000,
          "options": {
            "timeoutMs": 12000
          },
          "metadata": {
            "reason": "auto-enable-for-privileged-ios-command"
          }
        },
        {
          "type": "command",
          "kind": "command",
          "value": "show running-config",
          "command": "show running-config",
          "allowPager": true,
          "allowConfirm": false,
          "optional": false,
          "timeoutMs": 12000,
          "options": {
            "timeoutMs": 12000
          },
          "metadata": {}
        }
      ],
      "options": {
        "stopOnError": true,
        "commandTimeoutMs": 12000,
        "stallTimeoutMs": 15000
      },
      "payload": {
        "source": "terminal.plan.run",
        "metadata": {
          "deviceKind": "ios",
          "source": "pt-control.terminal-plan-builder",
          "lineCount": 1
        },
        "policies": {
          "autoBreakWizard": true,
          "autoAdvancePager": true,
          "maxPagerAdvances": 80,
          "maxConfirmations": 0,
          "abortOnPromptMismatch": false,
          "abortOnModeMismatch": true
        }
      }
    }
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018398.json -----
{
  "protocolVersion": 2,
  "id": "cmd_000000018398",
  "seq": 18398,
  "type": "__pollDeferred",
  "startedAt": 1777403631706,
  "completedAt": 1777403631787,
  "status": "completed",
  "ok": true,
  "value": {
    "ok": true,
    "deferred": true,
    "ticket": "cmd-9dffcfc2",
    "done": false,
    "state": "waiting-ensure-mode",
    "currentStep": 0,
    "totalSteps": 2,
    "stepType": "ensure-mode",
    "stepValue": "privileged-exec",
    "outputTail": "",
    "lastPrompt": "SW-SRV-DIST>",
    "lastMode": "user-exec",
    "waitingForCommandEnd": true,
    "updatedAt": 1777403631593,
    "ageMs": 169,
    "idleMs": 169,
    "debug": [
      "1777403631677 native-tick reason=reapStaleJobs phase=waiting-ensure-mode waiting=true pending=set ageMs=84 idleMs=84",
      "1777403631749 native-tick reason=getJobState phase=waiting-ensure-mode waiting=true pending=set ageMs=156 idleMs=156",
      "1777403631758 native-tick reason=reapStaleJobs phase=waiting-ensure-mode waiting=true pending=set ageMs=165 idleMs=165"
    ],
    "stepResults": []
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018399.json -----
{
  "protocolVersion": 2,
  "id": "cmd_000000018399",
  "seq": 18399,
  "type": "__pollDeferred",
  "startedAt": 1777403632177,
  "completedAt": 1777403632253,
  "status": "completed",
  "ok": true,
  "value": {
    "ok": true,
    "deferred": true,
    "ticket": "cmd-9dffcfc2",
    "done": false,
    "state": "waiting-command",
    "currentStep": 1,
    "totalSteps": 2,
    "stepType": "command",
    "stepValue": "show running-config",
    "outputTail": "    active    \n100  WIFI_EMPLEADOS                   active    \n110  WIFI_TIC                         active    \n120  WIFI_INVITADOS                   active    \n130  IOT                              active    \n999  NATIVA_TECNICA                   active    \n1002 fddi-default                     active    \n1003 token-ring-default               active    \n1004 fddinet-default                  active    \n1005 trnet-default                    active    \nSW-SRV-DIST>\nSW-SRV-DIST>enable\nSW-SRV-DIST#",
    "lastPrompt": "SW-SRV-DIST#",
    "lastMode": "privileged-exec",
    "waitingForCommandEnd": true,
    "updatedAt": 1777403632142,
    "ageMs": 639,
    "idleMs": 90,
    "debug": [
      "1777403631677 native-tick reason=reapStaleJobs phase=waiting-ensure-mode waiting=true pending=set ageMs=84 idleMs=84",
      "1777403631749 native-tick reason=getJobState phase=waiting-ensure-mode waiting=true pending=set ageMs=156 idleMs=156",
      "1777403631758 native-tick reason=reapStaleJobs phase=waiting-ensure-mode waiting=true pending=set ageMs=165 idleMs=165",
      "1777403631808 native-tick reason=reapStaleJobs phase=waiting-ensure-mode waiting=true pending=set ageMs=215 idleMs=215",
      "1777403631835 native-tick reason=reapStaleJobs phase=waiting-ensure-mode waiting=true pending=set ageMs=242 idleMs=242",
      "1777403632033 native-tick reason=reapStaleJobs phase=waiting-ensure-mode waiting=true pending=set ageMs=440 idleMs=440",
      "1777403632052 native-tick reason=reapStaleJobs phase=waiting-ensure-mode waiting=true pending=set ageMs=459 idleMs=459",
      "1777403632120 native-tick reason=reapStaleJobs phase=waiting-ensure-mode waiting=true pending=set ageMs=527 idleMs=527",
      "1777403632125 native-fallback-enter reason=reapStaleJobs elapsedMs=527",
      "1777403632129 native-output-len=4535",
      "1777403632135 native-check command=\"privileged-exec\" prompt=\"SW-SRV-DIST#\" mode=\"privileged-exec\" blockLen=4535 complete=true promptOk=true pager=false blockHead=\"\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nH\" blockTail=\"active    \\n999  NATIVA_TECNICA                   active    \\n1002 fddi-default                     active    \\n1003 token-ring-default               active    \\n1004 fddinet-default                  active    \\n1005 trnet-default                    active    \\nSW-SRV-DIST>\\nSW-SRV-DIST>enable\\nSW-SRV-DIST#\"",
      "1777403632218 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=625 idleMs=76",
      "1777403632227 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=634 idleMs=85"
    ],
    "stepResults": [
      {
        "stepIndex": 0,
        "stepType": "ensure-mode",
        "command": "privileged-exec",
        "raw": "\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST>\nSW-SRV-DIST>show ip interface brief\nInterface              IP-Address      OK? Method Status                Protocol \nFastEthernet0/1        unassigned      YES manual up                    up \nFastEthernet0/2        unassigned      YES manual up                    up \nFastEthernet0/3        unassigned      YES manual up                    up \nFastEthernet0/4        unassigned      YES manual up                    up \nFastEthernet0/5        unassigned      YES manual up                    up \nFastEthernet0/6        unassigned      YES manual down                  down \nFastEthernet0/7        unassigned      YES manual down                  down \nFastEthernet0/8        unassigned      YES manual down                  down \nFastEthernet0/9        unassigned      YES manual down                  down \nFastEthernet0/10       unassigned      YES manual down                  down \nFastEthernet0/11       unassigned      YES manual down                  down \nFastEthernet0/12       unassigned      YES manual down                  down \nFastEthernet0/13       unassigned      YES manual down                  down \nFastEthernet0/14       unassigned      YES manual down                  down \nFastEthernet0/15       unassigned      YES manual down                  down \nFastEthernet0/16       unassigned      YES manual down                  down \nFastEthernet0/17       unassigned      YES manual down                  down \nFastEthernet0/18       unassigned      YES manual down                  down \nFastEthernet0/19       unassigned      YES manual down                  down \nFastEthernet0/20       unassigned      YES manual down                  down \nFastEthernet0/21       unassigned      YES manual down                  down \nFastEthernet0/22       unassigned      YES manual down                  down \nFastEthernet0/23       unassigned      YES manual down                  down \nFastEthernet0/24       unassigned      YES manual down                  down \nGigabitEthernet0/1     unassigned      YES manual up                    up \nGigabitEthernet0/2     unassigned      YES manual up                    up \nVlan1                  unassigned      YES manual administratively down down \nVlan99                 192.168.99.6    YES manual up                    up\nSW-SRV-DIST>\nSW-SRV-DIST>show vlan brief\n\nVLAN Name                             Status    Ports\n---- -------------------------------- --------- -------------------------------\n1    default                          active    Fa0/6, Fa0/7, Fa0/8, Fa0/9\n                                                Fa0/10, Fa0/11, Fa0/12, Fa0/13\n                                                Fa0/14, Fa0/15, Fa0/16, Fa0/17\n                                                Fa0/18, Fa0/19, Fa0/20, Fa0/21\n                                                Fa0/22, Fa0/23, Fa0/24\n10   DIRECTIVOS                       active    \n15   JURIDICA                         active    \n20   FINANZAS                         active    \n25   TALENTO                          active    \n30   TIC                              active    \n40   TECNICA                          active    \n50   COMERCIAL                        active    \n60   SERV_GRAL                        active    \n70   SERVIDORES                       active    Fa0/1, Fa0/2, Fa0/3\n80   VOZ                              active    \n90   WIFI_DIRECTIVOS                  active    \n99   MGMT                             active    \n100  WIFI_EMPLEADOS                   active    \n110  WIFI_TIC                         active    \n120  WIFI_INVITADOS                   active    \n130  IOT                              active    \n999  NATIVA_TECNICA                   active    \n1002 fddi-default                     active    \n1003 token-ring-default               active    \n1004 fddinet-default                  active    \n1005 trnet-default                    active    \nSW-SRV-DIST>\nSW-SRV-DIST>enable\nSW-SRV-DIST#",
        "status": 0,
        "completedAt": 1777403632142
      }
    ]
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018400.json -----
{
  "protocolVersion": 2,
  "id": "cmd_000000018400",
  "seq": 18400,
  "type": "__pollDeferred",
  "startedAt": 1777403632654,
  "completedAt": 1777403632763,
  "status": "completed",
  "ok": true,
  "value": {
    "done": true,
    "ok": true,
    "status": 0,
    "result": {
      "ok": true,
      "raw": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n\nSW-SRV-DIST#\nSW-SRV-DIST# ",
      "status": 0,
      "session": {
        "mode": "privileged-exec",
        "prompt": "SW-SRV-DIST#",
        "paging": false,
        "awaitingConfirm": false
      }
    },
    "raw": "\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST>\nSW-SRV-DIST>show ip interface brief\nInterface              IP-Address      OK? Method Status                Protocol \nFastEthernet0/1        unassigned      YES manual up                    up \nFastEthernet0/2        unassigned      YES manual up                    up \nFastEthernet0/3        unassigned      YES manual up                    up \nFastEthernet0/4        unassigned      YES manual up                    up \nFastEthernet0/5        unassigned      YES manual up                    up \nFastEthernet0/6        unassigned      YES manual down                  down \nFastEthernet0/7        unassigned      YES manual down                  down \nFastEthernet0/8        unassigned      YES manual down                  down \nFastEthernet0/9        unassigned      YES manual down                  down \nFastEthernet0/10       unassigned      YES manual down                  down \nFastEthernet0/11       unassigned      YES manual down                  down \nFastEthernet0/12       unassigned      YES manual down                  down \nFastEthernet0/13       unassigned      YES manual down                  down \nFastEthernet0/14       unassigned      YES manual down                  down \nFastEthernet0/15       unassigned      YES manual down                  down \nFastEthernet0/16       unassigned      YES manual down                  down \nFastEthernet0/17       unassigned      YES manual down                  down \nFastEthernet0/18       unassigned      YES manual down                  down \nFastEthernet0/19       unassigned      YES manual down                  down \nFastEthernet0/20       unassigned      YES manual down                  down \nFastEthernet0/21       unassigned      YES manual down                  down \nFastEthernet0/22       unassigned      YES manual down                  down \nFastEthernet0/23       unassigned      YES manual down                  down \nFastEthernet0/24       unassigned      YES manual down                  down \nGigabitEthernet0/1     unassigned      YES manual up                    up \nGigabitEthernet0/2     unassigned      YES manual up                    up \nVlan1                  unassigned      YES manual administratively down down \nVlan99                 192.168.99.6    YES manual up                    up\nSW-SRV-DIST>\nSW-SRV-DIST>show vlan brief\n\nVLAN Name                             Status    Ports\n---- -------------------------------- --------- -------------------------------\n1    default                          active    Fa0/6, Fa0/7, Fa0/8, Fa0/9\n                                                Fa0/10, Fa0/11, Fa0/12, Fa0/13\n                                                Fa0/14, Fa0/15, Fa0/16, Fa0/17\n                                                Fa0/18, Fa0/19, Fa0/20, Fa0/21\n                                                Fa0/22, Fa0/23, Fa0/24\n10   DIRECTIVOS                       active    \n15   JURIDICA                         active    \n20   FINANZAS                         active    \n25   TALENTO                          active    \n30   TIC                              active    \n40   TECNICA                          active    \n50   COMERCIAL                        active    \n60   SERV_GRAL                        active    \n70   SERVIDORES                       active    Fa0/1, Fa0/2, Fa0/3\n80   VOZ                              active    \n90   WIFI_DIRECTIVOS                  active    \n99   MGMT                             active    \n100  WIFI_EMPLEADOS                   active    \n110  WIFI_TIC                         active    \n120  WIFI_INVITADOS                   active    \n130  IOT                              active    \n999  NATIVA_TECNICA                   active    \n1002 fddi-default                     active    \n1003 token-ring-default               active    \n1004 fddinet-default                  active    \n1005 trnet-default                    active    \nSW-SRV-DIST>\nSW-SRV-DIST>enable\nSW-SRV-DIST#SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n\nSW-SRV-DIST#\nSW-SRV-DIST# ",
    "output": "\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST>\nSW-SRV-DIST>show ip interface brief\nInterface              IP-Address      OK? Method Status                Protocol \nFastEthernet0/1        unassigned      YES manual up                    up \nFastEthernet0/2        unassigned      YES manual up                    up \nFastEthernet0/3        unassigned      YES manual up                    up \nFastEthernet0/4        unassigned      YES manual up                    up \nFastEthernet0/5        unassigned      YES manual up                    up \nFastEthernet0/6        unassigned      YES manual down                  down \nFastEthernet0/7        unassigned      YES manual down                  down \nFastEthernet0/8        unassigned      YES manual down                  down \nFastEthernet0/9        unassigned      YES manual down                  down \nFastEthernet0/10       unassigned      YES manual down                  down \nFastEthernet0/11       unassigned      YES manual down                  down \nFastEthernet0/12       unassigned      YES manual down                  down \nFastEthernet0/13       unassigned      YES manual down                  down \nFastEthernet0/14       unassigned      YES manual down                  down \nFastEthernet0/15       unassigned      YES manual down                  down \nFastEthernet0/16       unassigned      YES manual down                  down \nFastEthernet0/17       unassigned      YES manual down                  down \nFastEthernet0/18       unassigned      YES manual down                  down \nFastEthernet0/19       unassigned      YES manual down                  down \nFastEthernet0/20       unassigned      YES manual down                  down \nFastEthernet0/21       unassigned      YES manual down                  down \nFastEthernet0/22       unassigned      YES manual down                  down \nFastEthernet0/23       unassigned      YES manual down                  down \nFastEthernet0/24       unassigned      YES manual down                  down \nGigabitEthernet0/1     unassigned      YES manual up                    up \nGigabitEthernet0/2     unassigned      YES manual up                    up \nVlan1                  unassigned      YES manual administratively down down \nVlan99                 192.168.99.6    YES manual up                    up\nSW-SRV-DIST>\nSW-SRV-DIST>show vlan brief\n\nVLAN Name                             Status    Ports\n---- -------------------------------- --------- -------------------------------\n1    default                          active    Fa0/6, Fa0/7, Fa0/8, Fa0/9\n                                                Fa0/10, Fa0/11, Fa0/12, Fa0/13\n                                                Fa0/14, Fa0/15, Fa0/16, Fa0/17\n                                                Fa0/18, Fa0/19, Fa0/20, Fa0/21\n                                                Fa0/22, Fa0/23, Fa0/24\n10   DIRECTIVOS                       active    \n15   JURIDICA                         active    \n20   FINANZAS                         active    \n25   TALENTO                          active    \n30   TIC                              active    \n40   TECNICA                          active    \n50   COMERCIAL                        active    \n60   SERV_GRAL                        active    \n70   SERVIDORES                       active    Fa0/1, Fa0/2, Fa0/3\n80   VOZ                              active    \n90   WIFI_DIRECTIVOS                  active    \n99   MGMT                             active    \n100  WIFI_EMPLEADOS                   active    \n110  WIFI_TIC                         active    \n120  WIFI_INVITADOS                   active    \n130  IOT                              active    \n999  NATIVA_TECNICA                   active    \n1002 fddi-default                     active    \n1003 token-ring-default               active    \n1004 fddinet-default                  active    \n1005 trnet-default                    active    \nSW-SRV-DIST>\nSW-SRV-DIST>enable\nSW-SRV-DIST#SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n\nSW-SRV-DIST#\nSW-SRV-DIST# ",
    "source": "terminal",
    "session": {
      "mode": "privileged-exec",
      "prompt": "SW-SRV-DIST#",
      "paging": false,
      "awaitingConfirm": false
    }
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018402.json -----
{
  "protocolVersion": 2,
  "id": "cmd_000000018402",
  "seq": 18402,
  "type": "terminal.plan.run",
  "startedAt": 1777403633556,
  "completedAt": 1777403633651,
  "status": "completed",
  "ok": true,
  "value": {
    "ok": true,
    "deferred": true,
    "ticket": "cmd-109b83cd",
    "job": {
      "id": "cmd-109b83cd",
      "kind": "ios-session",
      "version": 1,
      "device": "SW-SRV-DIST",
      "plan": [
        {
          "type": "command",
          "kind": "command",
          "value": "show version",
          "command": "show version",
          "allowPager": true,
          "allowConfirm": false,
          "optional": false,
          "timeoutMs": 12000,
          "options": {
            "timeoutMs": 12000
          },
          "metadata": {}
        }
      ],
      "options": {
        "stopOnError": true,
        "commandTimeoutMs": 12000,
        "stallTimeoutMs": 15000
      },
      "payload": {
        "source": "terminal.plan.run",
        "metadata": {
          "deviceKind": "ios",
          "source": "pt-control.terminal-plan-builder",
          "lineCount": 1
        },
        "policies": {
          "autoBreakWizard": true,
          "autoAdvancePager": true,
          "maxPagerAdvances": 80,
          "maxConfirmations": 0,
          "abortOnPromptMismatch": false,
          "abortOnModeMismatch": true
        }
      }
    }
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018403.json -----
{
  "protocolVersion": 2,
  "id": "cmd_000000018403",
  "seq": 18403,
  "type": "__pollDeferred",
  "startedAt": 1777403633752,
  "completedAt": 1777403633825,
  "status": "completed",
  "ok": true,
  "value": {
    "ok": true,
    "deferred": true,
    "ticket": "cmd-109b83cd",
    "done": false,
    "state": "waiting-command",
    "currentStep": 0,
    "totalSteps": 1,
    "stepType": "command",
    "stepValue": "show version",
    "outputTail": "",
    "lastPrompt": "",
    "lastMode": "unknown",
    "waitingForCommandEnd": true,
    "updatedAt": 1777403633604,
    "ageMs": 199,
    "idleMs": 199,
    "debug": [
      "1777403633673 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=69 idleMs=69",
      "1777403633727 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=123 idleMs=123",
      "1777403633791 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=187 idleMs=187",
      "1777403633799 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=195 idleMs=195"
    ],
    "stepResults": []
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018404.json -----
{
  "protocolVersion": 2,
  "id": "cmd_000000018404",
  "seq": 18404,
  "type": "__pollDeferred",
  "startedAt": 1777403634170,
  "completedAt": 1777403634244,
  "status": "completed",
  "ok": true,
  "value": {
    "done": true,
    "ok": true,
    "status": 0,
    "result": {
      "ok": true,
      "raw": "show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#",
      "status": 0,
      "session": {
        "mode": "privileged-exec",
        "prompt": "SW-SRV-DIST#",
        "paging": false,
        "awaitingConfirm": false
      }
    },
    "raw": "show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#",
    "output": "show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#",
    "source": "terminal",
    "session": {
      "mode": "privileged-exec",
      "prompt": "SW-SRV-DIST#",
      "paging": false,
      "awaitingConfirm": false
    }
  }
}
```

## current terminal state
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
function safe(name) {
  try {
    if (t && typeof t[name] === \"function\") return String(t[name]());
    return \"<no-method>\";
  } catch(e) {
    return \"<err:\" + String(e) + \">\";
  }
}
return JSON.stringify({
  prompt: safe(\"getPrompt\"),
  mode: safe(\"getMode\"),
  input: safe(\"getCommandInput\"),
  outputTail: safe(\"getOutput\").slice(-5000),
  allOutputTail: safe(\"getAllOutput\").slice(-5000),
  bufferTail: safe(\"getBuffer\").slice(-5000),
  textTail: safe(\"getText\").slice(-5000)
});
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
function safe(name) {
  try {
    if (t && typeof t[name] === \"function\") return String(t[name]());
    return \"<no-method>\";
  } catch(e) {
    return \"<err:\" + String(e) + \">\";
  }
}
return JSON.stringify({
  prompt: safe(\"getPrompt\"),
  mode: safe(\"getMode\"),
  input: safe(\"getCommandInput\"),
  outputTail: safe(\"getOutput\").slice(-5000),
  allOutputTail: safe(\"getAllOutput\").slice(-5000),
  bufferTail: safe(\"getBuffer\").slice(-5000),
  textTail: safe(\"getText\").slice(-5000)
});
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 611,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\nfunction safe(name) {\n  try {\n    if (t && typeof t[name] === \"function\") return String(t[name]());\n    return \"<no-method>\";\n  } catch(e) {\n    return \"<err:\" + String(e) + \">\";\n  }\n}\nreturn JSON.stringify({\n  prompt: safe(\"getPrompt\"),\n  mode: safe(\"getMode\"),\n  input: safe(\"getCommandInput\"),\n  outputTail: safe(\"getOutput\").slice(-5000),\n  allOutputTail: safe(\"getAllOutput\"",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"outputTail\":\"d      YES manual down                  down \\nFastEthernet0/10       unassigned      YES manual down                  down \\nFastEthernet0/11       unassigned      YES manual down                  down \\nFastEthernet0/12       unassigned      YES manual down                  down \\nFastEthernet0/13       unassigned      YES manual down                  down \\nFastEthernet0/14       unassigned      YES manual down                  down \\nFastEthernet0/15       unassigned      YES manual down                  down \\nFastEthernet0/16       unassigned      YES manual down                  down \\nFastEthernet0/17       unassigned      YES manual down                  down \\nFastEthernet0/18       unassigned      YES manual down                  down \\nFastEthernet0/19       unassigned      YES manual down                  down \\nFastEthernet0/20       unassigned      YES manual down                  down \\nFastEthernet0/21       unassigned      YES manual down                  down \\nFastEthernet0/22       unassigned      YES manual down                  down \\nFastEthernet0/23       unassigned      YES manual down                  down \\nFastEthernet0/24       unassigned      YES manual down                  down \\nGigabitEthernet0/1     unassigned      YES manual up                    up \\nGigabitEthernet0/2     unassigned      YES manual up                    up \\nVlan1                  unassigned      YES manual administratively down down \\nVlan99                 192.168.99.6    YES manual up                    up\\nSW-SRV-DIST>\\nSW-SRV-DIST>show vlan brief\\n\\nVLAN Name                             Status    Ports\\n---- -------------------------------- --------- -------------------------------\\n1    default                          active    Fa0/6, Fa0/7, Fa0/8, Fa0/9\\n                                                Fa0/10, Fa0/11, Fa0/12, Fa0/13\\n                                                Fa0/14, Fa0/15, Fa0/16, Fa0/17\\n                                                Fa0/18, Fa0/19, Fa0/20, Fa0/21\\n                                                Fa0/22, Fa0/23, Fa0/24\\n10   DIRECTIVOS                       active    \\n15   JURIDICA                         active    \\n20   FINANZAS                         active    \\n25   TALENTO                          active    \\n30   TIC                              active    \\n40   TECNICA                          active    \\n50   COMERCIAL                        active    \\n60   SERV_GRAL                        active    \\n70   SERVIDORES                       active    Fa0/1, Fa0/2, Fa0/3\\n80   VOZ                              active    \\n90   WIFI_DIRECTIVOS                  active    \\n99   MGMT                             active    \\n100  WIFI_EMPLEADOS                   active    \\n110  WIFI_TIC                         active    \\n120  WIFI_INVITADOS                   active    \\n130  IOT                              active    \\n999  NATIVA_TECNICA                   active    \\n1002 fddi-default                     active    \\n1003 token-ring-default               active    \\n1004 fddinet-default                  active    \\n1005 trnet-default                    active    \\nSW-SRV-DIST>\\nSW-SRV-DIST>enable\\nSW-SRV-DIST#show running-config\\nBuilding configuration...\\n\\nCurrent configuration : 2020 bytes\\n!\\nversion 12.2\\nno service timestamps log datetime msec\\nno service timestamps debug datetime msec\\nno service password-encryption\\n!\\nhostname SW-SRV-DIST\\n!\\n!\\n!\\nno ip domain-lookup\\n!\\n!\\n!\\nspanning-tree mode rapid-pvst\\nspanning-tree extend system-id\\n!\\ninterface FastEthernet0/1\\n switchport access vlan 70\\n\\nSW-SRV-DIST#\\nSW-SRV-DIST# show version\\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\\nCompiled Wed 12-Oct-05 22:05 by pt_team\\n\\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST#\",\"allOutputTail\":\"<no-method>\",\"bufferTail\":\"<no-method>\",\"textTail\":\"<no-method>\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018405",
      "seq": 18405,
      "type": "omni.evaluate.raw",
      "startedAt": 1777404719138,
      "completedAt": 1777404719325,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"outputTail\":\"d      YES manual down                  down \\nFastEthernet0/10       unassigned      YES manual down                  down \\nFastEthernet0/11       unassigned      YES manual down                  down \\nFastEthernet0/12       unassigned      YES manual down                  down \\nFastEthernet0/13       unassigned      YES manual down                  down \\nFastEthernet0/14       unassigned      YES manual down                  down \\nFastEthernet0/15       unassigned      YES manual down                  down \\nFastEthernet0/16       unassigned      YES manual down                  down \\nFastEthernet0/17       unassigned      YES manual down                  down \\nFastEthernet0/18       unassigned      YES manual down                  down \\nFastEthernet0/19       unassigned      YES manual down                  down \\nFastEthernet0/20       unassigned      YES manual down                  down \\nFastEthernet0/21       unassigned      YES manual down                  down \\nFastEthernet0/22       unassigned      YES manual down                  down \\nFastEthernet0/23       unassigned      YES manual down                  down \\nFastEthernet0/24       unassigned      YES manual down                  down \\nGigabitEthernet0/1     unassigned      YES manual up                    up \\nGigabitEthernet0/2     unassigned      YES manual up                    up \\nVlan1                  unassigned      YES manual administratively down down \\nVlan99                 192.168.99.6    YES manual up                    up\\nSW-SRV-DIST>\\nSW-SRV-DIST>show vlan brief\\n\\nVLAN Name                             Status    Ports\\n---- -------------------------------- --------- -------------------------------\\n1    default                          active    Fa0/6, Fa0/7, Fa0/8, Fa0/9\\n                                                Fa0/10, Fa0/11, Fa0/12, Fa0/13\\n                                                Fa0/14, Fa0/15, Fa0/16, Fa0/17\\n                                                Fa0/18, Fa0/19, Fa0/20, Fa0/21\\n                                                Fa0/22, Fa0/23, Fa0/24\\n10   DIRECTIVOS                       active    \\n15   JURIDICA                         active    \\n20   FINANZAS                         active    \\n25   TALENTO                          active    \\n30   TIC                              active    \\n40   TECNICA                          active    \\n50   COMERCIAL                        active    \\n60   SERV_GRAL                        active    \\n70   SERVIDORES                       active    Fa0/1, Fa0/2, Fa0/3\\n80   VOZ                              active    \\n90   WIFI_DIRECTIVOS                  active    \\n99   MGMT                             active    \\n100  WIFI_EMPLEADOS                   active    \\n110  WIFI_TIC                         active    \\n120  WIFI_INVITADOS                   active    \\n130  IOT                              active    \\n999  NATIVA_TECNICA                   active    \\n1002 fddi-default                     active    \\n1003 token-ring-default               active    \\n1004 fddinet-default                  active    \\n1005 trnet-default                    active    \\nSW-SRV-DIST>\\nSW-SRV-DIST>enable\\nSW-SRV-DIST#show running-config\\nBuilding configuration...\\n\\nCurrent configuration : 2020 bytes\\n!\\nversion 12.2\\nno service timestamps log datetime msec\\nno service timestamps debug datetime msec\\nno service password-encryption\\n!\\nhostname SW-SRV-DIST\\n!\\n!\\n!\\nno ip domain-lookup\\n!\\n!\\n!\\nspanning-tree mode rapid-pvst\\nspanning-tree extend system-id\\n!\\ninterface FastEthernet0/1\\n switchport access vlan 70\\n\\nSW-SRV-DIST#\\nSW-SRV-DIST# show version\\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\\nCompiled Wed 12-Oct-05 22:05 by pt_team\\n\\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST#\",\"allOutputTail\":\"<no-method>\",\"bufferTail\":\"<no-method>\",\"textTail\":\"<no-method>\"}"
      },
      "timings": {
        "sentAt": 1777404719039,
        "resultSeenAt": 1777404719356,
        "receivedAt": 1777404719356,
        "waitMs": 317,
        "completedAtMs": 1777404719325
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

## source extraction/parser files
### execution-engine output extraction
```ts
491-    if (!hasPromptAtEnd) {
492-      return false;
493-    }
494-
495-    const hasCommandEcho =
496-      cmd.length === 0 || lines.some((line) => lineContainsCommandEcho(line, cmd));
497-
498-    const hasMeaningfulBody = lines.some((line) => {
499-      if (!line) return false;
500-      if (lineContainsCommandEcho(line, cmd)) return false;
501-      if (isIosPrompt(line)) return false;
502-      if (isPagerOnlyLine(line)) return false;
503-      return true;
504-    });
505-
506-    return hasCommandEcho && hasMeaningfulBody;
507-  }
508-
509-  function stripCommandEchoFromLine(line: string, command: string): string {
510-    const rawLine = String(line ?? "").trim();
511-    const rawCommand = String(command ?? "").trim();
512-
513-    if (!rawLine || !rawCommand) return rawLine;
514-
515-    if (rawLine.toLowerCase() === rawCommand.toLowerCase()) {
516-      return "";
517-    }
518-
519-    const lowerLine = rawLine.toLowerCase();
520-    const lowerCommand = rawCommand.toLowerCase();
521-
522-    const gtIndex = lowerLine.indexOf(">" + lowerCommand);
523-    if (gtIndex >= 0) return "";
524-
525-    const hashIndex = lowerLine.indexOf("#" + lowerCommand);
526-    if (hashIndex >= 0) return "";
527-
528-    return rawLine;
529-  }
530-
531:  function nativeFallbackBlockLooksComplete(block: string, command: string, prompt: string): boolean {
532-    const text = normalizeEol(block);
533-    const lines = text
534-      .split("\n")
535-      .map((line) => line.trim())
536-      .filter(Boolean);
537-
538-    if (lines.length === 0) return false;
539-
540-    const promptOk = isIosPrompt(prompt) || isIosPrompt(lastNonEmptyLine(text));
541-    if (!promptOk) return false;
542-
543-    if (outputHasPager(text)) return false;
544-
545-    const meaningfulLines = lines.filter((line) => {
546-      const stripped = stripCommandEchoFromLine(line, command);
547-      if (!stripped) return false;
548-      if (isIosPrompt(stripped)) return false;
549-      if (isPagerOnlyLine(stripped)) return false;
550-      return true;
551-    });
552-
553-    return meaningfulLines.length > 0;
554-  }
555-
556-  function getNativeTerminalForDevice(device: string): any {
557-    try {
558-      const resolvedIpc = resolvePacketTracerIpc();
559-      const net = resolvedIpc && typeof resolvedIpc.network === "function" ? resolvedIpc.network() : null;
560-      const dev = net && typeof net.getDevice === "function" ? net.getDevice(device) : null;
561-
562-      if (!dev) return null;
563-
564-      try {
565-        if (typeof dev.getCommandLine === "function") {
566-          const term = dev.getCommandLine();
567-          if (term) return term;
568-        }
569-      } catch {}
570-
571-      try {
572-        if (
573-          typeof dev.getConsole === "function" &&
574-          dev.getConsole() &&
575-          typeof dev.getConsole().getTerminalLine === "function"
576-        ) {
577-          const term = dev.getConsole().getTerminalLine();
578-          if (term) return term;
579-        }
580-      } catch {}
581-
582-      return null;
583-    } catch {
584-      return null;
585-    }
586-  }
587-
588-  function readNativeTerminalOutput(device: string): string {
589-    const term = getNativeTerminalForDevice(device);
590-    if (!term) return "";
591-    return readTerminalTextSafe(term);
592-  }
593-
594-  function getNativePrompt(device: string, output: string): string {
595-    try {
596-      const term = getNativeTerminalForDevice(device);
597-      if (term && typeof term.getPrompt === "function") {
598-        const prompt = String(term.getPrompt() || "").trim();
599-        if (prompt) return prompt;
600-      }
601-    } catch {}
602-
603-    return inferPromptFromTerminalText(output);
604-  }
605-
606-  function getNativeMode(device: string, prompt: string): string {
607-    try {
608-      const term = getNativeTerminalForDevice(device);
609-      if (term && typeof term.getMode === "function") {
610-        const raw = String(term.getMode() || "").trim().toLowerCase();
611-
612-        if (raw === "user") return "user-exec";
613-        if (raw === "enable" || raw === "privileged" || raw === "privileged-exec") return "privileged-exec";
614-        if (raw === "global" || raw === "config" || raw === "global-config") return "global-config";
615-        if (raw === "logout") return "logout";
616-      }
617-    } catch {}
618-
619-    return inferModeFromPrompt(prompt);
620-  }
621-
622-  function outputHasPager(output: string): boolean {
623-    return /--More--|More:|Press any key to continue/i.test(String(output || "").slice(-1000));
624-  }
625-
626-  function shouldTryNativeFallback(job: ActiveJob, now: number): boolean {
627-    const ctx = job.context as any;
628-
629-    if (!job || ctx.finished === true || ctx.phase === "completed" || ctx.phase === "error") {
630-      return false;
631-    }
632-
633-    const waitingPhase =
634-      ctx.phase === "waiting-command" ||
635-      ctx.phase === "waiting-ensure-mode";
636-
637-    if (!waitingPhase) {
638-      return false;
639-    }
640-
641-    if (ctx.waitingForCommandEnd !== true) {
642-      return false;
643-    }
644-
645-    const ageMs = now - Number(ctx.updatedAt || ctx.startedAt || now);
646-
647-    return ageMs > 750;
648-  }
649-
650-  function tickNativeFallback(job: ActiveJob, reason: string): boolean {
651-    const now = Date.now();
652-
653-    jobDebug(
654-      job,
655-      "native-tick reason=" +
656-        reason +
657-        " phase=" +
658-        String(job.context.phase) +
659-        " waiting=" +
660-        String(job.context.waitingForCommandEnd) +
661-        " pending=" +
662-        String(job.pendingCommand === null ? "null" : "set") +
663-        " ageMs=" +
664-        String(now - Number(job.context.startedAt || now)) +
665-        " idleMs=" +
666-        String(now - Number(job.context.updatedAt || now)),
667-    );
668-
669-    if (!shouldTryNativeFallback(job, now)) {
670-      return false;
671-    }
672-
673-    return forceCompleteFromNativeTerminal(job, reason);
674-  }
675-
676-  function jobDebug(job: ActiveJob, message: string): void {
677-    try {
678-      const ctx = job.context as any;
679-
680-      if (!ctx.debug) {
681-        ctx.debug = [];
682-      }
683-
684-      ctx.debug.push(Date.now() + " " + message);
685-
686-      if (ctx.debug.length > 100) {
687-        ctx.debug.splice(0, ctx.debug.length - 100);
688-      }
689-    } catch {}
690-
691-    try {
692-      execLog("JOB DEBUG id=" + job.id + " " + message);
693-    } catch {}
694-  }
695-
696-  function advanceNativePager(device: string): boolean {
697-    try {
698-      const term = getNativeTerminalForDevice(device);
699-      if (!term || typeof term.enterChar !== "function") return false;
700-      term.enterChar(32, 0);
701-      return true;
702-    } catch {
703-      return false;
704-    }
705-  }
706-
707:  function extractLatestCommandBlock(output: string, command: string): string {
708-    const text = normalizeEol(output);
709-    const cmd = String(command || "").trim();
710-
711-    if (!text.trim() || !cmd) return text;
712-
713-    const lines = text.split("\n");
714-    let startIndex = -1;
715-
716-    for (let i = lines.length - 1; i >= 0; i -= 1) {
717-      const line = String(lines[i] || "").trim();
718-
719-      if (line === cmd || line.endsWith(">" + cmd) || line.endsWith("#" + cmd)) {
720-        startIndex = i;
721-        break;
722-      }
723-    }
724-
725-    if (startIndex === -1) {
726-      const idx = text.lastIndexOf(cmd);
727-      if (idx >= 0) return text.slice(idx);
728-      return text;
729-    }
730-
731-    return lines.slice(startIndex).join("\n");
732-  }
733-
734:  function forceCompleteFromNativeTerminal(job: ActiveJob, reason: string): boolean {
735-    const ctx = job.context;
736-    const step = getCurrentStep(ctx);
737-    const command = String(step?.value || "");
738-
739-    if (!step || !command) return false;
740-
741-    jobDebug(job, "native-fallback-enter reason=" + reason);
742-
743-    const output = readNativeTerminalOutput(job.device);
744-    jobDebug(job, "native-output-len=" + String(output.length));
745-
746-    if (!output.trim()) {
747-      jobDebug(job, "native-no-output");
748-      return false;
749-    }
750-
751-    if (outputHasPager(output)) {
752-      const advanced = advanceNativePager(job.device);
753-      execLog(
754-        "JOB NATIVE PAGER id=" +
755-          job.id +
756-          " device=" +
757-          job.device +
758-          " advanced=" +
759-          advanced,
760-      );
761-
762-      ctx.updatedAt = Date.now();
763-      return false;
764-    }
765-
766-    const prompt = getNativePrompt(job.device, output);
767-    const mode = getNativeMode(job.device, prompt);
768-    const block = extractLatestCommandBlock(output, command);
769-    const complete = nativeFallbackBlockLooksComplete(block, command, prompt);
770-
771-    jobDebug(
772-      job,
773-      "native-check command=" +
774-        JSON.stringify(command) +
775-        " prompt=" +
776-        JSON.stringify(prompt) +
777-        " mode=" +
778-        JSON.stringify(mode) +
779-        " blockLen=" +
780-        String(block.length) +
781-        " complete=" +
782-        String(complete) +
783-        " promptOk=" +
784-        String(isIosPrompt(prompt) || isIosPrompt(lastNonEmptyLine(block))) +
785-        " pager=" +
786-        String(outputHasPager(block)) +
787-        " blockHead=" +
788-        JSON.stringify(block.slice(0, 300)) +
789-        " blockTail=" +
790-        JSON.stringify(block.slice(-300)),
791-    );
792-
793-    if (!complete) {
794-      execLog(
795-        "JOB NATIVE INCOMPLETE id=" +
796-          job.id +
797-          " device=" +
798-          job.device +
799-          " command=" +
800-          command +
801-          " prompt=" +
802-          prompt +
803-          " blockTail=" +
804-          block.slice(-300),
805-      );
806-      return false;
807-    }
808-
809-    execLog(
810-      "JOB FORCE COMPLETE FROM NATIVE TERMINAL id=" +
811-        job.id +
812-        " device=" +
813-        job.device +
814-        " reason=" +
815-        reason +
816-        " prompt=" +
817-        prompt +
818-        " mode=" +
819-        mode +
820-        " blockLen=" +
821-        block.length,
822-    );
823-
824-    job.pendingCommand = null;
825-    ctx.waitingForCommandEnd = false;
826-    ctx.outputBuffer += block;
827-    ctx.lastPrompt = prompt;
828-    ctx.lastMode = mode;
829-    ctx.paged = false;
830-
831-    ctx.stepResults.push({
832-      stepIndex: ctx.currentStep,
833-      stepType: step.type,
834-      command,
835-      raw: block,
836-      status: 0,
837-      completedAt: Date.now(),
838-    });
839-
840-    ctx.currentStep++;
841-    ctx.error = null;
842-    ctx.errorCode = null;
843-    ctx.updatedAt = Date.now();
844-
845-    const terminalResult = {
846-      ok: true,
847-      output: block,
848-      status: 0,
849-      session: {
850-        mode,
851-        prompt,
852-        paging: false,
853-        awaitingConfirm: false,
854-      },
855-      mode,
856-    } as unknown as TerminalResult;
857-
858-    if (!completeJobIfLastStep(job, terminalResult)) {
859-      ctx.phase = "pending";
860-      advanceJob(job.id);
861-    }
862-
863-    return true;
864-  }
865-
866-  function reapStaleJobs(): void {
867-    execLog("REAP STALE JOBS tick");
868-    const now = Date.now();
869-
870-    for (const key in jobs) {
871-      const job = jobs[key];
872-      if (!job || job.context.finished || job.context.phase === "completed" || job.context.phase === "error") {
873-        continue;
874-      }
875-
876-      const completedFromNative = tickNativeFallback(job, "reapStaleJobs");
877-
878-      if (completedFromNative) {
879-        continue;
880-      }
881-
882-      if (job.pendingCommand === null) {
883-        continue;
884-      }
885-
886-      const elapsedMs = now - job.context.updatedAt;
887-      const withinTimeout = elapsedMs <= getJobTimeoutMs(job);
888-      const waitingForCommandEnd = job.context.waitingForCommandEnd === true;
889-      const waitingPhase =
890-        job.context.phase === "waiting-command" ||
891-        job.context.phase === "waiting-ensure-mode";
892-
893-      if (waitingForCommandEnd && waitingPhase && elapsedMs > 500) {
894-        try {
895-          const completedFromNative = forceCompleteFromNativeTerminal(
896-            job,
897-            "reapStaleJobs elapsedMs=" + elapsedMs,
898-          );
899-
900-          if (completedFromNative) {
901-            continue;
902-          }
903-        } catch (error) {
904-          execLog(
905-            "JOB NATIVE FALLBACK ERROR id=" +
906-              job.id +
907-              " device=" +
908-              job.device +
909-              " error=" +
910-              String(error),
911-          );
912-        }
913-      }
914-
```

### adapter response parsing area
```ts

      if (!parsed.ok || parsed.status !== 0) {
        return {
          ok: false,
          output: aggregatedOutput.trim(),
          status: parsed.status || 1,
          promptBefore,
          promptAfter,
          modeBefore,
          modeAfter,
          events,
          warnings,
          parsed: finalParsed,
          evidence: buildTimingsEvidence(bridgeResult.timings),
          confidence: 0,
        };
      }
    }

    return {
      ok: true,
      output: aggregatedOutput.trim(),
      status: finalStatus,
      promptBefore,
      promptAfter,
      modeBefore,
      modeAfter,
      events,
      warnings,
      parsed: finalParsed,
      evidence: buildTimingsEvidence(finalTimings),
      confidence: warnings.length > 0 ? 0.8 : 1,
    };
  }

  function computeDeferredPollTimeoutMs(plan: TerminalPlan, requestedTimeoutMs: number): number {
    const planTimeouts = plan.timeouts as TerminalPlanTimeouts | undefined;
    const commandTimeoutMs = Number(planTimeouts?.commandTimeoutMs ?? requestedTimeoutMs ?? 30000);
    const stallTimeoutMs = Number(planTimeouts?.stallTimeoutMs ?? 15000);
    const stepCount = Math.max(plan.steps.length, 1);

    const perStepBudgetMs = commandTimeoutMs + stallTimeoutMs + 3000;
    const totalBudgetMs = perStepBudgetMs * stepCount;

    return Math.max(requestedTimeoutMs, totalBudgetMs, 25000);
  }

  function computeTerminalPlanSubmitTimeoutMs(plan: TerminalPlan, requestedTimeoutMs: number): number {
    const firstStepTimeoutMs = Number(plan.steps[0]?.timeout ?? requestedTimeoutMs ?? 30000);

    // terminal.plan.run solo debe crear el ticket; no ejecuta todo el comando.
    // Pero Packet Tracer puede tardar en reclamar archivos si el kernel está ocupado,
    // hay polling activo, o el filesystem compartido va lento.
    return Math.max(
      15000,
      Math.min(firstStepTimeoutMs, 30000),
    );
  }

  async function executeTerminalPlanRun(
    plan: TerminalPlan,
    timeoutMs: number,
  ): Promise<TerminalPortResult | null> {
    const submitTimeoutMs = computeTerminalPlanSubmitTimeoutMs(plan, timeoutMs);
    const submitResult = await bridge.sendCommandAndWait(
      "terminal.plan.run",
      { plan, options: { timeoutMs } },
      submitTimeoutMs,
      { resolveDeferred: false },
    );
    let finalTimings: unknown = submitResult.timings;

    if (isUnsupportedTerminalPlanRun(submitResult)) {
      return null;
    }

    const submitValue = normalizeBridgeValue(submitResult);

    if (
      submitValue &&
      typeof submitValue === "object" &&
      (submitValue as { ok?: unknown }).ok === false
    ) {
      const parsed = responseParser.parseCommandResponse(submitValue, {
        stepIndex: 0,
        isHost: false,
        command: "terminal.plan.run",
      });

      return {
        ok: false,
        output: parsed.raw.trim(),
        status: parsed.status || 1,
        promptBefore: parsed.promptBefore,
        promptAfter: parsed.promptAfter,
        modeBefore: parsed.modeBefore,
        modeAfter: parsed.modeAfter,
        events: [
          responseParser.buildEventFromResponse(
            parsed,
            { kind: "command", command: "terminal.plan.run" },
            0,
          ),
        ],
        warnings: parsed.warnings,
        parsed: parsed.parsed,
        evidence: buildTimingsEvidence(submitResult.timings),
        confidence: 0,
      };
    }

    if (isDeferredValue(submitValue)) {
      const startedAt = Date.now();
      const pollTimeoutMs = computeDeferredPollTimeoutMs(plan, timeoutMs);
      const pollIntervalMs = 300;

      let pollValue: unknown = null;

      while (Date.now() - startedAt < pollTimeoutMs) {
        try {
          const pollResult = await bridge.sendCommandAndWait(
            "__pollDeferred",
            { ticket: submitValue.ticket },
            Math.max(pollTimeoutMs - (Date.now() - startedAt), 1000),
            { resolveDeferred: false },
          );

          finalTimings = pollResult.timings;
          pollValue = normalizeBridgeValue(pollResult);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error ?? "Unknown poll error");

          return buildTerminalDeferredFailure(
            "TERMINAL_DEFERRED_POLL_TIMEOUT",
            `__pollDeferred no respondió en ${pollTimeoutMs}ms para ticket ${submitValue.ticket}: ${message}`,
            {
              phase: "terminal-plan-poll",
              ticket: submitValue.ticket,
              pollTimeoutMs,
              elapsedMs: Date.now() - startedAt,
              error: message,
            },
          );
        }

        if (!isStillPending(pollValue)) {
          break;
        }

        const remainingMs = pollTimeoutMs - (Date.now() - startedAt);
        if (remainingMs <= 0) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, Math.min(pollIntervalMs, remainingMs)));
      }

      if (isStillPending(pollValue)) {
        return buildTerminalDeferredFailure(
          "TERMINAL_DEFERRED_STALLED",
          `terminal.plan.run creó el ticket ${submitValue.ticket}, pero el job siguió pendiente después de ${pollTimeoutMs}ms.`,
          {
            phase: "terminal-plan-poll",
            ticket: submitValue.ticket,
            pollTimeoutMs,
            elapsedMs: Date.now() - startedAt,
            pollValue,
          },
        );
      }

      const parsed = responseParser.parseCommandResponse(pollValue, {
        stepIndex: 0,
        isHost: false,
        command: "terminal.plan.run",
      });

      const warnings = [...parsed.warnings];
      const mismatchWarning = responseParser.checkPromptMismatch(parsed, plan.steps[0] ?? {});
      if (mismatchWarning) warnings.push(mismatchWarning);

      return {
        ok: parsed.ok,
        output: parsed.raw.trim(),
        status: parsed.status,
        promptBefore: parsed.promptBefore,
        promptAfter: parsed.promptAfter,
        modeBefore: parsed.modeBefore,
        modeAfter: parsed.modeAfter,
        events: [responseParser.buildEventFromResponse(parsed, { kind: "command", command: "terminal.plan.run" }, 0)],
        warnings,
        parsed: parsed.parsed,
        evidence: buildTimingsEvidence(finalTimings),
        confidence: !parsed.ok || parsed.status !== 0 ? 0 : warnings.length > 0 ? 0.8 : 1,
      };
    }

    const parsed = responseParser.parseCommandResponse(submitValue, {
      stepIndex: 0,
      isHost: false,
      command: "terminal.plan.run",
    });

    const warnings = [...parsed.warnings];
    const mismatchWarning = responseParser.checkPromptMismatch(parsed, plan.steps[0] ?? {});
    if (mismatchWarning) warnings.push(mismatchWarning);

    return {
      ok: parsed.ok,
      output: parsed.raw.trim(),
      status: parsed.status,
      promptBefore: parsed.promptBefore,
      promptAfter: parsed.promptAfter,
      modeBefore: parsed.modeBefore,
      modeAfter: parsed.modeAfter,
      events: [responseParser.buildEventFromResponse(parsed, { kind: "command", command: "terminal.plan.run" }, 0)],
      warnings,
      parsed: parsed.parsed,
      evidence: buildTimingsEvidence(submitResult.timings),
      confidence: !parsed.ok || parsed.status !== 0 ? 0 : warnings.length > 0 ? 0.8 : 1,
    };
```

### response parser
```ts
// Response parser — parsea respuestas del bridge
// NO llama al bridge — esa responsabilidad es del adapter

interface UnifiedContractValue {
  ok: boolean;
  output: string;
  session: {
    modeBefore?: string;
    modeAfter?: string;
    promptBefore?: string;
    promptAfter?: string;
    paging?: boolean;
    awaitingConfirm?: boolean;
    autoDismissedInitialDialog?: boolean;
    kind?: string;
  };
  diagnostics?: {
    statusCode?: number;
    completionReason?: string;
  };
  warnings?: string[];
  error?: string;
}

interface LegacyContractValue {
  raw?: string;
  value?: string;
  output?: string;
  parsed?: {
    promptBefore?: string;
    promptAfter?: string;
    modeBefore?: string;
    modeAfter?: string;
    warnings?: string[];
  };
  session?: {
    mode?: string;
    prompt?: string;
    paging?: boolean;
    awaitingConfirm?: boolean;
    autoDismissedInitialDialog?: boolean;
  };
  diagnostics?: {
    commandStatus?: number;
    completionReason?: string;
  };
}

interface SimpleRuntimeResultValue {
  ok?: boolean;
  code?: string;
  errorCode?: string;
  error?: string | { message?: string; code?: string; errorCode?: string };
  message?: string;
  raw?: string;
  output?: string;
  value?: unknown;
  parsed?: unknown;
  warnings?: string[];
  session?: {
    mode?: string;
    prompt?: string;
    modeBefore?: string;
    modeAfter?: string;
    promptBefore?: string;
    promptAfter?: string;
    paging?: boolean;
    awaitingConfirm?: boolean;
    autoDismissedInitialDialog?: boolean;
    kind?: string;
  };
  diagnostics?: {
    commandStatus?: number;
    statusCode?: number;
    completionReason?: string;
  };
}

export interface ParsedCommandResponse {
  raw: string;
  status: number;
  ok: boolean;
  promptBefore: string;
  promptAfter: string;
  modeBefore: string;
  modeAfter: string;
  parsed: unknown;
  paging: boolean;
  awaitingConfirm: boolean;
  autoDismissedInitialDialog: boolean;
  sessionKind: "host" | "ios";
  warnings: string[];
  error?: string;
  diagnostics?: {
    completionReason?: string;
    statusCode?: number;
  };
}

export interface ParseResponseOptions {
  stepIndex: number;
  isHost: boolean;
  command: string;
}

export function createResponseParser() {
  function normalizeStatusFromLegacy(value: LegacyContractValue | undefined): number {
    if (typeof value?.diagnostics?.commandStatus === "number") {
      return value.diagnostics.commandStatus;
    }

    const raw = String(value?.raw ?? value?.value ?? value?.output ?? "");
    if (!raw) return 0;

    const lines = raw.split("\n");
    const recentLines = lines.slice(-15).join("\n");

    if (
      recentLines.includes("% Invalid") ||
      recentLines.includes("% Incomplete") ||
      recentLines.includes("% Ambiguous") ||
      recentLines.includes("% Unknown") ||
      recentLines.includes("%Error") ||
      recentLines.toLowerCase().includes("invalid command") ||
      recentLines.includes("Command not found")
    ) {
      return 1;
    }

    return 0;
  }

  function parseCommandResponse(
    res: unknown,
    options: ParseResponseOptions,
  ): ParsedCommandResponse {
    const { stepIndex, isHost, command } = options;
    const warnings: string[] = [];

    const value = res as UnifiedContractValue | undefined;
    const hasUnifiedContract =
      typeof value?.ok === "boolean" &&
      value?.diagnostics &&
      value?.session &&
      typeof value?.output === "string";

    if (hasUnifiedContract) {
      return parseUnifiedContract(value, options, warnings);
    }

    const simpleValue = res as SimpleRuntimeResultValue | undefined;
    if (typeof simpleValue?.ok === "boolean") {
      return parseSimpleRuntimeResult(simpleValue, options, warnings);
    }

    return parseLegacyContract(res as LegacyContractValue | undefined, options, warnings, stepIndex);
  }

  function parseUnifiedContract(
    res: UnifiedContractValue,
    options: ParseResponseOptions,
    warnings: string[],
  ): ParsedCommandResponse {
    const { stepIndex, isHost, command } = options;
    const tr = res;

    const raw = String(tr.output ?? "");
    const status = Number(tr.diagnostics?.statusCode ?? (tr.ok ? 0 : 1));

    const promptBefore = stepIndex === 0 ? String(tr.session?.promptBefore ?? "") : "";
    const promptAfter = String(tr.session?.promptAfter ?? "");
    const modeBefore = stepIndex === 0 ? String(tr.session?.modeBefore ?? "") : "";
    const modeAfter = String(tr.session?.modeAfter ?? "");

    const sessionInfo = tr.session ?? {};

    if (tr.warnings && Array.isArray(tr.warnings)) {
      warnings.push(...tr.warnings);
    }

    if (sessionInfo.paging) {
      warnings.push(`El comando "${command}" activó paginación`);
    }

    if (sessionInfo.awaitingConfirm) {
      warnings.push(`El comando "${command}" requirió confirmación`);
    }

    if (isHost && (raw.includes("request timed out") || raw.includes("reply from"))) {
      warnings.push(`Comando host "${command}" produjo output de red (ping/tracert)`);
    }

    return {
      raw,
      status,
      ok: tr.ok,
      promptBefore,
      promptAfter,
      modeBefore,
      modeAfter,
      parsed: tr,
      paging: Boolean(sessionInfo.paging),
      awaitingConfirm: Boolean(sessionInfo.awaitingConfirm),
      autoDismissedInitialDialog: Boolean(sessionInfo.autoDismissedInitialDialog),
      sessionKind: isHost ? "host" : "ios",
      warnings,
      error: tr.error,
      diagnostics: tr.diagnostics,
    };
  }

  function parseLegacyContract(
    res: LegacyContractValue | undefined,
    options: ParseResponseOptions,
    warnings: string[],
    stepIndex: number,
  ): ParsedCommandResponse {
    const { isHost, command } = options;

    const raw = String(
      res?.output ?? res?.raw ?? (typeof res?.value === "string" ? res.value : "") ?? "",
    );
    const status = normalizeStatusFromLegacy(res);

    const parsedInfo = (res?.parsed ?? {}) as {
      promptBefore?: string;
      promptAfter?: string;
      modeBefore?: string;
      modeAfter?: string;
      warnings?: string[];
    };

    const promptBefore =
      stepIndex === 0
        ? String(parsedInfo.promptBefore ?? res?.session?.prompt ?? "")
        : "";
    const promptAfter = String(parsedInfo.promptAfter ?? res?.session?.prompt ?? "");
    const modeBefore =
      stepIndex === 0
        ? String(parsedInfo.modeBefore ?? res?.session?.mode ?? "")
        : "";
    const modeAfter = String(parsedInfo.modeAfter ?? res?.session?.mode ?? "");

    const sessionInfo = res?.session ?? {};

    if (sessionInfo.paging) {
      warnings.push(`El comando "${command}" activó paginación`);
    }

    if (sessionInfo.awaitingConfirm) {
      warnings.push(`El comando "${command}" requirió confirmación`);
    }

    if (isHost && (raw.includes("request timed out") || raw.includes("reply from"))) {
      warnings.push(`Comando host "${command}" produjo output de red (ping/tracert)`);
    }

    return {
      raw,
      status,
      ok: status === 0,
      promptBefore,
      promptAfter,
      modeBefore,
      modeAfter,
      parsed: res?.parsed,
      paging: Boolean(sessionInfo.paging),
      awaitingConfirm: Boolean(sessionInfo.awaitingConfirm),
      autoDismissedInitialDialog: Boolean(sessionInfo.autoDismissedInitialDialog),
      sessionKind: isHost ? "host" : "ios",
      warnings,
    };
  }

  function parseSimpleRuntimeResult(
    res: SimpleRuntimeResultValue,
    options: ParseResponseOptions,
    warnings: string[],
  ): ParsedCommandResponse {
    const { stepIndex, isHost, command } = options;

    const raw = String(
      res.output ??
        res.raw ??
        (typeof res.value === "string" ? res.value : "") ??
        "",
    );

    const status = Number(
      res.diagnostics?.statusCode ??
        res.diagnostics?.commandStatus ??
        (res.ok ? 0 : 1),
    );

    const sessionInfo = res.session ?? {};

    const promptBefore =
      stepIndex === 0
        ? String(sessionInfo.promptBefore ?? sessionInfo.prompt ?? "")
        : "";

    const promptAfter = String(sessionInfo.promptAfter ?? sessionInfo.prompt ?? "");

    const modeBefore =
      stepIndex === 0
        ? String(sessionInfo.modeBefore ?? sessionInfo.mode ?? "")
        : "";

    const modeAfter = String(sessionInfo.modeAfter ?? sessionInfo.mode ?? "");

    if (Array.isArray(res.warnings)) {
      warnings.push(...res.warnings.map(String));
    }

    const errorText =
      typeof res.error === "string"
        ? res.error
        : String(res.error?.message ?? res.message ?? res.code ?? res.errorCode ?? "");

    if (!res.ok && errorText) {
      warnings.push(errorText);
    }

    if (sessionInfo.paging) {
      warnings.push(`El comando "${command}" activó paginación`);
    }

    if (sessionInfo.awaitingConfirm) {
      warnings.push(`El comando "${command}" requirió confirmación`);
    }

    if (isHost && (raw.includes("request timed out") || raw.includes("reply from"))) {
      warnings.push(`Comando host "${command}" produjo output de red (ping/tracert)`);
    }

    return {
      raw,
      status,
      ok: Boolean(res.ok),
      promptBefore,
      promptAfter,
      modeBefore,
      modeAfter,
      parsed: res.parsed ?? res,
      paging: Boolean(sessionInfo.paging),
      awaitingConfirm: Boolean(sessionInfo.awaitingConfirm),
      autoDismissedInitialDialog: Boolean(sessionInfo.autoDismissedInitialDialog),
      sessionKind: isHost ? "host" : "ios",
      warnings,
      error: errorText || undefined,
      diagnostics: {
        completionReason: res.diagnostics?.completionReason,
        statusCode: status,
      },
    };
  }

  function buildEventFromResponse(
    parsed: ParsedCommandResponse,
    step: { kind?: string; command?: string; expectMode?: string; expectPromptPattern?: string; optional?: boolean },
```

## doctor queue count source
```
```
