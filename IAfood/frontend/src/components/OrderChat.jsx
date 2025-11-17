import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function OrderChat({ orderId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const socketRef = useRef(null);
  const scrollRef = useRef(null);
  const location = useLocation();
  const { user } = useAuth();

  // detect theme from current route (fallback to client)
  const theme = (() => {
    const p = location.pathname || "";
    if (p.includes("/merchant")) return "merchant";
    if (p.includes("/courier")) return "courier";
    return "client";
  })();

  useEffect(() => {
    const socket = io("http://localhost:3000", { transports: ["websocket"] });
    socketRef.current = socket;
    const room = `chat:order:${orderId}`;
    socket.emit("joinRoom", { room });

    socket.on("chat:message", (msg) => {
      if (msg && String(msg.orderId) === String(orderId)) {
        setMessages((m) => [...m, msg]);
      }
    });

    return () => {
      socket.off("chat:message");
      socket.disconnect();
    };
  }, [orderId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = () => {
    if (!text.trim()) return;
    const payload = { orderId, text, ts: new Date().toISOString() };
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("chat:message", payload);
    }
    setMessages((m) => [...m, { ...payload, self: true }]);
    setText("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <Card className="w-full">
      <CardContent>
        <div ref={scrollRef} className="h-48 overflow-auto mb-3 space-y-2 pr-2">
          {messages.map((m, i) => {
            const isSelf = !!m.self;
            // bubble classes by theme
            const bubbleSelf = theme === "merchant" ? "ml-auto bg-green-600 text-white" : theme === "courier" ? "ml-auto bg-amber-500 text-white" : "ml-auto bg-purple-600 text-white";
            const bubbleOther = theme === "merchant" ? "bg-green-50 text-green-900 border border-green-100" : theme === "courier" ? "bg-amber-50 text-amber-900 border border-amber-100" : "bg-purple-50 text-purple-900 border border-purple-100";
            return (
              <div key={i} className={`max-w-full break-words p-2 rounded-lg ${isSelf ? bubbleSelf : bubbleOther}`}>
                <div className={`text-xs mb-1 ${isSelf ? "text-white/90" : "text-muted-foreground"}`}>{isSelf ? "Você" : m.from || "Outro"} • {new Date(m.ts).toLocaleTimeString()}</div>
                <div className="whitespace-pre-wrap">{m.text}</div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 items-end">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            className={`flex-1 p-2 border rounded resize-none bg-card text-card-foreground focus:outline-none ${theme === "merchant" ? "focus:ring-2 focus:ring-green-300" : theme === "courier" ? "focus:ring-2 focus:ring-amber-300" : "focus:ring-2 focus:ring-violet-300"}`}
            placeholder="Escreva uma mensagem..."
          />
          <button onClick={send} className={`px-3 py-2 rounded-md text-white ${theme === "merchant" ? "bg-green-600 hover:bg-green-700" : theme === "courier" ? "bg-amber-500 hover:bg-amber-600" : "bg-purple-600 hover:bg-purple-700"}`}>Enviar</button>
        </div>
      </CardContent>
    </Card>
  );
}
