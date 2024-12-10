import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';

@Controller()
export class ViewsController {
  @Get()
  serveVideoChat(@Res() res: Response) {
    // Usa el path.join para manejar las rutas de manera segura
    res.sendFile(join(process.cwd(), 'public', 'video-chat.html'));
  }
}
