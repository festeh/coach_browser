import {
  PING_INTERVAL_MS,
  PONG_TIMEOUT_MS,
  RECONNECT_BASE_DELAY_MS,
  MAX_RECONNECT_ATTEMPTS,
  logError,
  logWarn
} from "./constants";
import { OutgoingMessage, FocusingMessage, isFocusingMessage, HookResultMessage, isHookResultMessage } from "./types";

export interface WebSocketManagerCallbacks {
  onConnected: () => void;
  onDisconnected: () => void;
  onFocusMessage: (message: FocusingMessage) => void;
  onHookResult: (message: HookResultMessage) => void;
}

export class WebSocketManager {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectScheduled = false;
  private pendingPongResolve: ((value: boolean) => void) | null = null;
  private pingLoopRunning = false;

  constructor(
    private serverUrl: string,
    private callbacks: WebSocketManagerCallbacks
  ) {}

  connect(): void {
    if (this.socket?.readyState === WebSocket.CONNECTING ||
        this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    this.reconnectScheduled = false;
    this.socket = new WebSocket(`${this.serverUrl}/connect`);
    this.setupListeners();
  }

  isOpen(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  send(message: OutgoingMessage): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  reconnect(force = false): void {
    if (this.reconnectScheduled && !force) {
      return;
    }

    if (force) {
      this.reconnectAttempts = 0;
    }

    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      logWarn("Maximum reconnect attempts reached. Click to reconnect manually.");
      return;
    }

    this.reconnectScheduled = true;
    this.reconnectAttempts++;
    this.socket = null;

    const delay = Math.min(RECONNECT_BASE_DELAY_MS * Math.pow(2, this.reconnectAttempts - 1), 30000);
    console.log(`[Background] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

    setTimeout(() => this.connect(), delay);
  }

  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.reconnectScheduled = false;
      this.callbacks.onConnected();
      this.startPingLoop();
    };

    this.socket.onerror = () => {
      // onclose will fire after this, so we just log
    };

    this.socket.onclose = () => {
      this.callbacks.onDisconnected();
      this.stopPingLoop();
      this.reconnect();
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "pong") {
          this.handlePong();
          return;
        }
        if (isHookResultMessage(message)) {
          this.callbacks.onHookResult(message);
          return;
        }
        if (isFocusingMessage(message)) {
          this.callbacks.onFocusMessage(message);
        }
      } catch (error) {
        logError("Failed to parse WebSocket message", error);
      }
    };
  }

  private async startPingLoop(): Promise<void> {
    if (this.pingLoopRunning) return;
    this.pingLoopRunning = true;

    while (this.pingLoopRunning && this.socket?.readyState === WebSocket.OPEN) {
      await this.sleep(PING_INTERVAL_MS);

      const alive = await this.sendPing();
      if (!alive) {
        this.callbacks.onDisconnected();
        this.pingLoopRunning = false;
        this.reconnect();
        return;
      }
    }
    this.pingLoopRunning = false;
  }

  private stopPingLoop(): void {
    this.pingLoopRunning = false;
    this.pendingPongResolve = null;
  }

  private sendPing(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        resolve(false);
        return;
      }

      this.pendingPongResolve = resolve;
      this.socket.send(JSON.stringify({ type: "ping" }));

      setTimeout(() => {
        if (this.pendingPongResolve === resolve) {
          this.pendingPongResolve = null;
          resolve(false);
        }
      }, PONG_TIMEOUT_MS);
    });
  }

  private handlePong(): void {
    if (this.pendingPongResolve) {
      this.pendingPongResolve(true);
      this.pendingPongResolve = null;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
