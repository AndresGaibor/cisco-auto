// ============================================================================
// E2E Module - Índice de tipos y exportaciones
// ============================================================================
// Módulo de testing E2E con tipos de escenarios, reportes y mocks
// para pruebas sin necesidad de Packet Tracer instalado.

export type {
  E2EStep,
  E2EStepType,
  E2EStepPayload,
  E2EStepResult,
  E2EOutcome,
  E2EEvidence,
  E2EScenario,
  PredefinedScenarios,
  AddDevicePayload,
  RemoveDevicePayload,
  AddLinkPayload,
  RemoveLinkPayload,
  ConfigHostPayload,
  ConfigIosPayload,
  ExecIosPayload,
  ShowCommandPayload,
  WaitForPayload,
  AssertPayload,
  SnapshotPayload,
} from "./e2e-scenario.js";

export {
  E2E_SCENARIOS,
  crearEscenarioCrearDispositivos,
  crearEscenarioCrearLinks,
  crearEscenarioConfigPcDhcp,
  crearEscenarioCrearVlan,
  crearEscenarioConfigTrunk,
  crearEscenarioShowVlan,
  crearEscenarioShowMac,
  crearEscenarioRouterInitialDialog,
  crearEscenarioExecIosEnableConfig,
  crearEscenarioPagination,
  crearEscenarioServerBasic,
} from "./e2e-scenario.js";

export type {
  E2ERunResult,
  E2ERunOutcome,
  E2EEvidenceBundle,
  E2ERunMetadata,
  E2EReport,
  E2EOutcomeSummary,
  E2EScenarioReport,
  E2EReportConfig,
  E2ETimingSummary,
} from "./e2e-report.js";

export {
  generarTimingSummary,
  generarReporteTexto,
  crearE2EReport,
} from "./e2e-report.js";

export type {
  MockBridgeState,
  MockBridgeConfig,
  MockDeviceState,
  MockLinkState,
  MockTopologySnapshot,
} from "./mock-pt-bridge.js";

export {
  MockPTBridge,
  crearMockBridgeState,
  ejecutarPasoE2EConMock,
  crearMockBridgeParaTests,
} from "./mock-pt-bridge.js";
