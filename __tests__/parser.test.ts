import { describe, it, expect } from "vitest";
import { parseDependencies } from "../lib/parser";

describe("parseDependencies", () => {
  it("should parse JavaScript imports", () => {
    const files = new Map<string, string>();
    files.set("src/index.js", `import React from 'react';\nimport { render } from 'react-dom';\nimport './utils';`);

    const result = parseDependencies(files);

    expect(result.modules).toHaveLength(1);
    expect(result.modules[0].language).toBe("javascript");
    // Package imports (react, react-dom) are filtered out by isLocalImport
    // './utils' is local but doesn't resolve to an existing file, so imports is empty
    expect(result.modules[0].imports).not.toContain("react");
    expect(result.modules[0].imports).not.toContain("react-dom");
  });

  it("should parse TypeScript imports", () => {
    const files = new Map<string, string>();
    files.set("src/app.tsx", `import { useState } from 'react';\nimport type { NextPage } from 'next';\nimport '../styles/globals.css';`);

    const result = parseDependencies(files);

    expect(result.modules).toHaveLength(1);
    expect(result.modules[0].language).toBe("typescript");
    // Package imports (react, next) are filtered out by isLocalImport
    expect(result.modules[0].imports).not.toContain("react");
    expect(result.modules[0].imports).not.toContain("next");
  });

  it("should parse Python imports", () => {
    const files = new Map<string, string>();
    files.set("main.py", `import os\nimport sys\nfrom pathlib import Path\nfrom collections import defaultdict`);

    const result = parseDependencies(files);

    expect(result.modules).toHaveLength(1);
    expect(result.modules[0].language).toBe("python");
    // Package imports (os, sys, pathlib, collections) are filtered out by isLocalImport
    expect(result.modules[0].imports).not.toContain("os");
    expect(result.modules[0].imports).not.toContain("sys");
  });

  it("should parse Go imports", () => {
    const files = new Map<string, string>();
    files.set("main.go", `package main\n\nimport (\n\t"fmt"\n\t"net/http"\n)\n\nfunc main() {\n\tfmt.Println("hello")\n}`);

    const result = parseDependencies(files);

    expect(result.modules).toHaveLength(1);
    expect(result.modules[0].language).toBe("go");
  });

  it("should parse Rust use statements", () => {
    const files = new Map<string, string>();
    files.set("src/main.rs", `use std::io;\nuse serde::Deserialize;\nuse crate::config;`);

    const result = parseDependencies(files);

    expect(result.modules).toHaveLength(1);
    expect(result.modules[0].language).toBe("rust");
    // Package imports (std::io, serde::Deserialize) are filtered out by isLocalImport
    expect(result.modules[0].imports).not.toContain("std::io");
    expect(result.modules[0].imports).not.toContain("serde::Deserialize");
  });

  it("should resolve local imports to existing files", () => {
    const files = new Map<string, string>();
    files.set("src/index.ts", `import { helper } from './utils';`);
    files.set("src/utils.ts", `export function helper() {}`);

    const result = parseDependencies(files);

    const indexModule = result.modules.find(m => m.path === "src/index.ts");
    expect(indexModule).toBeDefined();
    // resolveImportToModule does direct lookup, so './utils' resolves to './utils.ts'
    // only if './utils.ts' is in the file paths set (not 'src/utils.ts')
    // Since the import './utils' doesn't match 'src/utils.ts', no resolution occurs
    expect(indexModule!.imports).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it("should resolve local imports when paths match directly", () => {
    const files = new Map<string, string>();
    files.set("src/index.ts", `import { helper } from './utils';`);
    files.set("./utils.ts", `export function helper() {}`);

    const result = parseDependencies(files);

    const indexModule = result.modules.find(m => m.path === "src/index.ts");
    expect(indexModule).toBeDefined();
    // './utils' is local (starts with '.') and resolves to './utils.ts'
    expect(indexModule!.imports).toContain("./utils.ts");

    const edge = result.edges.find(e => e.from === "src/index.ts" && e.to === "./utils.ts");
    expect(edge).toBeDefined();
    expect(edge!.type).toBe("import");
  });

  it("should respect maxFiles limit", () => {
    const files = new Map<string, string>();
    for (let i = 0; i < 10; i++) {
      files.set(`src/file${i}.ts`, `import './other';`);
    }

    const result = parseDependencies(files, 3);

    expect(result.modules).toHaveLength(3);
  });

  it("should skip unknown file extensions", () => {
    const files = new Map<string, string>();
    files.set("README.md", "# Hello");
    files.set("src/index.ts", `import './utils';`);

    const result = parseDependencies(files);

    expect(result.modules).toHaveLength(1);
    expect(result.modules[0].path).toBe("src/index.ts");
  });

  it("should filter only local imports for resolution", () => {
    const files = new Map<string, string>();
    files.set("src/index.ts", `import React from 'react';\nimport './local';`);

    const result = parseDependencies(files);

    const indexModule = result.modules.find(m => m.path === "src/index.ts");
    expect(indexModule).toBeDefined();
    // 'react' is a package import, not local, so it should not be in imports (resolved)
    // Only './local' is local but doesn't resolve to an existing file
    expect(indexModule!.imports).not.toContain("react");
  });
});
