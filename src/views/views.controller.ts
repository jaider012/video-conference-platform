import { Controller, Get, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { ViewsService } from './views.service';

interface SyncProfile {
  id: string;
  name: string;
  reactionStartTime: number;
  externalStartTime: number;
  offset: number;
  description: string;
  createdAt: string;
}

@Controller()
export class ViewsController {
  constructor(private readonly viewsService: ViewsService) {}

  @Get()
  serveVideoChat(@Res() res: Response) {
    // Usa el path.join para manejar las rutas de manera segura
    res.sendFile(join(process.cwd(), 'public', 'video-chat.html'));
  }

  @Get('video-chat')
  serveVideoChatPage(@Res() res: Response) {
    res.sendFile(join(process.cwd(), 'public', 'video-chat.html'));
  }

  @Get('reaction-sync')
  serveReactionSyncPage(@Res() res: Response) {
    res.sendFile(join(process.cwd(), 'public', 'reaction-sync.html'));
  }

  @Get('api/sync-profiles')
  async getSyncProfiles(): Promise<SyncProfile[]> {
    return this.viewsService.getSyncProfiles();
  }

  @Post('api/sync-profiles')
  async saveSyncProfile(@Body() profile: any): Promise<SyncProfile> {
    return this.viewsService.saveSyncProfile(profile);
  }
}
