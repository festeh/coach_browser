// Wire protocol of the agents server's chat WebSocket
// (my-agents serving.py, the same one Android's AgentChatService speaks).

export interface ChatMessage {
  // "notice" is page-local (e.g. an override confirmation) — never sent,
  // never part of the agent thread.
  role: "human" | "ai" | "error" | "notice";
  content: string;
}

// Frames the server sends. `history` arrives once on connect; a turn is
// zero or more `chunk`s closed by `done`; `error` ends a turn instead.
export type ServerFrame =
  | { type: "history"; messages: { role: string; content: string }[] }
  | { type: "chunk"; content: string }
  | { type: "done"; message_id: string }
  | { type: "error"; message: string }
  | { type: "pong" };

// Build the chat socket URL the way Android does: https→wss, http→ws,
// pass ws(s) through untouched. The token rides the query string — the
// browser WebSocket API can't set headers.
export function chatWsUrl(baseUrl: string, threadId: string, token = ""): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  const withoutScheme = trimmed.replace(/^(https?|wss?):\/\//, "");
  const scheme = trimmed.startsWith("http://") || trimmed.startsWith("ws://") ? "ws://" : "wss://";
  const url = `${scheme}${withoutScheme}/api/coach/ws/${threadId}`;
  return token ? `${url}?token=${token}` : url;
}
