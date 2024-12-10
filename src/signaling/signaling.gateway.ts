import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomsService } from '../rooms/rooms.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SignalingGateway {
  @WebSocketServer() server: Server;
  constructor(private roomsService: RoomsService) {}

  @SubscribeMessage('join')
  handleJoin(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log('Client joining room:', data.roomId);
    const { roomId } = data;
    this.roomsService.joinRoom(roomId, client.id);
    client.join(roomId);
    client.emit('joined', { roomId, clientId: client.id });
    client.to(roomId).emit('userJoined', { clientId: client.id });
  }

  @SubscribeMessage('leave')
  handleLeave(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId } = data;
    console.log('Join room request:', data, 'from client:', client.id);

    this.roomsService.leaveRoom(roomId, client.id);
    client.leave(roomId);
    client.to(roomId).emit('userLeft', { clientId: client.id });
  }

  @SubscribeMessage('chatMessage')
  handleChatMessage(
    @MessageBody() data: { roomId: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, message } = data;

    this.server.to(roomId).emit('chatMessage', {
      clientId: client.id,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  // @SubscribeMessage('offer')
  // handleOffer(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
  //   // Lógica para manejar ofertas WebRTC
  // }

  // @SubscribeMessage('answer')
  // handleAnswer(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
  //   // Lógica para manejar respuestas WebRTC
  // }

  // @SubscribeMessage('ice-candidate')
  // handleIceCandidate(
  //   @MessageBody() data: any,
  //   @ConnectedSocket() client: Socket,
  // ) {
  //   // Lógica para manejar candidatos ICE
  // }
}
