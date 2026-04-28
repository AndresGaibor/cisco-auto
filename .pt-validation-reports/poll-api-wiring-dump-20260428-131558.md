# poll api wiring dump

Fecha: Tue Apr 28 13:15:58 -05 2026

## grep poll/job/api wiring
```
packages/pt-runtime/src/core/middleware.ts:4:import type { RuntimeResult, RuntimeApi } from "../runtime/contracts";
packages/pt-runtime/src/core/middleware.ts:10:  api: RuntimeApi;
packages/pt-runtime/src/core/plugin-api.ts:5:import type { RuntimeApi, RuntimeResult } from "../runtime/contracts";
packages/pt-runtime/src/core/plugin-api.ts:18:  getApi(): RuntimeApi;
packages/pt-runtime/src/core/plugin-api.ts:22:export type HandlerFn = (payload: Record<string, unknown>, api: RuntimeApi) => RuntimeResult;
packages/pt-runtime/src/core/plugin-api.ts:30:  constructor(api: RuntimeApi) {
packages/pt-runtime/src/runtime/contracts.ts:97:export interface RuntimeApi {
packages/pt-runtime/src/runtime/contracts.ts:137:  createJob(plan: DeferredJobPlan): string;
packages/pt-runtime/src/runtime/contracts.ts:140:  getJobState(ticket: string): KernelJobState | null;
packages/pt-runtime/src/runtime/contracts.ts:143:  getActiveJobs(): Array<{ id: string; device: string; finished: boolean; state: string }>;
packages/pt-runtime/src/runtime/contracts.ts:305:export type RuntimeFunction = (payload: Record<string, unknown>, api: RuntimeApi) => RuntimeResult;
packages/pt-runtime/src/runtime/contracts.ts:313:  type: "__pollDeferred";
packages/pt-runtime/src/runtime/index.ts:26:import type { RuntimeApi, RuntimeResult, RuntimeDeferredResult } from "./contracts";
packages/pt-runtime/src/runtime/index.ts:52:function initializeRuntime(api: RuntimeApi): void {
packages/pt-runtime/src/runtime/index.ts:97: * @param api - RuntimeApi object injected by main.js kernel
packages/pt-runtime/src/runtime/index.ts:99:function runtime(payload: Record<string, unknown>, api: RuntimeApi): RuntimeResult {
packages/pt-runtime/src/runtime/index.ts:106:    if (payload.type === "__pollDeferred") {
packages/pt-runtime/src/runtime/index.ts:107:      var pollLog = log.withCommand("__pollDeferred");
packages/pt-runtime/src/runtime/index.ts:108:      pollLog.debug("Runtime entrada __pollDeferred", {
packages/pt-runtime/src/runtime/index.ts:112:      var pollResult = handlePollDeferred(payload, api);
packages/pt-runtime/src/runtime/index.ts:115:        pollLog.debug("Runtime resultado __pollDeferred", {
packages/pt-runtime/src/runtime/index.ts:170:      var jobId = api.createJob ? api.createJob(r.job) : undefined;
packages/pt-runtime/src/runtime/index.ts:204:function handlePollDeferred(payload: Record<string, unknown>, api: RuntimeApi): RuntimeResult {
packages/pt-runtime/src/runtime/index.ts:210:  const jobState = api.getJobState(ticket);
packages/pt-runtime/src/runtime/index.ts:235:function handleHasPendingDeferred(api: RuntimeApi): { pending: boolean } {
packages/pt-runtime/src/runtime/index.ts:236:  if (!api.getActiveJobs) {
packages/pt-runtime/src/runtime/index.ts:240:  const jobs = api.getActiveJobs();
packages/pt-runtime/src/pt-api/pt-deps.ts:11:import type { RuntimeApi, DeviceRef, SessionStateSnapshot } from "../runtime/contracts.js";
packages/pt-runtime/src/pt-api/pt-deps.ts:43:  createJob(plan: unknown): string;
packages/pt-runtime/src/pt-api/pt-deps.ts:44:  getJobState(ticket: string): JobStateSnapshot | null;
packages/pt-runtime/src/pt-api/pt-deps.ts:45:  getActiveJobs(): JobStateSnapshot[];
packages/pt-runtime/src/pt-api/pt-deps.ts:48:export interface PtRuntimeApi extends RuntimeApi {
packages/pt-runtime/src/pt/kernel/queue-poller.ts:5:import { createRuntimeApi } from "./runtime-api";
packages/pt-runtime/src/pt/kernel/queue-poller.ts:13:    executionEngine,
packages/pt-runtime/src/pt/kernel/queue-poller.ts:37:  const activeJobs = executionEngine.getActiveJobs();
packages/pt-runtime/src/pt/kernel/queue-poller.ts:49:        ? (queue as any).pollAllowedTypes(["__pollDeferred", "__ping"])
packages/pt-runtime/src/pt/kernel/queue-poller.ts:101:    const runtimeApi = createRuntimeApi(subsystems);
packages/pt-runtime/src/pt/kernel/queue-poller.ts:102:    Promise.resolve(runtimeFn(claimed.payload, runtimeApi))
packages/pt-runtime/src/pt/kernel/main.ts:9:  RuntimeApi,
packages/pt-runtime/src/pt/kernel/main.ts:26:import { createExecutionEngine, type ActiveJob, toKernelJobState } from "./execution-engine";
packages/pt-runtime/src/pt/kernel/main.ts:38:export { createExecutionEngine } from "./execution-engine";
packages/pt-runtime/src/pt/kernel/main.ts:82:  const executionEngine = createExecutionEngine(terminal);
packages/pt-runtime/src/pt/kernel/main.ts:104:    executionEngine,
packages/pt-runtime/src/pt/kernel/main.ts:121:      return executionEngine.startJob(plan).id;
packages/pt-runtime/src/pt/kernel/main.ts:124:      return executionEngine.getJob(id);
packages/pt-runtime/src/pt/kernel/runtime-loader.ts:12:import type { RuntimeApi } from "../../runtime/contracts";
packages/pt-runtime/src/pt/kernel/runtime-loader.ts:21:  getRuntimeFn(): ((payload: Record<string, unknown>, api: RuntimeApi) => unknown) | null;
packages/pt-runtime/src/pt/kernel/runtime-loader.ts:27:  let runtimeFn: ((payload: Record<string, unknown>, api: RuntimeApi) => unknown) | null = null;
packages/pt-runtime/src/pt/kernel/runtime-loader.ts:28:  let lastGoodRuntimeFn: ((payload: Record<string, unknown>, api: RuntimeApi) => unknown) | null =
packages/pt-runtime/src/pt/kernel/runtime-loader.ts:193:      runtimeFn = function (payload: Record<string, unknown>, api: RuntimeApi) {
packages/pt-runtime/src/pt/kernel/runtime-api.ts:2:// Factory para el objeto RuntimeApi inyectado en los handlers del runtime
packages/pt-runtime/src/pt/kernel/runtime-api.ts:4:import type { RuntimeApi, DeviceRef, DeferredJobPlan } from "../../runtime/contracts";
packages/pt-runtime/src/pt/kernel/runtime-api.ts:10:export function createRuntimeApi(subsystems: KernelSubsystems): RuntimeApi {
packages/pt-runtime/src/pt/kernel/runtime-api.ts:13:  const { executionEngine, terminal, subsystems: subs } = getDependencies(subsystems);
packages/pt-runtime/src/pt/kernel/runtime-api.ts:106:    createJob: function (plan: DeferredJobPlan): string {
packages/pt-runtime/src/pt/kernel/runtime-api.ts:107:      return executionEngine.startJob(plan).id;
packages/pt-runtime/src/pt/kernel/runtime-api.ts:109:    getJobState: function (id: string) {
packages/pt-runtime/src/pt/kernel/runtime-api.ts:110:      const job = executionEngine.getJob(id);
packages/pt-runtime/src/pt/kernel/runtime-api.ts:113:    getActiveJobs: function (): Array<{ id: string; device: string; finished: boolean; state: string }> {
packages/pt-runtime/src/pt/kernel/runtime-api.ts:114:      return executionEngine.getActiveJobs().map(function (j: ActiveJob) {
packages/pt-runtime/src/pt/kernel/runtime-api.ts:118:          finished: executionEngine.isJobFinished(j.id),
packages/pt-runtime/src/pt/kernel/runtime-api.ts:124:      const job = executionEngine.getJob(id);
packages/pt-runtime/src/pt/kernel/runtime-api.ts:133:    executionEngine: (subsystems as any).executionEngine,
packages/pt-runtime/src/pt/kernel/types.ts:7:  RuntimeApi,
packages/pt-runtime/src/pt/kernel/types.ts:45:export type { RuntimeApi, SessionStateSnapshot, DeviceRef };
packages/pt-runtime/src/pt/kernel/__tests__/kernel-lifecycle.test.ts:24:    executionEngine: {
packages/pt-runtime/src/pt/kernel/__tests__/kernel-lifecycle.test.ts:25:      getActiveJobs: vi.fn(() => []),
packages/pt-runtime/src/pt/kernel/index.ts:8:export { createExecutionEngine, toKernelJobState } from "./execution-engine";
packages/pt-runtime/src/pt/kernel/execution-engine.ts:68:  getJob(jobId: string): ActiveJob | null;
packages/pt-runtime/src/pt/kernel/execution-engine.ts:69:  getJobState(jobId: string): JobContext | null;
packages/pt-runtime/src/pt/kernel/execution-engine.ts:70:  getActiveJobs(): ActiveJob[];
packages/pt-runtime/src/pt/kernel/execution-engine.ts:71:  isJobFinished(jobId: string): boolean;
packages/pt-runtime/src/pt/kernel/execution-engine.ts:78:export function createExecutionEngine(terminal: TerminalEngine): ExecutionEngine {
packages/pt-runtime/src/pt/kernel/execution-engine.ts:93:  function isJobFinished(jobId: string): boolean {
packages/pt-runtime/src/pt/kernel/execution-engine.ts:99:  function createJobContext(plan: DeferredJobPlan): JobContext {
packages/pt-runtime/src/pt/kernel/execution-engine.ts:800:        if (isJobFinished(key)) continue;
packages/pt-runtime/src/pt/kernel/execution-engine.ts:1263:    if (!job || isJobFinished(jobId) || job.pendingCommand !== null) return;
packages/pt-runtime/src/pt/kernel/execution-engine.ts:1271:      if (!isJobFinished(key) && other.device === device && other.pendingCommand !== null) {
packages/pt-runtime/src/pt/kernel/execution-engine.ts:1287:      const context = createJobContext(plan);
packages/pt-runtime/src/pt/kernel/execution-engine.ts:1315:    getJobState: function (id: string) {
packages/pt-runtime/src/pt/kernel/execution-engine.ts:1320:    getActiveJobs: function () {
packages/pt-runtime/src/pt/kernel/execution-engine.ts:1324:        if (!isJobFinished(key)) {
packages/pt-runtime/src/pt/kernel/execution-engine.ts:1330:    isJobFinished: isJobFinished,
packages/pt-runtime/src/pt/kernel/kernel-lifecycle.ts:15:  executionEngine: ReturnType<typeof import("./execution-engine").createExecutionEngine>;
packages/pt-runtime/src/pt/kernel/kernel-lifecycle.ts:37:    executionEngine,
packages/pt-runtime/src/pt/kernel/kernel-lifecycle.ts:146:    const activeJobs = executionEngine.getActiveJobs();
packages/pt-runtime/src/__tests__/runtime/runtime-entry.test.ts:4:import type { RuntimeApi } from "../../runtime/contracts";
packages/pt-runtime/src/__tests__/runtime/runtime-entry.test.ts:72:  test("comandos especiales (__pollDeferred) se loguean", () => {
packages/pt-runtime/src/__tests__/runtime/runtime-entry.test.ts:74:    log.debug("Runtime entrada __pollDeferred", { ticket: "TICKET-123" });
packages/pt-runtime/src/__tests__/runtime/runtime-entry.test.ts:75:    log.debug("Runtime resultado __pollDeferred", { done: false, ok: true });
packages/pt-runtime/src/__tests__/pt/queue-poller.test.ts:30:    executionEngine: {
packages/pt-runtime/src/__tests__/pt/queue-poller.test.ts:31:      getActiveJobs: vi.fn(() => []),
packages/pt-runtime/src/__tests__/pt/queue-control-while-busy.test.ts:6:  test("procesa __pollDeferred aunque haya jobs activos", () => {
packages/pt-runtime/src/__tests__/pt/queue-control-while-busy.test.ts:10:      type: "__pollDeferred",
packages/pt-runtime/src/__tests__/pt/queue-control-while-busy.test.ts:11:      payload: { type: "__pollDeferred", ticket: "job-1" },
packages/pt-runtime/src/__tests__/pt/queue-control-while-busy.test.ts:12:      filename: "000000000001-__pollDeferred.json",
packages/pt-runtime/src/__tests__/pt/queue-control-while-busy.test.ts:31:      executionEngine: {
packages/pt-runtime/src/__tests__/pt/queue-control-while-busy.test.ts:32:        getActiveJobs: vi.fn().mockReturnValue([{ id: "job-1" }]),
packages/pt-runtime/src/__tests__/pt/queue-control-while-busy.test.ts:56:    expect(queue.pollAllowedTypes).toHaveBeenCalledWith(["__pollDeferred", "__ping"]);
packages/pt-runtime/src/__tests__/pt/queue-control-while-busy.test.ts:57:    expect((state.activeCommand as any)?.type).toBe("__pollDeferred");
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:341:      "000000000002-__pollDeferred.json",
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:346:      if (p.includes("__pollDeferred")) {
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:351:          type: "__pollDeferred",
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:352:          payload: { type: "__pollDeferred", ticket: "job-1" },
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:371:    const claimed = queue.pollAllowedTypes(["__pollDeferred", "__ping"]);
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:373:    expect(claimed?.type).toBe("__pollDeferred");
packages/pt-runtime/src/__tests__/pt/job-executor.test.ts:2:import { createExecutionEngine, type ActiveJob } from "../../pt/kernel/execution-engine";
packages/pt-runtime/src/__tests__/pt/job-executor.test.ts:36:describe("createExecutionEngine", () => {
packages/pt-runtime/src/__tests__/pt/job-executor.test.ts:64:    const executor = createExecutionEngine(terminal);
packages/pt-runtime/src/__tests__/pt/job-executor.test.ts:73:    expect(executor.getJob(plan.id)).not.toBeNull();
packages/pt-runtime/src/__tests__/pt/job-executor.test.ts:76:  test("getActiveJobs returns unfinished jobs", () => {
packages/pt-runtime/src/__tests__/pt/job-executor.test.ts:84:    const executor = createExecutionEngine(terminal);
packages/pt-runtime/src/__tests__/pt/job-executor.test.ts:90:    const activeJobs = executor.getActiveJobs();
packages/pt-runtime/src/__tests__/pt/job-executor.test.ts:94:  test("isJobFinished returns false for active job", () => {
packages/pt-runtime/src/__tests__/pt/job-executor.test.ts:102:    const executor = createExecutionEngine(terminal);
packages/pt-runtime/src/__tests__/pt/job-executor.test.ts:108:    expect(executor.isJobFinished(plan.id)).toBe(false);
packages/pt-runtime/src/__tests__/pt/job-executor.test.ts:111:  test("isJobFinished returns true for unknown job", () => {
packages/pt-runtime/src/__tests__/pt/job-executor.test.ts:119:    const executor = createExecutionEngine(terminal);
packages/pt-runtime/src/__tests__/pt/job-executor.test.ts:120:    expect(executor.isJobFinished("unknown-id")).toBe(true);
packages/pt-runtime/src/__tests__/pt/job-executor.test.ts:141:    const executor = createExecutionEngine(terminal as never);
packages/pt-runtime/src/__tests__/pt/job-executor.test.ts:150:    expect(executor.getActiveJobs()).toHaveLength(0);
packages/pt-runtime/src/__tests__/pt/job-executor.test.ts:151:    expect(executor.getJob(plan.id)?.context.errorCode).toBe("JOB_TIMEOUT");
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:2:import { createExecutionEngine } from "../../pt/kernel/execution-engine.js";
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:46:      const engine = createExecutionEngine(terminal);
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:90:      const engine = createExecutionEngine(terminal);
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:143:      const engine = createExecutionEngine(terminal);
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:198:      const engine = createExecutionEngine(terminal);
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:255:      const engine = createExecutionEngine(terminal);
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:313:      const engine = createExecutionEngine(terminal);
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:319:      const refreshed = engine.getJob(job.id);
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:375:      const engine = createExecutionEngine(terminal);
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:430:      const engine = createExecutionEngine(terminal);
packages/pt-runtime/src/__tests__/pt/kernel/runtime-api-compat.test.ts:2:import { createRuntimeApi } from "../../../pt/kernel/runtime-api.js";
packages/pt-runtime/src/__tests__/pt/kernel/runtime-api-compat.test.ts:4:describe("createRuntimeApi", () => {
packages/pt-runtime/src/__tests__/pt/kernel/runtime-api-compat.test.ts:31:      const api: any = createRuntimeApi({} as any);
packages/pt-runtime/src/__tests__/pt/kernel/runtime-api-compat.test.ts:33:      expect(typeof api.getNet).toBe("function");
packages/pt-runtime/src/__tests__/pt/kernel/runtime-api-compat.test.ts:34:      expect(typeof api.getLW).toBe("function");
packages/pt-runtime/src/__tests__/pt/kernel/runtime-api-compat.test.ts:35:      expect(typeof api.getFM).toBe("function");
packages/pt-runtime/src/__tests__/pt/kernel/runtime-api-compat.test.ts:36:      expect(typeof api.getCommandLine).toBe("function");
packages/pt-runtime/src/__tests__/pt/kernel/runtime-api-compat.test.ts:40:      expect(api.getNet()).toBe(red);
packages/pt-runtime/src/__tests__/pt/kernel/runtime-api-compat.test.ts:44:      expect(api.getNet()).toBe(blue);
packages/pt-runtime/src/__tests__/pt/kernel/runtime-api-compat.test.ts:45:      expect(api.getDeviceByName("R1")).toBeNull();
packages/pt-runtime/src/__tests__/handlers/poll-deferred.test.ts:5:describe("__pollDeferred", () => {
packages/pt-runtime/src/__tests__/handlers/poll-deferred.test.ts:9:    const api = {
packages/pt-runtime/src/__tests__/handlers/poll-deferred.test.ts:11:      getJobState: vi.fn().mockReturnValue({
packages/pt-runtime/src/__tests__/handlers/poll-deferred.test.ts:22:    const result = runtimeDispatcher({ type: "__pollDeferred", ticket: "ticket-1" }, api);
packages/pt-runtime/src/__tests__/handlers/poll-deferred.test.ts:24:    expect(api.getJobState).toHaveBeenCalledWith("ticket-1");
packages/pt-runtime/src/__tests__/handlers/poll-deferred.test.ts:36:    const api = {
packages/pt-runtime/src/__tests__/handlers/poll-deferred.test.ts:38:      getJobState: vi.fn().mockReturnValue({
packages/pt-runtime/src/__tests__/handlers/poll-deferred.test.ts:56:    const result = runtimeDispatcher({ type: "__pollDeferred", ticket: "ticket-1" }, api);
packages/pt-runtime/src/__tests__/handlers/deferred-poll-handler.test.ts:9:        getJobState: () => ({
packages/pt-runtime/src/__tests__/handlers/deferred-poll-handler.test.ts:32:        getJobState: () => ({
packages/pt-runtime/src/__tests__/handlers/runtime-handler-groups.test.ts:13:  "__pollDeferred",
packages/pt-runtime/src/__tests__/handlers/terminal-plan-run.test.ts:6:    const createJob = vi.fn().mockReturnValue("plan-1");
packages/pt-runtime/src/__tests__/handlers/terminal-plan-run.test.ts:7:    const api = {
packages/pt-runtime/src/__tests__/handlers/terminal-plan-run.test.ts:9:      createJob,
packages/pt-runtime/src/__tests__/handlers/terminal-plan-run.test.ts:45:    expect(createJob).toHaveBeenCalledTimes(1);
packages/pt-runtime/src/__tests__/handlers/terminal-plan-run.test.ts:46:    expect(createJob.mock.calls[0]?.[0]).toMatchObject({
packages/pt-runtime/src/__tests__/handlers/terminal-plan-run.test.ts:55:  test("rechaza terminal.plan.run si createJob no está disponible", () => {
packages/pt-runtime/src/__tests__/handlers/terminal-plan-run.test.ts:56:    const api = {
packages/pt-runtime/src/__tests__/handlers/terminal-plan-run.test.ts:79:    const api = {
packages/pt-runtime/src/__tests__/handlers/terminal-plan-run.test.ts:81:      createJob: vi.fn(),
packages/pt-runtime/src/__tests__/handlers/terminal-plan-run.test.ts:103:    const createJob = vi.fn().mockReturnValue("plan-empty");
packages/pt-runtime/src/__tests__/handlers/terminal-plan-run.test.ts:104:    const api = {
packages/pt-runtime/src/__tests__/handlers/terminal-plan-run.test.ts:106:      createJob,
packages/pt-runtime/src/__tests__/handlers/terminal-plan-run.test.ts:126:    expect(createJob).toHaveBeenCalledTimes(1);
packages/pt-runtime/src/__tests__/handlers/terminal-plan-run-poll.integration.test.ts:5:describe("terminal.plan.run + __pollDeferred", () => {
packages/pt-runtime/src/__tests__/handlers/terminal-plan-run-poll.integration.test.ts:6:  test("el ticket devuelto por terminal.plan.run se puede consultar con __pollDeferred", () => {
packages/pt-runtime/src/__tests__/handlers/terminal-plan-run-poll.integration.test.ts:11:    const api = {
packages/pt-runtime/src/__tests__/handlers/terminal-plan-run-poll.integration.test.ts:14:      createJob: vi.fn((plan: any) => {
packages/pt-runtime/src/__tests__/handlers/terminal-plan-run-poll.integration.test.ts:29:      getJobState: vi.fn((ticket: string) => jobs.get(ticket) ?? null),
packages/pt-runtime/src/__tests__/handlers/terminal-plan-run-poll.integration.test.ts:53:    expect(api.createJob).toHaveBeenCalledTimes(1);
packages/pt-runtime/src/__tests__/handlers/terminal-plan-run-poll.integration.test.ts:57:        type: "__pollDeferred",
packages/pt-runtime/src/__tests__/handlers/terminal-plan-run-poll.integration.test.ts:63:    expect(api.getJobState).toHaveBeenCalledWith("plan-1");
packages/pt-runtime/src/__tests__/handlers/ios-execution.test.ts:77:    expect(api.getDeviceByName).toHaveBeenCalledWith("PC1");
packages/pt-runtime/src/__tests__/deprecated/ios-engine.test.ts:20:    createJob: () => "ticket-1",
packages/pt-runtime/src/__tests__/deprecated/ios-engine.test.ts:21:    getJobState: () => null,
packages/pt-runtime/src/__tests__/deprecated/ios-engine.test.ts:22:    getActiveJobs: () => [],
packages/pt-runtime/src/__tests__/deprecated/ios-engine.test.ts:29:    const ticket = engine.createJob("configIos", { commands: ["show version"] });
packages/pt-runtime/src/__tests__/deprecated/ios-engine.test.ts:31:    const job = engine.getJob(ticket);
packages/pt-runtime/src/domain/contracts.ts:12:  RuntimeApi,
packages/pt-runtime/src/handlers/poll-deferred.ts:1:import type { RuntimeApi, RuntimeResult } from "../runtime/contracts.js";
packages/pt-runtime/src/handlers/poll-deferred.ts:7:export function handlePollDeferred(payload: PollDeferredPayload, api: RuntimeApi): RuntimeResult {
packages/pt-runtime/src/handlers/poll-deferred.ts:14:  const jobState = api.getJobState(ticket);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:57:import { handlePollDeferred } from "../poll-deferred.js";
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:88:  registerHandler("__pollDeferred", handlePollDeferred as unknown as HandlerFn);
packages/pt-runtime/src/handlers/terminal-plan-run.ts:1:import type { RuntimeApi, RuntimeResult, DeferredJobPlan } from "../runtime/contracts.js";
packages/pt-runtime/src/handlers/terminal-plan-run.ts:67:function buildDeferredPlan(payload: TerminalPlanRunPayload, api: RuntimeApi): DeferredJobPlan | null {
packages/pt-runtime/src/handlers/terminal-plan-run.ts:105:  api: RuntimeApi,
packages/pt-runtime/src/handlers/terminal-plan-run.ts:113:  if (!api || typeof api.createJob !== "function") {
packages/pt-runtime/src/handlers/terminal-plan-run.ts:115:      "terminal.plan.run requiere RuntimeApi.createJob para registrar el job diferido",
packages/pt-runtime/src/handlers/terminal-plan-run.ts:123:  var ticket = String(api.createJob(deferredPlan) || deferredPlan.id || payload.plan?.id || "terminal_plan");
packages/pt-runtime/src/handlers/ios-engine.ts:88:  createJob(type: IosJob["type"], payload: Record<string, unknown>): string {
packages/pt-runtime/src/handlers/ios-engine.ts:163:  getJob(ticket: string): IosJob | null {
packages/pt-runtime/src/handlers/ios-engine.ts:167:  getActiveJobs(): IosJob[] {
packages/pt-runtime/src/handlers/ios-engine.ts:333:    const ticket = this.createJob("execInteractive", { device: deviceName });
packages/pt-runtime/src/handlers/ios/exec-ios-handler.ts:5:import type { PtRuntimeApi } from "../../pt-api/pt-deps.js";
packages/pt-runtime/src/handlers/ios/exec-ios-handler.ts:26: * @param api - PtRuntimeApi con acceso a IPC y device registry
packages/pt-runtime/src/handlers/ios/exec-ios-handler.ts:33:export async function handleExecIos(payload: ExecIosPayload, api: PtRuntimeApi): Promise<PtResult> {
packages/pt-runtime/src/handlers/ios/exec-ios-handler.ts:35:  const device = api.getDeviceByName(deviceName);
packages/pt-runtime/src/handlers/ios/read-terminal-handler.ts:5:import type { PtRuntimeApi } from "../../pt-api/pt-deps.js";
packages/pt-runtime/src/handlers/ios/read-terminal-handler.ts:12:export function handleReadTerminal(payload: { device: string }, api: PtRuntimeApi): PtResult {
packages/pt-runtime/src/handlers/ios/ping-handler.ts:5:import type { PtRuntimeApi } from "../../pt-api/pt-deps.js";
packages/pt-runtime/src/handlers/ios/ping-handler.ts:13:  api: PtRuntimeApi,
packages/pt-runtime/src/handlers/ios/ping-handler.ts:17:    const device = api.getDeviceByName(deviceName);
packages/pt-runtime/src/handlers/ios/deferred-poll-handler.ts:5:import type { PtRuntimeApi } from "../../pt-api/pt-deps.js";
packages/pt-runtime/src/handlers/ios/deferred-poll-handler.ts:11:export function handleDeferredPoll(pollPayload: PollDeferredPayload, api: PtRuntimeApi): PtResult {
packages/pt-runtime/src/handlers/ios/deferred-poll-handler.ts:13:  const jobState = (api as any).getJobState?.(ticket);
packages/pt-runtime/src/handlers/ios/config-ios-handler.ts:5:import type { PtRuntimeApi } from "../../pt-api/pt-deps.js";
packages/pt-runtime/src/handlers/ios/config-ios-handler.ts:21: * @param api - PtRuntimeApi con acceso a IPC y device registry
packages/pt-runtime/src/handlers/ios/config-ios-handler.ts:32:export async function handleConfigIos(payload: ConfigIosPayload, api: PtRuntimeApi): Promise<PtResult> {
packages/pt-runtime/src/handlers/ios/config-ios-handler.ts:34:  const device = api.getDeviceByName(deviceName);
packages/pt-runtime/src/handlers/ios/exec-pc-handler.ts:5:import type { PtRuntimeApi } from "../../pt-api/pt-deps.js";
packages/pt-runtime/src/handlers/ios/exec-pc-handler.ts:21: * @param api - PtRuntimeApi con acceso a IPC y device registry
packages/pt-runtime/src/handlers/ios/exec-pc-handler.ts:24:export async function handleExecPc(payload: ExecPcPayload, api: PtRuntimeApi): Promise<PtResult> {
packages/pt-runtime/src/handlers/ios/exec-pc-handler.ts:26:  const deviceRef = api.getDeviceByName(deviceName);
packages/pt-runtime/src/handlers/ios/ios-session-utils.ts:5:import type { PtRuntimeApi } from "../../pt-api/pt-deps.js";
packages/pt-runtime/src/handlers/ios/ios-session-utils.ts:39:export function getTerminalDevice(api: PtRuntimeApi, deviceName: string): any {
packages/pt-runtime/src/handlers/ios/ios-session-utils.ts:52:    const device = api.getDeviceByName(deviceName);
packages/pt-runtime/src/handlers/device-config.ts:7:import type { PtRuntimeApi } from "../pt-api/pt-deps.js";
packages/pt-runtime/src/handlers/device-config.ts:12:  api: PtRuntimeApi,
packages/pt-runtime/src/handlers/device-config.ts:85:  api: PtRuntimeApi,
packages/pt-runtime/src/handlers/handler-registry.ts:12:import type { RuntimeApi, RuntimeResult } from "../runtime/contracts";
packages/pt-runtime/src/handlers/handler-registry.ts:14:export type HandlerFn = (payload: Record<string, unknown>, api: RuntimeApi) => RuntimeResult;
packages/pt-runtime/src/handlers/host-handler.ts:5:import type { PtRuntimeApi } from "../pt-api/pt-deps.js";
packages/pt-runtime/src/handlers/host-handler.ts:12:export async function handleConfigHost(payload: ConfigHostPayload, api: PtRuntimeApi): Promise<PtResult> {
packages/pt-runtime/src/handlers/host-handler.ts:13:  const device = api.getDeviceByName(payload.device);
packages/pt-runtime/src/handlers/ios-payloads.ts:72:  type: "__pollDeferred";
packages/pt-runtime/src/handlers/dispatcher.ts:19:import type { RuntimeApi, RuntimeResult } from "../runtime/contracts";
packages/pt-runtime/src/handlers/dispatcher.ts:43: * @param api - RuntimeApi con acceso a IPC, device registry, y utilidades.
packages/pt-runtime/src/handlers/dispatcher.ts:56:  api: RuntimeApi,
```


