export const PT_STATUS_DASHBOARD_RESOURCE_URI = "ui://pt/status-dashboard/control-panel.html";
export const PT_STATUS_DASHBOARD_MIME_TYPE = "text/html;profile=mcp-app";

export function createPtStatusDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Packet Tracer Status Dashboard</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #08111f;
        --panel: rgba(11, 19, 35, 0.86);
        --panel-strong: rgba(16, 27, 48, 0.96);
        --line: rgba(148, 163, 184, 0.16);
        --text: #e5eefb;
        --muted: #9fb2cf;
        --accent: #5eead4;
        --accent-strong: #38bdf8;
        --warning: #f59e0b;
        --danger: #fb7185;
        --success: #34d399;
        --shadow: 0 24px 60px rgba(0, 0, 0, 0.42);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(56, 189, 248, 0.26), transparent 28%),
          radial-gradient(circle at top right, rgba(94, 234, 212, 0.18), transparent 24%),
          linear-gradient(180deg, #050b16 0%, #08111f 42%, #050b16 100%);
      }
      .shell {
        max-width: 1280px;
        margin: 0 auto;
        padding: 24px;
      }
      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.9fr);
        gap: 16px;
        align-items: stretch;
        margin-bottom: 16px;
      }
      .panel {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 22px;
        box-shadow: var(--shadow);
        backdrop-filter: blur(16px);
      }
      .panel-inner { padding: 20px; }
      .kicker {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 7px 12px;
        border-radius: 999px;
        background: rgba(56, 189, 248, 0.12);
        color: #bfdbfe;
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      h1 {
        margin: 14px 0 10px;
        font-size: clamp(2rem, 4vw, 3.5rem);
        line-height: 0.95;
      }
      .subtitle {
        margin: 0;
        max-width: 72ch;
        color: var(--muted);
        line-height: 1.6;
      }
      .stats {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .stat {
        padding: 16px;
        border-radius: 18px;
        background: var(--panel-strong);
        border: 1px solid var(--line);
      }
      .stat-label {
        display: block;
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        margin-bottom: 8px;
      }
      .stat-value {
        font-size: 1.35rem;
        font-weight: 700;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(12, minmax(0, 1fr));
        gap: 16px;
      }
      .col-8 { grid-column: span 8; }
      .col-4 { grid-column: span 4; }
      .card {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 22px;
        box-shadow: var(--shadow);
        overflow: hidden;
      }
      .card-header {
        padding: 18px 20px 0;
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: start;
      }
      .card-title {
        margin: 0;
        font-size: 1.05rem;
      }
      .card-desc {
        margin: 6px 0 0;
        color: var(--muted);
        font-size: 0.95rem;
      }
      .card-body { padding: 18px 20px 20px; }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.04);
        color: var(--text);
        font-size: 13px;
      }
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: var(--warning);
        box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.12);
      }
      .dot.ok { background: var(--success); box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.12); }
      .dot.bad { background: var(--danger); box-shadow: 0 0 0 4px rgba(251, 113, 133, 0.12); }
      .actions {
        display: grid;
        gap: 10px;
      }
      .row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      button {
        appearance: none;
        border: 1px solid var(--line);
        background: linear-gradient(180deg, rgba(56, 189, 248, 0.14), rgba(56, 189, 248, 0.08));
        color: var(--text);
        border-radius: 14px;
        padding: 12px 14px;
        font: inherit;
        cursor: pointer;
        transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
      }
      button:hover { transform: translateY(-1px); border-color: rgba(94, 234, 212, 0.45); }
      button.secondary { background: rgba(255, 255, 255, 0.04); }
      button.ghost { background: transparent; }
      .field {
        display: grid;
        gap: 8px;
      }
      label {
        font-size: 12px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      input, textarea {
        width: 100%;
        border-radius: 14px;
        border: 1px solid var(--line);
        background: rgba(3, 7, 18, 0.72);
        color: var(--text);
        padding: 12px 14px;
        font: inherit;
      }
      textarea { min-height: 120px; resize: vertical; }
      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        color: #c7d2fe;
        background: rgba(2, 6, 23, 0.72);
        border: 1px solid var(--line);
        border-radius: 18px;
        padding: 16px;
        overflow: auto;
        min-height: 250px;
      }
      .list {
        display: grid;
        gap: 10px;
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .list li {
        padding: 12px 14px;
        border-radius: 14px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.03);
        color: var(--muted);
        line-height: 1.45;
      }
      .footer-note {
        color: var(--muted);
        font-size: 12px;
        margin-top: 12px;
      }
      @media (max-width: 1100px) {
        .hero, .grid { grid-template-columns: 1fr; }
        .col-8, .col-4 { grid-column: auto; }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <div class="panel panel-inner">
          <div class="kicker">Packet Tracer MCP Apps</div>
          <h1>Packet Tracer Status Dashboard</h1>
          <p class="subtitle">Panel visual para entender el estado del lab, detectar bloqueos y saltar a las acciones más útiles sin salir de ChatGPT. El panel consume tools reales de MCP y refresca el contexto con datos legibles para el usuario.</p>
          <div class="chips" id="status-chips">
            <span class="chip"><span class="dot" id="dot-app"></span><span id="chip-app">App pendiente</span></span>
            <span class="chip"><span class="dot" id="dot-project"></span><span id="chip-project">Proyecto pendiente</span></span>
            <span class="chip"><span class="dot" id="dot-command"></span><span id="chip-command">Comandos pendientes</span></span>
            <span class="chip"><span class="dot" id="dot-topology"></span><span id="chip-topology">Topología pendiente</span></span>
          </div>
        </div>
        <div class="panel panel-inner">
          <div class="stats">
            <div class="stat"><span class="stat-label">Dispositivos</span><span class="stat-value" id="stat-devices">-</span></div>
            <div class="stat"><span class="stat-label">Enlaces</span><span class="stat-value" id="stat-links">-</span></div>
            <div class="stat"><span class="stat-label">Advertencias</span><span class="stat-value" id="stat-warnings">-</span></div>
            <div class="stat"><span class="stat-label">Acción sugerida</span><span class="stat-value" id="stat-next">-</span></div>
          </div>
        </div>
      </section>

      <section class="grid">
        <div class="col-8 card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Resumen reconciliado</h2>
              <p class="card-desc">Se actualiza con la salida JSON de <code>pt_status</code> y resume salud, heartbeat, proyecto e inventario.</p>
            </div>
            <div class="chips">
              <span class="chip" id="health-pill"><span class="dot" id="health-dot"></span><span id="health-text">Esperando datos</span></span>
            </div>
          </div>
          <div class="card-body">
            <pre id="raw-output">Conecta el panel con <code>pt_status op=summary</code> para ver un resumen visual.</pre>
            <div class="footer-note" id="last-update">Sin actualización todavía.</div>
          </div>
        </div>

        <div class="col-4 card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Acciones rápidas</h2>
              <p class="card-desc">Llaman tools reales del servidor MCP.</p>
            </div>
          </div>
          <div class="card-body actions">
            <button id="refresh-summary">Refrescar resumen</button>
            <div class="row">
              <button class="secondary" id="run-doctor">Diagnóstico</button>
              <button class="secondary" id="list-devices">Dispositivos</button>
            </div>
            <div class="row">
              <button class="secondary" id="list-links">Enlaces</button>
              <button class="secondary" id="app-status">Estado app</button>
            </div>
            <div class="field">
              <label for="focus">Contexto para el modelo</label>
              <textarea id="focus" placeholder="Ejemplo: validar VLANs y mostrar por qué un switch no responde."></textarea>
            </div>
            <button class="ghost" id="send-context">Enviar contexto al chat</button>
          </div>
        </div>

        <div class="col-8 card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Advertencias y siguiente paso</h2>
              <p class="card-desc">Ayuda a priorizar lectura, diagnóstico y validación.</p>
            </div>
          </div>
          <div class="card-body">
            <ul class="list" id="warnings-list">
              <li>No hay advertencias todavía.</li>
            </ul>
            <div style="height: 12px"></div>
            <ul class="list" id="next-actions-list">
              <li>El siguiente paso aparecerá aquí cuando llegue un resumen.</li>
            </ul>
          </div>
        </div>

        <div class="col-4 card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Guía visual</h2>
              <p class="card-desc">Pensado para usuarios que no quieren leer JSON crudo.</p>
            </div>
          </div>
          <div class="card-body">
            <ul class="list">
              <li>Primero mira el panel de estado.</li>
              <li>Si falta algo, usa diagnóstico.</li>
              <li>Si no conoces el nombre exacto de un dispositivo, pide inventario.</li>
              <li>Si la topología está rara, revisa enlaces antes de ejecutar comandos IOS.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>

    <script type="module">
      import { App } from "@modelcontextprotocol/ext-apps";

      var app = new App({ name: "PT Status Dashboard", version: "1.0.0" });

      var rawOutput = document.getElementById("raw-output");
      var lastUpdate = document.getElementById("last-update");
      var healthText = document.getElementById("health-text");
      var healthDot = document.getElementById("health-dot");
      var statDevices = document.getElementById("stat-devices");
      var statLinks = document.getElementById("stat-links");
      var statWarnings = document.getElementById("stat-warnings");
      var statNext = document.getElementById("stat-next");
      var chipApp = document.getElementById("chip-app");
      var chipProject = document.getElementById("chip-project");
      var chipCommand = document.getElementById("chip-command");
      var chipTopology = document.getElementById("chip-topology");
      var dotApp = document.getElementById("dot-app");
      var dotProject = document.getElementById("dot-project");
      var dotCommand = document.getElementById("dot-command");
      var dotTopology = document.getElementById("dot-topology");
      var warningsList = document.getElementById("warnings-list");
      var nextActionsList = document.getElementById("next-actions-list");
      var focusInput = document.getElementById("focus");

      function setDot(dot, state) {
        dot.classList.remove("ok", "bad");
        if (state === "ok") {
          dot.classList.add("ok");
          return;
        }
        if (state === "bad") {
          dot.classList.add("bad");
        }
      }

      function textOf(item) {
        return item && item.type === "text" && typeof item.text === "string" ? item.text : null;
      }

      function parsePayload(result) {
        if (!result || !Array.isArray(result.content)) {
          return null;
        }

        for (var i = 0; i < result.content.length; i += 1) {
          var text = textOf(result.content[i]);
          if (!text) continue;
          try {
            return JSON.parse(text);
          } catch (error) {
            return { rawText: text, parseError: String(error) };
          }
        }

        return null;
      }

      function clearList(node, emptyMessage) {
        node.innerHTML = "";
        var li = document.createElement("li");
        li.textContent = emptyMessage;
        node.appendChild(li);
      }

      function renderList(node, items, emptyMessage) {
        node.innerHTML = "";
        if (!items || !items.length) {
          var fallback = document.createElement("li");
          fallback.textContent = emptyMessage;
          node.appendChild(fallback);
          return;
        }

        for (var i = 0; i < items.length; i += 1) {
          var li = document.createElement("li");
          li.textContent = items[i];
          node.appendChild(li);
        }
      }

      function firstNonEmpty(values, fallback) {
        for (var i = 0; i < values.length; i += 1) {
          if (values[i]) {
            return values[i];
          }
        }
        return fallback;
      }

      function renderPayload(payload) {
        if (!payload) {
          rawOutput.textContent = "Sin datos todavía. Pulsa 'Refrescar resumen' para iniciar.";
          healthText.textContent = "Esperando datos";
          setDot(healthDot, null);
          clearList(warningsList, "No hay advertencias todavía.");
          clearList(nextActionsList, "El siguiente paso aparecerá aquí cuando llegue un resumen.");
          return;
        }

        if (payload.rawText && !payload.action) {
          rawOutput.textContent = payload.rawText;
          lastUpdate.textContent = "El resultado no se pudo parsear como JSON.";
          return;
        }

        var reconciled = payload.reconciled || {};
        var warnings = Array.isArray(payload.warnings) ? payload.warnings : [];
        var nextActions = Array.isArray(payload.nextActions) ? payload.nextActions : [];
        var healthReady = Boolean(reconciled.commandReady && reconciled.topologyUsable);
        var appReady = Boolean(reconciled.appReady);
        var projectReady = Boolean(reconciled.projectReady);
        var inventoryReady = Boolean(reconciled.inventoryReady);
        var commandReady = Boolean(reconciled.commandReady);
        var topologyUsable = Boolean(reconciled.topologyUsable);

        rawOutput.textContent = JSON.stringify(payload, null, 2);
        healthText.textContent = healthReady ? "Sistema listo" : "Sistema requiere atención";
        setDot(healthDot, healthReady ? "ok" : "bad");

        statDevices.textContent = String(reconciled.inventoryDeviceCount != null ? reconciled.inventoryDeviceCount : "-");
        statLinks.textContent = String(reconciled.projectLinkCount != null ? reconciled.projectLinkCount : "-");
        statWarnings.textContent = String(warnings.length);
        statNext.textContent = nextActions.length ? nextActions[0] : (payload.action || "Resumen listo");

        chipApp.textContent = appReady ? "App lista" : "App no lista";
        chipProject.textContent = projectReady ? "Proyecto listo" : "Proyecto no listo";
        chipCommand.textContent = commandReady ? "Comandos listos" : "Comandos bloqueados";
        chipTopology.textContent = topologyUsable ? "Topología usable" : "Topología incompleta";

        setDot(dotApp, appReady ? "ok" : "bad");
        setDot(dotProject, projectReady ? "ok" : "bad");
        setDot(dotCommand, commandReady ? "ok" : "bad");
        setDot(dotTopology, topologyUsable ? "ok" : "bad");

        renderList(warningsList, warnings.length ? warnings.map(function (warning) {
          if (typeof warning === "string") return warning;
          return warning.message ? warning.message : JSON.stringify(warning);
        }) : [], "No hay advertencias para mostrar.");

        renderList(nextActionsList, nextActions.length ? nextActions : ["Sin acciones sugeridas."], "Sin acciones sugeridas.");

        var resumen = firstNonEmpty([
          payload.summary,
          payload.resumen,
          payload.paso,
        ], "Resumen actualizado.");
        lastUpdate.textContent = resumen;
      }

      async function runTool(name, args) {
        var response = await app.callServerTool({ name: name, arguments: args });
        var payload = parsePayload(response);
        renderPayload(payload || { rawText: response && response.content && response.content[0] && response.content[0].text ? response.content[0].text : "" });
        return response;
      }

      app.ontoolresult = function (result) {
        renderPayload(parsePayload(result));
      };

      document.getElementById("refresh-summary").addEventListener("click", function () {
        runTool("pt_status", { op: "summary" });
      });

      document.getElementById("run-doctor").addEventListener("click", function () {
        runTool("pt_status", { op: "doctor" });
      });

      document.getElementById("list-devices").addEventListener("click", function () {
        runTool("pt_device", { op: "list", includePorts: false, includeLinks: false, deep: false });
      });

      document.getElementById("list-links").addEventListener("click", function () {
        runTool("pt_link", { op: "list", deep: false });
      });

      document.getElementById("app-status").addEventListener("click", function () {
        runTool("pt_app", { op: "status" });
      });

      document.getElementById("send-context").addEventListener("click", async function () {
        var text = String(focusInput.value || "").trim();
        if (!text) {
          focusInput.focus();
          return;
        }

        await app.updateModelContext({
          content: [{ type: "text", text: "Contexto del usuario: " + text }],
        });

        lastUpdate.textContent = "Contexto enviado al chat.";
      });

      (async function main() {
        await app.connect();
      })().catch(function (error) {
        rawOutput.textContent = "No se pudo conectar con el host MCP Apps: " + String(error && error.message ? error.message : error);
        healthText.textContent = "Conexión fallida";
        setDot(healthDot, "bad");
      });
    </script>
  </body>
</html>`;
}
