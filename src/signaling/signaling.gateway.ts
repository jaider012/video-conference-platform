import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { RoomsService } from '../rooms/rooms.service';

interface WebRTCData {
  roomId: string;
  targetId: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

interface ChatMessage {
  roomId: string;
  message: string;
  timestamp?: string;
}
interface StreamStateData {
  roomId: string;
  video: boolean;
  audio: boolean;
  isScreenSharing?: boolean;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SignalingGateway {
  @WebSocketServer() server: Server;
  private logger = new Logger(SignalingGateway.name);
  private joinDebounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private activeParticipants: Map<string, Set<string>> = new Map();
  private readonly JOIN_DEBOUNCE_TIME = 1000; // 2 seconds debounce

  constructor(private roomsService: RoomsService) {}

  private getOrCreateParticipantSet(roomId: string): Set<string> {
    if (!this.activeParticipants.has(roomId)) {
      this.activeParticipants.set(roomId, new Set());
    }
    return this.activeParticipants.get(roomId);
  }

  private clearDebounceTimer(clientId: string) {
    const existingTimer = this.joinDebounceTimers.get(clientId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.joinDebounceTimers.delete(clientId);
    }
  }

  @SubscribeMessage('join')
  handleJoin(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId } = data;
    this.logger.log(`Client ${client.id} attempting to join room ${roomId}`);

    const participants = this.getOrCreateParticipantSet(roomId);

    // Check if user is already in the room
    if (participants.has(client.id)) {
      this.logger.log(`Client ${client.id} already in room ${roomId}`);
      return;
    }

    // Clear any existing debounce timer
    this.clearDebounceTimer(client.id);

    // Set debounce timer for join event
    const timer = setTimeout(() => {
      // Add to room and track participation
      this.roomsService.joinRoom(roomId, client.id);
      participants.add(client.id);
      client.join(roomId);

      // Get current participants excluding the joining user
      const currentParticipants = Array.from(participants).filter(
        (id) => id !== client.id,
      );

      // Notify the joining user
      client.emit('joined', {
        roomId,
        clientId: client.id,
        participants: currentParticipants,
      });

      // Notify other participants
      client.to(roomId).emit('userJoined', {
        clientId: client.id,
        timestamp: new Date().toISOString(),
      });

      this.joinDebounceTimers.delete(client.id);
    }, this.JOIN_DEBOUNCE_TIME);

    this.joinDebounceTimers.set(client.id, timer);
  }

  @SubscribeMessage('leave')
  handleLeave(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId } = data;
    this.logger.log(`Client ${client.id} leaving room ${roomId}`);

    // Clear any pending join timer
    this.clearDebounceTimer(client.id);

    // Remove from tracking
    const participants = this.activeParticipants.get(roomId);
    if (participants) {
      participants.delete(client.id);
      if (participants.size === 0) {
        this.activeParticipants.delete(roomId);
      }
    }

    this.roomsService.leaveRoom(roomId, client.id);
    client.leave(roomId);
    client.to(roomId).emit('userLeft', {
      clientId: client.id,
      timestamp: new Date().toISOString(),
    });
  }

  // Implement cleanup on client disconnect
  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected`);

    // Clear any pending join timer
    this.clearDebounceTimer(client.id);

    // Remove from all rooms
    this.activeParticipants.forEach((participants, roomId) => {
      if (participants.has(client.id)) {
        participants.delete(client.id);
        this.roomsService.leaveRoom(roomId, client.id);
        client.to(roomId).emit('userLeft', {
          clientId: client.id,
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  @SubscribeMessage('chatMessage')
  handleChatMessage(
    @MessageBody() data: ChatMessage,
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, message } = data;
    this.logger.log(
      `Chat message from ${client.id} in room ${roomId}: ${message}`,
    );

    // Verificar si el cliente está en la sala
    if (!this.roomsService.isInRoom(roomId, client.id)) {
      this.logger.warn(
        `Client ${client.id} tried to send message to room ${roomId} without joining`,
      );
      return;
    }

    // Agregar timestamp al mensaje
    const messageWithMetadata = {
      clientId: client.id,
      message,
      timestamp: new Date().toISOString(),
      roomId,
    };

    // Emitir el mensaje a todos en la sala (incluyendo el emisor)
    this.server.to(roomId).emit('chatMessage', messageWithMetadata);
  }

  @SubscribeMessage('offer')
  handleOffer(
    @MessageBody() data: WebRTCData,
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, targetId, offer } = data;
    this.logger.log(`Forwarding offer from ${client.id} to ${targetId}`);

    this.server.to(targetId).emit('offer', {
      offer,
      roomId,
      sourceId: client.id,
    });
  }

  @SubscribeMessage('answer')
  handleAnswer(
    @MessageBody() data: WebRTCData,
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, targetId, answer } = data;
    this.logger.log(`Forwarding answer from ${client.id} to ${targetId}`);

    this.server.to(targetId).emit('answer', {
      answer,
      roomId,
      sourceId: client.id,
    });
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(
    @MessageBody() data: WebRTCData,
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, targetId, candidate } = data;
    this.logger.log(
      `Forwarding ICE candidate from ${client.id} to ${targetId}`,
    );

    this.server.to(targetId).emit('ice-candidate', {
      candidate,
      roomId,
      sourceId: client.id,
    });
  }

  @SubscribeMessage('stream-state')
  handleStreamState(
    @MessageBody() data: StreamStateData,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `Stream state update from ${client.id}: video=${data.video}, audio=${data.audio}, screenSharing=${data.isScreenSharing}`,
    );

    client.to(data.roomId).emit('stream-state-changed', {
      clientId: client.id,
      video: data.video,
      audio: data.audio,
      isScreenSharing: data.isScreenSharing,
    });
  }

  @SubscribeMessage('start-screen-share')
  handleStartScreenShare(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `Client ${client.id} started screen sharing in room ${data.roomId}`,
    );

    client.to(data.roomId).emit('user-started-sharing', {
      clientId: client.id,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('stop-screen-share')
  handleStopScreenShare(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `Client ${client.id} stopped screen sharing in room ${data.roomId}`,
    );

    client.to(data.roomId).emit('user-stopped-sharing', {
      clientId: client.id,
      timestamp: new Date().toISOString(),
    });
  }
}
