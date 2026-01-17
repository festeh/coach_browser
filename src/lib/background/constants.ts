// Timing constants
export const TIME_UPDATE_INTERVAL_MS = 30000;
export const INTERACTION_UPDATE_INTERVAL_MS = 60000;
export const RECONNECT_BASE_DELAY_MS = 500;
export const MAX_RECONNECT_ATTEMPTS = 10;
export const DEFAULT_FOCUS_DURATION_SECONDS = 30 * 60;

// Notification timing
export const TWO_HOURS_SECONDS = 2 * 60 * 60;
export const FIVE_MINUTES_SECONDS = 5 * 60;
export const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

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
