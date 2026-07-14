import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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

  @Post()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Endpoint MCP JSON-RPC de flujo campo-a-campo',
    description:
      'Soporta initialize, tools/list y tools/call. Tools: flow_start (1-2 formIds), flow_current, flow_answer, flow_dependent, flow_next_step (= submit), flow_back.',
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
            'flow_start: { formIds: [id] | [id1, id2], values? }. Luego flow_answer / flow_dependent / flow_next_step (= submit) con { sessionId, ... }.',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'JSON-RPC. En tools/call, result.content[0].text es: { ok, changed, sessionId, currentForm, fields, values, progress, dependentWatchFields, formDone, done, nextStep, warnings }. nextStep es flow_answer | flow_dependent | flow_next_step | null.',
    schema: {
      type: 'object',
      properties: {
        jsonrpc: { type: 'string', example: '2.0' },
        id: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'null' }], example: 1 },
        result: {
          type: 'object',
          example: {
            content: [
              {
                type: 'text',
                text: '{\n  "ok": true,\n  "changed": true,\n  "sessionId": "qs_8cf510b9-12a",\n  "currentForm": { "formId": 1, "index": 1, "total": 2, "name": "Formulario 1" },\n  "fields": { "type": "object", "properties": { "title": { "type": "string" } } },\n  "values": {},\n  "progress": { "current": 1, "total": 3 },\n  "dependentWatchFields": [],\n  "formDone": false,\n  "done": false,\n  "warnings": []\n}',
              },
            ],
          },
        },
        error: { type: 'object' },
      },
    },
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
