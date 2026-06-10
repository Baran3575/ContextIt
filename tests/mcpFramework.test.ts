import { McpServer } from '../src/mcp/framework';

describe('McpServer Framework', () => {
  it('should register tools and build correct schemas', () => {
    const server = new McpServer({
      name: 'test-server',
      version: '1.0.0',
      enableSchemaMinimization: false,
    });

    server.tool(
      'hello',
      'Says hello',
      {
        name: { type: 'string', description: 'Name to say hello to', required: true },
      },
      (args) => `Hello, ${args.name}!`
    );

    const schema = server['buildInputSchema'](server['tools'].get('hello')?.schema);
    expect(schema).toEqual({
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name to say hello to',
        },
      },
      required: ['name'],
    });
  });

  it('should validate arguments correctly', () => {
    const server = new McpServer({
      name: 'test-server',
      version: '1.0.0',
    });

    const schema = {
      age: { type: 'number', description: 'Age', required: true },
      active: { type: 'boolean', description: 'Active', required: false },
    };

    // Missing required field
    expect(() => server['validateArguments']({}, schema)).toThrow(/Missing required parameter: age/);

    // Invalid type
    expect(() => server['validateArguments']({ age: 'not-a-number' }, schema)).toThrow(/Invalid type for parameter 'age'/);

    // Valid and coerced types
    const validArgs = { age: '25', active: 'true' };
    server['validateArguments'](validArgs, schema);
    expect(validArgs).toEqual({ age: 25, active: true });
  });

  it('should execute middleware chain in order', async () => {
    const server = new McpServer({
      name: 'test-server',
      version: '1.0.0',
    });

    const steps: string[] = [];

    server.use(async (_ctx, next) => {
      steps.push('mw1-start');
      const res = await next();
      steps.push('mw1-end');
      return res;
    });

    server.use(async (_ctx, next) => {
      steps.push('mw2-start');
      const res = await next();
      steps.push('mw2-end');
      return res;
    });

    const baseCall = async () => {
      steps.push('handler');
      return 'done';
    };

    const result = await server['executeWithMiddleware']('test', 'tool', {}, baseCall);

    expect(result).toBe('done');
    expect(steps).toEqual([
      'mw1-start',
      'mw2-start',
      'handler',
      'mw2-end',
      'mw1-end',
    ]);
  });
});
