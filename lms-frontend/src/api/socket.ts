import { Client, type IMessage } from "@stomp/stompjs";
import type { MessageResponse, NotificationResponse, WsErrorResponse } from "./types";

const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;
const HEARTBEAT_MS = 15000;

export interface SocketHandlers {
  onNotification: (payload: NotificationResponse) => void;
  onMessage: (payload: MessageResponse) => void;
  onError?: (payload: WsErrorResponse) => void;
  onConnectionChange?: (connected: boolean) => void;
}

let client: Client | null = null;
let reconnectAttempts = 0;

function socketUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

/**
 * Opens (or replaces) the single shared STOMP connection, authenticated with the same JWT the
 * REST API uses (sent in the STOMP CONNECT frame, not a second token). Subscribes to the three
 * private per-user queues the backend allows. Reconnects automatically after a drop, with a
 * bounded exponential backoff driven by adjusting the client's own reconnectDelay between
 * attempts; disconnectSocket() zeroes that out so logout stops retrying immediately.
 */
export function connectSocket(token: string, handlers: SocketHandlers): void {
  disconnectSocket();
  reconnectAttempts = 0;

  const stompClient = new Client({
    brokerURL: socketUrl(),
    connectHeaders: { Authorization: `Bearer ${token}` },
    heartbeatIncoming: HEARTBEAT_MS,
    heartbeatOutgoing: HEARTBEAT_MS,
    reconnectDelay: BASE_RECONNECT_DELAY_MS,
    onConnect: () => {
      reconnectAttempts = 0;
      stompClient.reconnectDelay = BASE_RECONNECT_DELAY_MS;
      handlers.onConnectionChange?.(true);

      stompClient.subscribe("/user/queue/notifications", (msg: IMessage) => {
        handlers.onNotification(JSON.parse(msg.body));
      });
      stompClient.subscribe("/user/queue/messages", (msg: IMessage) => {
        handlers.onMessage(JSON.parse(msg.body));
      });
      stompClient.subscribe("/user/queue/errors", (msg: IMessage) => {
        handlers.onError?.(JSON.parse(msg.body));
      });
    },
    onWebSocketClose: () => {
      handlers.onConnectionChange?.(false);
      reconnectAttempts += 1;
      stompClient.reconnectDelay = Math.min(
        BASE_RECONNECT_DELAY_MS * 2 ** reconnectAttempts,
        MAX_RECONNECT_DELAY_MS,
      );
    },
  });

  client = stompClient;
  stompClient.activate();
}

/** Disconnects and stops all further reconnect attempts - call on logout or unmount. */
export function disconnectSocket(): void {
  if (client) {
    const stompClient = client;
    client = null;
    stompClient.reconnectDelay = 0;
    stompClient.deactivate().catch(() => {});
  }
}
