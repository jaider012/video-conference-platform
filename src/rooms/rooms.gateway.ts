import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { RoomsService } from './rooms.service';

interface RoomInfo {
  roomId: string;
  name?: string;
  description?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RoomsGateway {
  @WebSocketServer() server: Server;
  private logger = new Logger(RoomsGateway.name);

  constructor(private readonly roomsService: RoomsService) {}

  @SubscribeMessage('createRoom')
  handleCreateRoom(
    @MessageBody() data: RoomInfo,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Client ${client.id} creating room ${data.roomId}`);
    this.roomsService.createRoom(data.roomId);
    return {
      status: 'success',
      roomId: data.roomId,
    };
  }

  @SubscribeMessage('listRooms')
  handleListRooms() {
    const rooms = this.roomsService.getAllRooms();
    return {
      status: 'success',
      rooms,
    };
  }

  @SubscribeMessage('getRoomParticipants')
  handleGetRoomParticipants(@MessageBody() data: { roomId: string }) {
    const participants = this.roomsService.getRoomParticipants(data.roomId);
    return {
      status: 'success',
      roomId: data.roomId,
      participants,
    };
  }
}
