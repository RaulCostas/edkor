import React, { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { io, Socket } from "socket.io-client";

interface ChatContextType {
  socket: Socket | null;
  isConnected: boolean;
  messages: Message[];
  sendMessage: (msg: string, to?: string) => void;
  senderName: string;
  activeUsers: string[];
  loginUser: (user: any) => void;
  logoutUser: () => void;
  reconnect: () => void;
}

export interface Message {
  sender: string;
  message: string;
  to?: string;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};

import { API_BASE_URL } from "../config";

interface ChatProviderProps {
  children: ReactNode;
}

const SOCKET_URL = API_BASE_URL;

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = React.useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [senderName, setSenderName] = useState("");
  const [activeUsers, setActiveUsers] = useState<string[]>([]);

  const connectSocket = (name: string) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Resolver URL y path para WebSocket de forma inteligente
    let serverUrl = API_BASE_URL || window.location.origin;
    let socketPath = "/socket.io";

    // Si la URL es relativa (/api o similar)
    if (serverUrl.startsWith("/")) {
      serverUrl = window.location.origin + serverUrl;
    }

    try {
      const parsed = new URL(serverUrl);
      // Prevenir bloqueo Mixed Content en producción HTTPS
      if (
        typeof window !== "undefined" &&
        window.location.protocol === "https:" &&
        parsed.protocol === "http:" &&
        parsed.hostname !== "localhost" &&
        parsed.hostname !== "127.0.0.1"
      ) {
        parsed.protocol = "https:";
      }

      // Si la API tiene prefijo de ruta (ej: https://dominio.com/api), socket.io debe usar ese path
      if (parsed.pathname && parsed.pathname !== "/") {
        socketPath = `${parsed.pathname.replace(/\/+$/, "")}/socket.io`;
      }
      serverUrl = parsed.origin;
    } catch (e) {
      console.warn("Error parsing API_BASE_URL for socket:", e);
    }

    console.log(`[Chat] Conectando a ${serverUrl} con path ${socketPath}`);

    const newSocket = io(serverUrl, {
      path: socketPath,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("[Chat] Conectado exitosamente al servidor de chat");
      setIsConnected(true);
      newSocket.emit("join", name);
    });

    newSocket.on("connect_error", (err) => {
      console.warn("[Chat] Error de conexión socket:", err.message);
      setIsConnected(false);
    });

    newSocket.on("reconnect", () => {
      console.log("[Chat] Reconectado al servidor de chat");
      setIsConnected(true);
      newSocket.emit("join", name);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("[Chat] Desconectado del servidor de chat. Razón:", reason);
      setIsConnected(false);
      setActiveUsers([]);
    });

    newSocket.on("receiveMessage", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on("activeUsers", (users: string[]) => {
      setActiveUsers(users);
    });
  };

  const loginUser = (user: any) => {
    setSenderName(user.name);
    connectSocket(user.name);
  };

  const reconnect = () => {
    if (senderName) {
      connectSocket(senderName);
    } else {
      const user = localStorage.getItem("user");
      if (user) {
        try {
          const parsedUser = JSON.parse(user);
          if (parsedUser?.name) {
            setSenderName(parsedUser.name);
            connectSocket(parsedUser.name);
          }
        } catch (e) {
          console.error("Error parsing user from localStorage", e);
        }
      }
    }
  };

  const logoutUser = () => {
    if (socketRef.current) {
      socketRef.current.emit("logout");
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setSenderName("");
    setIsConnected(false);
    setActiveUsers([]);
    setSocket(null);
  };

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const parsedUser = JSON.parse(user);
        if (parsedUser) {
          setSenderName(parsedUser.name);
          connectSocket(parsedUser.name);
        }
      } catch (e) {
        console.error("Error parsing user from localStorage", e);
      }
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const sendMessage = (msg: string, to?: string) => {
    if (socketRef.current && msg.trim()) {
      const payload = { sender: senderName, message: msg, to };
      socketRef.current.emit("sendMessage", payload);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        socket,
        isConnected,
        messages,
        sendMessage,
        senderName,
        activeUsers,
        loginUser,
        logoutUser,
        reconnect,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
