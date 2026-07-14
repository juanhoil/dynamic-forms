import { Body, Controller, Get, HttpCode, Inject, NotFoundException, Param, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { McpFlowService, type McpFlowToolCall } from './mcp-flow.service.js';

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc?: '2.0';
  id?: JsonRpcId;
  method?: string;
  params?: Record<string, any>;
};

@ApiTags('Forms MCP Flow')
@Controller('forms/mcp-flow')
export class McpFlowController {
  constructor(@Inject(McpFlowService) private readonly flow: McpFlowService) {}

  @Get('sessions')
  @ApiOperation({
    summary: 'Lista sessionIds activos del flujo MCP',
  })
  listSessions() {
    return { sessions: this.flow.listSessionIds() };
  }

  @Get('sessions/:sessionId')
  @ApiOperation({
    summary: 'Inspecciona la sesión del flujo por formulario',
    description:
      'Devuelve por cada form: dataInit, dataEnd, submit.response, historial de dependents y answers.',
  })
  @ApiParam({ name: 'sessionId', description: 'UUID del flujo (qs_*)' })
  @ApiResponse({
    status: 200,
    description: 'Snapshot de sesión',
    schema: {
      type: 'object',
      example: {
        sessionId: 'qs_8cf510b9-12a',
        formIds: [1, 4],
        formIndex: 0,
        currentFormId: 1,
        forms: [
          {
            formId: 1,
            dataInit: { title: 'foo' },
            dataEnd: { title: 'bar' },
            submit: { response: { id: 1 }, warnings: [] },
            dependents: [],
            answers: [],
          },
        ],
      },
    },
  })
  getSession(@Param('sessionId') sessionId: string) {
    try {
      return this.flow.getSessionView(sessionId);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new NotFoundException(`No existe el flujo MCP "${sessionId}"`);
    }
  }

  @Post()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Endpoint MCP JSON-RPC de flujo campo-a-campo',
    description:
      'Soporta initialize, tools/list y tools/call. Tools: flow_list, flow_start, flow_answer (auto-dependent), flow_next_step, flow_back; flow_current (recovery).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['jsonrpc', 'method'],
      properties: {
        jsonrpc: { type: 'string', example: '2.0' },
        id: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'null' }], example: 1 },
        method: {
          type: 'string',
          enum: ['initialize', 'tools/list', 'tools/call'],
          example: 'tools/call',
        },
        params: {
          type: 'object',
          example: {
            name: 'flow_start',
            arguments: { formIds: [1, 4], values: { userId: 1 } },
          },
          description:
            'flow_start: { formIds }. Inspección: GET /api/forms/mcp-flow/sessions/:sessionId',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'JSON-RPC. Contrato: { ok, changed, sessionId, currentForm, fields, currentValues, dataInit, progress, dependentWatchFields, formDone, done, nextStep, warnings }. currentValues = estado actual del form.',
  })
  async handle(@Body() request: JsonRpcRequest) {
    const id = request.id ?? null;

    try {
      const result = await this.dispatch(request);
      return { jsonrpc: '2.0', id, result };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: 'Error ejecutando MCP flow de formularios.',
          data: this.flow.toMcpError(error),
        },
      };
    }
  }

  private async dispatch(request: JsonRpcRequest) {
    switch (request.method) {
      case 'initialize':
        return {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: {
            name: 'fenix-forms-mcp-flow',
            version: '1.0.0',
          },
        };
      case 'tools/list':
        return { tools: this.flow.listTools() };
      case 'tools/call': {
        const output = await this.flow.callTool(this.readToolCall(request.params));
        return this.flow.toMcpContent(output);
      }
      default:
        return this.flow.toMcpError({
          status: 404,
          message: `Metodo MCP no soportado: ${request.method ?? 'sin metodo'}`,
        });
    }
  }

  private readToolCall(params: Record<string, any> | undefined): McpFlowToolCall {
    if (!params || typeof params.name !== 'string') {
      throw new Error('tools/call requiere params.name.');
    }

    return {
      name: params.name as McpFlowToolCall['name'],
      arguments: params.arguments,
    };
  }
}
