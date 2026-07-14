import { Module } from '@nestjs/common';
import { FormConfigModule } from '../form-config/form-config.module.js';
import { FormsController } from './forms.controller.js';
import { FormsMcpController } from './mcp/forms-mcp.controller.js';
import { FormsMcpService } from './mcp/forms-mcp.service.js';
import { McpFlowController } from './mcp/mcp-flow.controller.js';
import { McpFlowService } from './mcp/mcp-flow.service.js';
import { FormsSessionService } from './forms-session.service.js';
import { FormsService } from './forms.service.js';

@Module({
  imports: [FormConfigModule],
  controllers: [FormsController, FormsMcpController, McpFlowController],
  providers: [FormsService, FormsSessionService, FormsMcpService, McpFlowService],
})
export class FormsModule {}