## packages/pt-runtime/src/handlers/poll-deferred.ts
```ts
import type { RuntimeApi, RuntimeResult } from "../runtime/contracts.js";

interface PollDeferredPayload {
  ticket?: string;
}

export function handlePollDeferred(payload: PollDeferredPayload, api: RuntimeApi): RuntimeResult {
  const ticket = String(payload.ticket ?? "").trim();

  if (!ticket) {
    return { ok: false, error: "Missing ticket", code: "INVALID_PAYLOAD" } as RuntimeResult;
  }

  const jobState = api.getJobState(ticket);
  if (!jobState) {
    return { ok: false, error: `Job not found: ${ticket}`, code: "UNKNOWN_COMMAND" } as RuntimeResult;
  }

  const finished =
    jobState.finished === true ||
    (jobState as any).done === true ||
    jobState.state === "completed" ||
    jobState.state === "error";

  if (!finished) {
    const currentStep = jobState.currentStep ?? 0;
    const currentStepData = jobState.plan.plan[currentStep];
    return {
      ok: true,
      deferred: true,
      ticket,
      done: false,
      state: jobState.state,
      currentStep,
      totalSteps: jobState.plan.plan.length,
      stepType: currentStepData?.type,
      stepValue: currentStepData?.value,
      outputTail: jobState.outputBuffer ? jobState.outputBuffer.slice(-500) : "",
      lastPrompt: jobState.lastPrompt,
      lastMode: jobState.lastMode,
      waitingForCommandEnd: jobState.waitingForCommandEnd,
      updatedAt: jobState.updatedAt,
      ageMs: Date.now() - jobState.startedAt,
      idleMs: Date.now() - jobState.updatedAt,
      debug: (jobState as any).debug || [],
      stepResults: (jobState as any).stepResults || [],
    } as unknown as RuntimeResult;
  }

  const output = String(jobState.outputBuffer ?? (jobState.result as any)?.raw ?? (jobState.result as any)?.output ?? "");
  const status = jobState.error || jobState.state === "error" ? 1 : Number((jobState.result as any)?.status ?? 0);

  return {
    done: true,
    ok: !jobState.error && jobState.state !== "error",
    status,
    result: jobState.result,
    error: jobState.error || undefined,
    code: jobState.errorCode || undefined,
    errorCode: jobState.errorCode || undefined,
    raw: output,
    output,
    source: "terminal",
    session: {
      mode: String(jobState.lastMode ?? ""),
      prompt: String(jobState.lastPrompt ?? ""),
      paging: jobState.paged === true,
      awaitingConfirm: false,
    },
  } as unknown as RuntimeResult;
}
```

