import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { minimizeTool } from './schemaMinimizer';

export interface PropertyDefinition {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: any[];
  required?: boolean;
  items?: any;
  properties?: any;
}

export interface ToolDefinition {
  name: string;
  description: string;
  schema?: Record<string, PropertyDefinition> | any;
  handler: (args: any, ctx: { server: McpServer; request: any }) => Promise<any> | any;
}

export interface ResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  handler: (uri: string, ctx: { server: McpServer; request: any }) => Promise<any> | any;
}

export interface PromptDefinition {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
  handler: (args: any, ctx: { server: McpServer; request: any }) => Promise<any> | any;
}

export interface McpServerOptions {
  name: string;
  version: string;
  description?: string;
  enableSchemaMinimization?: boolean;
}

export type Middleware = (
  ctx: { server: McpServer; name: string; type: 'tool' | 'resource' | 'prompt'; arguments: any },
  next: () => Promise<any>
) => Promise<any>;

export class McpServer {
  private server: Server;
  private tools = new Map<string, ToolDefinition>();
  private resources = new Map<string, ResourceDefinition>();
  private prompts = new Map<string, PromptDefinition>();
  private middlewares: Middleware[] = [];
  private options: McpServerOptions;

  constructor(options: McpServerOptions) {
    this.options = {
      enableSchemaMinimization: true,
      ...options,
    };

    this.server = new Server(
      {
        name: options.name,
        version: options.version,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Registers a middleware hook to intercept calls (logging, auth, telemetry, caching).
   */
  public use(middleware: Middleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Registers a tool.
   */
  public tool(
    name: string,
    description: string,
    schema: Record<string, PropertyDefinition> | any,
    handler: ToolDefinition['handler']
  ): this {
    this.tools.set(name, { name, description, schema, handler });
    return this;
  }

  /**
   * Registers a static or dynamic resource.
   */
  public resource(
    uri: string,
    name: string,
    description: string,
    mimeType: string,
    handler: ResourceDefinition['handler']
  ): this {
    this.resources.set(uri, { uri, name, description, mimeType, handler });
    return this;
  }

  /**
   * Registers a prompt template.
   */
  public prompt(
    name: string,
    description: string,
    args: PromptDefinition['arguments'],
    handler: PromptDefinition['handler']
  ): this {
    this.prompts.set(name, { name, description, arguments: args, handler });
    return this;
  }

  /**
   * Compiles JSON schema from a property definition record.
   */
  private buildInputSchema(schema: any): any {
    if (!schema) {
      return { type: 'object', properties: {} };
    }

    // If it's already a full JSON schema object, return it
    if (schema.type === 'object' && schema.properties) {
      return schema;
    }

    // Build JSON Schema from property definitions record
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const [key, prop] of Object.entries(schema)) {
      const p = prop as PropertyDefinition;
      properties[key] = {
        type: p.type,
        description: p.description,
        ...(p.enum ? { enum: p.enum } : {}),
        ...(p.items ? { items: p.items } : {}),
        ...(p.properties ? { properties: p.properties } : {}),
      };
      if (p.required) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      ...(required.length > 0 ? { required } : {}),
    };
  }

  /**
   * Validate tool/prompt arguments against declared requirements.
   */
  private validateArguments(args: any, schema: any): void {
    if (!schema || !args) return;
    const inputSchema = this.buildInputSchema(schema);
    
    if (inputSchema.required) {
      for (const requiredField of inputSchema.required) {
        if (args[requiredField] === undefined || args[requiredField] === null) {
          throw new Error(`Missing required parameter: ${requiredField}`);
        }
      }
    }

    if (inputSchema.properties) {
      for (const [key, value] of Object.entries(args)) {
        const propDef = inputSchema.properties[key];
        if (propDef) {
          const expectedType = propDef.type;
          const actualType = Array.isArray(value) ? 'array' : typeof value;
          if (expectedType && expectedType !== actualType) {
            // Allow numbers formatted as strings or vice versa if easily coercible
            if (expectedType === 'number' && actualType === 'string' && !isNaN(Number(value))) {
              args[key] = Number(value);
            } else if (expectedType === 'boolean' && actualType === 'string') {
              if (value === 'true') args[key] = true;
              else if (value === 'false') args[key] = false;
            } else {
              throw new Error(`Invalid type for parameter '${key}': Expected ${expectedType}, got ${actualType}`);
            }
          }
        }
      }
    }
  }

  /**
   * Execute handler through middlewares chain.
   */
  private async executeWithMiddleware(
    name: string,
    type: 'tool' | 'resource' | 'prompt',
    args: any,
    baseCall: () => Promise<any>
  ): Promise<any> {
    let index = 0;
    const ctx = { server: this, name, type, arguments: args };

    const next = async (): Promise<any> => {
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index++];
        return middleware(ctx, next);
      }
      return baseCall();
    };

    return next();
  }

  /**
   * Setup request handlers on the underlying MCP server.
   */
  private setupHandlers(): void {
    // 1. Tool handlers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const list = Array.from(this.tools.values()).map((t) => {
        const inputSchema = this.buildInputSchema(t.schema);
        const rawTool = {
          name: t.name,
          description: t.description,
          inputSchema,
        };
        return this.options.enableSchemaMinimization ? minimizeTool(rawTool) : rawTool;
      });

