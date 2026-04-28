# pt cmd final diagnosis dump

Fecha: Tue Apr 28 13:53:37 -05 2026

## execution-engine source relevant
```ts
    return String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  }

  function isIosPrompt(value: unknown): boolean {
    const line = String(value ?? "").trim();
    return /^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]$/.test(line);
  }

  function lastNonEmptyLine(value: unknown): string {
    const lines = normalizeEol(value)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    return lines.length > 0 ? lines[lines.length - 1] : "";
  }

  function lineContainsCommandEcho(line: string, command: string): boolean {
    const rawLine = String(line ?? "").trim();
    const rawCommand = String(command ?? "").trim();

    if (!rawLine || !rawCommand) return false;

    const lowerLine = rawLine.toLowerCase();
    const lowerCommand = rawCommand.toLowerCase();

    if (lowerLine === lowerCommand) {
      return true;
    }

    // Packet Tracer suele dejar el eco como:
    //   SW-SRV-DIST>show version
    //   Router#show ip interface brief
    //   Switch(config)#interface vlan 10
    const promptEchoPattern = new RegExp(
      "^[A-Za-z0-9._-]+(?:\\(config[^)]*\\))?[>#]\\s*" +
        rawCommand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
        "\\s*$",
      "i",
    );

    return promptEchoPattern.test(rawLine);
  }

  function isPagerOnlyLine(line: string): boolean {
    return /^--More--$/i.test(String(line ?? "").trim());
  }

  function outputLooksComplete(output: string, command: string): boolean {
    const text = normalizeEol(output);
    const cmd = String(command ?? "").trim();

    if (!text.trim()) return false;

    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const hasPromptAtEnd = isIosPrompt(lastNonEmptyLine(text));

    if (!hasPromptAtEnd) {
      return false;
    }

    const hasCommandEcho =
      cmd.length === 0 || lines.some((line) => lineContainsCommandEcho(line, cmd));

    const hasMeaningfulBody = lines.some((line) => {
      if (!line) return false;
      if (lineContainsCommandEcho(line, cmd)) return false;
      if (isIosPrompt(line)) return false;
      if (isPagerOnlyLine(line)) return false;
      return true;
    });

    return hasCommandEcho && hasMeaningfulBody;
  }

  function getNativeTerminalForDevice(device: string): any {
    try {
      const resolvedIpc = resolvePacketTracerIpc();
      const net = resolvedIpc && typeof resolvedIpc.network === "function" ? resolvedIpc.network() : null;
      const dev = net && typeof net.getDevice === "function" ? net.getDevice(device) : null;

      if (!dev) return null;

      try {
        if (typeof dev.getCommandLine === "function") {
          const term = dev.getCommandLine();
          if (term) return term;
        }
      } catch {}

      try {
        if (
          typeof dev.getConsole === "function" &&
          dev.getConsole() &&
          typeof dev.getConsole().getTerminalLine === "function"
        ) {
          const term = dev.getConsole().getTerminalLine();
          if (term) return term;
        }
      } catch {}

      return null;
    } catch {
      return null;
    }
  }

  function readNativeTerminalOutput(device: string): string {
    const term = getNativeTerminalForDevice(device);
    if (!term) return "";
    return readTerminalTextSafe(term);
  }

  function getNativePrompt(device: string, output: string): string {
    try {
      const term = getNativeTerminalForDevice(device);
      if (term && typeof term.getPrompt === "function") {
        const prompt = String(term.getPrompt() || "").trim();
        if (prompt) return prompt;
      }
    } catch {}

    return inferPromptFromTerminalText(output);
  }

  function getNativeMode(device: string, prompt: string): string {
    try {
      const term = getNativeTerminalForDevice(device);
      if (term && typeof term.getMode === "function") {
        const raw = String(term.getMode() || "").trim().toLowerCase();

        if (raw === "user") return "user-exec";
        if (raw === "enable" || raw === "privileged" || raw === "privileged-exec") return "privileged-exec";
        if (raw === "global" || raw === "config" || raw === "global-config") return "global-config";
        if (raw === "logout") return "logout";
      }
    } catch {}

    return inferModeFromPrompt(prompt);
  }

  function outputHasPager(output: string): boolean {
    return /--More--|More:|Press any key to continue/i.test(String(output || "").slice(-1000));
  }

  function shouldTryNativeFallback(job: ActiveJob, now: number): boolean {
    const ctx = job.context as any;

    if (!job || ctx.finished === true || ctx.phase === "completed" || ctx.phase === "error") {
      return false;
    }

    const waitingPhase =
      ctx.phase === "waiting-command" ||
      ctx.phase === "waiting-ensure-mode";

    if (!waitingPhase) {
      return false;
    }

    if (ctx.waitingForCommandEnd !== true) {
      return false;
    }

    const ageMs = now - Number(ctx.updatedAt || ctx.startedAt || now);

    return ageMs > 750;
  }

  function tickNativeFallback(job: ActiveJob, reason: string): boolean {
    const now = Date.now();

    jobDebug(
      job,
      "native-tick reason=" +
        reason +
        " phase=" +
        String(job.context.phase) +
        " waiting=" +
        String(job.context.waitingForCommandEnd) +
        " pending=" +
        String(job.pendingCommand === null ? "null" : "set") +
        " ageMs=" +
        String(now - Number(job.context.startedAt || now)) +
        " idleMs=" +
        String(now - Number(job.context.updatedAt || now)),
    );

    if (!shouldTryNativeFallback(job, now)) {
      return false;
    }

    return forceCompleteFromNativeTerminal(job, reason);
  }

  function jobDebug(job: ActiveJob, message: string): void {
    try {
      const ctx = job.context as any;

      if (!ctx.debug) {
        ctx.debug = [];
      }

      ctx.debug.push(Date.now() + " " + message);

      if (ctx.debug.length > 100) {
        ctx.debug.splice(0, ctx.debug.length - 100);
      }
    } catch {}

    try {
      execLog("JOB DEBUG id=" + job.id + " " + message);
    } catch {}
  }

  function advanceNativePager(device: string): boolean {
    try {
      const term = getNativeTerminalForDevice(device);
      if (!term || typeof term.enterChar !== "function") return false;
      term.enterChar(32, 0);
      return true;
    } catch {
      return false;
    }
  }

  function extractLatestCommandBlock(output: string, command: string): string {
    const text = normalizeEol(output);
    const cmd = String(command || "").trim();

    if (!text.trim() || !cmd) return text;

    const lines = text.split("\n");
    let startIndex = -1;

    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const line = String(lines[i] || "").trim();

      if (line === cmd || line.endsWith(">" + cmd) || line.endsWith("#" + cmd)) {
        startIndex = i;
        break;
      }
    }

    if (startIndex === -1) {
      const idx = text.lastIndexOf(cmd);
      if (idx >= 0) return text.slice(idx);
      return text;
    }

    return lines.slice(startIndex).join("\n");
  }

  function forceCompleteFromNativeTerminal(job: ActiveJob, reason: string): boolean {
    const ctx = job.context;
    const step = getCurrentStep(ctx);
    const command = String(step?.value || "");

    if (!step || !command) return false;

    jobDebug(job, "native-fallback-enter reason=" + reason);

    const output = readNativeTerminalOutput(job.device);
    jobDebug(job, "native-output-len=" + String(output.length));

    if (!output.trim()) {
      jobDebug(job, "native-no-output");
      return false;
    }

    if (outputHasPager(output)) {
      const advanced = advanceNativePager(job.device);
      execLog(
        "JOB NATIVE PAGER id=" +
          job.id +
          " device=" +
          job.device +
          " advanced=" +
          advanced,
      );

      ctx.updatedAt = Date.now();
      return false;
    }

    const prompt = getNativePrompt(job.device, output);
    const mode = getNativeMode(job.device, prompt);
    const block = extractLatestCommandBlock(output, command);
    const complete = outputLooksComplete(block, command);

    jobDebug(
      job,
      "native-check command=" +
        JSON.stringify(command) +
        " prompt=" +
        JSON.stringify(prompt) +
        " mode=" +
        JSON.stringify(mode) +
        " blockLen=" +
        String(block.length) +
        " complete=" +
        String(complete) +
        " blockTail=" +
        JSON.stringify(block.slice(-300)),
    );

    if (!complete) {
      execLog(
        "JOB NATIVE INCOMPLETE id=" +
          job.id +
          " device=" +
          job.device +
          " command=" +
          command +
          " prompt=" +
          prompt +
          " blockTail=" +
          block.slice(-300),
      );
      return false;
    }

    execLog(
      "JOB FORCE COMPLETE FROM NATIVE TERMINAL id=" +
        job.id +
        " device=" +
        job.device +
```

