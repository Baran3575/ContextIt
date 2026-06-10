
/**
 * Deterministically compresses tool parameter descriptions by removing parentheticals,
 * keeping only the first sentence/clause, and applying clean abbreviations.
 */
export function minimizeDescription(desc: string): string {
  if (!desc) return '';
  
  // Keep only the first sentence
  let cleaned = desc.split(/[.!?]\s+/)[0];
  
  // Remove parenthetical notes e.g., (absolute or relative to workspace root)
  cleaned = cleaned.replace(/\s*\([^)]*\)/g, '');
  
  // Clean up common verbosity
  cleaned = cleaned.replace(/Focus only on a/i, 'Target');
  cleaned = cleaned.replace(/Path to the/i, 'Path of');
  
  return cleaned.trim();
}

/**
 * Recursively minimizes a JSON schema structure to save tokens.
 */
export function minimizeSchema(schema: any): any {
  if (typeof schema !== 'object' || schema === null) {
    return schema;
  }

  if (Array.isArray(schema)) {
    return schema.map(minimizeSchema);
  }

  const minimized: any = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === 'description' && typeof value === 'string') {
      minimized[key] = minimizeDescription(value);
    } else if (key === 'properties' && typeof value === 'object' && value !== null) {
      const props: any = {};
      for (const [propName, propValue] of Object.entries(value)) {
        props[propName] = minimizeSchema(propValue);
      }
      minimized[key] = props;
    } else {
      minimized[key] = minimizeSchema(value);
    }
  }
  return minimized;
}

/**
 * Minimizes an MCP tool schema.
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

export function minimizeTool(tool: MCPTool): { name: string; description: string; inputSchema: any } {
  return {
    name: tool.name,
    description: minimizeDescription(tool.description),
    inputSchema: minimizeSchema(tool.inputSchema)
  };
}
