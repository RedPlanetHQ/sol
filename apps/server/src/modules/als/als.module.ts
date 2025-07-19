import {
  forwardRef,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';

import { AuthModule } from 'modules/auth/auth.module';

import { ALSMiddleware } from './als.middleware';
import { ALSService } from './als.service';

@Module({
  imports: [forwardRef(() => AuthModule)],
  providers: [ALSService],
  exports: [ALSService],
})
export class ALSModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ALSMiddleware).forRoutes('*');
  }
}