## deployed relevant
```js
1768-}
1769-    function lastNonEmptyLine(value) {
1770-        var lines = normalizeEol(value)
1771-            .split("\n")
1772-            .map(function (line) { return line.trim(); })
1773-            .filter(Boolean);
1774-        return lines.length > 0 ? lines[lines.length - 1] : "";
1775-}
1776-    function lineContainsCommandEcho(line, command) {
1777-        var rawLine = String(line !== null && line !== void 0 ? line : "").trim();
1778-        var rawCommand = String(command !== null && command !== void 0 ? command : "").trim();
1779-        if (!rawLine || !rawCommand)
1780-            return false;
1781-        var lowerLine = rawLine.toLowerCase();
1782-        var lowerCommand = rawCommand.toLowerCase();
1783-        if (lowerLine === lowerCommand) {
1784-            return true;
1785-}
1786-        // Packet Tracer suele dejar el eco como:
1787-        //   SW-SRV-DIST>show version
1788-        //   Router#show ip interface brief
1789-        //   Switch(config)#interface vlan 10
1790-        var promptEchoPattern = new RegExp("^[A-Za-z0-9._-]+(?:\\(config[^)]*\\))?[>#]\\s*" +
1791-            rawCommand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
1792-            "\\s*$", "i");
1793-        return promptEchoPattern.test(rawLine);
1794-}
1795-    function isPagerOnlyLine(line) {
1796-        return /^--More--$/i.test(String(line !== null && line !== void 0 ? line : "").trim());
1797-}
1798:    function outputLooksComplete(output, command) {
1799-        var text = normalizeEol(output);
1800-        var cmd = String(command !== null && command !== void 0 ? command : "").trim();
1801-        if (!text.trim())
1802-            return false;
1803-        var lines = text
1804-            .split("\n")
1805-            .map(function (line) { return line.trim(); })
1806-            .filter(Boolean);
1807-        var hasPromptAtEnd = isIosPrompt(lastNonEmptyLine(text));
1808-        if (!hasPromptAtEnd) {
1809-            return false;
1810-}
1811-        var hasCommandEcho = cmd.length === 0 || lines.some(function (line) { return lineContainsCommandEcho(line, cmd); });
1812-        var hasMeaningfulBody = lines.some(function (line) {
1813-            if (!line)
1814-                return false;
1815-            if (lineContainsCommandEcho(line, cmd))
1816-                return false;
1817-            if (isIosPrompt(line))
1818-                return false;
1819-            if (isPagerOnlyLine(line))
1820-                return false;
1821-            return true;
1822-        });
1823-        return hasCommandEcho && hasMeaningfulBody;
1824-}
1825-    function getNativeTerminalForDevice(device) {
1826-        try {
1827-            var resolvedIpc = resolvePacketTracerIpc();
1828-            var net = resolvedIpc && typeof resolvedIpc.network === "function" ? resolvedIpc.network() : null;
1829-            var dev = net && typeof net.getDevice === "function" ? net.getDevice(device) : null;
1830-            if (!dev)
1831-                return null;
1832-            try {
1833-                if (typeof dev.getCommandLine === "function") {
1834-                    var term = dev.getCommandLine();
1835-                    if (term)
1836-                        return term;
1837-}
1838-}
1839-            catch (_a) { }
1840-            try {
1841-                if (typeof dev.getConsole === "function" &&
1842-                    dev.getConsole() &&
1843-                    typeof dev.getConsole().getTerminalLine === "function") {
1844-                    var term = dev.getConsole().getTerminalLine();
1845-                    if (term)
1846-                        return term;
1847-}
1848-}
1849-            catch (_b) { }
1850-            return null;
1851-}
1852-        catch (_c) {
1853-            return null;
1854-}
1855-}
1856-    function readNativeTerminalOutput(device) {
1857-        var term = getNativeTerminalForDevice(device);
1858-        if (!term)
1859-            return "";
1860-        return readTerminalTextSafe(term);
1861-}
1862-    function getNativePrompt(device, output) {
1863-        try {
1864-            var term = getNativeTerminalForDevice(device);
1865-            if (term && typeof term.getPrompt === "function") {
1866-                var prompt = String(term.getPrompt() || "").trim();
1867-                if (prompt)
1868-                    return prompt;
1869-}
1870-}
1871-        catch (_a) { }
1872-        return inferPromptFromTerminalText(output);
1873-}
1874-    function getNativeMode(device, prompt) {
1875-        try {
1876-            var term = getNativeTerminalForDevice(device);
1877-            if (term && typeof term.getMode === "function") {
1878-                var raw = String(term.getMode() || "").trim().toLowerCase();
1879-                if (raw === "user")
1880-                    return "user-exec";
1881-                if (raw === "enable" || raw === "privileged" || raw === "privileged-exec")
1882-                    return "privileged-exec";
1883-                if (raw === "global" || raw === "config" || raw === "global-config")
1884-                    return "global-config";
1885-                if (raw === "logout")
1886-                    return "logout";
1887-}
1888-}
1889-        catch (_a) { }
1890-        return inferModeFromPrompt(prompt);
1891-}
1892-    function outputHasPager(output) {
1893-        return /--More--|More:|Press any key to continue/i.test(String(output || "").slice(-1000));
1894-}
1895-    function shouldTryNativeFallback(job, now) {
1896-        var ctx = job.context;
1897-        if (!job || ctx.finished === true || ctx.phase === "completed" || ctx.phase === "error") {
1898-            return false;
1899-}
1900-        var waitingPhase = ctx.phase === "waiting-command" ||
1901-            ctx.phase === "waiting-ensure-mode";
1902-        if (!waitingPhase) {
1903-            return false;
1904-}
1905-        if (ctx.waitingForCommandEnd !== true) {
1906-            return false;
1907-}
1908-        var ageMs = now - Number(ctx.updatedAt || ctx.startedAt || now);
1909-        return ageMs > 750;
1910-}
1911-    function tickNativeFallback(job, reason) {
1912-        var now = Date.now();
1913-        jobDebug(job, "native-tick reason=" +
1914-            reason +
1915-            " phase=" +
1916-            String(job.context.phase) +
1917-            " waiting=" +
1918-            String(job.context.waitingForCommandEnd) +
1929-}
1930-    function jobDebug(job, message) {
1931-        try {
1932-            var ctx = job.context;
1933-            if (!ctx.debug) {
1934-                ctx.debug = [];
1935-}
1936-            ctx.debug.push(Date.now() + " " + message);
1937-            if (ctx.debug.length > 100) {
1938-                ctx.debug.splice(0, ctx.debug.length - 100);
1939-}
1940-}
1941-        catch (_a) { }
1942-        try {
1943-            execLog("JOB DEBUG id=" + job.id + " " + message);
1944-}
1945-        catch (_b) { }
1946-}
1947-    function advanceNativePager(device) {
1948-        try {
1949-            var term = getNativeTerminalForDevice(device);
1950-            if (!term || typeof term.enterChar !== "function")
1951-                return false;
1952-            term.enterChar(32, 0);
1953-            return true;
1954-}
1955-        catch (_a) {
1956-            return false;
1957-}
1958-}
1959:    function extractLatestCommandBlock(output, command) {
1960-        var text = normalizeEol(output);
1961-        var cmd = String(command || "").trim();
1962-        if (!text.trim() || !cmd)
1963-            return text;
1964-        var lines = text.split("\n");
1965-        var startIndex = -1;
1966-        for (var i = lines.length - 1; i >= 0; i -= 1) {
1967-            var line = String(lines[i] || "").trim();
1968-            if (line === cmd || line.endsWith(">" + cmd) || line.endsWith("#" + cmd)) {
1969-                startIndex = i;
1970-                break;
1971-}
1972-}
1973-        if (startIndex === -1) {
1974-            var idx = text.lastIndexOf(cmd);
1975-            if (idx >= 0)
1976-                return text.slice(idx);
1977-            return text;
1978-}
1979-        return lines.slice(startIndex).join("\n");
1980-}
1981-    function forceCompleteFromNativeTerminal(job, reason) {
1982-        var ctx = job.context;
1983-        var step = getCurrentStep(ctx);
1984-        var command = String((step === null || step === void 0 ? void 0 : step.value) || "");
1985-        if (!step || !command)
1986-            return false;
1987-        jobDebug(job, "native-fallback-enter reason=" + reason);
1988-        var output = readNativeTerminalOutput(job.device);
1989-        jobDebug(job, "native-output-len=" + String(output.length));
1990-        if (!output.trim()) {
1991-            jobDebug(job, "native-no-output");
1992-            return false;
1993-}
1994-        if (outputHasPager(output)) {
1995-            var advanced = advanceNativePager(job.device);
1996-            execLog("JOB NATIVE PAGER id=" +
1997-                job.id +
1998-                " device=" +
1999-                job.device +
2000-                " advanced=" +
2001-                advanced);
2002-            ctx.updatedAt = Date.now();
2003-            return false;
2004-}
2005-        var prompt = getNativePrompt(job.device, output);
2006-        var mode = getNativeMode(job.device, prompt);
2007-        var block = extractLatestCommandBlock(output, command);
2008-        var complete = outputLooksComplete(block, command);
2009-        jobDebug(job, "native-check command=" +
2010-            JSON.stringify(command) +
2011-            " prompt=" +
2012-            JSON.stringify(prompt) +
2013-            " mode=" +
2014-            JSON.stringify(mode) +
2015-            " blockLen=" +
2016-            String(block.length) +
2017-            " complete=" +
2018-            String(complete) +
2019-            " blockTail=" +
2020-            JSON.stringify(block.slice(-300)));
2021-        if (!complete) {
2022-            execLog("JOB NATIVE INCOMPLETE id=" +
2023-                job.id +
2024-                " device=" +
2025-                job.device +
2026-                " command=" +
2027-                command +
2028-                " prompt=" +
2029-                prompt +
2030-                " blockTail=" +
2031-                block.slice(-300));
2032-            return false;
2033-}
2034-        execLog("JOB FORCE COMPLETE FROM NATIVE TERMINAL id=" +
2035-            job.id +
2036-            " device=" +
2037-            job.device +
2038-            " reason=" +
2039-            reason +
2040-            " prompt=" +
2041-            prompt +
2042-            " mode=" +
2043-            mode +
2044-            " blockLen=" +
2045-            block.length);
2046-        job.pendingCommand = null;
2047-        ctx.waitingForCommandEnd = false;
2048-        ctx.outputBuffer += block;
2049-        ctx.lastPrompt = prompt;
2050-        ctx.lastMode = mode;
2051-        ctx.paged = false;
2052-        ctx.stepResults.push({
2053-            stepIndex: ctx.currentStep,
2054-            stepType: step.type,
2055-            command: command,
2056-            raw: block,
2057-            status: 0,
2058-            completedAt: Date.now(),
2059-        });
2060-        ctx.currentStep++;
2061-        ctx.error = null;
2062-        ctx.errorCode = null;
2063-        ctx.updatedAt = Date.now();
2064-        var terminalResult = {
2065-            ok: true,
2066-            output: block,
2067-            status: 0,
2068-            session: {
2069-                mode: mode,
2070-                prompt: prompt,
2071-                paging: false,
2072-                awaitingConfirm: false,
2073-            },
2074-            mode: mode,
2075-};
2076-        if (!completeJobIfLastStep(job, terminalResult)) {
2077-            ctx.phase = "pending";
2078-            advanceJob(job.id);
2079-}
1951-                return false;
1952-            term.enterChar(32, 0);
1953-            return true;
1954-}
1955-        catch (_a) {
1956-            return false;
1957-}
1958-}
1959-    function extractLatestCommandBlock(output, command) {
1960-        var text = normalizeEol(output);
1961-        var cmd = String(command || "").trim();
1962-        if (!text.trim() || !cmd)
1963-            return text;
1964-        var lines = text.split("\n");
1965-        var startIndex = -1;
1966-        for (var i = lines.length - 1; i >= 0; i -= 1) {
1967-            var line = String(lines[i] || "").trim();
1968-            if (line === cmd || line.endsWith(">" + cmd) || line.endsWith("#" + cmd)) {
1969-                startIndex = i;
1970-                break;
1971-}
1972-}
1973-        if (startIndex === -1) {
1974-            var idx = text.lastIndexOf(cmd);
1975-            if (idx >= 0)
1976-                return text.slice(idx);
1977-            return text;
1978-}
1979-        return lines.slice(startIndex).join("\n");
1980-}
1981:    function forceCompleteFromNativeTerminal(job, reason) {
1982-        var ctx = job.context;
1983-        var step = getCurrentStep(ctx);
1984-        var command = String((step === null || step === void 0 ? void 0 : step.value) || "");
1985-        if (!step || !command)
1986-            return false;
1987-        jobDebug(job, "native-fallback-enter reason=" + reason);
1988-        var output = readNativeTerminalOutput(job.device);
1989-        jobDebug(job, "native-output-len=" + String(output.length));
1990-        if (!output.trim()) {
1991-            jobDebug(job, "native-no-output");
1992-            return false;
1993-}
1994-        if (outputHasPager(output)) {
1995-            var advanced = advanceNativePager(job.device);
1996-            execLog("JOB NATIVE PAGER id=" +
1997-                job.id +
1998-                " device=" +
1999-                job.device +
2000-                " advanced=" +
2001-                advanced);
2002-            ctx.updatedAt = Date.now();
2003-            return false;
2004-}
2005-        var prompt = getNativePrompt(job.device, output);
2006-        var mode = getNativeMode(job.device, prompt);
2007-        var block = extractLatestCommandBlock(output, command);
2008-        var complete = outputLooksComplete(block, command);
2009-        jobDebug(job, "native-check command=" +
2010-            JSON.stringify(command) +
2011-            " prompt=" +
2012-            JSON.stringify(prompt) +
2013-            " mode=" +
2014-            JSON.stringify(mode) +
2015-            " blockLen=" +
2016-            String(block.length) +
2017-            " complete=" +
2018-            String(complete) +
2019-            " blockTail=" +
2020-            JSON.stringify(block.slice(-300)));
2021-        if (!complete) {
2022-            execLog("JOB NATIVE INCOMPLETE id=" +
2023-                job.id +
2024-                " device=" +
2025-                job.device +
2026-                " command=" +
2027-                command +
2028-                " prompt=" +
2029-                prompt +
2030-                " blockTail=" +
2031-                block.slice(-300));
2032-            return false;
2033-}
2034-        execLog("JOB FORCE COMPLETE FROM NATIVE TERMINAL id=" +
2035-            job.id +
2036-            " device=" +
2037-            job.device +
2038-            " reason=" +
2039-            reason +
2040-            " prompt=" +
2041-            prompt +
2042-            " mode=" +
2043-            mode +
2044-            " blockLen=" +
2045-            block.length);
2046-        job.pendingCommand = null;
2047-        ctx.waitingForCommandEnd = false;
2048-        ctx.outputBuffer += block;
2049-        ctx.lastPrompt = prompt;
2050-        ctx.lastMode = mode;
2051-        ctx.paged = false;
2052-        ctx.stepResults.push({
2053-            stepIndex: ctx.currentStep,
2054-            stepType: step.type,
2055-            command: command,
2056-            raw: block,
2057-            status: 0,
2058-            completedAt: Date.now(),
2059-        });
2060-        ctx.currentStep++;
2061-        ctx.error = null;
2062-        ctx.errorCode = null;
2063-        ctx.updatedAt = Date.now();
2064-        var terminalResult = {
2065-            ok: true,
2066-            output: block,
2067-            status: 0,
2068-            session: {
2069-                mode: mode,
2070-                prompt: prompt,
2071-                paging: false,
2072-                awaitingConfirm: false,
2073-            },
2074-            mode: mode,
2075-};
2076-        if (!completeJobIfLastStep(job, terminalResult)) {
2077-            ctx.phase = "pending";
2078-            advanceJob(job.id);
2079-}
2080-        return true;
2081-}
2082-    function reapStaleJobs() {
2083-        var _a, _b;
2084-        execLog("REAP STALE JOBS tick");
2085-        var now = Date.now();
2086-        for (var key in jobs) {
2087-            var job = jobs[key];
2088-            if (!job || job.context.finished || job.context.phase === "completed" || job.context.phase === "error") {
2089-                continue;
2090-}
2091-            var completedFromNative = tickNativeFallback(job, "reapStaleJobs");
2092-            if (completedFromNative) {
2093-                continue;
2094-}
2095-            if (job.pendingCommand === null) {
2096-                continue;
2097-}
2098-            var elapsedMs = now - job.context.updatedAt;
2099-            var withinTimeout = elapsedMs <= getJobTimeoutMs(job);
2100-            var waitingForCommandEnd = job.context.waitingForCommandEnd === true;
2101-            var waitingPhase = job.context.phase === "waiting-command" ||
2102-                job.context.phase === "waiting-ensure-mode";
2103-            if (waitingForCommandEnd && waitingPhase && elapsedMs > 500) {
2104-                try {
2105-                    var completedFromNative_1 = forceCompleteFromNativeTerminal(job, "reapStaleJobs elapsedMs=" + elapsedMs);
2106-                    if (completedFromNative_1) {
2107-                        continue;
2108-}
2109-}
2110-                catch (error) {
2111-                    execLog("JOB NATIVE FALLBACK ERROR id=" +
2112-                        job.id +
2113-                        " device=" +
2114-                        job.device +
2115-                        " error=" +
2116-                        String(error));
2117-}
2118-}
2119-            if (withinTimeout) {
2120-                var output = String((_a = job.context.outputBuffer) !== null && _a !== void 0 ? _a : "");
2121-                var lastPrompt = String((_b = job.context.lastPrompt) !== null && _b !== void 0 ? _b : "");
```