## packages/pt-runtime/src/handlers/terminal-plan-run.ts
```ts
import type { RuntimeApi, RuntimeResult, DeferredJobPlan } from "../runtime/contracts.js";
import { createDeferredResult, createErrorResult } from "./result-factories.js";

interface TerminalPlanRunPayload {
  type: "terminal.plan.run";
  plan?: {
    id?: string;
    device?: string;
    targetMode?: string;
    steps?: Array<{
      kind?: string;
      command?: string;
      expectMode?: string;
      expectPromptPattern?: string;
      allowPager?: boolean;
      allowConfirm?: boolean;
      optional?: boolean;
      timeout?: number;
      metadata?: Record<string, unknown>;
    }>;
    timeouts?: {
      commandTimeoutMs?: number;
      stallTimeoutMs?: number;
    };
    policies?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  };
  options?: {
    timeoutMs?: number;
    stallTimeoutMs?: number;
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function normalizeStep(step: any): any {
  var kind = String(step.kind || "command");

  if (kind === "ensureMode") kind = "ensure-mode";
  if (kind === "expectPrompt") kind = "expect-prompt";
  if (kind === "saveConfig") kind = "save-config";
  if (kind === "closeSession") kind = "close-session";

  const timeoutMs = Number(step.timeout || 0) || undefined;

  return {
    type: kind,
    kind: kind,
    value: String(step.command || step.expectMode || step.expectPromptPattern || ""),
    command: step.command ? String(step.command) : undefined,
    expectMode: step.expectMode ? String(step.expectMode) : undefined,
    expectPromptPattern: step.expectPromptPattern ? String(step.expectPromptPattern) : undefined,
    allowPager: step.allowPager !== false,
    allowConfirm: step.allowConfirm === true,
    optional: step.optional === true,
    timeoutMs,
    options: {
      timeoutMs,
      expectedPrompt: step.expectPromptPattern ? String(step.expectPromptPattern) : undefined,
    },
    metadata: isObject(step.metadata) ? step.metadata : {},
  };
}

function buildDeferredPlan(payload: TerminalPlanRunPayload, api: RuntimeApi): DeferredJobPlan | null {
  var plan = payload.plan;

  if (!plan || !String(plan.device || "").trim()) {
    return null;
  }

  var steps = Array.isArray(plan.steps) ? plan.steps : [];
  if (!Array.isArray(plan.steps)) {
    return null;
  }

  var id = String(plan.id || "");
  if (!id) {
    id = "terminal_plan_" + String(api.now()) + "_" + String(Math.floor(Math.random() * 100000));
  }

  return {
    id: id,
    kind: "ios-session",
    version: 1,
    device: String(plan.device),
    plan: steps.map(normalizeStep),
    options: {
      stopOnError: true,
      commandTimeoutMs: Number(plan.timeouts?.commandTimeoutMs || payload.options?.timeoutMs || 30000),
      stallTimeoutMs: Number(plan.timeouts?.stallTimeoutMs || payload.options?.stallTimeoutMs || 15000),
    },
    payload: {
      source: "terminal.plan.run",
      metadata: isObject(plan.metadata) ? plan.metadata : {},
      policies: isObject(plan.policies) ? plan.policies : {},
    },
  } as unknown as DeferredJobPlan;
}

export function handleTerminalPlanRun(
  payload: TerminalPlanRunPayload,
  api: RuntimeApi,
): RuntimeResult {
  var deferredPlan = buildDeferredPlan(payload, api);

  if (!deferredPlan) {
    return createErrorResult("terminal.plan.run requiere plan.device y plan.steps", "INVALID_TERMINAL_PLAN");
  }

  if (!api || typeof api.createJob !== "function") {
    return createErrorResult(
      "terminal.plan.run requiere RuntimeApi.createJob para registrar el job diferido",
      "RUNTIME_API_MISSING_CREATE_JOB",
      {
        details: { job: deferredPlan },
      } as any,
    );
  }

  var ticket = String(api.createJob(deferredPlan) || deferredPlan.id || payload.plan?.id || "terminal_plan");
  deferredPlan.id = ticket;

  return createDeferredResult(ticket, deferredPlan);
}
```

## packages/pt-runtime/src/pt/kernel/execution-engine.ts
```ts
// packages/pt-runtime/src/pt/kernel/execution-engine.ts
// Execution Engine para Deferred Jobs IOS
// Responsabilidades: tipos de job, contexto, ejecución de steps, serialización a KernelJobState

import type {
  DeferredJobPlan,
  DeferredStep,
  DeferredStepType,
  KernelJobState,
} from "../../runtime/contracts";
import type { TerminalEngine, TerminalResult } from "../terminal/terminal-engine";

export type JobPhase =
  | "pending"
  | "waiting-ensure-mode"
  | "waiting-command"
  | "waiting-confirm"
  | "waiting-prompt"
  | "waiting-save"
  | "waiting-delay"
  | "completed"
  | "error";

export interface JobStepResult {
  stepIndex: number;
  stepType: DeferredStepType;
  command: string;
  raw: string;
  status: number | null;
  error?: string;
  completedAt: number;
}

export interface JobContext {
  plan: DeferredJobPlan;
  currentStep: number;
  phase: JobPhase;
  outputBuffer: string;
  startedAt: number;
  updatedAt: number;
  stepResults: JobStepResult[];
  lastMode: string;
  lastPrompt: string;
  paged: boolean;
  waitingForCommandEnd: boolean;
  finished: boolean;
  result: TerminalResult | null;
  error: string | null;
  errorCode: string | null;
  pendingDelay: number | null;
  waitingForConfirm: boolean;
}

export interface ActiveJob {
  id: string;
  device: string;
  context: JobContext;
  pendingCommand: Promise<TerminalResult> | null;
}

// ============================================================================
// INTERFAZ PÚBLICA
// ============================================================================

export interface ExecutionEngine {
  startJob(plan: DeferredJobPlan): ActiveJob;
  advanceJob(jobId: string): void;
  getJob(jobId: string): ActiveJob | null;
  getJobState(jobId: string): JobContext | null;
  getActiveJobs(): ActiveJob[];
  isJobFinished(jobId: string): boolean;
}

// ============================================================================
// IMPLEMENTACIÓN
// ============================================================================

export function createExecutionEngine(terminal: TerminalEngine): ExecutionEngine {
  const jobs: Record<string, ActiveJob> = {};

  function execLog(message: string): void {
    try {
      dprint("[exec] " + message);
    } catch {}
  }

  function getJobTimeoutMs(job: ActiveJob): number {
    const commandTimeout = Number(job.context.plan.options.commandTimeoutMs || 30000);
    const stallTimeout = Number(job.context.plan.options.stallTimeoutMs || 15000);
    return Math.max(commandTimeout + stallTimeout + 2000, 5000);
  }

  function isJobFinished(jobId: string): boolean {
    const job = jobs[jobId];
    if (!job) return true;
    return job.context.finished === true || job.context.phase === "completed" || job.context.phase === "error";
  }

  function createJobContext(plan: DeferredJobPlan): JobContext {
    const now = Date.now();

    return {
      plan,
      currentStep: 0,
      phase: "pending",
      outputBuffer: "",
      startedAt: now,
      updatedAt: now,
      stepResults: [],
      lastMode: "unknown",
      lastPrompt: "",
      paged: false,
      waitingForCommandEnd: false,
      finished: false,
      result: null,
      error: null,
      errorCode: null,
      pendingDelay: null,
      waitingForConfirm: false,
    };
  }

  function resolvePacketTracerIpc(): any {
    // 1. self — funciona en PT QTScript, browsers y Node
    try {
      if (typeof self !== "undefined" && self) {
        const root = self as any;
        if (root.ipc && typeof root.ipc.network === "function") {
          return root.ipc;
        }
      }
    } catch {}
 
    // 2. Free variable 'ipc' — Packet Tracer nativo (QTScript)
    try {
      if (typeof ipc !== "undefined" && ipc && typeof ipc.network === "function") {
        return ipc;
      }
    } catch {}
 
    // 3. _ScriptModule.context.ipc — fallback PT
    try {
      if (typeof _ScriptModule !== "undefined" && _ScriptModule) {
        const scriptModule = _ScriptModule as any;
        const context = scriptModule.context;
        const scriptModuleIpc = context && context.ipc;
        if (scriptModuleIpc && typeof scriptModuleIpc.network === "function") {
          return scriptModuleIpc;
        }
      }
    } catch {}
 
    return null;
  }

  function readTerminalTextSafe(term: any): string {
    const methods = [
      "getAllOutput",
      "getBuffer",
      "getOutput",
      "getText",
      "readAll",
      "read",
      "getHistory",
      "history",
    ];

    for (let i = 0; i < methods.length; i += 1) {
      const name = methods[i];

      try {
        if (typeof term[name] === "function") {
          const value = term[name]();
          if (value && typeof value === "string") {
            return value;
          }
        }
      } catch {}
    }

    try {
      if (typeof term.getConsole === "function") {
        const consoleObj = term.getConsole();

        if (consoleObj) {
          for (let i = 0; i < methods.length; i += 1) {
            const name = methods[i];

            try {
              if (typeof consoleObj[name] === "function") {
                const value = consoleObj[name]();
                if (value && typeof value === "string") {
                  return value;
                }
              }
            } catch {}
          }
        }
      }
    } catch {}

    return "";
  }

  function inferPromptFromTerminalText(text: string): string {
    const lines = String(text || "")
      .replace(/\r/g, "")
      .split("\n")
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean);

    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const line = lines[i] || "";

      if (/^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]$/.test(line)) {
        return line;
      }

      if (/[A-Z]:\\>$/.test(line)) {
        return line;
      }
    }

    return "";
  }

  function createAttachableTerminal(term: any): any {
    return {
      getPrompt: function () {
        try {
          if (typeof term.getPrompt === "function") {
            const prompt = term.getPrompt();
            if (prompt && typeof prompt === "string") {
              return prompt;
            }
          }
        } catch {}

        return inferPromptFromTerminalText(readTerminalTextSafe(term));
      },

      getMode: function () {
        try {
          if (typeof term.getMode === "function") {
            return term.getMode();
          }
        } catch {}

        const prompt = inferPromptFromTerminalText(readTerminalTextSafe(term));
        if (/\(config[^)]*\)#\s*$/.test(prompt)) return "global-config";
        if (/#\s*$/.test(prompt)) return "privileged-exec";
        if (/>$/.test(prompt)) return "user-exec";
        return "unknown";
      },

      getOutput: function () {
        try {
          if (typeof term.getOutput === "function") {
            return term.getOutput();
          }
        } catch {}

        return readTerminalTextSafe(term);
      },

      getAllOutput: function () {
        try {
          if (typeof term.getAllOutput === "function") {
            return term.getAllOutput();
          }
        } catch {}

        return readTerminalTextSafe(term);
      },

      getBuffer: function () {
        try {
          if (typeof term.getBuffer === "function") {
            return term.getBuffer();
          }
        } catch {}

        return readTerminalTextSafe(term);
      },

      getCommandInput: function () {
        try {
          if (typeof term.getCommandInput === "function") {
            return term.getCommandInput();
          }
        } catch {}

        return "";
      },

      enterCommand: function (cmd: string) {
        return term.enterCommand(cmd);
      },

      enterChar: function (charCode: number, modifiers: number) {
        return term.enterChar(charCode, modifiers);
      },

      registerEvent: function (
        eventName: string,
        context: unknown,
        handler: (src: unknown, args: unknown) => void,
      ) {
        return term.registerEvent(eventName, context, handler);
      },

      unregisterEvent: function (
        eventName: string,
        context: unknown,
        handler: (src: unknown, args: unknown) => void,
      ) {
        return term.unregisterEvent(eventName, context, handler);
      },

      println: function (text: string) {
        if (typeof term.println === "function") {
          return term.println(text);
        }
      },

      flush: function () {
        if (typeof term.flush === "function") {
          return term.flush();
        }
      },

      getConsole: function () {
        if (typeof term.getConsole === "function") {
          return term.getConsole();
        }

        return null;
      },
    };
  }

  function tryAttachTerminal(device: string): boolean {
    try {
      const resolvedIpc = resolvePacketTracerIpc();

      if (!resolvedIpc) {
        execLog("ATTACH failed device=" + device + " reason=no-ipc");
        return false;
      }

      const net = typeof resolvedIpc.network === "function" ? resolvedIpc.network() : null;

      if (!net || typeof net.getDevice !== "function") {
        execLog("ATTACH failed device=" + device + " reason=no-network");
        return false;
      }

      const dev = net.getDevice(device);

      if (!dev) {
        execLog("ATTACH failed device=" + device + " reason=no-device");
        return false;
      }

      if (typeof dev.getCommandLine !== "function") {
        execLog("ATTACH failed device=" + device + " reason=no-get-command-line");
        return false;
      }

      const term = dev.getCommandLine();

      if (!term) {
        execLog("ATTACH failed device=" + device + " reason=no-command-line");
        return false;
      }

      if (typeof term.enterCommand !== "function") {
        execLog("ATTACH failed device=" + device + " reason=no-enter-command");
        return false;
      }

      if (typeof term.registerEvent !== "function") {
        execLog("ATTACH failed device=" + device + " reason=no-register-event");
        return false;
      }

      if (typeof term.unregisterEvent !== "function") {
        execLog("ATTACH failed device=" + device + " reason=no-unregister-event");
        return false;
      }

      terminal.attach(device, createAttachableTerminal(term) as any);
      return true;
    } catch (error) {
      execLog("ATTACH failed device=" + device + " error=" + String(error));
      return false;
    }
  }

  function isConfigMode(mode: string | null | undefined): boolean {
    return String(mode ?? "").startsWith("config");
  }

  function cleanupConfigSession(device: string, mode: string | null | undefined, prompt: string | null | undefined): void {
    if (!isConfigMode(mode) && !/\(config[^)]*\)#\s*$/.test(String(prompt ?? ""))) {
      return;
    }

    execLog("CLEANUP config session device=" + device);
    void terminal
      .executeCommand(device, "end", {
        commandTimeoutMs: 5000,
        allowPager: false,
        autoConfirm: false,
      })
      .catch(function (error) {
        execLog("CLEANUP failed device=" + device + " error=" + String(error));
      });
  }

  // ============================================================================
  // Helpers para detección de prompt y output completo
  // ============================================================================

  function normalizeEol(value: unknown): string {
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

  function outputLooksComplete(output: string, command: string): boolean {
    const text = normalizeEol(output);
    const cmd = String(command ?? "").trim().toLowerCase();

    if (!text.trim()) return false;

    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
    const hasCommandEcho = cmd.length > 0 && lines.some((line) => line.toLowerCase() === cmd);
    const hasPromptAtEnd = isIosPrompt(lastNonEmptyLine(text));
    const hasMeaningfulBody = lines.some((line) => {
      if (!line) return false;
      if (cmd && line.toLowerCase() === cmd) return false;
      if (isIosPrompt(line)) return false;
      return true;
    });

    return hasCommandEcho && hasPromptAtEnd && hasMeaningfulBody;
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
```

