// src/signaling/signaling.module.ts
import { Module } from '@nestjs/common';
import { SignalingGateway } from './signaling.gateway';
import { RoomsService } from 'src/rooms/rooms.service';

@Module({
  providers: [SignalingGateway, RoomsService],
})
export class SignalingModule {}
