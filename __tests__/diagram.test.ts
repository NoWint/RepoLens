import { describe, it, expect } from "vitest";
import {
  generateDependencyGraph,
  generateDirectoryStructure,
  generateDiagrams,
} from "../lib/diagram";
import { DependencyMap, FileTreeNode, DirectoryPattern } from "../lib/types";

describe("sanitizeMermaidId (via generateDependencyGraph)", () => {
  it("should replace special characters with underscores in node IDs", () => {
    const depMap: DependencyMap = {
      modules: [
        { name: "index", path: "src/index.ts", language: "typescript", imports: [] },
        { name: "utils", path: "src/utils/helper.ts", language: "typescript", imports: [] },
      ],
      edges: [{ from: "src/index.ts", to: "src/utils/helper.ts", type: "import" }],
    };

    const result = generateDependencyGraph(depMap);

    // Paths with slashes should be sanitized: "src/index.ts" -> "src_index_ts"
    expect(result).toContain("src_index_ts");
    expect(result).toContain("src_utils_helper_ts");
    expect(result).toContain("src_index_ts --> src_utils_helper_ts");
  });

  it("should collapse multiple special characters into single underscore", () => {
    const depMap: DependencyMap = {
      modules: [
        { name: "mod", path: "src/@scope/pkg-name.ts", language: "typescript", imports: [] },
      ],
      edges: [],
    };

    const result = generateDependencyGraph(depMap);

    // "src/@scope/pkg-name.ts" -> "src_scope_pkg_name_ts" (multiple specials collapsed)
    expect(result).toContain("src_scope_pkg_name_ts");
    expect(result).not.toContain("src__scope");
  });

  it("should strip leading and trailing underscores from IDs", () => {
    const depMap: DependencyMap = {
      modules: [
        { name: "mod", path: ".src/index.ts", language: "typescript", imports: [] },
      ],
      edges: [],
    };

    const result = generateDependencyGraph(depMap);

    // ".src/index.ts" -> "_src_index_ts" -> "src_index_ts" (leading _ stripped)
    expect(result).toContain("src_index_ts");
    expect(result).not.toMatch(/^\s+_src_index_ts/);
  });

  it("should handle paths with spaces", () => {
    const depMap: DependencyMap = {
      modules: [
        { name: "my module", path: "src/my module.ts", language: "typescript", imports: [] },
      ],
      edges: [],
    };

    const result = generateDependencyGraph(depMap);

    // "src/my module.ts" -> "src_my_module_ts"
    expect(result).toContain("src_my_module_ts");
  });
});

describe("generateDependencyGraph", () => {
  it("should return empty message when no modules", () => {
    const depMap: DependencyMap = { modules: [], edges: [] };

    const result = generateDependencyGraph(depMap);

    expect(result).toBe("graph LR\n  empty[No module dependencies detected]");
  });

  it("should generate graph with valid modules and edges", () => {
    const depMap: DependencyMap = {
      modules: [
        { name: "app", path: "src/app.tsx", language: "typescript", imports: ["react"] },
        { name: "utils", path: "src/utils.ts", language: "typescript", imports: [] },
      ],
      edges: [{ from: "src/app.tsx", to: "src/utils.ts", type: "import" }],
    };

    const result = generateDependencyGraph(depMap);

    expect(result).toContain("graph LR");
    expect(result).toContain('src_app_tsx["app"]');
    expect(result).toContain('src_utils_ts["utils"]');
    expect(result).toContain("src_app_tsx --> src_utils_ts");
  });

  it("should limit to 30 modules", () => {
    const modules = Array.from({ length: 35 }, (_, i) => ({
      name: `mod${i}`,
      path: `src/mod${i}.ts`,
      language: "typescript",
      imports: [],
    }));
    const depMap: DependencyMap = { modules, edges: [] };

    const result = generateDependencyGraph(depMap);

    // Count node definitions (lines with ["name"] pattern)
    const nodeLines = result.split("\n").filter((l) => l.includes('["'));
    expect(nodeLines).toHaveLength(30);
  });

  it("should deduplicate edges", () => {
    const depMap: DependencyMap = {
      modules: [
        { name: "a", path: "src/a.ts", language: "typescript", imports: [] },
        { name: "b", path: "src/b.ts", language: "typescript", imports: [] },
      ],
      edges: [
        { from: "src/a.ts", to: "src/b.ts", type: "import" },
        { from: "src/a.ts", to: "src/b.ts", type: "import" },
      ],
    };

    const result = generateDependencyGraph(depMap);

    const edgeLines = result.split("\n").filter((l) => l.includes("-->"));
    expect(edgeLines).toHaveLength(1);
  });
});