## live terminal forensic via omni raw
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "var d = ipc.network().getDevice(\"SW-SRV-DIST\");" "var t = d && d.getCommandLine ? d.getCommandLine() : null;"  "function safe(name) {" "  try {" "    if (t && typeof t[name] === \"function\") return String(t[name]());" "    return \"<no-method>\";" "  } catch (e) {" "    return \"<err:\" + String(e) + \">\";" "  }" "}"  "function normalizeEol(v) {" "  return String(v == null ? \"\" : v).split(\"\\r\\n\").join(\"\\n\").split(\"\\r\").join(\"\\n\");" "}"  "function trimLine(v) {" "  return String(v == null ? \"\" : v).replace(/^[ \\t]+/, \"\").replace(/[ \\t]+\$/, \"\");" "}"  "function isIosPrompt(v) {" "  var line = trimLine(v);" "  if (!line) return false;" "  if (line.indexOf(\"--More--\") >= 0) return false;" "  if (line.indexOf(\" \") >= 0) return false;" "  var last = line.charAt(line.length - 1);" "  return last === \">\" || last === \"#\";" "}"  "function lastNonEmptyLine(v) {" "  var lines = normalizeEol(v).split(\"\\n\");" "  for (var i = lines.length - 1; i >= 0; i--) {" "    var s = trimLine(lines[i]);" "    if (s) return s;" "  }" "  return \"\";" "}"  "function escapeRegex(s) {" "  return String(s).replace(/[.*+?^\${}()|[\\]\\]/g, \"\\\$&\");" "}"  "function lineContainsCommandEcho(line, command) {" "  var rawLine = trimLine(line);" "  var rawCommand = trimLine(command);" "  if (!rawLine || !rawCommand) return false;" "  if (rawLine.toLowerCase() === rawCommand.toLowerCase()) return true;" "  var promptEchoPattern = new RegExp(\"^[A-Za-z0-9._-]+(?:\\(config[^)]*\\))?[>#]\\s*\" + escapeRegex(rawCommand) + \"\\s*\$\", \"i\");" "  return promptEchoPattern.test(rawLine);" "}"  "function isPagerOnlyLine(line) {" "  return trimLine(line).toLowerCase() === \"--more--\";" "}"  "function outputLooksCompleteProbe(output, command) {" "  var text = normalizeEol(output);" "  var cmd = trimLine(command);" "  var lines = text.split(\"\\n\").map(trimLine).filter(function(x) { return !!x; });" "  var lastLine = lastNonEmptyLine(text);" "  var echoLines = [];" "  var promptLines = [];" "  var bodyLines = [];" "  for (var i = 0; i < lines.length; i++) {" "    var line = lines[i];" "    var isEcho = lineContainsCommandEcho(line, cmd);" "    var isPrompt = isIosPrompt(line);" "    var isPager = isPagerOnlyLine(line);" "    if (isEcho) echoLines.push({ index: i, line: line });" "    if (isPrompt) promptLines.push({ index: i, line: line });" "    if (line && !isEcho && !isPrompt && !isPager) bodyLines.push({ index: i, line: line });" "  }" "  var hasPromptAtEnd = isIosPrompt(lastLine);" "  var hasCommandEcho = cmd.length === 0 || echoLines.length > 0;" "  var hasMeaningfulBody = bodyLines.length > 0;" "  return {" "    lineCount: lines.length," "    lastLine: lastLine," "    hasPromptAtEnd: hasPromptAtEnd," "    hasCommandEcho: hasCommandEcho," "    hasMeaningfulBody: hasMeaningfulBody," "    complete: hasCommandEcho && hasMeaningfulBody && hasPromptAtEnd," "    echoLines: echoLines.slice(0, 10)," "    promptLines: promptLines.slice(-10)," "    bodyFirst: bodyLines.slice(0, 8)," "    bodyLast: bodyLines.slice(-8)," "    firstLines: lines.slice(0, 20)," "    lastLines: lines.slice(-20)" "  };" "}"  "function extractLatestCommandBlockProbe(output, command) {" "  var text = normalizeEol(output);" "  var cmd = trimLine(command).toLowerCase();" "  var lines = text.split(\"\\n\");" "  if (!cmd) return { startIndex: -1, totalLines: lines.length, block: text, probe: outputLooksCompleteProbe(text, command) };" "  var startIndex = -1;" "  for (var i = lines.length - 1; i >= 0; i--) {" "    var line = trimLine(lines[i]);" "    var lower = line.toLowerCase();" "    if (lower === cmd || lower.indexOf(\">\" + cmd) >= 0 || lower.indexOf(\"#\" + cmd) >= 0) {" "      startIndex = i;" "      break;" "    }" "  }" "  var block = startIndex >= 0 ? lines.slice(startIndex).join(\"\\n\") : text;" "  return {" "    startIndex: startIndex," "    totalLines: lines.length," "    startLine: startIndex >= 0 ? trimLine(lines[startIndex]) : null," "    blockLen: block.length," "    blockFirst1000: block.slice(0, 1000)," "    blockLast1000: block.slice(-1000)," "    probe: outputLooksCompleteProbe(block, command)" "  };" "}"  "var output = safe(\"getOutput\");" "var allOutput = safe(\"getAllOutput\");" "var buffer = safe(\"getBuffer\");" "var text = safe(\"getText\");"  "return JSON.stringify({" "  prompt: safe(\"getPrompt\")," "  mode: safe(\"getMode\")," "  input: safe(\"getCommandInput\")," "  candidates: {" "    getOutput: { len: output.length, tail: output.slice(-800) }," "    getAllOutput: { len: allOutput.length, tail: allOutput.slice(-800) }," "    getBuffer: { len: buffer.length, tail: buffer.slice(-800) }," "    getText: { len: text.length, tail: text.slice(-800) }" "  }," "  extraction: extractLatestCommandBlockProbe(output, \"show version\")" "});"
$ bun run src/index.ts omni raw --wrap --yes --json -- "var d = ipc.network().getDevice(\"SW-SRV-DIST\");" "var t = d && d.getCommandLine ? d.getCommandLine() : null;" "function safe(name) {" "  try {" "    if (t && typeof t[name] === \"function\") return String(t[name]());" "    return \"<no-method>\";" "  } catch (e) {" "    return \"<err:\" + String(e) + \">\";" "  }" "}" "function normalizeEol(v) {" "  return String(v == null ? \"\" : v).split(\"\\r\\n\").join(\"\\n\").split(\"\\r\").join(\"\\n\");" "}" "function trimLine(v) {" "  return String(v == null ? \"\" : v).replace(/^[ \\t]+/, \"\").replace(/[ \\t]+\$/, \"\");" "}" "function isIosPrompt(v) {" "  var line = trimLine(v);" "  if (!line) return false;" "  if (line.indexOf(\"--More--\") >= 0) return false;" "  if (line.indexOf(\" \") >= 0) return false;" "  var last = line.charAt(line.length - 1);" "  return last === \">\" || last === \"#\";" "}" "function lastNonEmptyLine(v) {" "  var lines = normalizeEol(v).split(\"\\n\");" "  for (var i = lines.length - 1; i >= 0; i--) {" "    var s = trimLine(lines[i]);" "    if (s) return s;" "  }" "  return \"\";" "}" "function escapeRegex(s) {" "  return String(s).replace(/[.*+?^\${}()|[\\]\\]/g, \"\\\$&\");" "}" "function lineContainsCommandEcho(line, command) {" "  var rawLine = trimLine(line);" "  var rawCommand = trimLine(command);" "  if (!rawLine || !rawCommand) return false;" "  if (rawLine.toLowerCase() === rawCommand.toLowerCase()) return true;" "  var promptEchoPattern = new RegExp(\"^[A-Za-z0-9._-]+(?:\\(config[^)]*\\))?[>#]\\s*\" + escapeRegex(rawCommand) + \"\\s*\$\", \"i\");" "  return promptEchoPattern.test(rawLine);" "}" "function isPagerOnlyLine(line) {" "  return trimLine(line).toLowerCase() === \"--more--\";" "}" "function outputLooksCompleteProbe(output, command) {" "  var text = normalizeEol(output);" "  var cmd = trimLine(command);" "  var lines = text.split(\"\\n\").map(trimLine).filter(function(x) { return !!x; });" "  var lastLine = lastNonEmptyLine(text);" "  var echoLines = [];" "  var promptLines = [];" "  var bodyLines = [];" "  for (var i = 0; i < lines.length; i++) {" "    var line = lines[i];" "    var isEcho = lineContainsCommandEcho(line, cmd);" "    var isPrompt = isIosPrompt(line);" "    var isPager = isPagerOnlyLine(line);" "    if (isEcho) echoLines.push({ index: i, line: line });" "    if (isPrompt) promptLines.push({ index: i, line: line });" "    if (line && !isEcho && !isPrompt && !isPager) bodyLines.push({ index: i, line: line });" "  }" "  var hasPromptAtEnd = isIosPrompt(lastLine);" "  var hasCommandEcho = cmd.length === 0 || echoLines.length > 0;" "  var hasMeaningfulBody = bodyLines.length > 0;" "  return {" "    lineCount: lines.length," "    lastLine: lastLine," "    hasPromptAtEnd: hasPromptAtEnd," "    hasCommandEcho: hasCommandEcho," "    hasMeaningfulBody: hasMeaningfulBody," "    complete: hasCommandEcho && hasMeaningfulBody && hasPromptAtEnd," "    echoLines: echoLines.slice(0, 10)," "    promptLines: promptLines.slice(-10)," "    bodyFirst: bodyLines.slice(0, 8)," "    bodyLast: bodyLines.slice(-8)," "    firstLines: lines.slice(0, 20)," "    lastLines: lines.slice(-20)" "  };" "}" "function extractLatestCommandBlockProbe(output, command) {" "  var text = normalizeEol(output);" "  var cmd = trimLine(command).toLowerCase();" "  var lines = text.split(\"\\n\");" "  if (!cmd) return { startIndex: -1, totalLines: lines.length, block: text, probe: outputLooksCompleteProbe(text, command) };" "  var startIndex = -1;" "  for (var i = lines.length - 1; i >= 0; i--) {" "    var line = trimLine(lines[i]);" "    var lower = line.toLowerCase();" "    if (lower === cmd || lower.indexOf(\">\" + cmd) >= 0 || lower.indexOf(\"#\" + cmd) >= 0) {" "      startIndex = i;" "      break;" "    }" "  }" "  var block = startIndex >= 0 ? lines.slice(startIndex).join(\"\\n\") : text;" "  return {" "    startIndex: startIndex," "    totalLines: lines.length," "    startLine: startIndex >= 0 ? trimLine(lines[startIndex]) : null," "    blockLen: block.length," "    blockFirst1000: block.slice(0, 1000)," "    blockLast1000: block.slice(-1000)," "    probe: outputLooksCompleteProbe(block, command)" "  };" "}" "var output = safe(\"getOutput\");" "var allOutput = safe(\"getAllOutput\");" "var buffer = safe(\"getBuffer\");" "var text = safe(\"getText\");" "return JSON.stringify({" "  prompt: safe(\"getPrompt\")," "  mode: safe(\"getMode\")," "  input: safe(\"getCommandInput\")," "  candidates: {" "    getOutput: { len: output.length, tail: output.slice(-800) }," "    getAllOutput: { len: allOutput.length, tail: allOutput.slice(-800) }," "    getBuffer: { len: buffer.length, tail: buffer.slice(-800) }," "    getText: { len: text.length, tail: text.slice(-800) }" "  }," "  extraction: extractLatestCommandBlockProbe(output, \"show version\")" "});"
{
  "schemaVersion": "1.0",
  "ok": false,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "error": {
    "code": "EVALUATION_FAILED",
    "message": "EVAL_ERROR: Unterminated regular expression literal"
  },
  "warnings": [
    "Topología virtual aún no materializada; la verificación de estado puede ser incompleta."
  ],
  "confidence": 0,
  "nextSteps": [
    "pt doctor",
    "pt runtime logs"
  ]
}
⏱ pt omni raw · 0.5s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

