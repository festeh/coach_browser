import { z } from "zod";

// Messages sent to the server over WebSocket
export type OutgoingMessage =
  | { type: "ping" }
  | { type: "get_focus" }
  | { type: "focus"; duration: number };

// Messages received from the server over WebSocket
export const focusingMessageSchema = z.object({
  type: z.string(),
  focusing: z.boolean(),
  since_last_change: z.number(),
  focus_time_left: z.number()
});

export type FocusingMessage = z.infer<typeof focusingMessageSchema>;

export function isFocusingMessage(message: object): message is FocusingMessage {
  return focusingMessageSchema.safeParse(message).success;
}

// Messages passed between extension components via browser.runtime
export type ExtensionMessage =
  | { type: "get_focus" }
  | { type: "reconnect" }
  | { type: "show_notification" }
  | { type: "BLOCKED_ALERT" };
