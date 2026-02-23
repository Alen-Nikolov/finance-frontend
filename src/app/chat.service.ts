import { Injectable, inject, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';

export interface ChatMessage {
  id: number;
  username: string;
  content: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly socket: Socket;
  readonly messages = signal<ChatMessage[]>([]);
  readonly unreadCount = signal(0);

  private helloActive = false;

  constructor() {
    // for dev: http://localhost:3000 
    // for prod: https://finance-backend-x0tv.onrender.com
    const baseOrigin = 'https://finance-backend-x0tv.onrender.com';

    this.socket = io(baseOrigin, {
      transports: ['websocket', 'polling'],
    });

    this.socket.on('chat:history', (history: ChatMessage[]) => {
      this.messages.set(history);
      if (this.helloActive) {
        this.unreadCount.set(0);
      }
    });

    this.socket.on('chat:new', (message: ChatMessage) => {
      this.messages.update((list) => [...list, message]);
      if (!this.helloActive) {
        this.unreadCount.update((n) => n + 1);
      }
    });
  }

  setHelloActive(active: boolean) {
    this.helloActive = active;
    if (active) {
      this.unreadCount.set(0);
    }
  }

  send(username: string, content: string) {
    const trimmedName = username.trim();
    const trimmedContent = content.trim();
    if (!trimmedName || !trimmedContent) {
      return;
    }
    this.socket.emit('chat:send', { username: trimmedName, content: trimmedContent });
  }

  deleteMessage(id: number) {
    this.socket.emit('chat:delete', { id });
  }
}

