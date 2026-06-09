import ast
import json
import sys
import os

def parse_python_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        code = f.read()

    try:
        tree = ast.parse(code, filename=file_path)
    except Exception as e:
        return {"error": str(e), "filePath": file_path, "imports": [], "symbols": []}

    imports = []
    symbols = []

    class DependencyExtractor(ast.NodeVisitor):
        def __init__(self, exclude_name):
            self.exclude_name = exclude_name
            self.names = set()

        def visit_Name(self, node):
            if isinstance(node.ctx, ast.Load) and node.id != self.exclude_name:
                self.names.add(node.id)
            self.generic_visit(node)

    for node in tree.body:
        # 1. Extract Imports
        if isinstance(node, ast.Import):
            for name in node.names:
                imports.append({
                    "source": name.name,
                    "specifiers": [name.asname or name.name.split('.')[0]]
                })
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                specifiers = [n.asname or n.name for n in node.names]
                imports.append({
                    "source": "." * (node.level or 0) + node.module,
                    "specifiers": specifiers
                })

        # 2. Extract Top-level Symbols (functions and classes)
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            name = node.name
            symbol_type = "function" if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) else "class"
            
            start_line = node.lineno
            end_line = getattr(node, 'end_lineno', start_line + 10)
            
            lines = code.split('\n')[start_line-1:end_line]
            symbol_code = '\n'.join(lines)

            extractor = DependencyExtractor(name)
            extractor.visit(node)

            symbols.append({
                "name": name,
                "type": symbol_type,
                "start": start_line,
                "end": end_line,
                "code": symbol_code,
                "dependencies": list(extractor.names)
            })

    return {
        "filePath": file_path,
        "imports": imports,
        "symbols": symbols
    }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}))
        sys.exit(1)
    
    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(json.dumps({"error": "File not found"}))
        sys.exit(1)

    result = parse_python_file(file_path)
    print(json.dumps(result))
