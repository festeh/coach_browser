import { z } from "zod";

export interface Message {
  type: string;
}

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