## latest poll results compact
```

----- /Users/andresgaibor/pt-dev/results/cmd_000000018363.json -----
{
  "id": "cmd_000000018363",
  "seq": 18363,
  "type": "__pollDeferred",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "JOB_TIMEOUT",
    "message": "Job timed out while waiting for terminal command completion",
    "phase": "execution"
  }
}
{
  "done": true,
  "ok": false,
  "status": 1,
  "result": null,
  "error": "Job timed out while waiting for terminal command completion",
  "code": "JOB_TIMEOUT",
  "errorCode": "JOB_TIMEOUT",
  "raw": "",
  "output": "",
  "source": "terminal",
  "session": {
    "mode": "unknown",
    "prompt": "",
    "paging": false,
    "awaitingConfirm": false
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018362.json -----
{
  "id": "cmd_000000018362",
  "seq": 18362,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
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
  "updatedAt": 1777402137105,
  "ageMs": 28600,
  "idleMs": 28600,
  "debug": [
    "1777402164036 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164057 native-fallback-enter reason=reapStaleJobs elapsedMs=26906",
    "1777402164065 native-output-len=5830",
    "1777402164074 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164116 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=27011 idleMs=27011",
    "1777402164124 native-fallback-enter reason=reapStaleJobs",
    "1777402164132 native-output-len=5830",
    "1777402164140 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164160 native-fallback-enter reason=reapStaleJobs elapsedMs=27011",
    "1777402164167 native-output-len=5830",
    "1777402164175 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164217 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=27112 idleMs=27112",
    "1777402164225 native-fallback-enter reason=reapStaleJobs",
    "1777402164237 native-output-len=5830",
    "1777402164245 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164262 native-fallback-enter reason=reapStaleJobs elapsedMs=27112",
    "1777402164270 native-output-len=5830",
    "1777402164279 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164372 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=27267 idleMs=27267",
    "1777402164380 native-fallback-enter reason=getJobState",
    "1777402164389 native-output-len=5830",
    "1777402164397 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164420 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=27315 idleMs=27315",
    "1777402164432 native-fallback-enter reason=reapStaleJobs",
    "1777402164441 native-output-len=5830",
    "1777402164450 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164465 native-fallback-enter reason=reapStaleJobs elapsedMs=27315",
    "1777402164473 native-output-len=5830",
    "1777402164481 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164563 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=27458 idleMs=27458",
    "1777402164572 native-fallback-enter reason=reapStaleJobs",
    "1777402164581 native-output-len=5830",
    "1777402164590 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164604 native-fallback-enter reason=reapStaleJobs elapsedMs=27458",
    "1777402164612 native-output-len=5830",
    "1777402164626 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164667 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=27562 idleMs=27562",
    "1777402164676 native-fallback-enter reason=reapStaleJobs",
    "1777402164684 native-output-len=5830",
    "1777402164692 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164708 native-fallback-enter reason=reapStaleJobs elapsedMs=27562",
    "1777402164721 native-output-len=5830",
    "1777402164730 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164772 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=27667 idleMs=27667",
    "1777402164779 native-fallback-enter reason=reapStaleJobs",
    "1777402164787 native-output-len=5830",
    "1777402164795 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo

----- /Users/andresgaibor/pt-dev/results/cmd_000000018361.json -----
{
  "id": "cmd_000000018361",
  "seq": 18361,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
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
  "updatedAt": 1777402137105,
  "ageMs": 28049,
  "idleMs": 28049,
  "debug": [
    "1777402163477 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163492 native-fallback-enter reason=reapStaleJobs elapsedMs=26340",
    "1777402163500 native-output-len=5830",
    "1777402163508 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163558 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=26453 idleMs=26453",
    "1777402163566 native-fallback-enter reason=reapStaleJobs",
    "1777402163578 native-output-len=5830",
    "1777402163586 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163601 native-fallback-enter reason=reapStaleJobs elapsedMs=26453",
    "1777402163613 native-output-len=5830",
    "1777402163621 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163711 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=26606 idleMs=26606",
    "1777402163718 native-fallback-enter reason=getJobState",
    "1777402163726 native-output-len=5830",
    "1777402163734 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163758 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=26653 idleMs=26653",
    "1777402163765 native-fallback-enter reason=reapStaleJobs",
    "1777402163778 native-output-len=5830",
    "1777402163787 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163801 native-fallback-enter reason=reapStaleJobs elapsedMs=26653",
    "1777402163810 native-output-len=5830",
    "1777402163819 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163904 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=26799 idleMs=26799",
    "1777402163911 native-fallback-enter reason=reapStaleJobs",
    "1777402163919 native-output-len=5830",
    "1777402163928 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163943 native-fallback-enter reason=reapStaleJobs elapsedMs=26799",
    "1777402163951 native-output-len=5830",
    "1777402163965 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164011 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=26906 idleMs=26906",
    "1777402164019 native-fallback-enter reason=reapStaleJobs",
    "1777402164027 native-output-len=5830",
    "1777402164036 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164057 native-fallback-enter reason=reapStaleJobs elapsedMs=26906",
    "1777402164065 native-output-len=5830",
    "1777402164074 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164116 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=27011 idleMs=27011",
    "1777402164124 native-fallback-enter reason=reapStaleJobs",
    "1777402164132 native-output-len=5830",
    "1777402164140 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164160 native-fallback-enter reason=reapStaleJobs elapsedMs=27011",
    "1777402164167 native-output-len=5830",
    "1777402164175 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164217 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=27112 idleMs=27112",
    "1777402164225 native-fallback-enter reason=reapStaleJobs",
    "1777402164237 native-output-len=5830",
    "1777402164245 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo

----- /Users/andresgaibor/pt-dev/results/cmd_000000018360.json -----
{
  "id": "cmd_000000018360",
  "seq": 18360,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
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
  "updatedAt": 1777402137105,
  "ageMs": 27392,
  "idleMs": 27392,
  "debug": [
    "1777402162679 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162697 native-fallback-enter reason=reapStaleJobs elapsedMs=25545",
    "1777402162705 native-output-len=5830",
    "1777402162719 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162768 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=25663 idleMs=25663",
    "1777402162777 native-fallback-enter reason=reapStaleJobs",
    "1777402162786 native-output-len=5830",
    "1777402162795 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162816 native-fallback-enter reason=reapStaleJobs elapsedMs=25663",
    "1777402162825 native-output-len=5830",
    "1777402162835 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162884 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=25779 idleMs=25779",
    "1777402162897 native-fallback-enter reason=reapStaleJobs",
    "1777402162905 native-output-len=5830",
    "1777402162915 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162937 native-fallback-enter reason=reapStaleJobs elapsedMs=25779",
    "1777402162947 native-output-len=5830",
    "1777402162959 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163082 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=25977 idleMs=25977",
    "1777402163094 native-fallback-enter reason=getJobState",
    "1777402163105 native-output-len=5830",
    "1777402163123 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163157 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=26052 idleMs=26052",
    "1777402163171 native-fallback-enter reason=reapStaleJobs",
    "1777402163181 native-output-len=5830",
    "1777402163192 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163216 native-fallback-enter reason=reapStaleJobs elapsedMs=26052",
    "1777402163226 native-output-len=5830",
    "1777402163237 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163325 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=26220 idleMs=26220",
    "1777402163334 native-fallback-enter reason=reapStaleJobs",
    "1777402163347 native-output-len=5830",
    "1777402163356 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163373 native-fallback-enter reason=reapStaleJobs elapsedMs=26220",
    "1777402163386 native-output-len=5830",
    "1777402163396 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163445 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=26340 idleMs=26340",
    "1777402163454 native-fallback-enter reason=reapStaleJobs",
    "1777402163467 native-output-len=5830",
    "1777402163477 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163492 native-fallback-enter reason=reapStaleJobs elapsedMs=26340",
    "1777402163500 native-output-len=5830",
    "1777402163508 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163558 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=26453 idleMs=26453",
    "1777402163566 native-fallback-enter reason=reapStaleJobs",
    "1777402163578 native-output-len=5830",
    "1777402163586 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo

----- /Users/andresgaibor/pt-dev/results/cmd_000000018359.json -----
{
  "id": "cmd_000000018359",
  "seq": 18359,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
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
  "updatedAt": 1777402137105,
  "ageMs": 26730,
  "idleMs": 26730,
  "debug": [
    "1777402161958 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161974 native-fallback-enter reason=reapStaleJobs elapsedMs=24823",
    "1777402161987 native-output-len=5830",
    "1777402161995 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162044 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=24939 idleMs=24939",
    "1777402162052 native-fallback-enter reason=reapStaleJobs",
    "1777402162066 native-output-len=5830",
    "1777402162075 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162092 native-fallback-enter reason=reapStaleJobs elapsedMs=24939",
    "1777402162101 native-output-len=5830",
    "1777402162110 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162158 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=25053 idleMs=25053",
    "1777402162166 native-fallback-enter reason=reapStaleJobs",
    "1777402162179 native-output-len=5830",
    "1777402162188 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162203 native-fallback-enter reason=reapStaleJobs elapsedMs=25053",
    "1777402162214 native-output-len=5830",
    "1777402162223 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162269 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=25164 idleMs=25164",
    "1777402162277 native-fallback-enter reason=reapStaleJobs",
    "1777402162291 native-output-len=5830",
    "1777402162299 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162316 native-fallback-enter reason=reapStaleJobs elapsedMs=25164",
    "1777402162329 native-output-len=5830",
    "1777402162338 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162438 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=25333 idleMs=25333",
    "1777402162445 native-fallback-enter reason=getJobState",
    "1777402162454 native-output-len=5830",
    "1777402162462 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162492 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=25387 idleMs=25387",
    "1777402162501 native-fallback-enter reason=reapStaleJobs",
    "1777402162514 native-output-len=5830",
    "1777402162523 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162540 native-fallback-enter reason=reapStaleJobs elapsedMs=25387",
    "1777402162554 native-output-len=5830",
    "1777402162563 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162650 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=25545 idleMs=25545",
    "1777402162659 native-fallback-enter reason=reapStaleJobs",
    "1777402162667 native-output-len=5830",
    "1777402162679 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162697 native-fallback-enter reason=reapStaleJobs elapsedMs=25545",
    "1777402162705 native-output-len=5830",
    "1777402162719 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162768 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=25663 idleMs=25663",
    "1777402162777 native-fallback-enter reason=reapStaleJobs",
    "1777402162786 native-output-len=5830",
    "1777402162795 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo

----- /Users/andresgaibor/pt-dev/results/cmd_000000018358.json -----
{
  "id": "cmd_000000018358",
  "seq": 18358,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
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
  "updatedAt": 1777402137105,
  "ageMs": 26154,
  "idleMs": 26154,
  "debug": [
    "1777402161375 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161392 native-fallback-enter reason=reapStaleJobs elapsedMs=24239",
    "1777402161400 native-output-len=5830",
    "1777402161414 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161458 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=24353 idleMs=24353",
    "1777402161465 native-fallback-enter reason=reapStaleJobs",
    "1777402161474 native-output-len=5830",
    "1777402161482 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161503 native-fallback-enter reason=reapStaleJobs elapsedMs=24353",
    "1777402161513 native-output-len=5830",
    "1777402161521 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161566 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=24461 idleMs=24461",
    "1777402161578 native-fallback-enter reason=reapStaleJobs",
    "1777402161587 native-output-len=5830",
    "1777402161595 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161615 native-fallback-enter reason=reapStaleJobs elapsedMs=24461",
    "1777402161622 native-output-len=5830",
    "1777402161632 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161728 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=24623 idleMs=24623",
    "1777402161736 native-fallback-enter reason=getJobState",
    "1777402161745 native-output-len=5830",
    "1777402161758 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161782 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=24677 idleMs=24677",
    "1777402161793 native-fallback-enter reason=reapStaleJobs",
    "1777402161801 native-output-len=5830",
    "1777402161811 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161830 native-fallback-enter reason=reapStaleJobs elapsedMs=24677",
    "1777402161838 native-output-len=5830",
    "1777402161847 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161928 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=24823 idleMs=24823",
    "1777402161937 native-fallback-enter reason=reapStaleJobs",
    "1777402161949 native-output-len=5830",
    "1777402161958 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161974 native-fallback-enter reason=reapStaleJobs elapsedMs=24823",
    "1777402161987 native-output-len=5830",
    "1777402161995 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162044 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=24939 idleMs=24939",
    "1777402162052 native-fallback-enter reason=reapStaleJobs",
    "1777402162066 native-output-len=5830",
    "1777402162075 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162092 native-fallback-enter reason=reapStaleJobs elapsedMs=24939",
    "1777402162101 native-output-len=5830",
    "1777402162110 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162158 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=25053 idleMs=25053",
    "1777402162166 native-fallback-enter reason=reapStaleJobs",
    "1777402162179 native-output-len=5830",
    "1777402162188 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo

----- /Users/andresgaibor/pt-dev/results/cmd_000000018357.json -----
{
  "id": "cmd_000000018357",
  "seq": 18357,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
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
  "updatedAt": 1777402137105,
  "ageMs": 25475,
  "idleMs": 25475,
  "debug": [
    "1777402160773 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160793 native-fallback-enter reason=reapStaleJobs elapsedMs=23643",
    "1777402160801 native-output-len=5830",
    "1777402160809 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160855 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=23750 idleMs=23750",
    "1777402160866 native-fallback-enter reason=reapStaleJobs",
    "1777402160875 native-output-len=5830",
    "1777402160885 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160906 native-fallback-enter reason=reapStaleJobs elapsedMs=23750",
    "1777402160915 native-output-len=5830",
    "1777402160924 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160971 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=23866 idleMs=23866",
    "1777402160979 native-fallback-enter reason=reapStaleJobs",
    "1777402160992 native-output-len=5830",
    "1777402161001 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161018 native-fallback-enter reason=reapStaleJobs elapsedMs=23866",
    "1777402161031 native-output-len=5830",
    "1777402161040 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161137 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=24032 idleMs=24032",
    "1777402161145 native-fallback-enter reason=getJobState",
    "1777402161153 native-output-len=5830",
    "1777402161162 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161189 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=24084 idleMs=24084",
    "1777402161197 native-fallback-enter reason=reapStaleJobs",
    "1777402161210 native-output-len=5830",
    "1777402161219 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161235 native-fallback-enter reason=reapStaleJobs elapsedMs=24084",
    "1777402161248 native-output-len=5830",
    "1777402161256 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161344 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=24239 idleMs=24239",
    "1777402161353 native-fallback-enter reason=reapStaleJobs",
    "1777402161361 native-output-len=5830",
    "1777402161375 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161392 native-fallback-enter reason=reapStaleJobs elapsedMs=24239",
    "1777402161400 native-output-len=5830",
    "1777402161414 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161458 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=24353 idleMs=24353",
    "1777402161465 native-fallback-enter reason=reapStaleJobs",
    "1777402161474 native-output-len=5830",
    "1777402161482 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161503 native-fallback-enter reason=reapStaleJobs elapsedMs=24353",
    "1777402161513 native-output-len=5830",
    "1777402161521 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161566 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=24461 idleMs=24461",
    "1777402161578 native-fallback-enter reason=reapStaleJobs",
    "1777402161587 native-output-len=5830",
    "1777402161595 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo

----- /Users/andresgaibor/pt-dev/results/cmd_000000018356.json -----
{
  "id": "cmd_000000018356",
  "seq": 18356,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
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
  "updatedAt": 1777402137105,
  "ageMs": 24762,
  "idleMs": 24762,
  "debug": [
    "1777402160060 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160077 native-fallback-enter reason=reapStaleJobs elapsedMs=22924",
    "1777402160090 native-output-len=5830",
    "1777402160098 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160145 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=23040 idleMs=23040",
    "1777402160154 native-fallback-enter reason=reapStaleJobs",
    "1777402160167 native-output-len=5830",
    "1777402160175 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160191 native-fallback-enter reason=reapStaleJobs elapsedMs=23040",
    "1777402160204 native-output-len=5830",
    "1777402160212 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160258 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=23153 idleMs=23153",
    "1777402160266 native-fallback-enter reason=reapStaleJobs",
    "1777402160280 native-output-len=5830",
    "1777402160289 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160304 native-fallback-enter reason=reapStaleJobs elapsedMs=23153",
    "1777402160319 native-output-len=5830",
    "1777402160328 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160424 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=23319 idleMs=23319",
    "1777402160431 native-fallback-enter reason=getJobState",
    "1777402160440 native-output-len=5830",
    "1777402160449 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160478 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=23373 idleMs=23373",
    "1777402160486 native-fallback-enter reason=reapStaleJobs",
    "1777402160500 native-output-len=5830",
    "1777402160509 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160526 native-fallback-enter reason=reapStaleJobs elapsedMs=23373",
    "1777402160539 native-output-len=5830",
    "1777402160549 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160635 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=23530 idleMs=23530",
    "1777402160644 native-fallback-enter reason=reapStaleJobs",
    "1777402160652 native-output-len=5830",
    "1777402160665 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160682 native-fallback-enter reason=reapStaleJobs elapsedMs=23530",
    "1777402160690 native-output-len=5830",
    "1777402160703 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160748 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=23643 idleMs=23643",
    "1777402160756 native-fallback-enter reason=reapStaleJobs",
    "1777402160765 native-output-len=5830",
    "1777402160773 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160793 native-fallback-enter reason=reapStaleJobs elapsedMs=23643",
    "1777402160801 native-output-len=5830",
    "1777402160809 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160855 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=23750 idleMs=23750",
    "1777402160866 native-fallback-enter reason=reapStaleJobs",
    "1777402160875 native-output-len=5830",
    "1777402160885 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo

----- /Users/andresgaibor/pt-dev/results/cmd_000000018355.json -----
{
  "id": "cmd_000000018355",
  "seq": 18355,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
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
  "updatedAt": 1777402137105,
  "ageMs": 24168,
  "idleMs": 24168,
  "debug": [
    "1777402159472 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159490 native-fallback-enter reason=reapStaleJobs elapsedMs=22339",
    "1777402159498 native-output-len=5830",
    "1777402159512 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159560 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=22455 idleMs=22455",
    "1777402159568 native-fallback-enter reason=reapStaleJobs",
    "1777402159577 native-output-len=5830",
    "1777402159586 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159606 native-fallback-enter reason=reapStaleJobs elapsedMs=22455",
    "1777402159615 native-output-len=5830",
    "1777402159623 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159667 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=22562 idleMs=22562",
    "1777402159678 native-fallback-enter reason=reapStaleJobs",
    "1777402159686 native-output-len=5830",
    "1777402159695 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159716 native-fallback-enter reason=reapStaleJobs elapsedMs=22562",
    "1777402159723 native-output-len=5830",
    "1777402159732 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159827 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=22722 idleMs=22722",
    "1777402159835 native-fallback-enter reason=getJobState",
    "1777402159842 native-output-len=5830",
    "1777402159856 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159880 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=22775 idleMs=22775",
    "1777402159893 native-fallback-enter reason=reapStaleJobs",
    "1777402159901 native-output-len=5830",
    "1777402159909 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159928 native-fallback-enter reason=reapStaleJobs elapsedMs=22775",
    "1777402159936 native-output-len=5830",
    "1777402159945 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160029 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=22924 idleMs=22924",
    "1777402160038 native-fallback-enter reason=reapStaleJobs",
    "1777402160051 native-output-len=5830",
    "1777402160060 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160077 native-fallback-enter reason=reapStaleJobs elapsedMs=22924",
    "1777402160090 native-output-len=5830",
    "1777402160098 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160145 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=23040 idleMs=23040",
    "1777402160154 native-fallback-enter reason=reapStaleJobs",
    "1777402160167 native-output-len=5830",
    "1777402160175 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160191 native-fallback-enter reason=reapStaleJobs elapsedMs=23040",
    "1777402160204 native-output-len=5830",
    "1777402160212 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160258 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=23153 idleMs=23153",
    "1777402160266 native-fallback-enter reason=reapStaleJobs",
    "1777402160280 native-output-len=5830",
    "1777402160289 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo

----- /Users/andresgaibor/pt-dev/results/cmd_000000018354.json -----
{
  "id": "cmd_000000018354",
  "seq": 18354,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
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
  "updatedAt": 1777402137105,
  "ageMs": 23461,
  "idleMs": 23461,
  "debug": [
    "1777402158772 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158789 native-fallback-enter reason=reapStaleJobs elapsedMs=21637",
    "1777402158801 native-output-len=5830",
    "1777402158809 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158852 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=21747 idleMs=21747",
    "1777402158859 native-fallback-enter reason=reapStaleJobs",
    "1777402158871 native-output-len=5830",
    "1777402158880 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158896 native-fallback-enter reason=reapStaleJobs elapsedMs=21747",
    "1777402158908 native-output-len=5830",
    "1777402158916 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158960 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=21855 idleMs=21855",
    "1777402158969 native-fallback-enter reason=reapStaleJobs",
    "1777402158981 native-output-len=5830",
    "1777402158989 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159005 native-fallback-enter reason=reapStaleJobs elapsedMs=21855",
    "1777402159018 native-output-len=5830",
    "1777402159027 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159081 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=21976 idleMs=21976",
    "1777402159089 native-fallback-enter reason=reapStaleJobs",
    "1777402159102 native-output-len=5830",
    "1777402159110 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159125 native-fallback-enter reason=reapStaleJobs elapsedMs=21976",
    "1777402159138 native-output-len=5830",
    "1777402159147 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159240 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=22135 idleMs=22135",
    "1777402159247 native-fallback-enter reason=getJobState",
    "1777402159255 native-output-len=5830",
    "1777402159263 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159293 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=22188 idleMs=22188",
    "1777402159301 native-fallback-enter reason=reapStaleJobs",
    "1777402159312 native-output-len=5830",
    "1777402159321 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159337 native-fallback-enter reason=reapStaleJobs elapsedMs=22188",
    "1777402159350 native-output-len=5830",
    "1777402159359 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159444 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=22339 idleMs=22339",
    "1777402159452 native-fallback-enter reason=reapStaleJobs",
    "1777402159459 native-output-len=5830",
    "1777402159472 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159490 native-fallback-enter reason=reapStaleJobs elapsedMs=22339",
    "1777402159498 native-output-len=5830",
    "1777402159512 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159560 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=22455 idleMs=22455",
    "1777402159568 native-fallback-enter reason=reapStaleJobs",
    "1777402159577 native-output-len=5830",
    "1777402159586 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo

----- /Users/andresgaibor/pt-dev/results/cmd_000000018353.json -----
{
  "id": "cmd_000000018353",
  "seq": 18353,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
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
  "updatedAt": 1777402137105,
  "ageMs": 22859,
  "idleMs": 22859,
  "debug": [
    "1777402158184 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158200 native-fallback-enter reason=reapStaleJobs elapsedMs=21051",
    "1777402158208 native-output-len=5830",
    "1777402158220 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158265 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=21160 idleMs=21160",
    "1777402158273 native-fallback-enter reason=reapStaleJobs",
    "1777402158282 native-output-len=5830",
    "1777402158291 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158312 native-fallback-enter reason=reapStaleJobs elapsedMs=21160",
    "1777402158321 native-output-len=5830",
    "1777402158330 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158377 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=21272 idleMs=21272",
    "1777402158389 native-fallback-enter reason=reapStaleJobs",
    "1777402158398 native-output-len=5830",
    "1777402158407 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158428 native-fallback-enter reason=reapStaleJobs elapsedMs=21272",
    "1777402158436 native-output-len=5830",
    "1777402158445 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158541 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=21436 idleMs=21436",
    "1777402158549 native-fallback-enter reason=getJobState",
    "1777402158556 native-output-len=5830",
    "1777402158570 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158592 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=21487 idleMs=21487",
    "1777402158605 native-fallback-enter reason=reapStaleJobs",
    "1777402158613 native-output-len=5830",
    "1777402158621 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158642 native-fallback-enter reason=reapStaleJobs elapsedMs=21487",
    "1777402158650 native-output-len=5830",
    "1777402158660 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158742 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=21637 idleMs=21637",
    "1777402158750 native-fallback-enter reason=reapStaleJobs",
    "1777402158763 native-output-len=5830",
    "1777402158772 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158789 native-fallback-enter reason=reapStaleJobs elapsedMs=21637",
    "1777402158801 native-output-len=5830",
    "1777402158809 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158852 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=21747 idleMs=21747",
    "1777402158859 native-fallback-enter reason=reapStaleJobs",
    "1777402158871 native-output-len=5830",
    "1777402158880 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158896 native-fallback-enter reason=reapStaleJobs elapsedMs=21747",
    "1777402158908 native-output-len=5830",
    "1777402158916 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158960 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=21855 idleMs=21855",
    "1777402158969 native-fallback-enter reason=reapStaleJobs",
    "1777402158981 native-output-len=5830",
    "1777402158989 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo

----- /Users/andresgaibor/pt-dev/results/cmd_000000018352.json -----
{
  "id": "cmd_000000018352",
  "seq": 18352,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
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
  "updatedAt": 1777402137105,
  "ageMs": 22271,
  "idleMs": 22271,
  "debug": [
    "1777402157594 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157615 native-fallback-enter reason=reapStaleJobs elapsedMs=20463",
    "1777402157624 native-output-len=5830",
    "1777402157632 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157678 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=20573 idleMs=20573",
    "1777402157690 native-fallback-enter reason=reapStaleJobs",
    "1777402157698 native-output-len=5830",
    "1777402157706 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157725 native-fallback-enter reason=reapStaleJobs elapsedMs=20573",
    "1777402157733 native-output-len=5830",
    "1777402157741 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157789 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=20684 idleMs=20684",
    "1777402157796 native-fallback-enter reason=reapStaleJobs",
    "1777402157808 native-output-len=5830",
    "1777402157816 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157832 native-fallback-enter reason=reapStaleJobs elapsedMs=20684",
    "1777402157845 native-output-len=5830",
    "1777402157854 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157950 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=20845 idleMs=20845",
    "1777402157957 native-fallback-enter reason=getJobState",
    "1777402157966 native-output-len=5830",
    "1777402157975 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158004 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=20899 idleMs=20899",
    "1777402158012 native-fallback-enter reason=reapStaleJobs",
    "1777402158025 native-output-len=5830",
    "1777402158034 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158051 native-fallback-enter reason=reapStaleJobs elapsedMs=20899",
    "1777402158064 native-output-len=5830",
    "1777402158073 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158156 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=21051 idleMs=21051",
    "1777402158164 native-fallback-enter reason=reapStaleJobs",
    "1777402158171 native-output-len=5830",
    "1777402158184 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158200 native-fallback-enter reason=reapStaleJobs elapsedMs=21051",
    "1777402158208 native-output-len=5830",
    "1777402158220 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158265 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=21160 idleMs=21160",
    "1777402158273 native-fallback-enter reason=reapStaleJobs",
    "1777402158282 native-output-len=5830",
    "1777402158291 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158312 native-fallback-enter reason=reapStaleJobs elapsedMs=21160",
    "1777402158321 native-output-len=5830",
    "1777402158330 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158377 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=21272 idleMs=21272",
    "1777402158389 native-fallback-enter reason=reapStaleJobs",
    "1777402158398 native-output-len=5830",
    "1777402158407 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo

----- /Users/andresgaibor/pt-dev/results/cmd_000000018351.json -----
{
  "id": "cmd_000000018351",
  "seq": 18351,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
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
  "updatedAt": 1777402137105,
  "ageMs": 21576,
  "idleMs": 21576,
  "debug": [
    "1777402156892 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156909 native-fallback-enter reason=reapStaleJobs elapsedMs=19756",
    "1777402156922 native-output-len=5830",
    "1777402156931 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156979 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=19874 idleMs=19874",
    "1777402156987 native-fallback-enter reason=reapStaleJobs",
    "1777402157001 native-output-len=5830",
    "1777402157010 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157027 native-fallback-enter reason=reapStaleJobs elapsedMs=19874",
    "1777402157040 native-output-len=5830",
    "1777402157049 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157095 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=19990 idleMs=19990",
    "1777402157103 native-fallback-enter reason=reapStaleJobs",
    "1777402157115 native-output-len=5830",
    "1777402157123 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157139 native-fallback-enter reason=reapStaleJobs elapsedMs=19990",
    "1777402157151 native-output-len=5830",
    "1777402157159 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157249 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=20144 idleMs=20144",
    "1777402157257 native-fallback-enter reason=getJobState",
    "1777402157266 native-output-len=5830",
    "1777402157275 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157305 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=20200 idleMs=20200",
    "1777402157313 native-fallback-enter reason=reapStaleJobs",
    "1777402157325 native-output-len=5830",
    "1777402157334 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157350 native-fallback-enter reason=reapStaleJobs elapsedMs=20200",
    "1777402157362 native-output-len=5830",
    "1777402157371 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157450 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=20345 idleMs=20345",
    "1777402157459 native-fallback-enter reason=reapStaleJobs",
    "1777402157468 native-output-len=5830",
    "1777402157481 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157498 native-fallback-enter reason=reapStaleJobs elapsedMs=20345",
    "1777402157507 native-output-len=5830",
    "1777402157520 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157568 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=20463 idleMs=20463",
    "1777402157576 native-fallback-enter reason=reapStaleJobs",
    "1777402157585 native-output-len=5830",
    "1777402157594 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157615 native-fallback-enter reason=reapStaleJobs elapsedMs=20463",
    "1777402157624 native-output-len=5830",
    "1777402157632 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157678 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=20573 idleMs=20573",
    "1777402157690 native-fallback-enter reason=reapStaleJobs",
    "1777402157698 native-output-len=5830",
    "1777402157706 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo

----- /Users/andresgaibor/pt-dev/results/cmd_000000018350.json -----
{
  "id": "cmd_000000018350",
  "seq": 18350,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
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
  "updatedAt": 1777402137105,
  "ageMs": 20985,
  "idleMs": 20985,
  "debug": [
    "1777402156278 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156294 native-fallback-enter reason=reapStaleJobs elapsedMs=19143",
    "1777402156303 native-output-len=5830",
    "1777402156316 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156360 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=19255 idleMs=19255",
    "1777402156369 native-fallback-enter reason=reapStaleJobs",
    "1777402156377 native-output-len=5830",
    "1777402156386 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156407 native-fallback-enter reason=reapStaleJobs elapsedMs=19255",
    "1777402156416 native-output-len=5830",
    "1777402156427 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156476 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=19371 idleMs=19371",
    "1777402156490 native-fallback-enter reason=reapStaleJobs",
    "1777402156499 native-output-len=5830",
    "1777402156508 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156529 native-fallback-enter reason=reapStaleJobs elapsedMs=19371",
    "1777402156538 native-output-len=5830",
    "1777402156548 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156647 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=19542 idleMs=19542",
    "1777402156656 native-fallback-enter reason=getJobState",
    "1777402156665 native-output-len=5830",
    "1777402156679 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156704 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=19599 idleMs=19599",
    "1777402156717 native-fallback-enter reason=reapStaleJobs",
    "1777402156725 native-output-len=5830",
    "1777402156734 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156755 native-fallback-enter reason=reapStaleJobs elapsedMs=19599",
    "1777402156764 native-output-len=5830",
    "1777402156773 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156861 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=19756 idleMs=19756",
    "1777402156870 native-fallback-enter reason=reapStaleJobs",
    "1777402156883 native-output-len=5830",
    "1777402156892 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156909 native-fallback-enter reason=reapStaleJobs elapsedMs=19756",
    "1777402156922 native-output-len=5830",
    "1777402156931 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156979 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=19874 idleMs=19874",
    "1777402156987 native-fallback-enter reason=reapStaleJobs",
    "1777402157001 native-output-len=5830",
    "1777402157010 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157027 native-fallback-enter reason=reapStaleJobs elapsedMs=19874",
    "1777402157040 native-output-len=5830",
    "1777402157049 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157095 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=19990 idleMs=19990",
    "1777402157103 native-fallback-enter reason=reapStaleJobs",
    "1777402157115 native-output-len=5830",
    "1777402157123 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo

----- /Users/andresgaibor/pt-dev/results/cmd_000000018349.json -----
{
  "id": "cmd_000000018349",
  "seq": 18349,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
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
  "updatedAt": 1777402137105,
  "ageMs": 20281,
  "idleMs": 20281,
  "debug": [
    "1777402155586 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155602 native-fallback-enter reason=reapStaleJobs elapsedMs=18452",
    "1777402155609 native-output-len=5830",
    "1777402155622 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155668 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=18563 idleMs=18563",
    "1777402155676 native-fallback-enter reason=reapStaleJobs",
    "1777402155685 native-output-len=5830",
    "1777402155694 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155714 native-fallback-enter reason=reapStaleJobs elapsedMs=18563",
    "1777402155722 native-output-len=5830",
    "1777402155731 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155778 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=18673 idleMs=18673",
    "1777402155789 native-fallback-enter reason=reapStaleJobs",
    "1777402155797 native-output-len=5830",
    "1777402155805 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155824 native-fallback-enter reason=reapStaleJobs elapsedMs=18673",
    "1777402155832 native-output-len=5830",
    "1777402155841 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155887 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=18782 idleMs=18782",
    "1777402155895 native-fallback-enter reason=reapStaleJobs",
    "1777402155908 native-output-len=5830",
    "1777402155917 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155932 native-fallback-enter reason=reapStaleJobs elapsedMs=18782",
    "1777402155944 native-output-len=5830",
    "1777402155953 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156051 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=18946 idleMs=18946",
    "1777402156059 native-fallback-enter reason=getJobState",
    "1777402156066 native-output-len=5830",
    "1777402156076 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156104 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=18999 idleMs=18999",
    "1777402156111 native-fallback-enter reason=reapStaleJobs",
    "1777402156123 native-output-len=5830",
    "1777402156132 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156149 native-fallback-enter reason=reapStaleJobs elapsedMs=18999",
    "1777402156161 native-output-len=5830",
    "1777402156169 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156248 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=19143 idleMs=19143",
    "1777402156256 native-fallback-enter reason=reapStaleJobs",
    "1777402156265 native-output-len=5830",
    "1777402156278 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156294 native-fallback-enter reason=reapStaleJobs elapsedMs=19143",
    "1777402156303 native-output-len=5830",
    "1777402156316 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156360 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=19255 idleMs=19255",
    "1777402156369 native-fallback-enter reason=reapStaleJobs",
    "1777402156377 native-output-len=5830",
    "1777402156386 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo

----- /Users/andresgaibor/pt-dev/results/cmd_000000018348.json -----
{
  "id": "cmd_000000018348",
  "seq": 18348,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
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
  "updatedAt": 1777402137105,
  "ageMs": 19690,
  "idleMs": 19690,
  "debug": [
    "1777402155003 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155019 native-fallback-enter reason=reapStaleJobs elapsedMs=17869",
    "1777402155028 native-output-len=5830",
    "1777402155041 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155088 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=17983 idleMs=17983",
    "1777402155097 native-fallback-enter reason=reapStaleJobs",
    "1777402155106 native-output-len=5830",
    "1777402155114 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155133 native-fallback-enter reason=reapStaleJobs elapsedMs=17983",
    "1777402155142 native-output-len=5830",
    "1777402155150 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155192 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=18087 idleMs=18087",
    "1777402155204 native-fallback-enter reason=reapStaleJobs",
    "1777402155212 native-output-len=5830",
    "1777402155221 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155240 native-fallback-enter reason=reapStaleJobs elapsedMs=18087",
    "1777402155247 native-output-len=5830",
    "1777402155256 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155353 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=18248 idleMs=18248",
    "1777402155361 native-fallback-enter reason=getJobState",
    "1777402155369 native-output-len=5830",
    "1777402155382 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155407 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=18302 idleMs=18302",
    "1777402155419 native-fallback-enter reason=reapStaleJobs",
    "1777402155427 native-output-len=5830",
    "1777402155437 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155457 native-fallback-enter reason=reapStaleJobs elapsedMs=18302",
    "1777402155465 native-output-len=5830",
    "1777402155473 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155557 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=18452 idleMs=18452",
    "1777402155565 native-fallback-enter reason=reapStaleJobs",
    "1777402155573 native-output-len=5830",
    "1777402155586 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155602 native-fallback-enter reason=reapStaleJobs elapsedMs=18452",
    "1777402155609 native-output-len=5830",
    "1777402155622 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155668 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=18563 idleMs=18563",
    "1777402155676 native-fallback-enter reason=reapStaleJobs",
    "1777402155685 native-output-len=5830",
    "1777402155694 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155714 native-fallback-enter reason=reapStaleJobs elapsedMs=18563",
    "1777402155722 native-output-len=5830",
    "1777402155731 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155778 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=18673 idleMs=18673",
    "1777402155789 native-fallback-enter reason=reapStaleJobs",
    "1777402155797 native-output-len=5830",
    "1777402155805 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo

----- /Users/andresgaibor/pt-dev/results/cmd_000000018347.json -----
{
  "id": "cmd_000000018347",
  "seq": 18347,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
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
  "updatedAt": 1777402137105,
  "ageMs": 19079,
  "idleMs": 19079,
  "debug": [
    "1777402154425 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154440 native-fallback-enter reason=reapStaleJobs elapsedMs=17291",
    "1777402154448 native-output-len=5830",
    "1777402154462 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154507 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=17402 idleMs=17402",
    "1777402154515 native-fallback-enter reason=reapStaleJobs",
    "1777402154524 native-output-len=5830",
    "1777402154533 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154554 native-fallback-enter reason=reapStaleJobs elapsedMs=17402",
    "1777402154563 native-output-len=5830",
    "1777402154572 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154617 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=17512 idleMs=17512",
    "1777402154628 native-fallback-enter reason=reapStaleJobs",
    "1777402154636 native-output-len=5830",
    "1777402154646 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154666 native-fallback-enter reason=reapStaleJobs elapsedMs=17512",
    "1777402154674 native-output-len=5830",
    "1777402154684 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154775 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=17670 idleMs=17670",
    "1777402154782 native-fallback-enter reason=getJobState",
    "1777402154790 native-output-len=5830",
    "1777402154803 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154825 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=17720 idleMs=17720",
    "1777402154837 native-fallback-enter reason=reapStaleJobs",
    "1777402154846 native-output-len=5830",
    "1777402154855 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154874 native-fallback-enter reason=reapStaleJobs elapsedMs=17720",
    "1777402154882 native-output-len=5830",
    "1777402154892 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154974 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=17869 idleMs=17869",
    "1777402154982 native-fallback-enter reason=reapStaleJobs",
    "1777402154989 native-output-len=5830",
    "1777402155003 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155019 native-fallback-enter reason=reapStaleJobs elapsedMs=17869",
    "1777402155028 native-output-len=5830",
    "1777402155041 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155088 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=17983 idleMs=17983",
    "1777402155097 native-fallback-enter reason=reapStaleJobs",
    "1777402155106 native-output-len=5830",
    "1777402155114 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155133 native-fallback-enter reason=reapStaleJobs elapsedMs=17983",
    "1777402155142 native-output-len=5830",
    "1777402155150 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155192 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=18087 idleMs=18087",
    "1777402155204 native-fallback-enter reason=reapStaleJobs",
    "1777402155212 native-output-len=5830",
    "1777402155221 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo

----- /Users/andresgaibor/pt-dev/results/cmd_000000018346.json -----
{
  "id": "cmd_000000018346",
  "seq": 18346,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
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
  "updatedAt": 1777402137105,
  "ageMs": 18388,
  "idleMs": 18388,
  "debug": [
    "1777402153728 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153744 native-fallback-enter reason=reapStaleJobs elapsedMs=16594",
    "1777402153751 native-output-len=5830",
    "1777402153764 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153810 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=16705 idleMs=16705",
    "1777402153819 native-fallback-enter reason=reapStaleJobs",
    "1777402153827 native-output-len=5830",
    "1777402153835 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153855 native-fallback-enter reason=reapStaleJobs elapsedMs=16705",
    "1777402153863 native-output-len=5830",
    "1777402153872 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153917 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=16812 idleMs=16812",
    "1777402153930 native-fallback-enter reason=reapStaleJobs",
    "1777402153937 native-output-len=5830",
    "1777402153946 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153966 native-fallback-enter reason=reapStaleJobs elapsedMs=16812",
    "1777402153973 native-output-len=5830",
    "1777402153982 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154030 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=16925 idleMs=16925",
    "1777402154039 native-fallback-enter reason=reapStaleJobs",
    "1777402154052 native-output-len=5830",
    "1777402154061 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154078 native-fallback-enter reason=reapStaleJobs elapsedMs=16925",
    "1777402154091 native-output-len=5830",
    "1777402154100 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154194 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=17089 idleMs=17089",
    "1777402154202 native-fallback-enter reason=getJobState",
    "1777402154209 native-output-len=5830",
    "1777402154218 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154247 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=17142 idleMs=17142",
    "1777402154254 native-fallback-enter reason=reapStaleJobs",
    "1777402154266 native-output-len=5830",
    "1777402154275 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154292 native-fallback-enter reason=reapStaleJobs elapsedMs=17142",
    "1777402154304 native-output-len=5830",
    "1777402154313 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154396 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=17291 idleMs=17291",
    "1777402154404 native-fallback-enter reason=reapStaleJobs",
    "1777402154412 native-output-len=5830",
    "1777402154425 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154440 native-fallback-enter reason=reapStaleJobs elapsedMs=17291",
    "1777402154448 native-output-len=5830",
    "1777402154462 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154507 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=17402 idleMs=17402",
    "1777402154515 native-fallback-enter reason=reapStaleJobs",
    "1777402154524 native-output-len=5830",
    "1777402154533 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo

----- /Users/andresgaibor/pt-dev/results/cmd_000000018345.json -----
{
  "id": "cmd_000000018345",
  "seq": 18345,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
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
  "updatedAt": 1777402137105,
  "ageMs": 17808,
  "idleMs": 17808,
  "debug": [
    "1777402153166 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153182 native-fallback-enter reason=reapStaleJobs elapsedMs=16030",
    "1777402153191 native-output-len=5830",
    "1777402153204 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153252 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=16147 idleMs=16147",
    "1777402153260 native-fallback-enter reason=reapStaleJobs",
    "1777402153269 native-output-len=5830",
    "1777402153278 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153299 native-fallback-enter reason=reapStaleJobs elapsedMs=16147",
    "1777402153308 native-output-len=5830",
    "1777402153317 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153359 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=16254 idleMs=16254",
    "1777402153371 native-fallback-enter reason=reapStaleJobs",
    "1777402153378 native-output-len=5830",
    "1777402153386 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153405 native-fallback-enter reason=reapStaleJobs elapsedMs=16254",
    "1777402153412 native-output-len=5830",
    "1777402153421 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153507 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=16402 idleMs=16402",
    "1777402153514 native-fallback-enter reason=getJobState",
    "1777402153522 native-output-len=5830",
    "1777402153535 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153557 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=16452 idleMs=16452",
    "1777402153569 native-fallback-enter reason=reapStaleJobs",
    "1777402153577 native-output-len=5830",
    "1777402153585 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153604 native-fallback-enter reason=reapStaleJobs elapsedMs=16452",
    "1777402153611 native-output-len=5830",
    "1777402153620 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153699 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=16594 idleMs=16594",
    "1777402153707 native-fallback-enter reason=reapStaleJobs",
    "1777402153715 native-output-len=5830",
    "1777402153728 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153744 native-fallback-enter reason=reapStaleJobs elapsedMs=16594",
    "1777402153751 native-output-len=5830",
    "1777402153764 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153810 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=16705 idleMs=16705",
    "1777402153819 native-fallback-enter reason=reapStaleJobs",
    "1777402153827 native-output-len=5830",
    "1777402153835 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153855 native-fallback-enter reason=reapStaleJobs elapsedMs=16705",
    "1777402153863 native-output-len=5830",
    "1777402153872 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153917 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=16812 idleMs=16812",
    "1777402153930 native-fallback-enter reason=reapStaleJobs",
    "1777402153937 native-output-len=5830",
    "1777402153946 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo
```
