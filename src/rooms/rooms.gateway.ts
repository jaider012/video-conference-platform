import { WebSocketGateway } from '@nestjs/websockets';
import { RoomsService } from './rooms.service';

@WebSocketGateway()
export class RoomsGateway {
  constructor(private readonly roomsService: RoomsService) {}
}