## packages/pt-runtime/src/pt/kernel/main.ts
```ts
// packages/pt-runtime/src/pt/kernel/main.ts
// Kernel Core - Packet Tracer Script Module Entry Point
// Responsibilities: Coordinate subsystems, lifecycle, queue polling, runtime loading, API injection

import type { KernelConfig, CommandEnvelope, ResultEnvelope } from "./types";
import type {
  DeferredJobPlan,
  KernelJobState,
  RuntimeApi,
  DeviceRef,
} from "../../runtime/contracts";
import type {
  PTNetwork,
  PTDevice,
  PTCommandLine,
  PTIpc,
  PTAppWindow,
} from "../../pt-api/pt-api-registry.js";
import { createDirectoryManager } from "./directories";
import { createLeaseManager } from "./lease";
import { createCommandQueue } from "./command-queue";
import { createRuntimeLoader } from "./runtime-loader";
import { createHeartbeat, type HeartbeatManager } from "./heartbeat";
import { createCleanupManager } from "./cleanup";
import { createTerminalEngine } from "../terminal/terminal-engine";
import { createExecutionEngine, type ActiveJob, toKernelJobState } from "./execution-engine";
import { safeFM } from "./safe-fm";
import { createKernelLifecycle } from "./kernel-lifecycle";
import { createKernelState, type KernelState } from "./kernel-state";
import { initDebugLog, writeDebugLog } from "./debug-log.js";

export { createDirectoryManager } from "./directories";
export { createLeaseManager } from "./lease";
export { createCommandQueue } from "./command-queue";
export { createRuntimeLoader } from "./runtime-loader";
export { createHeartbeat, type HeartbeatManager } from "./heartbeat";
export { createCleanupManager } from "./cleanup";
export { createExecutionEngine } from "./execution-engine";

export interface Kernel {
  boot(): void;
  shutdown(): void;
  isRunning(): boolean;
  startDeferredJob(plan: DeferredJobPlan): string;
  getDeferredJob(jobId: string): ActiveJob | null;
}

declare var dprint: (msg: string) => void;
declare var print: (msg: string) => void;

function isDebugEnabled(): boolean {
  try {
    const scope = (typeof self !== "undefined" ? self : Function("return this")()) as any;
    return scope.PT_DEBUG === 1 || scope.PT_DEBUG === "1" || scope.PT_DEBUG === true;
  } catch {
    return false;
  }
}

export function createKernel(config: KernelConfig) {
  const state = createKernelState();

  const dirs = createDirectoryManager(config);
  initDebugLog(config.logsDir);
  const lease = createLeaseManager({ devDir: config.devDir, checkIntervalMs: 1000 });
  const queue = createCommandQueue({
    commandsDir: config.commandsDir,
    inFlightDir: config.inFlightDir,
    deadLetterDir: config.deadLetterDir,
  });
  const runtimeLoader = createRuntimeLoader({ runtimeFile: config.devDir + "/runtime.js" });
  const heartbeat = createHeartbeat({
    devDir: config.devDir,
    intervalMs: config.heartbeatIntervalMs,
  });

  const terminal = createTerminalEngine({
    commandTimeoutMs: 8000,
    stallTimeoutMs: 15000,
    pagerTimeoutMs: 30000,
  });
  const executionEngine = createExecutionEngine(terminal);

  function kernelLog(message: string, level: "debug" | "info" | "warn" | "error" = "debug"): void {
    try {
      writeDebugLog("kernel", message, level);
    } catch {}
    if (!isDebugEnabled()) return;
    try {
      dprint("[kernel] " + message);
    } catch {}
  }

  function kernelLogSubsystem(name: string, message: string): void {
    if (!isDebugEnabled()) return;
    kernelLog("[" + name + "] " + message, "debug");
  }

  const subsystems = {
    dirs,
    queue,
    runtimeLoader,
    heartbeat,
    executionEngine,
    terminal,
    lease,
    config,
    kernelLog,
    kernelLogSubsystem,
  };

  const lifecycle = createKernelLifecycle(subsystems, state);

  return {
    boot: lifecycle.boot,
    shutdown: lifecycle.shutdown,
    isRunning: function () {
      return state.isRunning;
    },
    startDeferredJob: function (plan: DeferredJobPlan) {
      return executionEngine.startJob(plan).id;
    },
    getDeferredJob: function (id: string) {
      return executionEngine.getJob(id);
    },
  };
}
```

## packages/pt-runtime/src/pt/kernel/runtime-api.ts
```ts
// packages/pt-runtime/src/pt/kernel/runtime-api.ts
// Factory para el objeto RuntimeApi inyectado en los handlers del runtime

import type { RuntimeApi, DeviceRef, DeferredJobPlan } from "../../runtime/contracts";
import type { KernelSubsystems } from "./kernel-lifecycle";
import type { KernelState } from "./kernel-state";
import { toKernelJobState, type ActiveJob } from "./execution-engine";
import type { PTFileManager, PTLogicalWorkspace, PTNetwork, PTCommandLine } from "../../pt-api/pt-api-registry.js";

export function createRuntimeApi(subsystems: KernelSubsystems): RuntimeApi {
  const scope = (typeof self !== "undefined" ? self : Function("return this")()) as any;
  const ipc = scope.ipc;
  const { executionEngine, terminal, subsystems: subs } = getDependencies(subsystems);

  function getNet(): PTNetwork {
    return ipc.network() as PTNetwork;
  }

  function getLW(): any {
    return ipc.appWindow().getActiveWorkspace().getLogicalWorkspace() as unknown as PTLogicalWorkspace;
  }

  function getFM(): any {
    return ipc.systemFileManager() as unknown as PTFileManager;
  }

  function safeDprint(msg: string): void {
    try {
      const appWindow = ipc && ipc.appWindow ? ipc.appWindow() : null;
      if (appWindow && typeof appWindow.writeToPT === "function") {
        appWindow.writeToPT("[runtime] " + msg + "\n");
      }
    } catch {
      // Ignorar fallos de escritura en PT Debug.
    }

    try {
      dprint("[runtime] " + msg);
    } catch {
      // Ignorar fallos del logger nativo.
    }
  }

  return {
    ipc: ipc as any,
    privileged: scope._ScriptModule || null,
    DEV_DIR: scope.DEV_DIR,
    getLW,
    getNet,
    getFM,
    getDeviceByName: function (name: string): DeviceRef | null {
      const net = getNet();
      const dev = net && typeof net.getDevice === "function" ? (net.getDevice(name) as any) : null;
      if (!dev) return null;
      const term = (dev as any).getCommandLine ? (dev as any).getCommandLine() : null;
      const res: any = dev;
      res.hasTerminal = !!term;
      res.getTerminal = function () {
        return term as any;
      };
      res.getNetwork = function () {
        return net as any;
      };
      return res as unknown as DeviceRef;
    },
    listDevices: function (): string[] {
      const net = getNet();
      const names: string[] = [];
      const count = net && typeof net.getDeviceCount === "function" ? net.getDeviceCount() : 0;
      for (let i = 0; i < count; i++) {
        const dev = typeof net.getDeviceAt === "function" ? net.getDeviceAt(i) : null;
        if (dev && typeof (dev as any).getName === "function") names.push(String((dev as any).getName()));
      }
      return names;
    },
    getCommandLine: function (deviceName: string): PTCommandLine | null {
      const device = this.getDeviceByName(deviceName) as any;
      if (!device || typeof device.getCommandLine !== "function") return null;
      return device.getCommandLine() ?? null;
    },
    listDeviceNames: function (): string[] {
      return this.listDevices();
    },
    querySessionState: function (deviceName: string) {
      return terminal.getSession(deviceName);
    },
    getWorkspace: function () {
      return getLW();
    },
    now: function () {
      return Date.now();
    },
    safeJsonClone: function (data: any) {
      try {
        return JSON.parse(JSON.stringify(data));
      } catch (e) {
        return data;
      }
    },
    normalizePortName: function (name: string) {
      return String(name || "")
        .replace(/\s+/g, "")
        .toLowerCase();
    },
    dprint: safeDprint,
    createJob: function (plan: DeferredJobPlan): string {
      return executionEngine.startJob(plan).id;
    },
    getJobState: function (id: string) {
      const job = executionEngine.getJob(id);
      return job ? toKernelJobState(job.context) : null;
    },
    getActiveJobs: function (): Array<{ id: string; device: string; finished: boolean; state: string }> {
      return executionEngine.getActiveJobs().map(function (j: ActiveJob) {
        return {
          id: j.id,
          device: j.device,
          finished: executionEngine.isJobFinished(j.id),
          state: j.context.phase,
        };
      });
    },
    jobPayload: function (id: string) {
      const job = executionEngine.getJob(id);
      if (!job) return null;
      return job.context.plan.payload || null;
    },
  };
}

function getDependencies(subsystems: KernelSubsystems) {
  return {
    executionEngine: (subsystems as any).executionEngine,
    terminal: (subsystems as any).terminal,
    subsystems: subsystems,
  };
}

declare var dprint: (msg: string) => void;
```

