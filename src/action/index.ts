import * as fs from 'fs';
import * as path from 'path';
import * as core from '@actions/core';
import { DependencyResolver } from '../parser/resolver';
import { CodePruner } from '../pruner/pruner';

export async function run() {
  try {
    const entryFile = core.getInput('entry', { required: true });
    const symbol = core.getInput('symbol') || undefined;
    const mode = (core.getInput('mode') || 'full') as 'full' | 'decl';
    const outputFile = core.getInput('output') || 'pruned_context.md';
    const noMetrics = core.getInput('no-metrics') === 'true';
    const stats = core.getInput('stats') === 'true';

    const absoluteEntry = path.resolve(entryFile);
    if (!fs.existsSync(absoluteEntry)) {
      throw new Error(`Entry file not found: ${entryFile}`);
    }

    core.info(`Starting ContextIt on entry: ${entryFile} (focus symbol: ${symbol || 'None'}, mode: ${mode})`);

    const resolver = new DependencyResolver();
    const pruner = new CodePruner();

    const resolution = resolver.resolve(absoluteEntry, symbol);
    const resultContext = pruner.prune(resolution, { mode, noMetrics, targetSymbol: symbol }, absoluteEntry);

    const absoluteOutput = path.resolve(outputFile);
    const outputDir = path.dirname(absoluteOutput);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(absoluteOutput, resultContext, 'utf-8');
    core.info(`Successfully wrote pruned context to: ${outputFile}`);
    core.setOutput('pruned-file', outputFile);

    // Compute and report metrics
    let rawTotalCharacters = 0;
    for (const filePath of Object.keys(resolution.parsedFiles)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        rawTotalCharacters += content.length;
      } catch (e) {}
    }

    const rawTokens = Math.ceil(rawTotalCharacters / 3.7);
    const prunedTokens = Math.ceil(resultContext.length / 3.7);
    const reductionRatio = rawTokens / (prunedTokens || 1);
    const percentSavings = rawTokens > 0 
      ? Math.max(0, Math.round((1 - prunedTokens / rawTokens) * 100))
      : 0;

    core.info(`--- ContextIt Slicing Summary ---`);
    core.info(`Raw Context Size: ~${rawTokens.toLocaleString()} tokens`);
    core.info(`Pruned Context Size: ~${prunedTokens.toLocaleString()} tokens (${reductionRatio.toFixed(1)}x reduction)`);
    core.info(`Total Reduction Percentage: ${percentSavings}%`);

    if (stats) {
      core.info(`=== File-by-File Slicing Summary ===`);
      for (const filePath of Object.keys(resolution.parsedFiles)) {
        const rel = path.relative(process.cwd(), filePath);
        let rawSize = 0;
        try {
          rawSize = fs.readFileSync(filePath, 'utf-8').length;
        } catch (e) {}

        let prunedSize = 0;
        const escapedPath = rel.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const fileBlockRegex = new RegExp(`## File: \`\\x1b*\\x07*${escapedPath}\`\\r?\\n\`\`\`[a-z]*\\r?\\n([\\s\\S]*?)\`\`\`\\r?\\n\\r?\\n`, 'i');
        const match = resultContext.match(fileBlockRegex);
        if (match) {
          prunedSize = match[1].length;
        }

        const rTok = Math.ceil(rawSize / 3.7);
        const pTok = Math.ceil(prunedSize / 3.7);
        const ratio = pTok > 0 ? (rTok / pTok).toFixed(1) + 'x' : '1.0x';
        core.info(`| ${rel} | Raw: ${rTok.toLocaleString()} | Pruned: ${pTok.toLocaleString()} | Reduction: ${ratio} |`);
      }
    }

  } catch (error: any) {
    core.setFailed(`ContextIt Action failed: ${error.message || error}`);
  }
}

if (require.main === module) {
  run();
}
