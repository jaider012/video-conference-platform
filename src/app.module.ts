import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SignalingModule } from './signaling/signaling.module';
import { RoomsModule } from './rooms/rooms.module';

@Module({
  imports: [SignalingModule, RoomsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
