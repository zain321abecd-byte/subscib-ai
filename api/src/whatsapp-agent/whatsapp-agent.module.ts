import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { InternalOrAdminGuard } from '../notifications/internal-or-admin.guard';
import { WhatsappAgentService } from './whatsapp-agent.service';
import { WhatsappAgentWorker } from './whatsapp-agent.worker';
import { WhatsappAgentToolsService } from './whatsapp-agent-tools.service';
import { WhatsappAgentController } from './whatsapp-agent.controller';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [WhatsappAgentController],
  providers: [
    WhatsappAgentService,
    WhatsappAgentWorker,
    WhatsappAgentToolsService,
    InternalOrAdminGuard,
  ],
  exports: [WhatsappAgentService, WhatsappAgentToolsService],
})
export class WhatsappAgentModule {}
