import * as path from 'path';
import { PrunedContextResult } from '../parser/resolver';

export interface SortedFileResult {
  filePaths: string[];
  levels: Record<string, number>;
}

/**
 * Sorts files topologically and by stability levels (Level 1-4) to optimize Prompt Caching.
 * 
 * Level 1: Static / Global / Config (0 out-degree/local dependencies)
 * Level 2: Core Logic / Highly reused (in-degree >= out-degree)
 * Level 3: Utilities / Feature logic
 * Level 4: Entry / Target / Dynamic (entry file itself, or out-degree > 0 and in-degree === 0)
 * 
 * Within each level, files are sorted alphabetically by their relative path from the project root.
 */
export function sortFilesForCaching(
  result: PrunedContextResult,
  entryFile: string,
  projectRoot: string
): SortedFileResult {
  const absoluteEntry = path.resolve(entryFile);
  const filePaths = Object.keys(result.filesToSymbols);

  const localImportsMap: Record<string, Set<string>> = {};
  const importedByMap: Record<string, Set<string>> = {};

  // Initialize maps
  for (const filePath of filePaths) {
    localImportsMap[filePath] = new Set<string>();
    importedByMap[filePath] = new Set<string>();
  }

  // Populate dependency graphs
  for (const filePath of filePaths) {
    const fileDeps = result.parsedFiles[filePath];
    if (!fileDeps) continue;

    for (const imp of fileDeps.imports) {
      if (imp.resolvedPath && filePaths.includes(imp.resolvedPath) && imp.resolvedPath !== filePath) {
        localImportsMap[filePath].add(imp.resolvedPath);
        importedByMap[imp.resolvedPath].add(filePath);
      }
    }
  }

  const levels: Record<string, number> = {};

  for (const filePath of filePaths) {
    if (filePath === absoluteEntry) {
      levels[filePath] = 4;
      continue;
    }

    const outDegree = localImportsMap[filePath].size;
    const inDegree = importedByMap[filePath].size;

    if (outDegree === 0) {
      levels[filePath] = 1; // Level 1: No local dependencies (very stable)
    } else if (inDegree === 0) {
      levels[filePath] = 4; // Level 4: Entry-like files that are not imported by anything
    } else if (inDegree >= outDegree) {
      levels[filePath] = 2; // Level 2: Reused core logic
    } else {
      levels[filePath] = 3; // Level 3: Standard utilities and features
    }
  }

  // Ensure entryFile is always Level 4 and placed at the very end
  levels[absoluteEntry] = 4;

  // Group files by level
  const group1: string[] = [];
  const group2: string[] = [];
  const group3: string[] = [];
  const group4: string[] = [];

  for (const filePath of filePaths) {
    const level = levels[filePath];
    if (level === 1) group1.push(filePath);
    else if (level === 2) group2.push(filePath);
    else if (level === 3) group3.push(filePath);
    else group4.push(filePath);
  }

  // Sort groups alphabetically by relative path
  const sortFunc = (a: string, b: string) => {
    const relA = path.relative(projectRoot, a);
    const relB = path.relative(projectRoot, b);
    return relA.localeCompare(relB);
  };

  group1.sort(sortFunc);
  group2.sort(sortFunc);
  group3.sort(sortFunc);

  // Group 4 should also be sorted, but placing the entryFile at the absolute end of Group 4
  group4.sort((a, b) => {
    if (a === absoluteEntry) return 1;
    if (b === absoluteEntry) return -1;
    return sortFunc(a, b);
  });

  const sortedPaths = [...group1, ...group2, ...group3, ...group4];

  return {
    filePaths: sortedPaths,
    levels
  };
}
