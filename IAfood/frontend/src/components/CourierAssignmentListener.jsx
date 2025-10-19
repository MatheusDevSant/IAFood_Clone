import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { api } from "@/lib/api";

export default function CourierAssignmentListener({ user }) {
  const [socket, setSocket] = useState(null);
  const [proposal, setProposal] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!user || user.role !== "courier") return;

    const s = io("http://localhost:3000", { transports: ["websocket"] });
    setSocket(s);

    s.on("connect", () => {
      // join room
      const room = `courier-${user.id}`;
      s.emit("joinRoom", { room });
      console.log("Courier socket connected, joined:", room);
    });

    s.on("assignmentRequest", (data) => {
      // data should contain assignmentId, orderId, score, expiresAt, order summary
      console.log("assignmentRequest received:", data);
      setProposal(data);
      const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : Date.now() + 20000;
      const secs = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setSecondsLeft(secs);
    });

    s.on("assignmentResponse", (payload) => {
      console.log("assignmentResponse:", payload);
      // if assignment was responded elsewhere, clear proposal UI
      if (proposal && String(payload.assignmentId) === String(proposal.id)) {
        setProposal(null);
        setSecondsLeft(0);
      }
    });

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [user]);

  // countdown effect
  useEffect(() => {
    if (!proposal || secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [proposal, secondsLeft]);

  const respond = async (action) => {
    if (!proposal) return;
    try {
      await api.post(`/assignments/${proposal.id}/respond`, { action });
      setProposal(null);
      setSecondsLeft(0);
    } catch (err) {
      console.error("Erro ao responder assignment:", err);
    }
  };

  if (!proposal) return null;

  return (
    <div className="fixed inset-0 flex items-end sm:items-center justify-center p-4 pointer-events-none">
      <div className="w-full max-w-md pointer-events-auto bg-white dark:bg-gray-900 rounded-xl shadow-lg border p-4">
        <h3 className="font-bold">Nova proposta de entrega</h3>
        <p className="text-sm text-muted-foreground">Pedido #{proposal.order_id} • {proposal.merchant_name}</p>
        <p className="mt-2">Tempo restante: <strong>{secondsLeft}s</strong></p>

        <div className="flex gap-2 mt-4">
          <button className="btn btn-danger flex-1" onClick={() => respond('REJECT')}>Recusar</button>
          <button className="btn btn-primary flex-1" onClick={() => respond('ACCEPT')}>Aceitar</button>
        </div>
      </div>
    </div>
  );
}
