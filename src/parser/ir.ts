import * as path from 'path';
import * as crypto from 'crypto';
import { PrunedContextResult } from './resolver';

export interface ContextIR {
  metadata: {
    fingerprint: string;
    entryPoint: string;
    targetSymbol: string | null;
  };
  task: {
    instruction: string;
  };
  tools: Array<{
    name: string;
    minimizedSchema: any;
  }>;
  graph: {
    nodes: Array<{ id: string; type: string }>;
    edges: Array<{ source: string; target: string }>;
  };
  files: Record<string, {
    imports: Array<{
      source: string;
      specifiers: Array<{ localName: string; exportName: string }>;
    }>;
    activeSymbols: string[];
  }>;
  context_stats: {
    tokens: number;
    files: number;
    symbols: number;
    tool_count: number;
  };
}

export function buildContextIR(
  result: PrunedContextResult,
  entryFile: string,
  targetSymbol: string | null,
  taskInstruction: string,
  outputContext: string,
  projectRoot: string
): ContextIR {
  const absoluteEntry = path.resolve(entryFile);
  const relativeEntry = path.relative(projectRoot, absoluteEntry);

  // Generate fingerprint
  const hash = crypto.createHash('sha256').update(outputContext).digest('hex');
  const fingerprint = `ctx://${hash.substring(0, 7)}`;

  const nodes: Array<{ id: string; type: string }> = [];
  const edges: Array<{ source: string; target: string }> = [];
  const files: Record<string, any> = {};

  let outputSymbolsCount = 0;

  // Process nodes and active symbols
  for (const [filePath, symbolsSet] of Object.entries(result.filesToSymbols)) {
    const relPath = path.relative(projectRoot, filePath);
    const fileDeps = result.parsedFiles[filePath];
    const activeSymbols = Array.from(symbolsSet);
    outputSymbolsCount += activeSymbols.length;

    for (const symName of activeSymbols) {
      const symDef = fileDeps.symbols.find(s => s.name === symName);
      const symType = symDef ? symDef.type : 'other';
      nodes.push({
        id: `${relPath}::${symName}`,
        type: symType
      });

      // Add dependencies edges
      if (symDef) {
        for (const depName of symDef.dependencies) {
          // Find if it's resolved locally
          const isLocal = fileDeps.symbols.some(s => s.name === depName);
          if (isLocal && activeSymbols.includes(depName)) {
            edges.push({
              source: `${relPath}::${symName}`,
              target: `${relPath}::${depName}`
            });
          } else {
            // Check if it's imported
            for (const imp of fileDeps.imports) {
              if (imp.resolvedPath) {
                const impRelPath = path.relative(projectRoot, imp.resolvedPath);
                for (const spec of imp.specifiers) {
                  if (spec.localName === depName) {
                    const targetSym = spec.exportName === '*' ? '*' : spec.exportName;
                    edges.push({
                      source: `${relPath}::${symName}`,
                      target: `${impRelPath}::${targetSym}`
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    // Add to files record
    files[relPath] = {
      imports: fileDeps.imports.map(imp => ({
        source: imp.source,
        specifiers: imp.specifiers.map(spec => ({
          localName: spec.localName,
          exportName: spec.exportName
        }))
      })),
      activeSymbols
    };
  }

  const cleanOutput = outputContext
    .replace(/^# ContextIt: Compressed Project Context\n/, '')
    .replace(/^<!-- fingerprint: [^\n]+\n\n/, '')
    .replace(/^> \[!NOTE\]\n(?:> [^\n]*\n)*/m, '')
    .trim();
  const outputTokens = Math.ceil(cleanOutput.length / 3.7);


  return {
    metadata: {
      fingerprint,
      entryPoint: relativeEntry,
      targetSymbol: targetSymbol || null
    },
    task: {
      instruction: taskInstruction
    },
    tools: [],
    graph: {
      nodes,
      edges
    },
    files,
    context_stats: {
      tokens: outputTokens,
      files: Object.keys(result.filesToSymbols).length,
      symbols: outputSymbolsCount,
      tool_count: 0
    }
  };
}
