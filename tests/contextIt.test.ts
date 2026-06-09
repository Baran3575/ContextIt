import * as path from 'path';
import { DependencyResolver } from '../src/parser/resolver';
import { CodePruner, stripFunctionBody } from '../src/pruner/pruner';

describe('ContextIt - Core Tests', () => {
  const mainFixturePath = path.resolve(__dirname, 'fixtures/main.ts');
  const utilsFixturePath = path.resolve(__dirname, 'fixtures/utils.ts');
  const dbFixturePath = path.resolve(__dirname, 'fixtures/db.ts');

  test('stripFunctionBody helper function', () => {
    const fnCode = 'export function add(a: number, b: number): number {\n  return a + b;\n}';
    const result = stripFunctionBody(fnCode);
    expect(result).toBe('export function add(a: number, b: number): number;');

    const arrowFnCode = 'export const multiply = (a: number, b: number): number => {\n  return a * b;\n}';
    const arrowResult = stripFunctionBody(arrowFnCode);
    expect(arrowResult).toBe('export const multiply = (a: number, b: number): number;');
  });

  test('DependencyResolver - traces symbols correctly', () => {
    const resolver = new DependencyResolver();
    const resolution = resolver.resolve(mainFixturePath, 'registerUser');

    // Check files are traced
    expect(resolution.filesToSymbols[mainFixturePath]).toBeDefined();
    expect(resolution.filesToSymbols[utilsFixturePath]).toBeDefined();
    expect(resolution.filesToSymbols[dbFixturePath]).toBeDefined();

    // Check specific symbols are included
    expect(resolution.filesToSymbols[mainFixturePath].has('registerUser')).toBe(true);
    expect(resolution.filesToSymbols[utilsFixturePath].has('hashPassword')).toBe(true);
    expect(resolution.filesToSymbols[dbFixturePath].has('User')).toBe(true);

    // Check unused symbols are pruned
    expect(resolution.filesToSymbols[mainFixturePath].has('unusedMain')).toBe(false);
    expect(resolution.filesToSymbols[utilsFixturePath].has('unusedUtil')).toBe(false);
  });

  test('CodePruner - Full Mode', () => {
    const resolver = new DependencyResolver();
    const pruner = new CodePruner();

    const resolution = resolver.resolve(mainFixturePath, 'registerUser');
    const result = pruner.prune(resolution, { mode: 'full' }, mainFixturePath);

    // Should contain necessary declarations with bodies
    expect(result).toContain('function registerUser');
    expect(result).toContain('function hashPassword');
    expect(result).toContain('return "hashed_" + p;');
    
    // Should NOT contain unused code
    expect(result).not.toContain('unusedMain');
    expect(result).not.toContain('unusedUtil');
  });

  test('CodePruner - Declaration-Only Mode', () => {
    const resolver = new DependencyResolver();
    const pruner = new CodePruner();

    const resolution = resolver.resolve(mainFixturePath, 'registerUser');
    const result = pruner.prune(resolution, { mode: 'decl' }, mainFixturePath);

    // Main file symbols must retain body
    expect(result).toContain('function registerUser');
    expect(result).toContain('return { id: "1", email };');

    // Transitive dependencies must be declarations (no body)
    expect(result).toContain('function hashPassword(p: string): string;');
    expect(result).not.toContain('return "hashed_" + p;');
  });
});
