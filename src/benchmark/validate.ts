import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { DependencyResolver } from '../parser/resolver';
import { CodePruner } from '../pruner/pruner';

function cleanDirectory(dir: string) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export function runValidation() {
  console.log('Starting Objective Compilation Validation (TAM NESNEL TEST)...');

  const mainFixturePath = path.resolve(__dirname, '../../tests/fixtures/main.ts');
  const tempDir = path.resolve(__dirname, '../../tests/fixtures/validation_temp');
  cleanDirectory(tempDir);
  fs.mkdirSync(tempDir, { recursive: true });

  const resolver = new DependencyResolver();
  const pruner = new CodePruner();

  // Run resolution and pruning
  const resolution = resolver.resolve(mainFixturePath, 'registerUser');
  const prunedMarkdown = pruner.prune(resolution, { mode: 'full' }, mainFixturePath);

  // Parse markdown and write files to tempDir to test compilation
  const fileRegex = /## File: `([^`]+)`\r?\n```typescript\r?\n([\s\S]*?)```/g;
  let match;
  
  while ((match = fileRegex.exec(prunedMarkdown)) !== null) {
    const relPath = match[1];
    const codeContent = match[2];
    
    const targetPath = path.join(tempDir, relPath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, codeContent, 'utf-8');
  }

  // Create a minimal tsconfig.json in validation_temp
  const tsconfigContent = {
    compilerOptions: {
      target: 'es2022',
      module: 'commonjs',
      strict: true,
      skipLibCheck: true,
      esModuleInterop: true
    }
  };
  fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), JSON.stringify(tsconfigContent, null, 2), 'utf-8');

  // Run tsc on the temp directory
  console.log('Compiling the pruned output files using tsc...');
  try {
    const tscPath = path.resolve(__dirname, '../../node_modules/typescript/bin/tsc');
    execSync(`node ${tscPath} --project ${path.join(tempDir, 'tsconfig.json')}`, { stdio: 'pipe' });
    console.log('\n✅ COMPILATION SUCCESSFUL! The pruned codebase has ZERO compilation errors.');
    console.log('Objective Validation Passed: The compressed context is syntactically complete.');
  } catch (error: any) {
    console.error('\n❌ COMPILATION FAILED! The pruned codebase has compilation errors:');
    console.error(error.stdout.toString() || error.message);
  }

  // Clean up
  cleanDirectory(tempDir);
}

if (require.main === module) {
  runValidation();
}
