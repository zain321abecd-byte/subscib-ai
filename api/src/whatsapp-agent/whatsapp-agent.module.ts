import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InternalOrAdminGuard } from '../notifications/internal-or-admin.guard';
import { WhatsappAgentService } from './whatsapp-agent.service';
import { WhatsappAgentWorker } from './whatsapp-agent.worker';
import { WhatsappAgentController } from './whatsapp-agent.controller';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [WhatsappAgentController],
  providers: [WhatsappAgentService, WhatsappAgentWorker, InternalOrAdminGuard],
  exports: [WhatsappAgentService],
})
export class WhatsappAgentModule {}
