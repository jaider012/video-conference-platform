// src/rooms/rooms.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class RoomsService {
  private rooms: Map<string, Set<string>> = new Map();

  createRoom(roomId: string): void {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
  }

  joinRoom(roomId: string, clientId: string): void {
    if (!this.rooms.has(roomId)) {
      this.createRoom(roomId);
    }
    this.rooms.get(roomId).add(clientId);
  }

  leaveRoom(roomId: string, clientId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(clientId);
      if (room.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  getRoomParticipants(roomId: string): string[] {
    return Array.from(this.rooms.get(roomId) || []);
  }
}