      return { tools: list };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const t = this.tools.get(name);
      if (!t) {
        throw new Error(`Unknown tool: ${name}`);
      }

      try {
        this.validateArguments(args, t.schema);

        const result = await this.executeWithMiddleware(name, 'tool', args, async () => {
          return t.handler(args, { server: this, request });
        });

        // Format return values automatically
        if (result && typeof result === 'object' && ('content' in result || 'isError' in result)) {
          return result;
        }

        if (typeof result === 'string') {
          return {
            content: [{ type: 'text', text: result }],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error executing tool '${name}': ${error.message || error}`,
            },
          ],
        };
      }
    });

    // 2. Resource handlers
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resourcesList = Array.from(this.resources.values()).map((r) => ({
        uri: r.uri,
        name: r.name,
        description: r.description,
        mimeType: r.mimeType,
      }));
      return { resources: resourcesList };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      const r = this.resources.get(uri);
      if (!r) {
        throw new Error(`Resource not found: ${uri}`);
      }

      try {
        const result = await this.executeWithMiddleware(uri, 'resource', null, async () => {
          return r.handler(uri, { server: this, request });
        });

        if (result && typeof result === 'object' && 'contents' in result) {
          return result;
        }

        if (typeof result === 'string') {
          return {
            contents: [
              {
                uri,
                mimeType: r.mimeType || 'text/plain',
                text: result,
              },
            ],
          };
        }

        return {
          contents: [
            {
              uri,
              mimeType: r.mimeType || 'application/json',
              text: typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result),
            },
          ],
        };
      } catch (error: any) {
        throw new Error(`Error reading resource '${uri}': ${error.message || error}`);
      }
    });

    // 3. Prompt handlers
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      const promptsList = Array.from(this.prompts.values()).map((p) => ({
        name: p.name,
        description: p.description,
        arguments: p.arguments,
      }));
      return { prompts: promptsList };
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const p = this.prompts.get(name);
      if (!p) {
        throw new Error(`Prompt not found: ${name}`);
      }

      try {
        // Validate required prompt arguments
        if (p.arguments && args) {
          for (const argDef of p.arguments) {
            if (argDef.required && (args[argDef.name] === undefined || args[argDef.name] === null)) {
              throw new Error(`Missing required prompt argument: ${argDef.name}`);
            }
          }
        }

        const result = await this.executeWithMiddleware(name, 'prompt', args, async () => {
          return p.handler(args, { server: this, request });
        });

        if (result && typeof result === 'object' && 'messages' in result) {
          return result;
        }

        if (typeof result === 'string') {
          return {
            messages: [
              {
                role: 'user',
                content: { type: 'text', text: result },
              },
            ],
          };
        }

        throw new Error(`Invalid prompt handler return value: Must return a GetPromptResult structure`);
      } catch (error: any) {
        throw new Error(`Error getting prompt '${name}': ${error.message || error}`);
      }
    });
  }

  /**
   * Connects the server to a transport (defaults to StdioServerTransport).
   */
  public async start(transport?: Transport): Promise<void> {
    const activeTransport = transport || new StdioServerTransport();
    await this.server.connect(activeTransport);
    console.error(`MCP Server '${this.options.name}' v${this.options.version} is running`);
  }
}
