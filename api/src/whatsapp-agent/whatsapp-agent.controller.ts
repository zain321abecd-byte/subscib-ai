import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { InternalOrAdminGuard } from '../notifications/internal-or-admin.guard';
import { WhatsappAgentService } from './whatsapp-agent.service';
import { WhatsappAgentWorker } from './whatsapp-agent.worker';

@Controller('whatsapp-agent')
@UseGuards(InternalOrAdminGuard)
export class WhatsappAgentController {
  constructor(
    private readonly service: WhatsappAgentService,
    private readonly worker: WhatsappAgentWorker,
  ) {}

  @Get('status')
  getStatus() {
    const serviceStatus = this.service.status();
    return {
      ...serviceStatus,
      workerRunning: this.worker.getIsRunning(),
    };
  }

  @Post('start')
  startWorker() {
    this.worker.start();
    return { success: true, running: true };
  }

  @Post('stop')
  stopWorker() {
    this.worker.stop();
    return { success: true, running: false };
  }

  @Get('history')
  getHistory() {
    return this.worker.getHistory();
  }
}
