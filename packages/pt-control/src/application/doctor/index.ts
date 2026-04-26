/**
 * Doctor module - System diagnostics for PT control.
 */

export type { DoctorCheckResult, DoctorCheckFunction, DoctorPaths, DoctorControllerHealth } from "./doctor-types.js";
export {
  checkPtDevDirectory,
  checkLogDirectory,
  checkHistoryDirectory,
  checkResultsDirectory,
  checkRuntimeFiles,
  checkBridgeQueues,
  runDoctorFsChecks,
  runAllDoctorChecks,
} from "./doctor-use-cases.js";