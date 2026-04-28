# runtime/main marker check

Fecha: Tue Apr 28 12:50:37 -05 2026

## deployed markers
```
runtime.js:

main.js:
1898:    function forceCompleteFromNativeTerminal(job, reason) {
1909:            execLog("JOB NATIVE PAGER id=" +
1924:        execLog("JOB FORCE COMPLETE FROM NATIVE TERMINAL id=" +
1987:                    var completedFromNative = forceCompleteFromNativeTerminal(job, "poll-fallback elapsedMs=" + elapsedMs);
```

## dist markers
```
dist runtime.js:

dist main.js:
1898:    function forceCompleteFromNativeTerminal(job, reason) {
1909:            execLog("JOB NATIVE PAGER id=" +
1924:        execLog("JOB FORCE COMPLETE FROM NATIVE TERMINAL id=" +
1987:                    var completedFromNative = forceCompleteFromNativeTerminal(job, "poll-fallback elapsedMs=" + elapsedMs);
```

## where terminal.plan.run is registered
```
/Users/andresgaibor/pt-dev/runtime.js:6264:            source: "terminal.plan.run",
/Users/andresgaibor/pt-dev/runtime.js:6270:function handleTerminalPlanRun(payload, api) {
/Users/andresgaibor/pt-dev/runtime.js:6274:        return createErrorResult("terminal.plan.run requiere plan.device y plan.steps", "INVALID_TERMINAL_PLAN");
/Users/andresgaibor/pt-dev/runtime.js:6276:    if (!api || typeof api.createJob !== "function") {
/Users/andresgaibor/pt-dev/runtime.js:6277:        return createErrorResult("terminal.plan.run requiere RuntimeApi.createJob para registrar el job diferido", "RUNTIME_API_MISSING_CREATE_JOB", {
/Users/andresgaibor/pt-dev/runtime.js:6281:    var ticket = String(api.createJob(deferredPlan) || deferredPlan.id || ((_a = payload.plan) === null || _a === void 0 ? void 0 : _a.id) || "terminal_plan");
/Users/andresgaibor/pt-dev/runtime.js:6291:    var jobState = api.getJobState(ticket);
/Users/andresgaibor/pt-dev/runtime.js:6696:    var jobState = (_b = (_a = api).getJobState) === null || _b === void 0 ? void 0 : _b.call(_a, ticket);
/Users/andresgaibor/pt-dev/runtime.js:7334:    registerHandler("terminal.plan.run", handleTerminalPlanRun);
/Users/andresgaibor/pt-dev/main.js:1461:function createExecutionEngine(terminal) {
/Users/andresgaibor/pt-dev/main.js:1480:    function createJobContext(plan) {
/Users/andresgaibor/pt-dev/main.js:2488:            var context = createJobContext(plan);
/Users/andresgaibor/pt-dev/main.js:2935:        createJob: function (plan) {
/Users/andresgaibor/pt-dev/main.js:2938:        getJobState: function (id) {
/Users/andresgaibor/pt-dev/main.js:6796:    var executionEngine = createExecutionEngine(terminal);
```
