/**
 * Alias de compatibilidad para `IosFacade`.
 * Mantener este nombre evita romper consumidores que todavía importan
 * `ControllerIosService` desde el barrel público.
 */
export { IosFacade as ControllerIosService } from "./ios-facade.js";
