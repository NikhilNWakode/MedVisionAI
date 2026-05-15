import { useCallback, useEffect, useRef, useState } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: any[];
}

export function useChat(sessionId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const streamBufferRef = useRef("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !sessionId) return;

    const wsUrl = `${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace("http", "ws")}/ws/chat/${sessionId}?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "stream_start") {
        setIsStreaming(true);
        streamBufferRef.current = "";
      } else if (data.type === "stream_token") {
        streamBufferRef.current += data.token;
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") {
            updated[updated.length - 1] = { ...last, content: streamBufferRef.current };
          } else {
            updated.push({ role: "assistant", content: streamBufferRef.current });
          }
          return updated;
        });
      } else if (data.type === "stream_end") {
        setIsStreaming(false);
        if (data.citations) {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              updated[updated.length - 1] = { ...last, citations: data.citations };
            }
            return updated;
          });
        }
      }
    };

    wsRef.current = ws;
    return () => ws.close();
  }, [sessionId]);

  const sendMessage = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    setMessages((prev) => [...prev, { role: "user", content }]);
    wsRef.current.send(JSON.stringify({ content }));
  }, []);

  return { messages, sendMessage, isConnected, isStreaming };
}
