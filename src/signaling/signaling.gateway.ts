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

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SignalingGateway {
  @WebSocketServer() server: Server;
  private logger = new Logger(SignalingGateway.name);

  constructor(private roomsService: RoomsService) {}

  @SubscribeMessage('join')
  handleJoin(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId } = data;
    this.logger.log(`Client ${client.id} joining room ${roomId}`);

    // Unirse a la sala
    this.roomsService.joinRoom(roomId, client.id);
    client.join(roomId);

    // Obtener lista de participantes actuales
    const participants = this.roomsService
      .getRoomParticipants(roomId)
      .filter((id) => id !== client.id);

    // Notificar al nuevo participante sobre los usuarios existentes
    client.emit('joined', {
      roomId,
      clientId: client.id,
      participants,
    });

    // Notificar a los demás participantes sobre el nuevo usuario
    client.to(roomId).emit('userJoined', { clientId: client.id });
  }

  @SubscribeMessage('leave')
  handleLeave(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId } = data;
    this.logger.log(`Client ${client.id} leaving room ${roomId}`);

    this.roomsService.leaveRoom(roomId, client.id);
    client.leave(roomId);
    client.to(roomId).emit('userLeft', { clientId: client.id });
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
    @MessageBody()
    data: {
      roomId: string;
      video: boolean;
      audio: boolean;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, video, audio } = data;
    this.logger.log(
      `Stream state update from ${client.id}: video=${video}, audio=${audio}`,
    );

    client.to(roomId).emit('stream-state-changed', {
      clientId: client.id,
      video,
      audio,
    });
  }
}
