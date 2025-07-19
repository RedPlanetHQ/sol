import { forwardRef, Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PrismaModule, PrismaService } from 'nestjs-prisma';

import { AuthModule } from 'modules/auth/auth.module';
import { UsersService } from 'modules/users/users.service';

import { AttachmentController } from './attachments.controller';
import { AttachmentService } from './attachments.service';
import { StorageFactory } from './storage.factory';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({
      storage: memoryStorage(),
    }),
    forwardRef(() => AuthModule),
  ],
  controllers: [AttachmentController],
  providers: [AttachmentService, PrismaService, UsersService, StorageFactory],
  exports: [AttachmentService],
})
export class AttachmentModule {}
