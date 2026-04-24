import { detectModeFromPrompt, isHostMode, normalizePrompt } from "./prompt-detector";
import type { TerminalSessionState } from "./session-state";

/**
 * Resultado del chequeo de finalización de comando.
 */
export interface CommandFinishedVerdict {
  finished: boolean;
  reason?: string;
}

/**
 * Heurística de estabilidad para el motor de ejecución.
 * 
 * Determina si un comando ha finalizado analizando el estado actual de la terminal,
 * el prompt detectado y el tipo de sesión.
 * 
 * @param currentPrompt - Prompt actual leído de la terminal
 * @param session - Estado de la sesión actual
 * @param commandEndedSeen - Indica si el evento nativo commandEnded fue disparado
 * @returns Veredicto con estado de finalización y motivo
 */
export function checkIsCommandFinished(
    currentPrompt: string,
    session: TerminalSessionState,
    commandEndedSeen: boolean
): CommandFinishedVerdict {
    const prompt = normalizePrompt(currentPrompt);
    
    // 1. Detección IOS: Si contiene # o > (y no es un disco de host)
    // Usamos una búsqueda más flexible para encontrar el prompt entre el ruido
    const iosPromptMatch = prompt.match(/[A-Za-z0-9._()-]+(?:\(config[^\)]*\))?[>#]\s*$/);
    
    if (iosPromptMatch || /[>#]$/.test(prompt)) {
        if (/[A-Z]:\\>$/i.test(prompt)) {
            // Es un host, ignorar aquí
        } else {
            // REGLA DE ORO IOS: No terminar si el comando ni siquiera ha empezado a procesarse
            // (a menos que haya pasado mucho tiempo, manejado por el executor)
            const elapsed = Date.now() - session.lastActivityAt;
            if (!commandEndedSeen && elapsed < 800) {
                return { finished: false };
            }
            return { finished: true, reason: "Prompt de IOS detectado (estabilizado)" };
        }
    }

    // 2. Heurística de Host
    const isHost = session.sessionKind === "host";
    const currentMode = detectModeFromPrompt(prompt);
    const hasHostPrompt = isHost && isHostMode(currentMode);

    if (hasHostPrompt && !commandEndedSeen) {
        return { finished: true, reason: "Prompt de host detectado" };
    }

    // 3. Fallback nativo
    if (commandEndedSeen) {
        return { finished: true, reason: "Evento commandEnded nativo detectado" };
    }

    return { finished: false };
}