import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { InternalOrAdminGuard } from '../notifications/internal-or-admin.guard';
import { WhatsappAgentService } from './whatsapp-agent.service';
import { WhatsappAgentToolsService } from './whatsapp-agent-tools.service';

@Controller('whatsapp-agent')
@UseGuards(InternalOrAdminGuard)
export class WhatsappAgentController {
  constructor(
    private readonly service: WhatsappAgentService,
    private readonly toolsService: WhatsappAgentToolsService,
  ) {}

  @Get('export-customers.csv')
  async exportCustomersCsvFile(@Res() res: any) {
    const csv = await this.toolsService.generateCustomersCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="subscribai_customers.csv"');
    return res.send(csv);
  }

  @Get('status')
  getStatus() {
    return this.service.status();
  }

  @Get('agents')
  listAgents() {
    return this.service.listAgents();
  }

  @Post('agents')
  async saveAgent(
    @Body()
    body: {
      id?: string;
      name: string;
      whatsappKey: string;
      geminiKey?: string;
      role?: 'admin_assistant' | 'customer_support';
      systemPrompt?: string;
      enabled?: boolean;
    },
  ) {
    const saved = await this.service.saveAgent(body);
    return { success: true, agent: saved };
  }

  @Delete('agents/:id')
  async deleteAgent(@Param('id') id: string) {
    const ok = await this.service.deleteAgent(id);
    return { success: ok };
  }

  @Post('agents/:id/start')
  startAgent(@Param('id') id: string) {
    this.service.startAgent(id);
    return { success: true, running: true };
  }

  @Post('agents/:id/stop')
  stopAgent(@Param('id') id: string) {
    this.service.stopAgent(id);
    return { success: true, running: false };
  }

  @Get('agents/:id/history')
  getAgentHistory(@Param('id') id: string) {
    return this.service.getAgentHistory(id);
  }

  // ── Backwards Compatibility Endpoints ─────────────────────────────────────

  @Post('config')
  async updateConfig(
    @Body() body: { whatsappAgentKey?: string; geminiApiKey?: string },
  ) {
    await this.service.setKeys(body);
    return {
      success: true,
      ...this.service.status(),
    };
  }

  @Post('start')
  startFirstAgent() {
    const list = this.service.listAgents();
    if (list.length > 0) {
      this.service.startAgent(list[0].id);
    }
    return { success: true, running: true };
  }

  @Post('stop')
  stopFirstAgent() {
    const list = this.service.listAgents();
    if (list.length > 0) {
      this.service.stopAgent(list[0].id);
    }
    return { success: true, running: false };
  }

  @Get('history')
  getFirstAgentHistory(@Query('agentId') agentId?: string) {
    const targetId = agentId || this.service.listAgents()[0]?.id || 'default';
    return this.service.getAgentHistory(targetId);
  }
}
