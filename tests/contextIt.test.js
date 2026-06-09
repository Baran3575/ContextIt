"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const resolver_1 = require("../src/parser/resolver");
const pruner_1 = require("../src/pruner/pruner");
describe('ContextIt - Core Tests', () => {
    const mainFixturePath = path.resolve(__dirname, 'fixtures/main.ts');
    const utilsFixturePath = path.resolve(__dirname, 'fixtures/utils.ts');
    const dbFixturePath = path.resolve(__dirname, 'fixtures/db.ts');
    test('stripFunctionBody helper function', () => {
        const fnCode = 'export function add(a: number, b: number): number {\n  return a + b;\n}';
        const result = (0, pruner_1.stripFunctionBody)(fnCode);
        expect(result).toBe('export function add(a: number, b: number): number;');
        const arrowFnCode = 'export const multiply = (a: number, b: number): number => {\n  return a * b;\n}';
        const arrowResult = (0, pruner_1.stripFunctionBody)(arrowFnCode);
        expect(arrowResult).toBe('export const multiply = (a: number, b: number): number;');
    });
    test('DependencyResolver - traces symbols correctly', () => {
        const resolver = new resolver_1.DependencyResolver();
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
        const resolver = new resolver_1.DependencyResolver();
        const pruner = new pruner_1.CodePruner();
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
        const resolver = new resolver_1.DependencyResolver();
        const pruner = new pruner_1.CodePruner();
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
