# Packet Tracer IPC API - Referencia Completa

> **Fuente de verdad:** `docs/pt-script-result.json` (generado 2026-04-15)
> **Última actualización:** Abril 2026
> **PT Version:** 9.0.0.0810
> **Estado:** ✅ Métodos verificados en dump — otros marcados con ⚠️

---

## RESUMEN DE MÉTODOS FUNCIONANDO

### ✅ ROUTERPORT - CONFIGURACIÓN DIRECTA (FUNCIONA)

```javascript
var router = net.getDeviceAt(0);
var port = router.getPortAt(0);

// IP Address ✅ FUNCIONA
port.setIpSubnetMask("192.168.1.1", "255.255.255.0");
port.getIpAddress();    // 192.168.1.1
port.getSubnetMask();   // 255.255.255.0

// DHCP ✅
port.setDhcpClientFlag(true);
port.setDhcpClientFlag(false);

// Descripción ✅
port.setDescription("WAN Interface");
port.getDescription();

// Bandwidth ✅
port.setBandwidth(1000000);  // 1 Gbps
port.resetBandwidth();
port.getBandwidth();

// Duplex ✅
port.setFullDuplex(true);
port.isFullDuplex();

// MTU ✅
port.setMtu(1500);
port.getMtu();

// Clock Rate ✅
port.setClockRate(64000);
port.getClockRate();

// Power ✅
port.setPower(true);
port.setPower(false);

// Gateway ✅
port.setDefaultGateway("192.168.1.254");
```

---

## OSPF CONFIGURATION ✅

```javascript
// Cost
port.setOspfCost(10);
port.getOspfCost();

// Priority
port.setOspfPriority(128);
port.getOspfPriority();

// Timers
port.setOspfDeadInterval(40);
port.setOspfHelloInterval(15);
port.getOspfDeadInterval();
port.getOspfHelloInterval();

// Authentication
port.setOspfAuthKey("cisco123");
port.getOspfAuthKey();
```

---

## RIP CONFIGURATION ✅

```javascript
// Passive Interface
port.setRipPassive(true);
port.isRipPassive();

// Split Horizon
port.setRipSplitHorizon(true);
port.isRipSplitHorizon();
```

---

## ACL CONFIGURATION ✅

```javascript
port.setAclInID("100");
port.getAclInID();

port.setAclOutID("100");
port.getAclOutID();
```

---

## CDP / PROXY ARP ✅

```javascript
port.setCdpEnable(true);
port.isCdpEnable();

port.setProxyArpEnabled(true);
port.isProxyArpEnabled();
```

---

## ZONE / SECURITY ✅

```javascript
port.setZoneMemberName("INSIDE");
port.getZoneMemberName();
```

---

## IPv6 ✅

```javascript
port.setIpv6Enabled(true);
port.isIpv6Enabled();

port.setIpv6LinkLocal("fe80::1");
port.getIpv6LinkLocal();

port.setIpv6Mtu(1500);
port.getIpv6Mtu();

port.setIpv6AddressAutoConfig(true);
port.isIpv6AddressAutoConfig();
```

---

## APPWINDOW ✅

```javascript
var aw = ipc.appWindow();

aw.getVersion();           // 9.0.0.0810
aw.getWidth();
aw.getHeight();
aw.getX();
aw.getY();
aw.isMaximized();
aw.isMinimized();
aw.isRealtimeMode();
aw.isSimulationMode();
aw.getUserFolder();       // /Users/.../Cisco Packet Tracer 9.0.0
aw.getDefaultFileSaveLocation();  // /Users/.../saves

aw.showMaximized();
aw.showMinimized();
aw.showNormal();
aw.setWindowTitle("My Lab");
aw.setClipboardText("text");
aw.getClipboardText();
aw.openURL("http://example.com");
aw.showMessageBox("Hello!");
```

---

## OPTIONS ✅

```javascript
var opt = ipc.options();

// Animación
opt.setAnimation(true);
opt.isAnimation();

// Sonido
opt.setSound(true);
opt.isSound();

// Toolbars
opt.setMainToolbarShown(true);
opt.setBottomToolbarShown(true);
opt.setSecondaryToolbarShown(true);

// Tabs
opt.setCliTabHidden(false);
opt.setConfigTabHidden(false);
opt.setDesktopTabHidden(false);
```

---

## CLI AUTOMATION ✅

```javascript
var cli = device.getCommandLine();

// Responder dialog inicial
cli.enterCommand("no");

// Entrar a enable
cli.enterCommand("enable");

// Ejecutar comandos
cli.enterCommand("show version");
var output = cli.getOutput();

// Configurar
cli.enterCommand("configure terminal");
cli.enterCommand("hostname R1");
cli.enterCommand("end");
```

---

## NAT CONFIGURATION ✅

```javascript
// NAT Modes (números 0-5)
port.setNatMode(0);  // Normal/Ninguno
port.setNatMode(1);  // Inside NAT
port.setNatMode(2);  // Outside NAT
port.setNatMode(3);  // Otro tipo
port.setNatMode(4);  // Otro tipo
port.setNatMode(5);  // Otro tipo

port.getNatMode();  // 0-5
```

> ⚠️ Strings no funcionan, usar números (0-5)

---

## NO FUNCIONAN ❌

| Método | Razón |
|--------|--------|
| `setNatMode("inside")` | Usar números 0-5 |
| `setHideDevLabel(true)` | Argumentos incorrectos |
| `createFrameInstance()` | Necesita argumentos específicos |
| `getIpcTimer()` | Necesita argumentos específicos |
| `createTimer()` | Necesita argumentos específicos |

---

## PRÓXIMOS PASOS

1. ⏳ Probar `setNatMode()` con diferentes argumentos
2. ⏳ Explorar `createFrameInstance()` 
3. ⏳ Probar `setHideDevLabel()` con bool
4. ⏳ Automation completa de lab

---

*Generado: Abril 2026*
