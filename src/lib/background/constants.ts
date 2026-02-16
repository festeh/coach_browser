// Timing constants
export const TIME_UPDATE_INTERVAL_MS = 30000;
export const INTERACTION_UPDATE_INTERVAL_MS = 60000;
export const RECONNECT_BASE_DELAY_MS = 2000;
export const MAX_RECONNECT_ATTEMPTS = 10;

// WebSocket ping/pong
export const PING_INTERVAL_MS = 30000;
export const PONG_TIMEOUT_MS = 5000;

// Logging helpers
export function logError(context: string, error: unknown): void {
  console.error(`[Background] ${context}:`, error);
}

export function logWarn(message: string): void {
  console.warn(`[Background] ${message}`);
}
