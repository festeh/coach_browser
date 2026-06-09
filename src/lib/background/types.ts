import * as z from "zod/mini";

// Attention beacon: what currently has the user's attention.
// "site" — a website (hostname in `site`; omitted for browser-internal pages)
// "idle" — at the machine but no input for a while (and not watching the active tab)
// "away" — browser windows are not focused
export type AttentionState = "site" | "idle" | "away";

export interface AttentionMessage {
  type: "attention";
  state: AttentionState;
  site?: string;
}

// Temptation: a non-whitelisted site the user hit while blocked.
// `source` names this browser; `target` is the blocked hostname.
export interface TemptationMessage {
  type: "temptation";
  source: string;
  target: string;
}

// Messages sent to the server over WebSocket
export type OutgoingMessage =
  | { type: "ping" }
  | { type: "get_focusing" }
  | AttentionMessage
  | TemptationMessage;

// Messages received from the server over WebSocket
export const focusingMessageSchema = z.object({
  type: z.string(),
  focusing: z.boolean(),
  since_last_change: z.number(),
  focus_time_left: z.number(),
  agent_release_time_left: z.nullable(z.number())
});

export type FocusingMessage = z.infer<typeof focusingMessageSchema>;

export function isFocusingMessage(message: object): message is FocusingMessage {
  return focusingMessageSchema.safeParse(message).success;
}

// Messages passed between extension components via browser.runtime
export type ExtensionMessage =
  | { type: "get_focusing" }
  | { type: "reconnect" }
  | { type: "BLOCKED_ALERT" };
