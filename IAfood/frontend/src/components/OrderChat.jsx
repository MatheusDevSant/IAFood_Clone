import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

export default function OrderChat({ orderId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const socketRef = useRef(null);
  const scrollRef = useRef(null);

  // conecta ao socket e entra na sala do pedido
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

  // rolar para o fim quando chegam novas mensagens
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

  // Enter envia (Shift+Enter permite nova linha)
  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="border p-3 rounded">
      <div ref={scrollRef} className="h-40 overflow-auto mb-2">
        {messages.map((m, i) => (
          <div key={i} className={`p-2 mb-1 ${m.self ? "bg-blue-100" : "bg-gray-100"} rounded`}>
            <div className="text-xs text-gray-500 mb-1">{m.self ? "Você" : m.from || "Outro"} • {new Date(m.ts).toLocaleTimeString()}</div>
            <div>{m.text}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown} rows={1} className="flex-1 p-2 border rounded resize-none" placeholder="Mensagem..." />
        <button onClick={send} className="px-3 py-2 bg-green-600 text-white rounded">Enviar</button>
      </div>
    </div>
  );
}