## generated snippets
```
/Users/andresgaibor/pt-dev/main.js-1421-                if (!isAllowedType(sourceType, allowed)) {
/Users/andresgaibor/pt-dev/main.js-1422-                    logQueue("[queue-claim] control skip commands no permitido: " +
/Users/andresgaibor/pt-dev/main.js-1423-                        filename +
/Users/andresgaibor/pt-dev/main.js-1424-                        " tipo=" +
/Users/andresgaibor/pt-dev/main.js-1425-                        String(sourceType));
/Users/andresgaibor/pt-dev/main.js-1426-                    continue;
/Users/andresgaibor/pt-dev/main.js-1427-}
/Users/andresgaibor/pt-dev/main.js-1428-                logQueue("[queue-claim] control claim permitido: " + filename + " tipo=" + sourceType);
/Users/andresgaibor/pt-dev/main.js-1429-                var claimed = claimFromCommands(filename, srcPath, dstPath);
/Users/andresgaibor/pt-dev/main.js-1430-                if (claimed)
/Users/andresgaibor/pt-dev/main.js-1431-                    return claimed;
/Users/andresgaibor/pt-dev/main.js-1432-}
/Users/andresgaibor/pt-dev/main.js-1433-}
/Users/andresgaibor/pt-dev/main.js-1434-        catch (e_18_1) { e_18 = { error: e_18_1 }; }
/Users/andresgaibor/pt-dev/main.js-1435-        finally {
/Users/andresgaibor/pt-dev/main.js-1436-            try {
/Users/andresgaibor/pt-dev/main.js-1437-                if (files_3_1 && !files_3_1.done && (_a = files_3.return)) _a.call(files_3);
/Users/andresgaibor/pt-dev/main.js-1438-}
/Users/andresgaibor/pt-dev/main.js-1439-            finally { if (e_18) throw e_18.error; }
/Users/andresgaibor/pt-dev/main.js-1440-}
/Users/andresgaibor/pt-dev/main.js-1441-        return null;
/Users/andresgaibor/pt-dev/main.js-1442-}
/Users/andresgaibor/pt-dev/main.js-1443-    return { poll: poll, pollAllowedTypes: pollAllowedTypes, count: count };
/Users/andresgaibor/pt-dev/main.js-1444-}
/Users/andresgaibor/pt-dev/main.js-1445-function createCommandQueue(config) {
/Users/andresgaibor/pt-dev/main.js-1446-    var queueIndex = createQueueIndex(config.commandsDir);
/Users/andresgaibor/pt-dev/main.js-1447-    var queueDiscovery = createQueueDiscovery(config.commandsDir);
/Users/andresgaibor/pt-dev/main.js-1448-    var deadLetter = createDeadLetter(config.deadLetterDir);
/Users/andresgaibor/pt-dev/main.js-1449-    var cleanup = createQueueCleanup(config.commandsDir, config.inFlightDir, queueIndex);
/Users/andresgaibor/pt-dev/main.js-1450-    var claim = createQueueClaim(config.commandsDir, config.inFlightDir, queueIndex, queueDiscovery, deadLetter);
/Users/andresgaibor/pt-dev/main.js-1451-    return {
/Users/andresgaibor/pt-dev/main.js-1452-        poll: function () { return claim.poll(); },
/Users/andresgaibor/pt-dev/main.js-1453-        pollAllowedTypes: function (allowedTypes) { return claim.pollAllowedTypes(allowedTypes); },
/Users/andresgaibor/pt-dev/main.js-1454-        cleanup: function (filename) { return cleanup.cleanup(filename); },
/Users/andresgaibor/pt-dev/main.js-1455-        count: function () { return claim.count(); },
/Users/andresgaibor/pt-dev/main.js-1456-};
/Users/andresgaibor/pt-dev/main.js-1457-}
/Users/andresgaibor/pt-dev/main.js-1458-// ============================================================================
/Users/andresgaibor/pt-dev/main.js-1459-// IMPLEMENTACIÓN
/Users/andresgaibor/pt-dev/main.js-1460-// ============================================================================
/Users/andresgaibor/pt-dev/main.js:1461:function createExecutionEngine(terminal) {
/Users/andresgaibor/pt-dev/main.js-1462-    var jobs = {};
/Users/andresgaibor/pt-dev/main.js-1463-    function execLog(message) {
/Users/andresgaibor/pt-dev/main.js-1464-        try {
/Users/andresgaibor/pt-dev/main.js-1465-            dprint("[exec] " + message);
/Users/andresgaibor/pt-dev/main.js-1466-}
/Users/andresgaibor/pt-dev/main.js-1467-        catch (_a) { }
/Users/andresgaibor/pt-dev/main.js-1468-}
/Users/andresgaibor/pt-dev/main.js-1469-    function getJobTimeoutMs(job) {
/Users/andresgaibor/pt-dev/main.js-1470-        var commandTimeout = Number(job.context.plan.options.commandTimeoutMs || 30000);
/Users/andresgaibor/pt-dev/main.js-1471-        var stallTimeout = Number(job.context.plan.options.stallTimeoutMs || 15000);
/Users/andresgaibor/pt-dev/main.js-1472-        return Math.max(commandTimeout + stallTimeout + 2000, 5000);
/Users/andresgaibor/pt-dev/main.js-1473-}
/Users/andresgaibor/pt-dev/main.js-1474-    function isJobFinished(jobId) {
/Users/andresgaibor/pt-dev/main.js-1475-        var job = jobs[jobId];
/Users/andresgaibor/pt-dev/main.js-1476-        if (!job)
/Users/andresgaibor/pt-dev/main.js-1477-            return true;
/Users/andresgaibor/pt-dev/main.js-1478-        return job.context.finished === true || job.context.phase === "completed" || job.context.phase === "error";
/Users/andresgaibor/pt-dev/main.js-1479-}
/Users/andresgaibor/pt-dev/main.js-1480-    function createJobContext(plan) {
/Users/andresgaibor/pt-dev/main.js-1481-        var now = Date.now();
/Users/andresgaibor/pt-dev/main.js-1482-        return {
/Users/andresgaibor/pt-dev/main.js-1483-            plan: plan,
/Users/andresgaibor/pt-dev/main.js-1484-            currentStep: 0,
/Users/andresgaibor/pt-dev/main.js-1485-            phase: "pending",
/Users/andresgaibor/pt-dev/main.js-1486-            outputBuffer: "",
/Users/andresgaibor/pt-dev/main.js-1487-            startedAt: now,
/Users/andresgaibor/pt-dev/main.js-1488-            updatedAt: now,
/Users/andresgaibor/pt-dev/main.js-1489-            stepResults: [],
/Users/andresgaibor/pt-dev/main.js-1490-            lastMode: "unknown",
/Users/andresgaibor/pt-dev/main.js-1491-            lastPrompt: "",
/Users/andresgaibor/pt-dev/main.js-1492-            paged: false,
/Users/andresgaibor/pt-dev/main.js-1493-            waitingForCommandEnd: false,
/Users/andresgaibor/pt-dev/main.js-1494-            finished: false,
/Users/andresgaibor/pt-dev/main.js-1495-            result: null,
/Users/andresgaibor/pt-dev/main.js-1496-            error: null,
/Users/andresgaibor/pt-dev/main.js-1497-            errorCode: null,
/Users/andresgaibor/pt-dev/main.js-1498-            pendingDelay: null,
/Users/andresgaibor/pt-dev/main.js-1499-            waitingForConfirm: false,
/Users/andresgaibor/pt-dev/main.js-1500-};
/Users/andresgaibor/pt-dev/main.js-1501-}
/Users/andresgaibor/pt-dev/main.js-1502-    function resolvePacketTracerIpc() {
/Users/andresgaibor/pt-dev/main.js-1503-        // 1. self — funciona en PT QTScript, browsers y Node
/Users/andresgaibor/pt-dev/main.js-1504-        try {
/Users/andresgaibor/pt-dev/main.js-1505-            if (typeof self !== "undefined" && self) {
/Users/andresgaibor/pt-dev/main.js-1506-                var root = self;
/Users/andresgaibor/pt-dev/main.js-1507-                if (root.ipc && typeof root.ipc.network === "function") {
/Users/andresgaibor/pt-dev/main.js-1508-                    return root.ipc;
/Users/andresgaibor/pt-dev/main.js-1509-}
/Users/andresgaibor/pt-dev/main.js-1510-}
/Users/andresgaibor/pt-dev/main.js-1511-}
/Users/andresgaibor/pt-dev/main.js-1512-        catch (_a) { }
/Users/andresgaibor/pt-dev/main.js-1513-        // 2. Free variable 'ipc' — Packet Tracer nativo (QTScript)
/Users/andresgaibor/pt-dev/main.js-1514-        try {
/Users/andresgaibor/pt-dev/main.js-1515-            if (typeof ipc !== "undefined" && ipc && typeof ipc.network === "function") {
/Users/andresgaibor/pt-dev/main.js-1516-                return ipc;
/Users/andresgaibor/pt-dev/main.js-1517-}
/Users/andresgaibor/pt-dev/main.js-1518-}
/Users/andresgaibor/pt-dev/main.js-1519-        catch (_b) { }
/Users/andresgaibor/pt-dev/main.js-1520-        // 3. _ScriptModule.context.ipc — fallback PT
/Users/andresgaibor/pt-dev/main.js-1521-        try {
/Users/andresgaibor/pt-dev/main.js-1522-            if (typeof _ScriptModule !== "undefined" && _ScriptModule) {
/Users/andresgaibor/pt-dev/main.js-1523-                var scriptModule = _ScriptModule;
/Users/andresgaibor/pt-dev/main.js-1524-                var context = scriptModule.context;
/Users/andresgaibor/pt-dev/main.js-1525-                var scriptModuleIpc = context && context.ipc;
/Users/andresgaibor/pt-dev/main.js-1526-                if (scriptModuleIpc && typeof scriptModuleIpc.network === "function") {
/Users/andresgaibor/pt-dev/main.js-1527-                    return scriptModuleIpc;
/Users/andresgaibor/pt-dev/main.js-1528-}
/Users/andresgaibor/pt-dev/main.js-1529-}
/Users/andresgaibor/pt-dev/main.js-1530-}
/Users/andresgaibor/pt-dev/main.js-1531-        catch (_c) { }
/Users/andresgaibor/pt-dev/main.js-1532-        return null;
/Users/andresgaibor/pt-dev/main.js-1533-}
/Users/andresgaibor/pt-dev/main.js-1534-    function readTerminalTextSafe(term) {
/Users/andresgaibor/pt-dev/main.js-1535-        var methods = [
/Users/andresgaibor/pt-dev/main.js-1536-            "getAllOutput",
/Users/andresgaibor/pt-dev/main.js-1537-            "getBuffer",
/Users/andresgaibor/pt-dev/main.js-1538-            "getOutput",
/Users/andresgaibor/pt-dev/main.js-1539-            "getText",
/Users/andresgaibor/pt-dev/main.js-1540-            "readAll",
/Users/andresgaibor/pt-dev/main.js-1541-            "read",
--
/Users/andresgaibor/pt-dev/main.js-2504-        var device = job.device;
/Users/andresgaibor/pt-dev/main.js-2505-        var jobIdStr = job.id;
/Users/andresgaibor/pt-dev/main.js-2506-        for (var key in jobs) {
/Users/andresgaibor/pt-dev/main.js-2507-            if (key === jobIdStr)
/Users/andresgaibor/pt-dev/main.js-2508-                continue;
/Users/andresgaibor/pt-dev/main.js-2509-            var other = jobs[key];
/Users/andresgaibor/pt-dev/main.js-2510-            if (!isJobFinished(key) && other.device === device && other.pendingCommand !== null) {
/Users/andresgaibor/pt-dev/main.js-2511-                return;
/Users/andresgaibor/pt-dev/main.js-2512-}
/Users/andresgaibor/pt-dev/main.js-2513-}
/Users/andresgaibor/pt-dev/main.js-2514-        if (job.context.paged) {
/Users/andresgaibor/pt-dev/main.js-2515-            terminal.continuePager(job.device);
/Users/andresgaibor/pt-dev/main.js-2516-            job.context.paged = false;
/Users/andresgaibor/pt-dev/main.js-2517-}
/Users/andresgaibor/pt-dev/main.js-2518-        executeCurrentStep(job);
/Users/andresgaibor/pt-dev/main.js-2519-}
/Users/andresgaibor/pt-dev/main.js-2520-    return {
/Users/andresgaibor/pt-dev/main.js-2521-        startJob: function (plan) {
/Users/andresgaibor/pt-dev/main.js-2522-            execLog("START JOB id=" + plan.id + " device=" + plan.device + " steps=" + plan.plan.length);
/Users/andresgaibor/pt-dev/main.js-2523-            var context = createJobContext(plan);
/Users/andresgaibor/pt-dev/main.js-2524-            var job = {
/Users/andresgaibor/pt-dev/main.js-2525-                id: plan.id,
/Users/andresgaibor/pt-dev/main.js-2526-                device: plan.device,
/Users/andresgaibor/pt-dev/main.js-2527-                context: context,
/Users/andresgaibor/pt-dev/main.js-2528-                pendingCommand: null,
/Users/andresgaibor/pt-dev/main.js-2529-};
/Users/andresgaibor/pt-dev/main.js-2530-            jobs[plan.id] = job;
/Users/andresgaibor/pt-dev/main.js-2531-            var attached = tryAttachTerminal(plan.device);
/Users/andresgaibor/pt-dev/main.js-2532-            if (!attached) {
/Users/andresgaibor/pt-dev/main.js-2533-                context.phase = "error";
/Users/andresgaibor/pt-dev/main.js-2534-                context.finished = true;
/Users/andresgaibor/pt-dev/main.js-2535-                context.error = "No terminal attached to " + plan.device;
/Users/andresgaibor/pt-dev/main.js-2536-                context.errorCode = "NO_TERMINAL_ATTACHED";
/Users/andresgaibor/pt-dev/main.js-2537-                context.updatedAt = Date.now();
/Users/andresgaibor/pt-dev/main.js-2538-                return job;
/Users/andresgaibor/pt-dev/main.js-2539-}
/Users/andresgaibor/pt-dev/main.js-2540-            advanceJob(plan.id);
/Users/andresgaibor/pt-dev/main.js-2541-            return job;
/Users/andresgaibor/pt-dev/main.js-2542-        },
/Users/andresgaibor/pt-dev/main.js-2543-        advanceJob: advanceJob,
/Users/andresgaibor/pt-dev/main.js:2544:        getJob: function (id) {
/Users/andresgaibor/pt-dev/main.js-2545-            execLog("GET JOB STATE id=" + id + " invoking reapStaleJobs");
/Users/andresgaibor/pt-dev/main.js-2546-            reapStaleJobs();
/Users/andresgaibor/pt-dev/main.js-2547-            return jobs[id] || null;
/Users/andresgaibor/pt-dev/main.js-2548-        },
/Users/andresgaibor/pt-dev/main.js:2549:        getJobState: function (id) {
/Users/andresgaibor/pt-dev/main.js-2550-            execLog("GET JOB STATE id=" + id + " invoking reapStaleJobs");
/Users/andresgaibor/pt-dev/main.js-2551-            reapStaleJobs();
/Users/andresgaibor/pt-dev/main.js-2552-            return jobs[id] ? jobs[id].context : null;
/Users/andresgaibor/pt-dev/main.js-2553-        },
/Users/andresgaibor/pt-dev/main.js-2554-        getActiveJobs: function () {
/Users/andresgaibor/pt-dev/main.js-2555-            reapStaleJobs();
/Users/andresgaibor/pt-dev/main.js-2556-            var active = [];
/Users/andresgaibor/pt-dev/main.js-2557-            for (var key in jobs) {
/Users/andresgaibor/pt-dev/main.js-2558-                if (!isJobFinished(key)) {
/Users/andresgaibor/pt-dev/main.js-2559-                    active.push(jobs[key]);
/Users/andresgaibor/pt-dev/main.js-2560-}
/Users/andresgaibor/pt-dev/main.js-2561-}
/Users/andresgaibor/pt-dev/main.js-2562-            return active;
/Users/andresgaibor/pt-dev/main.js-2563-        },
/Users/andresgaibor/pt-dev/main.js-2564-        isJobFinished: isJobFinished,
/Users/andresgaibor/pt-dev/main.js-2565-};
/Users/andresgaibor/pt-dev/main.js-2566-}
/Users/andresgaibor/pt-dev/main.js-2567-// ============================================================================
/Users/andresgaibor/pt-dev/main.js-2568-// SERIALIZACIÓN
/Users/andresgaibor/pt-dev/main.js-2569-// ============================================================================
/Users/andresgaibor/pt-dev/main.js-2570-function toKernelJobState(ctx) {
/Users/andresgaibor/pt-dev/main.js-2571-    var base = {
/Users/andresgaibor/pt-dev/main.js-2572-        id: ctx.plan.id,
/Users/andresgaibor/pt-dev/main.js-2573-        device: ctx.plan.device,
/Users/andresgaibor/pt-dev/main.js-2574-        plan: ctx.plan,
/Users/andresgaibor/pt-dev/main.js-2575-        currentStep: ctx.currentStep,
/Users/andresgaibor/pt-dev/main.js-2576-        state: ctx.phase,
/Users/andresgaibor/pt-dev/main.js-2577-        outputBuffer: ctx.outputBuffer,
/Users/andresgaibor/pt-dev/main.js-2578-        startedAt: ctx.startedAt,
/Users/andresgaibor/pt-dev/main.js-2579-        updatedAt: ctx.updatedAt,
/Users/andresgaibor/pt-dev/main.js-2580-        stepResults: ctx.stepResults,
/Users/andresgaibor/pt-dev/main.js-2581-        lastMode: ctx.lastMode,
/Users/andresgaibor/pt-dev/main.js-2582-        lastPrompt: ctx.lastPrompt,
/Users/andresgaibor/pt-dev/main.js-2583-        paged: ctx.paged,
/Users/andresgaibor/pt-dev/main.js-2584-        waitingForCommandEnd: ctx.waitingForCommandEnd,
/Users/andresgaibor/pt-dev/main.js-2585-        finished: ctx.finished,
/Users/andresgaibor/pt-dev/main.js-2586-        done: ctx.finished,
/Users/andresgaibor/pt-dev/main.js-2587-        error: ctx.error,
/Users/andresgaibor/pt-dev/main.js-2588-        errorCode: ctx.errorCode,
/Users/andresgaibor/pt-dev/main.js-2589-};
/Users/andresgaibor/pt-dev/main.js-2590-    if (ctx.result && ctx.result.ok) {
/Users/andresgaibor/pt-dev/main.js-2591-        base.result = {
/Users/andresgaibor/pt-dev/main.js-2592-            ok: true,
/Users/andresgaibor/pt-dev/main.js-2593-            raw: ctx.result.output,
/Users/andresgaibor/pt-dev/main.js-2594-            status: ctx.result.status,
/Users/andresgaibor/pt-dev/main.js-2595-            session: ctx.result.session,
/Users/andresgaibor/pt-dev/main.js-2596-};
/Users/andresgaibor/pt-dev/main.js-2597-        return base;
/Users/andresgaibor/pt-dev/main.js-2598-}
/Users/andresgaibor/pt-dev/main.js-2599-    base.result = null;
/Users/andresgaibor/pt-dev/main.js-2600-    return base;
/Users/andresgaibor/pt-dev/main.js-2601-}
/Users/andresgaibor/pt-dev/main.js-2602-function createLeaseManager(config) {
/Users/andresgaibor/pt-dev/main.js-2603-    var interval = null;
/Users/andresgaibor/pt-dev/main.js-2604-    var stopped = false;
/Users/andresgaibor/pt-dev/main.js-2605-    function validate() {
/Users/andresgaibor/pt-dev/main.js-2606-        try {
/Users/andresgaibor/pt-dev/main.js-2607-            var s = safeFM();
/Users/andresgaibor/pt-dev/main.js-2608-            if (!s.available || !s.fm) {
/Users/andresgaibor/pt-dev/main.js-2609-                dprint("[LEASE] fm unavailable — cannot validate lease");
/Users/andresgaibor/pt-dev/main.js-2610-                return false;
/Users/andresgaibor/pt-dev/main.js-2611-}
/Users/andresgaibor/pt-dev/main.js-2612-            var _fm = s.fm;
/Users/andresgaibor/pt-dev/main.js-2613-            var leaseFile = config.devDir + "/bridge-lease.json";
/Users/andresgaibor/pt-dev/main.js-2614-            if (!_fm.fileExists(leaseFile)) {
/Users/andresgaibor/pt-dev/main.js-2615-                dprint("[LEASE] No lease file found");
/Users/andresgaibor/pt-dev/main.js-2616-                return false;
/Users/andresgaibor/pt-dev/main.js-2617-}
/Users/andresgaibor/pt-dev/main.js-2618-            var content = _fm.getFileContents(leaseFile);
/Users/andresgaibor/pt-dev/main.js-2619-            if (!content || content.trim().length === 0) {
/Users/andresgaibor/pt-dev/main.js-2620-                dprint("[LEASE] Lease file empty");
/Users/andresgaibor/pt-dev/main.js-2621-                return false;
/Users/andresgaibor/pt-dev/main.js-2622-}
/Users/andresgaibor/pt-dev/main.js-2623-            var lease = JSON.parse(content);
/Users/andresgaibor/pt-dev/main.js-2624-            if (!lease.ownerId || !lease.expiresAt) {
/Users/andresgaibor/pt-dev/main.js-2625-                dprint("[LEASE] Lease invalid: missing ownerId or expiresAt");
/Users/andresgaibor/pt-dev/main.js-2626-                return false;
/Users/andresgaibor/pt-dev/main.js-2627-}
/Users/andresgaibor/pt-dev/main.js-2628-            var now = Date.now();
/Users/andresgaibor/pt-dev/main.js-2629-            if (now > lease.expiresAt) {
--
/Users/andresgaibor/pt-dev/main.js-2936-            for (var i = 0; i < count; i++) {
/Users/andresgaibor/pt-dev/main.js-2937-                var dev = typeof net.getDeviceAt === "function" ? net.getDeviceAt(i) : null;
/Users/andresgaibor/pt-dev/main.js-2938-                if (dev && typeof dev.getName === "function")
/Users/andresgaibor/pt-dev/main.js-2939-                    names.push(String(dev.getName()));
/Users/andresgaibor/pt-dev/main.js-2940-}
/Users/andresgaibor/pt-dev/main.js-2941-            return names;
/Users/andresgaibor/pt-dev/main.js-2942-        },
/Users/andresgaibor/pt-dev/main.js-2943-        getCommandLine: function (deviceName) {
/Users/andresgaibor/pt-dev/main.js-2944-            var _a;
/Users/andresgaibor/pt-dev/main.js-2945-            var device = this.getDeviceByName(deviceName);
/Users/andresgaibor/pt-dev/main.js-2946-            if (!device || typeof device.getCommandLine !== "function")
/Users/andresgaibor/pt-dev/main.js-2947-                return null;
/Users/andresgaibor/pt-dev/main.js-2948-            return (_a = device.getCommandLine()) !== null && _a !== void 0 ? _a : null;
/Users/andresgaibor/pt-dev/main.js-2949-        },
/Users/andresgaibor/pt-dev/main.js-2950-        listDeviceNames: function () {
/Users/andresgaibor/pt-dev/main.js-2951-            return this.listDevices();
/Users/andresgaibor/pt-dev/main.js-2952-        },
/Users/andresgaibor/pt-dev/main.js-2953-        querySessionState: function (deviceName) {
/Users/andresgaibor/pt-dev/main.js-2954-            return terminal.getSession(deviceName);
/Users/andresgaibor/pt-dev/main.js-2955-        },
/Users/andresgaibor/pt-dev/main.js-2956-        getWorkspace: function () {
/Users/andresgaibor/pt-dev/main.js-2957-            return getLW();
/Users/andresgaibor/pt-dev/main.js-2958-        },
/Users/andresgaibor/pt-dev/main.js-2959-        now: function () {
/Users/andresgaibor/pt-dev/main.js-2960-            return Date.now();
/Users/andresgaibor/pt-dev/main.js-2961-        },
/Users/andresgaibor/pt-dev/main.js-2962-        safeJsonClone: function (data) {
/Users/andresgaibor/pt-dev/main.js-2963-            try {
/Users/andresgaibor/pt-dev/main.js-2964-                return JSON.parse(JSON.stringify(data));
/Users/andresgaibor/pt-dev/main.js-2965-}
/Users/andresgaibor/pt-dev/main.js-2966-            catch (e) {
/Users/andresgaibor/pt-dev/main.js-2967-                return data;
/Users/andresgaibor/pt-dev/main.js-2968-}
/Users/andresgaibor/pt-dev/main.js-2969-        },
/Users/andresgaibor/pt-dev/main.js-2970-        normalizePortName: function (name) {
/Users/andresgaibor/pt-dev/main.js-2971-            return String(name || "")
/Users/andresgaibor/pt-dev/main.js-2972-                .replace(/\s+/g, "")
/Users/andresgaibor/pt-dev/main.js-2973-                .toLowerCase();
/Users/andresgaibor/pt-dev/main.js-2974-        },
/Users/andresgaibor/pt-dev/main.js-2975-        dprint: safeDprint,
/Users/andresgaibor/pt-dev/main.js:2976:        createJob: function (plan) {
/Users/andresgaibor/pt-dev/main.js-2977-            return executionEngine.startJob(plan).id;
/Users/andresgaibor/pt-dev/main.js-2978-        },
/Users/andresgaibor/pt-dev/main.js:2979:        getJobState: function (id) {
/Users/andresgaibor/pt-dev/main.js-2980-            var job = executionEngine.getJob(id);
/Users/andresgaibor/pt-dev/main.js-2981-            return job ? toKernelJobState(job.context) : null;
/Users/andresgaibor/pt-dev/main.js-2982-        },
/Users/andresgaibor/pt-dev/main.js-2983-        getActiveJobs: function () {
/Users/andresgaibor/pt-dev/main.js-2984-            return executionEngine.getActiveJobs().map(function (j) {
/Users/andresgaibor/pt-dev/main.js-2985-                return {
/Users/andresgaibor/pt-dev/main.js-2986-                    id: j.id,
/Users/andresgaibor/pt-dev/main.js-2987-                    device: j.device,
/Users/andresgaibor/pt-dev/main.js-2988-                    finished: executionEngine.isJobFinished(j.id),
/Users/andresgaibor/pt-dev/main.js-2989-                    state: j.context.phase,
/Users/andresgaibor/pt-dev/main.js-2990-};
/Users/andresgaibor/pt-dev/main.js-2991-            });
/Users/andresgaibor/pt-dev/main.js-2992-        },
/Users/andresgaibor/pt-dev/main.js-2993-        jobPayload: function (id) {
/Users/andresgaibor/pt-dev/main.js-2994-            var job = executionEngine.getJob(id);
/Users/andresgaibor/pt-dev/main.js-2995-            if (!job)
/Users/andresgaibor/pt-dev/main.js-2996-                return null;
/Users/andresgaibor/pt-dev/main.js-2997-            return job.context.plan.payload || null;
/Users/andresgaibor/pt-dev/main.js-2998-        },
/Users/andresgaibor/pt-dev/main.js-2999-};
/Users/andresgaibor/pt-dev/main.js-3000-}
/Users/andresgaibor/pt-dev/main.js-3001-function getDependencies(subsystems) {
/Users/andresgaibor/pt-dev/main.js-3002-    return {
/Users/andresgaibor/pt-dev/main.js-3003-        executionEngine: subsystems.executionEngine,
/Users/andresgaibor/pt-dev/main.js-3004-        terminal: subsystems.terminal,
/Users/andresgaibor/pt-dev/main.js-3005-        subsystems: subsystems,
/Users/andresgaibor/pt-dev/main.js-3006-};
/Users/andresgaibor/pt-dev/main.js-3007-}
/Users/andresgaibor/pt-dev/main.js-3008-// --- pt/kernel/command-result-envelope.ts ---
/Users/andresgaibor/pt-dev/main.js-3009-// packages/pt-runtime/src/pt/kernel/command-result-envelope.ts
/Users/andresgaibor/pt-dev/main.js-3010-// Construye el envelope de resultado sin tocar el filesystem.
/Users/andresgaibor/pt-dev/main.js-3011-function buildCommandResultEnvelope(activeCommand, result, completedAt) {
/Users/andresgaibor/pt-dev/main.js-3012-    var _a, _b, _c;
/Users/andresgaibor/pt-dev/main.js-3013-    if (completedAt === void 0) { completedAt = Date.now(); }
/Users/andresgaibor/pt-dev/main.js-3014-    var type = String((_a = activeCommand.type) !== null && _a !== void 0 ? _a : "").trim() || "unknown";
/Users/andresgaibor/pt-dev/main.js-3015-    return {
/Users/andresgaibor/pt-dev/main.js-3016-        protocolVersion: 2,
/Users/andresgaibor/pt-dev/main.js-3017-        id: activeCommand.id,
/Users/andresgaibor/pt-dev/main.js-3018-        seq: activeCommand.seq || 0,
/Users/andresgaibor/pt-dev/main.js-3019-        type: type,
/Users/andresgaibor/pt-dev/main.js-3020-        startedAt: activeCommand.startedAt,
/Users/andresgaibor/pt-dev/main.js-3021-        completedAt: completedAt,
/Users/andresgaibor/pt-dev/main.js-3022-        status: (result === null || result === void 0 ? void 0 : result.ok) === false ? "failed" : "completed",
/Users/andresgaibor/pt-dev/main.js-3023-        ok: (result === null || result === void 0 ? void 0 : result.ok) !== false,
/Users/andresgaibor/pt-dev/main.js-3024-        value: result,
/Users/andresgaibor/pt-dev/main.js-3025-        error: (result === null || result === void 0 ? void 0 : result.ok) === false
/Users/andresgaibor/pt-dev/main.js-3026-            ? {
/Users/andresgaibor/pt-dev/main.js-3027-                code: (_b = result === null || result === void 0 ? void 0 : result.code) !== null && _b !== void 0 ? _b : "EXECUTION_ERROR",
/Users/andresgaibor/pt-dev/main.js-3028-                message: String((_c = result === null || result === void 0 ? void 0 : result.error) !== null && _c !== void 0 ? _c : "Command failed"),
/Users/andresgaibor/pt-dev/main.js-3029-                phase: "execution",
/Users/andresgaibor/pt-dev/main.js-3030-}
/Users/andresgaibor/pt-dev/main.js-3031-            : undefined,
/Users/andresgaibor/pt-dev/main.js-3032-};
/Users/andresgaibor/pt-dev/main.js-3033-}
/Users/andresgaibor/pt-dev/main.js-3034-// --- pt/kernel/command-finalizer.ts ---
/Users/andresgaibor/pt-dev/main.js-3035-// packages/pt-runtime/src/pt/kernel/command-finalizer.ts
/Users/andresgaibor/pt-dev/main.js-3036-// Finaliza comandos activos: escribe resultados y limpia la cola
/Users/andresgaibor/pt-dev/main.js-3037-function finishActiveCommand(subsystems, state, result) {
/Users/andresgaibor/pt-dev/main.js-3038-    if (!state.activeCommand) {
/Users/andresgaibor/pt-dev/main.js-3039-        subsystems.kernelLogSubsystem("queue", "finishActiveCommand: no active command");
/Users/andresgaibor/pt-dev/main.js-3040-        return;
/Users/andresgaibor/pt-dev/main.js-3041-}
/Users/andresgaibor/pt-dev/main.js-3042-    var cmdId = state.activeCommand.id;
/Users/andresgaibor/pt-dev/main.js-3043-    subsystems.kernelLog("<<< COMPLETING: " + cmdId + " ok=" + ((result === null || result === void 0 ? void 0 : result.ok) !== false), "info");
/Users/andresgaibor/pt-dev/main.js-3044-    try {
/Users/andresgaibor/pt-dev/main.js-3045-        var envelope = buildCommandResultEnvelope(state.activeCommand, result);
/Users/andresgaibor/pt-dev/main.js-3046-        var resPath = subsystems.config.resultsDir + "/" + state.activeCommand.id + ".json";
/Users/andresgaibor/pt-dev/main.js-3047-        var fm_1 = safeFM().fm;
/Users/andresgaibor/pt-dev/main.js-3048-        if (fm_1) {
/Users/andresgaibor/pt-dev/main.js-3049-            subsystems.kernelLogSubsystem("fm", "Writing result to " + resPath);
/Users/andresgaibor/pt-dev/main.js-3050-            fm_1.writePlainTextToFile(resPath, JSON.stringify(envelope));
/Users/andresgaibor/pt-dev/main.js-3051-            subsystems.kernelLogSubsystem("fm", "Result written OK");
/Users/andresgaibor/pt-dev/main.js-3052-            if (state.activeCommandFilename) {
/Users/andresgaibor/pt-dev/main.js-3053-                subsystems.kernelLogSubsystem("queue", "Cleaning up " + state.activeCommandFilename);
/Users/andresgaibor/pt-dev/main.js-3054-                subsystems.queue.cleanup(state.activeCommandFilename);
/Users/andresgaibor/pt-dev/main.js-3055-                subsystems.heartbeat.setQueuedCount(subsystems.queue.count());
/Users/andresgaibor/pt-dev/main.js-3056-}
/Users/andresgaibor/pt-dev/main.js-3057-}
/Users/andresgaibor/pt-dev/main.js-3058-        else {
/Users/andresgaibor/pt-dev/main.js-3059-            subsystems.kernelLog("FM unavailable, cannot write result", "error");
/Users/andresgaibor/pt-dev/main.js-3060-}
/Users/andresgaibor/pt-dev/main.js-3061-}
/Users/andresgaibor/pt-dev/main.js-3062-    catch (e) {
/Users/andresgaibor/pt-dev/main.js-3063-        subsystems.kernelLog("ERROR saving result for " + cmdId + ": " + String(e), "error");
/Users/andresgaibor/pt-dev/main.js-3064-}
/Users/andresgaibor/pt-dev/main.js-3065-    state.activeCommand = null;
/Users/andresgaibor/pt-dev/main.js-3066-    state.activeCommandFilename = null;
/Users/andresgaibor/pt-dev/main.js-3067-    subsystems.heartbeat.setActiveCommand(null);
/Users/andresgaibor/pt-dev/main.js-3068-}
/Users/andresgaibor/pt-dev/main.js-3069-// --- pt/kernel/queue-poller.ts ---
/Users/andresgaibor/pt-dev/main.js-3070-// packages/pt-runtime/src/pt/kernel/queue-poller.ts
/Users/andresgaibor/pt-dev/main.js-3071-// Poll de la cola de comandos
/Users/andresgaibor/pt-dev/main.js-3072-function pollCommandQueue(subsystems, state) {
/Users/andresgaibor/pt-dev/main.js-3073-    var _a;
/Users/andresgaibor/pt-dev/main.js-3074-    var queue = subsystems.queue, runtimeLoader = subsystems.runtimeLoader, executionEngine = subsystems.executionEngine, terminal = subsystems.terminal, heartbeat = subsystems.heartbeat, config = subsystems.config, kernelLog = subsystems.kernelLog, kernelLogSubsystem = subsystems.kernelLogSubsystem;
/Users/andresgaibor/pt-dev/main.js-3075-    kernelLogSubsystem("queue", "poll tick: isRunning=" +
/Users/andresgaibor/pt-dev/main.js-3076-        state.isRunning +
/Users/andresgaibor/pt-dev/main.js-3077-        " isShuttingDown=" +
/Users/andresgaibor/pt-dev/main.js-3078-        state.isShuttingDown +
/Users/andresgaibor/pt-dev/main.js-3079-        " active=" +
/Users/andresgaibor/pt-dev/main.js-3080-        (state.activeCommand ? state.activeCommand.id : "null"));
/Users/andresgaibor/pt-dev/main.js-3081-    if (!state.isRunning || state.isShuttingDown)
/Users/andresgaibor/pt-dev/main.js-3082-        return;
/Users/andresgaibor/pt-dev/main.js-3083-    if (state.activeCommand) {
/Users/andresgaibor/pt-dev/main.js-3084-        kernelLogSubsystem("queue", "Skipping poll: command already active=" + state.activeCommand.id);
/Users/andresgaibor/pt-dev/main.js-3085-        return;
/Users/andresgaibor/pt-dev/main.js-3086-}
/Users/andresgaibor/pt-dev/main.js-3087-    var activeJobs = executionEngine.getActiveJobs();
/Users/andresgaibor/pt-dev/main.js-3088-    var terminalIsBusy = typeof terminal.isAnyBusy === "function" ? terminal.isAnyBusy() : false;
/Users/andresgaibor/pt-dev/main.js-3089-    var isBusy = activeJobs.length > 0 || terminalIsBusy;
/Users/andresgaibor/pt-dev/main.js-3090-    kernelLogSubsystem("loader", "Checking runtime reload... busy=" + isBusy);
/Users/andresgaibor/pt-dev/main.js-3091-    runtimeLoader.reloadIfNeeded(function () { return isBusy; });
/Users/andresgaibor/pt-dev/main.js-3092-    var claimed = null;
/Users/andresgaibor/pt-dev/main.js-3093-    if (isBusy) {
/Users/andresgaibor/pt-dev/main.js-3094-        claimed =
/Users/andresgaibor/pt-dev/main.js-3095-            typeof queue.pollAllowedTypes === "function"
/Users/andresgaibor/pt-dev/main.js:3096:                ? queue.pollAllowedTypes(["__pollDeferred", "__ping"])
/Users/andresgaibor/pt-dev/main.js-3097-                : null;
/Users/andresgaibor/pt-dev/main.js-3098-        if (!claimed) {
/Users/andresgaibor/pt-dev/main.js-3099-            kernelLogSubsystem("queue", "System busy, skipping non-control poll. Active jobs=" +
/Users/andresgaibor/pt-dev/main.js-3100-                activeJobs.length +
/Users/andresgaibor/pt-dev/main.js-3101-                " terminalBusy=" +
/Users/andresgaibor/pt-dev/main.js-3102-                terminalIsBusy);
/Users/andresgaibor/pt-dev/main.js-3103-            heartbeat.setQueuedCount(queue.count());
/Users/andresgaibor/pt-dev/main.js-3104-            return;
/Users/andresgaibor/pt-dev/main.js-3105-}
/Users/andresgaibor/pt-dev/main.js-3106-        kernelLogSubsystem("queue", "System busy, but processing control command=" +
/Users/andresgaibor/pt-dev/main.js-3107-            claimed.id +
/Users/andresgaibor/pt-dev/main.js-3108-            " type=" +
/Users/andresgaibor/pt-dev/main.js-3109-            String(claimed.type));
/Users/andresgaibor/pt-dev/main.js-3110-}
/Users/andresgaibor/pt-dev/main.js-3111-    else {
/Users/andresgaibor/pt-dev/main.js-3112-        claimed = queue.poll();
/Users/andresgaibor/pt-dev/main.js-3113-}
/Users/andresgaibor/pt-dev/main.js-3114-    kernelLogSubsystem("queue", "Poll result: claimed=" + (claimed ? claimed.id : "null"));
/Users/andresgaibor/pt-dev/main.js-3115-    if (!claimed) {
/Users/andresgaibor/pt-dev/main.js-3116-        kernelLogSubsystem("queue", "No command claimed, checking files...");
/Users/andresgaibor/pt-dev/main.js-3117-        heartbeat.setQueuedCount(queue.count());
/Users/andresgaibor/pt-dev/main.js-3118-        return;
/Users/andresgaibor/pt-dev/main.js-3119-}
/Users/andresgaibor/pt-dev/main.js-3120-    state.activeCommand = __assign(__assign({}, claimed), { startedAt: Date.now() });
/Users/andresgaibor/pt-dev/main.js-3121-    state.activeCommandFilename = (_a = claimed.filename) !== null && _a !== void 0 ? _a : null;
/Users/andresgaibor/pt-dev/main.js-3122-    heartbeat.setActiveCommand(claimed.id);
/Users/andresgaibor/pt-dev/main.js-3123-    kernelLog(">>> DISPATCH: " + claimed.id + " type=" + (claimed.type || "unknown"), "info");
/Users/andresgaibor/pt-dev/main.js-3124-    try {
/Users/andresgaibor/pt-dev/main.js-3125-        var runtimeFn = runtimeLoader.getRuntimeFn();
/Users/andresgaibor/pt-dev/main.js-3126-        if (!runtimeFn) {
/Users/andresgaibor/pt-dev/main.js-3127-            kernelLog("RUNTIME NOT LOADED - rejecting command", "error");
/Users/andresgaibor/pt-dev/main.js-3128-            finishActiveCommand(subsystems, state, {
/Users/andresgaibor/pt-dev/main.js-3129-                ok: false,
/Users/andresgaibor/pt-dev/main.js-3130-                error: "Runtime not loaded",
/Users/andresgaibor/pt-dev/main.js-3131-                code: "RUNTIME_NOT_FOUND",
/Users/andresgaibor/pt-dev/main.js-3132-            });
/Users/andresgaibor/pt-dev/main.js-3133-            return;
/Users/andresgaibor/pt-dev/main.js-3134-}
/Users/andresgaibor/pt-dev/main.js-3135-        var runtimeApi = createRuntimeApi(subsystems);
/Users/andresgaibor/pt-dev/main.js-3136-        Promise.resolve(runtimeFn(claimed.payload, runtimeApi))
/Users/andresgaibor/pt-dev/main.js-3137-            .then(function (result) {
/Users/andresgaibor/pt-dev/main.js-3138-            try {
/Users/andresgaibor/pt-dev/main.js-3139-                var keys = result && typeof result === "object" ? Object.keys(result) : [];
/Users/andresgaibor/pt-dev/main.js-3140-                kernelLogSubsystem("queue", "runtime result resolved type=" +
/Users/andresgaibor/pt-dev/main.js-3141-                    typeof result +
/Users/andresgaibor/pt-dev/main.js-3142-                    " keys=" +
/Users/andresgaibor/pt-dev/main.js-3143-                    keys.join(",") +
/Users/andresgaibor/pt-dev/main.js-3144-                    " ok=" +
/Users/andresgaibor/pt-dev/main.js-3145-                    String(result === null || result === void 0 ? void 0 : result.ok));
/Users/andresgaibor/pt-dev/main.js-3146-}
/Users/andresgaibor/pt-dev/main.js-3147-            catch (debugError) {
/Users/andresgaibor/pt-dev/main.js-3148-                kernelLogSubsystem("queue", "runtime result debug failed: " + String(debugError));
/Users/andresgaibor/pt-dev/main.js-3149-}
/Users/andresgaibor/pt-dev/main.js-3150-            finishActiveCommand(subsystems, state, result);
/Users/andresgaibor/pt-dev/main.js-3151-        })
/Users/andresgaibor/pt-dev/main.js-3152-            .catch(function (e) {
/Users/andresgaibor/pt-dev/main.js-3153-            kernelLog("RUNTIME ASYNC ERROR: " + String(e), "error");
/Users/andresgaibor/pt-dev/main.js-3154-            finishActiveCommand(subsystems, state, {
/Users/andresgaibor/pt-dev/main.js-3155-                ok: false,
/Users/andresgaibor/pt-dev/main.js-3156-                error: "Runtime async error: " + String(e),
/Users/andresgaibor/pt-dev/main.js-3157-                code: "EXEC_ERROR",
/Users/andresgaibor/pt-dev/main.js-3158-            });
/Users/andresgaibor/pt-dev/main.js-3159-        });
/Users/andresgaibor/pt-dev/main.js-3160-}
/Users/andresgaibor/pt-dev/main.js-3161-    catch (e) {
/Users/andresgaibor/pt-dev/main.js-3162-        kernelLog("RUNTIME FATAL ERROR: " + String(e), "error");
/Users/andresgaibor/pt-dev/main.js-3163-        finishActiveCommand(subsystems, state, {
/Users/andresgaibor/pt-dev/main.js-3164-            ok: false,
/Users/andresgaibor/pt-dev/main.js-3165-            error: "Runtime fatal: " + String(e),
/Users/andresgaibor/pt-dev/main.js-3166-            code: "EXEC_ERROR",
/Users/andresgaibor/pt-dev/main.js-3167-        });
/Users/andresgaibor/pt-dev/main.js-3168-}
/Users/andresgaibor/pt-dev/main.js-3169-}
/Users/andresgaibor/pt-dev/main.js-3170-function createKernelLifecycle(subsystems, state) {
/Users/andresgaibor/pt-dev/main.js-3171-    var dirs = subsystems.dirs, queue = subsystems.queue, runtimeLoader = subsystems.runtimeLoader, heartbeat = subsystems.heartbeat, executionEngine = subsystems.executionEngine, terminal = subsystems.terminal, lease = subsystems.lease, config = subsystems.config, kernelLog = subsystems.kernelLog, kernelLogSubsystem = subsystems.kernelLogSubsystem;
/Users/andresgaibor/pt-dev/main.js-3172-    var commandPollInterval = null;
/Users/andresgaibor/pt-dev/main.js-3173-    function safePollTick() {
/Users/andresgaibor/pt-dev/main.js-3174-        try {
/Users/andresgaibor/pt-dev/main.js-3175-            pollCommandQueue(subsystems, state);
/Users/andresgaibor/pt-dev/main.js-3176-}
--
/Users/andresgaibor/pt-dev/main.js-6797-            : (out2 != null && out2.length > 0)
/Users/andresgaibor/pt-dev/main.js-6798-                ? out2
/Users/andresgaibor/pt-dev/main.js-6799-                : (out3 != null && out3.length > 0)
/Users/andresgaibor/pt-dev/main.js-6800-                    ? out3
/Users/andresgaibor/pt-dev/main.js-6801-                    : "";
/Users/andresgaibor/pt-dev/main.js-6802-        return /--More--/i.test(String(output));
/Users/andresgaibor/pt-dev/main.js-6803-}
/Users/andresgaibor/pt-dev/main.js-6804-    catch (_d) {
/Users/andresgaibor/pt-dev/main.js-6805-        return false;
/Users/andresgaibor/pt-dev/main.js-6806-}
/Users/andresgaibor/pt-dev/main.js-6807-}
/Users/andresgaibor/pt-dev/main.js-6808-function isDebugEnabled() {
/Users/andresgaibor/pt-dev/main.js-6809-    try {
/Users/andresgaibor/pt-dev/main.js-6810-        var scope = (typeof self !== "undefined" ? self : Function("return this")());
/Users/andresgaibor/pt-dev/main.js-6811-        return scope.PT_DEBUG === 1 || scope.PT_DEBUG === "1" || scope.PT_DEBUG === true;
/Users/andresgaibor/pt-dev/main.js-6812-}
/Users/andresgaibor/pt-dev/main.js-6813-    catch (_a) {
/Users/andresgaibor/pt-dev/main.js-6814-        return false;
/Users/andresgaibor/pt-dev/main.js-6815-}
/Users/andresgaibor/pt-dev/main.js-6816-}
/Users/andresgaibor/pt-dev/main.js-6817-function createKernel(config) {
/Users/andresgaibor/pt-dev/main.js-6818-    var state = createKernelState();
/Users/andresgaibor/pt-dev/main.js-6819-    var dirs = createDirectoryManager(config);
/Users/andresgaibor/pt-dev/main.js-6820-    initDebugLog(config.logsDir);
/Users/andresgaibor/pt-dev/main.js-6821-    var lease = createLeaseManager({ devDir: config.devDir, checkIntervalMs: 1000 });
/Users/andresgaibor/pt-dev/main.js-6822-    var queue = createCommandQueue({
/Users/andresgaibor/pt-dev/main.js-6823-        commandsDir: config.commandsDir,
/Users/andresgaibor/pt-dev/main.js-6824-        inFlightDir: config.inFlightDir,
/Users/andresgaibor/pt-dev/main.js-6825-        deadLetterDir: config.deadLetterDir,
/Users/andresgaibor/pt-dev/main.js-6826-    });
/Users/andresgaibor/pt-dev/main.js-6827-    var runtimeLoader = createRuntimeLoader({ runtimeFile: config.devDir + "/runtime.js" });
/Users/andresgaibor/pt-dev/main.js-6828-    var heartbeat = createHeartbeat({
/Users/andresgaibor/pt-dev/main.js-6829-        devDir: config.devDir,
/Users/andresgaibor/pt-dev/main.js-6830-        intervalMs: config.heartbeatIntervalMs,
/Users/andresgaibor/pt-dev/main.js-6831-    });
/Users/andresgaibor/pt-dev/main.js-6832-    var terminal = createTerminalEngine({
/Users/andresgaibor/pt-dev/main.js-6833-        commandTimeoutMs: 8000,
/Users/andresgaibor/pt-dev/main.js-6834-        stallTimeoutMs: 15000,
/Users/andresgaibor/pt-dev/main.js-6835-        pagerTimeoutMs: 30000,
/Users/andresgaibor/pt-dev/main.js-6836-    });
/Users/andresgaibor/pt-dev/main.js:6837:    var executionEngine = createExecutionEngine(terminal);
/Users/andresgaibor/pt-dev/main.js-6838-    function kernelLog(message, level) {
/Users/andresgaibor/pt-dev/main.js-6839-        if (level === void 0) { level = "debug"; }
/Users/andresgaibor/pt-dev/main.js-6840-        try {
/Users/andresgaibor/pt-dev/main.js-6841-            writeDebugLog("kernel", message, level);
/Users/andresgaibor/pt-dev/main.js-6842-}
/Users/andresgaibor/pt-dev/main.js-6843-        catch (_a) { }
/Users/andresgaibor/pt-dev/main.js-6844-        if (!isDebugEnabled())
/Users/andresgaibor/pt-dev/main.js-6845-            return;
/Users/andresgaibor/pt-dev/main.js-6846-        try {
/Users/andresgaibor/pt-dev/main.js-6847-            dprint("[kernel] " + message);
/Users/andresgaibor/pt-dev/main.js-6848-}
/Users/andresgaibor/pt-dev/main.js-6849-        catch (_b) { }
/Users/andresgaibor/pt-dev/main.js-6850-}
/Users/andresgaibor/pt-dev/main.js-6851-    function kernelLogSubsystem(name, message) {
/Users/andresgaibor/pt-dev/main.js-6852-        if (!isDebugEnabled())
/Users/andresgaibor/pt-dev/main.js-6853-            return;
/Users/andresgaibor/pt-dev/main.js-6854-        kernelLog("[" + name + "] " + message, "debug");
/Users/andresgaibor/pt-dev/main.js-6855-}
/Users/andresgaibor/pt-dev/main.js-6856-    var subsystems = {
/Users/andresgaibor/pt-dev/main.js-6857-        dirs: dirs,
/Users/andresgaibor/pt-dev/main.js-6858-        queue: queue,
/Users/andresgaibor/pt-dev/main.js-6859-        runtimeLoader: runtimeLoader,
/Users/andresgaibor/pt-dev/main.js-6860-        heartbeat: heartbeat,
/Users/andresgaibor/pt-dev/main.js-6861-        executionEngine: executionEngine,
/Users/andresgaibor/pt-dev/main.js-6862-        terminal: terminal,
/Users/andresgaibor/pt-dev/main.js-6863-        lease: lease,
/Users/andresgaibor/pt-dev/main.js-6864-        config: config,
/Users/andresgaibor/pt-dev/main.js-6865-        kernelLog: kernelLog,
/Users/andresgaibor/pt-dev/main.js-6866-        kernelLogSubsystem: kernelLogSubsystem,
/Users/andresgaibor/pt-dev/main.js-6867-};
/Users/andresgaibor/pt-dev/main.js-6868-    var lifecycle = createKernelLifecycle(subsystems, state);
/Users/andresgaibor/pt-dev/main.js-6869-    return {
/Users/andresgaibor/pt-dev/main.js-6870-        boot: lifecycle.boot,
/Users/andresgaibor/pt-dev/main.js-6871-        shutdown: lifecycle.shutdown,
/Users/andresgaibor/pt-dev/main.js-6872-        isRunning: function () {
/Users/andresgaibor/pt-dev/main.js-6873-            return state.isRunning;
/Users/andresgaibor/pt-dev/main.js-6874-        },
/Users/andresgaibor/pt-dev/main.js-6875-        startDeferredJob: function (plan) {
/Users/andresgaibor/pt-dev/main.js-6876-            return executionEngine.startJob(plan).id;
/Users/andresgaibor/pt-dev/main.js-6877-        },
/Users/andresgaibor/pt-dev/main.js-6878-        getDeferredJob: function (id) {
/Users/andresgaibor/pt-dev/main.js-6879-            return executionEngine.getJob(id);
/Users/andresgaibor/pt-dev/main.js-6880-        },
/Users/andresgaibor/pt-dev/main.js-6881-};
/Users/andresgaibor/pt-dev/main.js-6882-}
/Users/andresgaibor/pt-dev/main.js-6883-
/Users/andresgaibor/pt-dev/main.js-6884-
/Users/andresgaibor/pt-dev/main.js-6885-  // Publish kernel factory on global scope
/Users/andresgaibor/pt-dev/main.js-6886-  if (typeof createKernel === "function") {
/Users/andresgaibor/pt-dev/main.js-6887-      _g.createKernel = createKernel;
/Users/andresgaibor/pt-dev/main.js-6888-    _g.createKernel = function(cfg) {
/Users/andresgaibor/pt-dev/main.js-6889-      return createKernel(cfg);
/Users/andresgaibor/pt-dev/main.js-6890-    };
/Users/andresgaibor/pt-dev/main.js-6891-    if (typeof dprint === "function") dprint("[KERNEL-IIFE] createKernel published OK");
/Users/andresgaibor/pt-dev/main.js-6892-  } else {
/Users/andresgaibor/pt-dev/main.js-6893-    if (typeof dprint === "function") dprint("[KERNEL-IIFE] ERROR: createKernel NOT found");
/Users/andresgaibor/pt-dev/main.js-6894-  }
/Users/andresgaibor/pt-dev/main.js-6895-
/Users/andresgaibor/pt-dev/main.js-6896-  _g.shutdownKernel = function() {
/Users/andresgaibor/pt-dev/main.js-6897-    var k = _g._kernelInstance;
/Users/andresgaibor/pt-dev/main.js-6898-    if (k && typeof k.shutdown === "function") k.shutdown();
/Users/andresgaibor/pt-dev/main.js-6899-  };
/Users/andresgaibor/pt-dev/main.js-6900-
/Users/andresgaibor/pt-dev/main.js-6901-})();
/Users/andresgaibor/pt-dev/main.js-6902-
/Users/andresgaibor/pt-dev/main.js-6903-function _ptLoadModule(modulePath, label) {
/Users/andresgaibor/pt-dev/main.js-6904-  try {
/Users/andresgaibor/pt-dev/main.js-6905-    // Resolve file manager: prefer fm global, fall back to _ScriptModule shim.
/Users/andresgaibor/pt-dev/main.js-6906-    var _g = (typeof self !== "undefined") ? self : Function("return this")();
/Users/andresgaibor/pt-dev/main.js-6907-    var _fm = (typeof fm !== "undefined") ? fm : (_g.fm || null);
/Users/andresgaibor/pt-dev/main.js-6908-    if (!_fm && typeof _ScriptModule !== "undefined" && _ScriptModule) {
/Users/andresgaibor/pt-dev/main.js-6909-      // _ScriptModule is always available in PT Script Module context.
/Users/andresgaibor/pt-dev/main.js-6910-      _fm = {
/Users/andresgaibor/pt-dev/main.js-6911-        fileExists: function(p) {
/Users/andresgaibor/pt-dev/main.js-6912-          try { var sz = _ScriptModule.getFileSize(p); return sz >= 0; } catch(e) { return false; }
/Users/andresgaibor/pt-dev/main.js-6913-        },
/Users/andresgaibor/pt-dev/main.js-6914-        getFileContents: function(p) { return _ScriptModule.getFileContents(p); },
/Users/andresgaibor/pt-dev/main.js-6915-      };
/Users/andresgaibor/pt-dev/main.js-6916-    }
/Users/andresgaibor/pt-dev/main.js-6917-    if (!_fm) {
--
/Users/andresgaibor/pt-dev/runtime.js-6245-    if (!Array.isArray(plan.steps)) {
/Users/andresgaibor/pt-dev/runtime.js-6246-        return null;
/Users/andresgaibor/pt-dev/runtime.js-6247-}
/Users/andresgaibor/pt-dev/runtime.js-6248-    var id = String(plan.id || "");
/Users/andresgaibor/pt-dev/runtime.js-6249-    if (!id) {
/Users/andresgaibor/pt-dev/runtime.js-6250-        id = "terminal_plan_" + String(api.now()) + "_" + String(Math.floor(Math.random() * 100000));
/Users/andresgaibor/pt-dev/runtime.js-6251-}
/Users/andresgaibor/pt-dev/runtime.js-6252-    return {
/Users/andresgaibor/pt-dev/runtime.js-6253-        id: id,
/Users/andresgaibor/pt-dev/runtime.js-6254-        kind: "ios-session",
/Users/andresgaibor/pt-dev/runtime.js-6255-        version: 1,
/Users/andresgaibor/pt-dev/runtime.js-6256-        device: String(plan.device),
/Users/andresgaibor/pt-dev/runtime.js-6257-        plan: steps.map(normalizeStep),
/Users/andresgaibor/pt-dev/runtime.js-6258-        options: {
/Users/andresgaibor/pt-dev/runtime.js-6259-            stopOnError: true,
/Users/andresgaibor/pt-dev/runtime.js-6260-            commandTimeoutMs: Number(((_a = plan.timeouts) === null || _a === void 0 ? void 0 : _a.commandTimeoutMs) || ((_b = payload.options) === null || _b === void 0 ? void 0 : _b.timeoutMs) || 30000),
/Users/andresgaibor/pt-dev/runtime.js-6261-            stallTimeoutMs: Number(((_c = plan.timeouts) === null || _c === void 0 ? void 0 : _c.stallTimeoutMs) || ((_d = payload.options) === null || _d === void 0 ? void 0 : _d.stallTimeoutMs) || 15000),
/Users/andresgaibor/pt-dev/runtime.js-6262-        },
/Users/andresgaibor/pt-dev/runtime.js-6263-        payload: {
/Users/andresgaibor/pt-dev/runtime.js-6264-            source: "terminal.plan.run",
/Users/andresgaibor/pt-dev/runtime.js-6265-            metadata: isObject(plan.metadata) ? plan.metadata : {},
/Users/andresgaibor/pt-dev/runtime.js-6266-            policies: isObject(plan.policies) ? plan.policies : {},
/Users/andresgaibor/pt-dev/runtime.js-6267-        },
/Users/andresgaibor/pt-dev/runtime.js-6268-};
/Users/andresgaibor/pt-dev/runtime.js-6269-}
/Users/andresgaibor/pt-dev/runtime.js-6270-function handleTerminalPlanRun(payload, api) {
/Users/andresgaibor/pt-dev/runtime.js-6271-    var _a;
/Users/andresgaibor/pt-dev/runtime.js-6272-    var deferredPlan = buildDeferredPlan(payload, api);
/Users/andresgaibor/pt-dev/runtime.js-6273-    if (!deferredPlan) {
/Users/andresgaibor/pt-dev/runtime.js-6274-        return createErrorResult("terminal.plan.run requiere plan.device y plan.steps", "INVALID_TERMINAL_PLAN");
/Users/andresgaibor/pt-dev/runtime.js-6275-}
/Users/andresgaibor/pt-dev/runtime.js-6276-    if (!api || typeof api.createJob !== "function") {
/Users/andresgaibor/pt-dev/runtime.js-6277-        return createErrorResult("terminal.plan.run requiere RuntimeApi.createJob para registrar el job diferido", "RUNTIME_API_MISSING_CREATE_JOB", {
/Users/andresgaibor/pt-dev/runtime.js-6278-            details: { job: deferredPlan },
/Users/andresgaibor/pt-dev/runtime.js-6279-        });
/Users/andresgaibor/pt-dev/runtime.js-6280-}
/Users/andresgaibor/pt-dev/runtime.js-6281-    var ticket = String(api.createJob(deferredPlan) || deferredPlan.id || ((_a = payload.plan) === null || _a === void 0 ? void 0 : _a.id) || "terminal_plan");
/Users/andresgaibor/pt-dev/runtime.js-6282-    deferredPlan.id = ticket;
/Users/andresgaibor/pt-dev/runtime.js-6283-    return createDeferredResult(ticket, deferredPlan);
/Users/andresgaibor/pt-dev/runtime.js-6284-}
/Users/andresgaibor/pt-dev/runtime.js:6285:function handlePollDeferred(payload, api) {
/Users/andresgaibor/pt-dev/runtime.js-6286-    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
/Users/andresgaibor/pt-dev/runtime.js-6287-    var ticket = String((_a = payload.ticket) !== null && _a !== void 0 ? _a : "").trim();
/Users/andresgaibor/pt-dev/runtime.js-6288-    if (!ticket) {
/Users/andresgaibor/pt-dev/runtime.js-6289-        return { ok: false, error: "Missing ticket", code: "INVALID_PAYLOAD" };
/Users/andresgaibor/pt-dev/runtime.js-6290-}
/Users/andresgaibor/pt-dev/runtime.js-6291-    var jobState = api.getJobState(ticket);
/Users/andresgaibor/pt-dev/runtime.js-6292-    if (!jobState) {
/Users/andresgaibor/pt-dev/runtime.js-6293-        return { ok: false, error: "Job not found: ".concat(ticket), code: "UNKNOWN_COMMAND" };
/Users/andresgaibor/pt-dev/runtime.js-6294-}
/Users/andresgaibor/pt-dev/runtime.js-6295-    var finished = jobState.finished === true ||
/Users/andresgaibor/pt-dev/runtime.js-6296-        jobState.done === true ||
/Users/andresgaibor/pt-dev/runtime.js-6297-        jobState.state === "completed" ||
/Users/andresgaibor/pt-dev/runtime.js-6298-        jobState.state === "error";
/Users/andresgaibor/pt-dev/runtime.js-6299-    if (!finished) {
/Users/andresgaibor/pt-dev/runtime.js-6300-        var currentStep = (_b = jobState.currentStep) !== null && _b !== void 0 ? _b : 0;
/Users/andresgaibor/pt-dev/runtime.js-6301-        var currentStepData = jobState.plan.plan[currentStep];
/Users/andresgaibor/pt-dev/runtime.js-6302-        return {
/Users/andresgaibor/pt-dev/runtime.js-6303-            ok: true,
/Users/andresgaibor/pt-dev/runtime.js-6304-            deferred: true,
/Users/andresgaibor/pt-dev/runtime.js-6305-            ticket: ticket,
/Users/andresgaibor/pt-dev/runtime.js-6306-            done: false,
/Users/andresgaibor/pt-dev/runtime.js-6307-            state: jobState.state,
/Users/andresgaibor/pt-dev/runtime.js-6308-            currentStep: currentStep,
/Users/andresgaibor/pt-dev/runtime.js-6309-            totalSteps: jobState.plan.plan.length,
/Users/andresgaibor/pt-dev/runtime.js-6310-            stepType: currentStepData === null || currentStepData === void 0 ? void 0 : currentStepData.type,
/Users/andresgaibor/pt-dev/runtime.js-6311-            stepValue: currentStepData === null || currentStepData === void 0 ? void 0 : currentStepData.value,
/Users/andresgaibor/pt-dev/runtime.js-6312-            outputTail: jobState.outputBuffer ? jobState.outputBuffer.slice(-500) : "",
/Users/andresgaibor/pt-dev/runtime.js-6313-            lastPrompt: jobState.lastPrompt,
/Users/andresgaibor/pt-dev/runtime.js-6314-            lastMode: jobState.lastMode,
/Users/andresgaibor/pt-dev/runtime.js-6315-            waitingForCommandEnd: jobState.waitingForCommandEnd,
/Users/andresgaibor/pt-dev/runtime.js-6316-            updatedAt: jobState.updatedAt,
/Users/andresgaibor/pt-dev/runtime.js-6317-            ageMs: Date.now() - jobState.startedAt,
/Users/andresgaibor/pt-dev/runtime.js-6318-            idleMs: Date.now() - jobState.updatedAt,
/Users/andresgaibor/pt-dev/runtime.js-6319-            debug: jobState.debug || [],
/Users/andresgaibor/pt-dev/runtime.js-6320-            stepResults: jobState.stepResults || [],
/Users/andresgaibor/pt-dev/runtime.js-6321-};
/Users/andresgaibor/pt-dev/runtime.js-6322-}
/Users/andresgaibor/pt-dev/runtime.js-6323-    var output = String((_g = (_e = (_c = jobState.outputBuffer) !== null && _c !== void 0 ? _c : (_d = jobState.result) === null || _d === void 0 ? void 0 : _d.raw) !== null && _e !== void 0 ? _e : (_f = jobState.result) === null || _f === void 0 ? void 0 : _f.output) !== null && _g !== void 0 ? _g : "");
/Users/andresgaibor/pt-dev/runtime.js-6324-    var status = jobState.error || jobState.state === "error" ? 1 : Number((_j = (_h = jobState.result) === null || _h === void 0 ? void 0 : _h.status) !== null && _j !== void 0 ? _j : 0);
/Users/andresgaibor/pt-dev/runtime.js-6325-    return {
/Users/andresgaibor/pt-dev/runtime.js-6326-        done: true,
/Users/andresgaibor/pt-dev/runtime.js-6327-        ok: !jobState.error && jobState.state !== "error",
/Users/andresgaibor/pt-dev/runtime.js-6328-        status: status,
/Users/andresgaibor/pt-dev/runtime.js-6329-        result: jobState.result,
/Users/andresgaibor/pt-dev/runtime.js-6330-        error: jobState.error || undefined,
/Users/andresgaibor/pt-dev/runtime.js-6331-        code: jobState.errorCode || undefined,
/Users/andresgaibor/pt-dev/runtime.js-6332-        errorCode: jobState.errorCode || undefined,
/Users/andresgaibor/pt-dev/runtime.js-6333-        raw: output,
/Users/andresgaibor/pt-dev/runtime.js-6334-        output: output,
/Users/andresgaibor/pt-dev/runtime.js-6335-        source: "terminal",
/Users/andresgaibor/pt-dev/runtime.js-6336-        session: {
/Users/andresgaibor/pt-dev/runtime.js-6337-            mode: String((_k = jobState.lastMode) !== null && _k !== void 0 ? _k : ""),
/Users/andresgaibor/pt-dev/runtime.js-6338-            prompt: String((_l = jobState.lastPrompt) !== null && _l !== void 0 ? _l : ""),
/Users/andresgaibor/pt-dev/runtime.js-6339-            paging: jobState.paged === true,
/Users/andresgaibor/pt-dev/runtime.js-6340-            awaitingConfirm: false,
/Users/andresgaibor/pt-dev/runtime.js-6341-        },
/Users/andresgaibor/pt-dev/runtime.js-6342-};
/Users/andresgaibor/pt-dev/runtime.js-6343-}
/Users/andresgaibor/pt-dev/runtime.js-6344-// --- handlers/ios/index.ts ---
/Users/andresgaibor/pt-dev/runtime.js-6345-// ============================================================================
/Users/andresgaibor/pt-dev/runtime.js-6346-// IOS Handlers Barrel - Re-exports all IOS handler functions
/Users/andresgaibor/pt-dev/runtime.js-6347-// ============================================================================
/Users/andresgaibor/pt-dev/runtime.js-6348-// Session utilities
/Users/andresgaibor/pt-dev/runtime.js-6349-// Host stabilization utilities
/Users/andresgaibor/pt-dev/runtime.js-6350-// Result mapping utilities
/Users/andresgaibor/pt-dev/runtime.js-6351-// Handler functions
/Users/andresgaibor/pt-dev/runtime.js-6352-// --- handlers/ios-execution.ts ---
/Users/andresgaibor/pt-dev/runtime.js-6353-// ============================================================================
/Users/andresgaibor/pt-dev/runtime.js-6354-// IOS Execution Handlers - Thin barrel re-export
/Users/andresgaibor/pt-dev/runtime.js-6355-// ============================================================================
/Users/andresgaibor/pt-dev/runtime.js-6356-// Este archivo existe unicamente para backward compatibility.
/Users/andresgaibor/pt-dev/runtime.js-6357-// Los handlers reales viven en handlers/ios/
/Users/andresgaibor/pt-dev/runtime.js-6358-// --- handlers/ios-plan-builder.ts ---
/Users/andresgaibor/pt-dev/runtime.js-6359-// --- handlers/terminal-sanitizer.ts ---
/Users/andresgaibor/pt-dev/runtime.js-6360-// --- handlers/cable-recommender.ts ---
/Users/andresgaibor/pt-dev/runtime.js-6361-function recommendCableType(device1, device2) {
/Users/andresgaibor/pt-dev/runtime.js-6362-    var type1 = device1.getType();
/Users/andresgaibor/pt-dev/runtime.js-6363-    var type2 = device2.getType();
/Users/andresgaibor/pt-dev/runtime.js-6364-    var isSwitchLike = function (type) {
/Users/andresgaibor/pt-dev/runtime.js-6365-        return type === DEVICE_TYPES.switch || type === DEVICE_TYPES.multilayerSwitch;
--
/Users/andresgaibor/pt-dev/runtime.js-7295-        var scope = Function("return this")();
/Users/andresgaibor/pt-dev/runtime.js-7296-        var registeredTypes = getRegisteredTypes();
/Users/andresgaibor/pt-dev/runtime.js-7297-        var handlerMap = {};
/Users/andresgaibor/pt-dev/runtime.js-7298-        for (var i = 0; i < registeredTypes.length; i++) {
/Users/andresgaibor/pt-dev/runtime.js-7299-            handlerMap[registeredTypes[i]] = true;
/Users/andresgaibor/pt-dev/runtime.js-7300-}
/Users/andresgaibor/pt-dev/runtime.js-7301-        scope.HANDLER_MAP = handlerMap;
/Users/andresgaibor/pt-dev/runtime.js-7302-}
/Users/andresgaibor/pt-dev/runtime.js-7303-    catch (_a) {
/Users/andresgaibor/pt-dev/runtime.js-7304-        // El runtime debe seguir cargando aunque el scope global no sea accesible.
/Users/andresgaibor/pt-dev/runtime.js-7305-}
/Users/andresgaibor/pt-dev/runtime.js-7306-}
/Users/andresgaibor/pt-dev/runtime.js-7307-// ============================================================================
/Users/andresgaibor/pt-dev/runtime.js-7308-// Handler registration side effect
/Users/andresgaibor/pt-dev/runtime.js-7309-// ============================================================================
/Users/andresgaibor/pt-dev/runtime.js-7310-registerRuntimeHandlersFromGlobals();
/Users/andresgaibor/pt-dev/runtime.js-7311-publishHandlerMap();
/Users/andresgaibor/pt-dev/runtime.js-7312-// ============================================================================
/Users/andresgaibor/pt-dev/runtime.js-7313-// Public exports
/Users/andresgaibor/pt-dev/runtime.js-7314-// ============================================================================
/Users/andresgaibor/pt-dev/runtime.js-7315-// --- handlers/registration/stable-handlers.ts ---
/Users/andresgaibor/pt-dev/runtime.js-7316-var stableHandlersRegistered = false;
/Users/andresgaibor/pt-dev/runtime.js-7317-/**
/Users/andresgaibor/pt-dev/runtime.js-7318- * Registra únicamente handlers operativos/estables.
/Users/andresgaibor/pt-dev/runtime.js-7319- *
/Users/andresgaibor/pt-dev/runtime.js-7320- * No registrar aquí:
/Users/andresgaibor/pt-dev/runtime.js-7321- * - __evaluate
/Users/andresgaibor/pt-dev/runtime.js-7322- * - omni.*
/Users/andresgaibor/pt-dev/runtime.js-7323- * - siphon*
/Users/andresgaibor/pt-dev/runtime.js-7324- * - exfiltrate*
/Users/andresgaibor/pt-dev/runtime.js-7325- * - skipBoot
/Users/andresgaibor/pt-dev/runtime.js-7326- * - evaluateInternalVariable
/Users/andresgaibor/pt-dev/runtime.js-7327- */
/Users/andresgaibor/pt-dev/runtime.js-7328-function registerStableRuntimeHandlers() {
/Users/andresgaibor/pt-dev/runtime.js-7329-    if (stableHandlersRegistered) {
/Users/andresgaibor/pt-dev/runtime.js-7330-        return;
/Users/andresgaibor/pt-dev/runtime.js-7331-}
/Users/andresgaibor/pt-dev/runtime.js-7332-    stableHandlersRegistered = true;
/Users/andresgaibor/pt-dev/runtime.js-7333-    registerHandler("configHost", handleConfigHost);
/Users/andresgaibor/pt-dev/runtime.js-7334-    registerHandler("terminal.plan.run", handleTerminalPlanRun);
/Users/andresgaibor/pt-dev/runtime.js:7335:    registerHandler("__pollDeferred", handlePollDeferred);
/Users/andresgaibor/pt-dev/runtime.js-7336-    // Legacy IOS/terminal handlers.
/Users/andresgaibor/pt-dev/runtime.js-7337-    // Se mantienen registrados para compatibilidad con adapters/comandos antiguos.
/Users/andresgaibor/pt-dev/runtime.js-7338-    registerHandler("configIos", handleConfigIos);
/Users/andresgaibor/pt-dev/runtime.js-7339-    registerHandler("execIos", handleExecIos);
/Users/andresgaibor/pt-dev/runtime.js-7340-    registerHandler("__ping", handlePing);
/Users/andresgaibor/pt-dev/runtime.js-7341-    registerHandler("execPc", handleExecPc);
/Users/andresgaibor/pt-dev/runtime.js-7342-    registerHandler("readTerminal", handleReadTerminal);
/Users/andresgaibor/pt-dev/runtime.js-7343-    registerHandler("ensureVlans", handleEnsureVlans);
/Users/andresgaibor/pt-dev/runtime.js-7344-    registerHandler("configVlanInterfaces", handleConfigVlanInterfaces);
/Users/andresgaibor/pt-dev/runtime.js-7345-    registerHandler("configDhcpServer", handleConfigDhcpServer);
/Users/andresgaibor/pt-dev/runtime.js-7346-    registerHandler("inspectDhcpServer", handleInspectDhcpServer);
/Users/andresgaibor/pt-dev/runtime.js-7347-    registerHandler("inspectHost", handleInspectHost);
/Users/andresgaibor/pt-dev/runtime.js-7348-    registerHandler("listDevices", handleListDevices);
/Users/andresgaibor/pt-dev/runtime.js-7349-    registerHandler("addDevice", handleAddDevice);
/Users/andresgaibor/pt-dev/runtime.js-7350-    registerHandler("removeDevice", handleRemoveDevice);
/Users/andresgaibor/pt-dev/runtime.js-7351-    registerHandler("renameDevice", handleRenameDevice);
/Users/andresgaibor/pt-dev/runtime.js-7352-    registerHandler("moveDevice", handleMoveDevice);
/Users/andresgaibor/pt-dev/runtime.js-7353-    registerHandler("setDeviceIp", handleSetDeviceIp);
/Users/andresgaibor/pt-dev/runtime.js-7354-    registerHandler("setDefaultGateway", handleSetDefaultGateway);
/Users/andresgaibor/pt-dev/runtime.js-7355-    registerHandler("addLink", handleAddLink);
/Users/andresgaibor/pt-dev/runtime.js-7356-    registerHandler("removeLink", handleRemoveLink);
/Users/andresgaibor/pt-dev/runtime.js-7357-    registerHandler("verifyLink", handleVerifyLink);
/Users/andresgaibor/pt-dev/runtime.js-7358-    registerHandler("listLinks", handleListLinks);
/Users/andresgaibor/pt-dev/runtime.js-7359-    registerHandler("listCanvasRects", handleListCanvasRects);
```
