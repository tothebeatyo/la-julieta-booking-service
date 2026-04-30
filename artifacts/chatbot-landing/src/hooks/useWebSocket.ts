import { useEffect, useRef, useCallback, useState } from "react";

type WSMessage = {
  type: string;
  data: unknown;
};

type Handler = (data: unknown) => void;

export function useWebSocket(handlers: Record<string, Handler>): { isConnected: boolean } {
  const ws = useRef<WebSocket | null>(null);
  const handlersRef = useRef(handlers);
  const [isConnected, setIsConnected] = useState(false);
  handlersRef.current = handlers;

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setIsConnected(true);
    };

    ws.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as WSMessage;
        const handler = handlersRef.current[msg.type];
        if (handler) handler(msg.data);
      } catch (err) {
        console.error("WebSocket parse error:", err);
      }
    };

    ws.current.onclose = () => {
      setIsConnected(false);
      setTimeout(connect, 3000);
    };

    ws.current.onerror = () => {
      ws.current?.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      ws.current?.close();
    };
  }, [connect]);

  return { isConnected };
}
