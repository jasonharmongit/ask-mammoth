import { useCallback, useEffect, useRef, useState } from "react";

type UseWebsocketProps<TypeReceive> = {
  endpoint: string | null;
  onMessage: (data: TypeReceive) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (e: Event) => void;
};

type UseWebsocketResult<TypeSend> = {
  isConnected: boolean;
  sendMessage: (msg: TypeSend) => void;
  wsRef: React.RefObject<WebSocket | null>;
};

export function useWebsocket<TypeSend, TypeReceive>(
  props: UseWebsocketProps<TypeReceive>
): UseWebsocketResult<TypeSend> {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!props.endpoint) {
      return;
    }
    setIsConnected(false);
    const url = `${getWebsocketBaseUrl()}${props.endpoint.startsWith("/") ? props.endpoint : `/${props.endpoint}`}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // console.log("WebSocket connected");
      props.onOpen?.();
    };
    ws.onclose = () => {
      setIsConnected(false);
      // console.log("WebSocket closed");
      props.onClose?.();
    };
    ws.onerror = (e) => {
      setIsConnected(false);
      // console.log("WebSocket error", e);
      props.onError?.(e);
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as TypeReceive;
        props.onMessage(data);
      } catch {
        // Optionally handle non-JSON messages
        props.onMessage(event.data as TypeReceive);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
      setIsConnected(false);
      // console.log("WebSocket disconnected");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.endpoint]);

  const sendMessage = useCallback((msg: TypeSend) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const outgoing = typeof msg === "string" ? msg : JSON.stringify(msg);
      wsRef.current.send(outgoing);
    }
  }, []);

  return { isConnected, sendMessage, wsRef };
}

function getWebsocketBaseUrl() {
  return import.meta.env.VITE_WS_BASE_URL;
}
