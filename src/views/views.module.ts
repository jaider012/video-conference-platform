// src/views/views.module.ts
import { Module } from '@nestjs/common';
import { ViewsController } from './views.controller';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
    }),
  ],
  controllers: [ViewsController],
})
export class ViewsModule {}
