import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule, PrismaService } from 'nestjs-prisma';

import { AuthModule } from 'modules/auth/auth.module';
import { UsersService } from 'modules/users/users.service';

import { IntegrationDefinitionController } from './integration-definition.controller';
import { IntegrationDefinitionService } from './integration-definition.service';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  controllers: [IntegrationDefinitionController],
  providers: [PrismaService, IntegrationDefinitionService, UsersService],
  exports: [IntegrationDefinitionService],
})
export class IntegrationDefinitionModule {}
