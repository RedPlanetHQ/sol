import { Module, NestModule, DynamicModule, forwardRef } from '@nestjs/common';
import { PrismaModule } from 'nestjs-prisma';

import { UsersModule } from 'modules/users/users.module';

import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

@Module({
  providers: [AuthService, AuthGuard],
  exports: [AuthService, AuthGuard],
  controllers: [AuthController],
  imports: [PrismaModule, forwardRef(() => UsersModule)],
})
export class AuthModule implements NestModule {
  configure() {}

  static forRoot(): DynamicModule {
    return {
      providers: [AuthService, AuthGuard],
      exports: [AuthService, AuthGuard],
      controllers: [AuthController],
      imports: [UsersModule, PrismaModule],
      module: AuthModule,
    };
  }
}
