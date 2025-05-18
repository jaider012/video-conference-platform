import { Injectable } from '@nestjs/common';

interface Room {
  id: string;
  participants: Set<string>;
  createdAt: Date;
}

@Injectable()
export class RoomsService {
  private rooms: Map<string, Set<string>> = new Map();
  private roomMetadata: Map<string, Room> = new Map();

  createRoom(roomId: string): void {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
      this.roomMetadata.set(roomId, {
        id: roomId,
        participants: new Set(),
        createdAt: new Date(),
      });
    }
  }

  joinRoom(roomId: string, clientId: string): void {
    if (!this.rooms.has(roomId)) {
      this.createRoom(roomId);
    }
    this.rooms.get(roomId).add(clientId);
    this.roomMetadata.get(roomId).participants.add(clientId);
  }

  leaveRoom(roomId: string, clientId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(clientId);
      this.roomMetadata.get(roomId)?.participants.delete(clientId);
      if (room.size === 0) {
        this.rooms.delete(roomId);
        this.roomMetadata.delete(roomId);
      }
    }
  }

  getRoomParticipants(roomId: string): string[] {
    return Array.from(this.rooms.get(roomId) || []);
  }

  isInRoom(roomId: string, clientId: string): boolean {
    const room = this.rooms.get(roomId);
    return room ? room.has(clientId) : false;
  }

  getAllRooms(): { id: string; participantCount: number; createdAt: Date }[] {
    return Array.from(this.roomMetadata.entries()).map(([id, room]) => ({
      id,
      participantCount: room.participants.size,
      createdAt: room.createdAt,
    }));
  }
}
