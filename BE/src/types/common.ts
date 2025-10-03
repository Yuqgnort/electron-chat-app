import { Socket } from "socket.io";

export interface AuthSocket extends Socket {
  userId?: string;
}

export type MessageStatus = "pending" | "sent" | "delivered" | "read";

export interface NewMessage {
  local_id: string;
  conversation_id: number;
  content: string;
}

export interface AckMessage {
  local_id: string;
  server_id: string;
  status: MessageStatus;
}

export interface ForwardMessage {
  server_id: string;
  conversation_id: number;
  senderId: number;
  content: string;
}

export interface Message {
  server_id: string;
  from: string;
  to: string;
  content: string;
  status: MessageStatus;
  createdAt: string;
}