describe("generateDirectoryStructure", () => {
  it("should generate directory tree diagram", () => {
    const tree: FileTreeNode = {
      name: "root",
      path: "root",
      type: "dir",
      children: [
        { name: "src", path: "root/src", type: "dir", children: [] },
        { name: "lib", path: "root/lib", type: "dir", children: [] },
      ],
    };
    const patterns: DirectoryPattern[] = [
      { path: "root/src", purpose: "Source code" },
    ];

    const result = generateDirectoryStructure(tree, patterns);

    expect(result).toContain("graph TD");
    expect(result).toContain("root");
    expect(result).toContain("Source code");
  });

  it("should include purpose labels from patterns", () => {
    const tree: FileTreeNode = {
      name: "project",
      path: "project",
      type: "dir",
      children: [
        { name: "components", path: "project/components", type: "dir", children: [] },
      ],
    };
    const patterns: DirectoryPattern[] = [
      { path: "project/components", purpose: "UI Components" },
    ];

    const result = generateDirectoryStructure(tree, patterns);

    expect(result).toContain("UI Components");
    expect(result).toContain("<br/><small>UI Components</small>");
  });

  it("should limit depth to 4 levels", () => {
    const deepChild: FileTreeNode = {
      name: "level5",
      path: "r/l1/l2/l3/l4/l5",
      type: "dir",
      children: [],
    };
    const level4: FileTreeNode = {
      name: "level4",
      path: "r/l1/l2/l3/l4",
      type: "dir",
      children: [deepChild],
    };
    const level3: FileTreeNode = {
      name: "level3",
      path: "r/l1/l2/l3",
      type: "dir",
      children: [level4],
    };
    const level2: FileTreeNode = {
      name: "level2",
      path: "r/l1/l2",
      type: "dir",
      children: [level3],
    };
    const level1: FileTreeNode = {
      name: "level1",
      path: "r/l1",
      type: "dir",
      children: [level2],
    };
    const tree: FileTreeNode = {
      name: "root",
      path: "r",
      type: "dir",
      children: [level1],
    };

    const result = generateDirectoryStructure(tree, []);

    // level5 should not appear (depth 5 > limit 4)
    expect(result).not.toContain("level5");
    // level4 should appear (depth 4)
    expect(result).toContain("level4");
  });

  it("should only include directory children, not files", () => {
    const tree: FileTreeNode = {
      name: "root",
      path: "root",
      type: "dir",
      children: [
        { name: "src", path: "root/src", type: "dir", children: [] },
        { name: "index.ts", path: "root/index.ts", type: "file" },
      ],
    };

    const result = generateDirectoryStructure(tree, []);

    expect(result).toContain("src");
    // Files should not appear as nodes in the directory structure
    const lines = result.split("\n");
    const nodeLines = lines.filter((l) => l.includes('["') && l.includes('"]'));
    // Only root and src should appear, not index.ts
    expect(nodeLines).toHaveLength(2);
  });
});

describe("generateDiagrams", () => {
  it("should combine dependency graph and directory structure", () => {
    const depMap: DependencyMap = {
      modules: [
        { name: "app", path: "src/app.ts", language: "typescript", imports: [] },
      ],
      edges: [],
    };
    const tree: FileTreeNode = {
      name: "root",
      path: "root",
      type: "dir",
      children: [],
    };
    const patterns: DirectoryPattern[] = [];

    const result = generateDiagrams(depMap, tree, patterns);

    expect(result.dependencyGraph).toContain("graph LR");
    expect(result.directoryStructure).toContain("graph TD");
  });
});
