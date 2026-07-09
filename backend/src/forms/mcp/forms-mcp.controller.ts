import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FormsMcpService, type FormsMcpToolCall } from './forms-mcp.service.js';

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc?: '2.0';
  id?: JsonRpcId;
  method?: string;
  params?: Record<string, any>;
};

@ApiTags('Forms MCP')
@Controller('forms/mcp')
export class FormsMcpController {
  constructor(@Inject(FormsMcpService) private readonly mcp: FormsMcpService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Endpoint MCP JSON-RPC de formularios',
    description:
      'Soporta initialize, tools/list y tools/call. Tools disponibles: form_init, form_dependent y form_submit.',
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
            name: 'form_init',
            arguments: {
              formId: 1,
              sessionId: 'fe9d6d60-5f83-4d57-b609-1b1c09c3b7a2',
              values: { userId: 1 },
              useTestValues: false,
            },
          },
          description:
            'Para form_dependent/form_submit usar arguments: { formId, sessionId, dataform, jschema, values }.',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        jsonrpc: { type: 'string', example: '2.0' },
        id: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'null' }], example: 1 },
        result: { type: 'object' },
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
          message: 'Error ejecutando MCP de formularios.',
          data: this.mcp.toMcpError(error),
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
            name: 'fenix-forms-mcp',
            version: '1.0.0',
          },
        };
      case 'tools/list':
        return { tools: this.mcp.listTools() };
      case 'tools/call': {
        const output = await this.mcp.callTool(this.readToolCall(request.params));
        return this.mcp.toMcpContent(output);
      }
      default:
        return this.mcp.toMcpError({
          status: 404,
          message: `Metodo MCP no soportado: ${request.method ?? 'sin metodo'}`,
        });
    }
  }

  private readToolCall(params: Record<string, any> | undefined): FormsMcpToolCall {
    if (!params || typeof params.name !== 'string') {
      throw new Error('tools/call requiere params.name.');
    }

    return {
      name: params.name as FormsMcpToolCall['name'],
      arguments: params.arguments,
    };
  }
}
