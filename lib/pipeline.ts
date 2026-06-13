import { RepoMeta, FileTreeNode, DirectoryPattern, TechStack, DependencyMap, AISummary, Diagrams, HealthScore, PipelineProgress } from "./types";
import { GitHubService } from "./github";
import { identifyDirectoryPatterns, extractConfigFileNames, collectParseableFilePaths } from "./scanner";
import { parseDependencies } from "./parser";
import { generateBaseSummary } from "./summary/templates";
import { refineSummary } from "./summary/llm";
import { generateDiagrams } from "./diagram";
import { calculateHealthScore } from "./health";
import { identifyTechStack } from "./analyzer";
import { ANALYSIS_CONFIG } from "./config";

export type ProgressCallback = (progress: PipelineProgress) => void;

// Phase result types
interface MetadataPhaseResult {
  meta: RepoMeta;
  readmeContent: string | null;
  languageBytes: Record<string, number>;
}

interface StructurePhaseResult {
  fileTree: FileTreeNode;
  directoryPatterns: DirectoryPattern[];
  configFileContents: Record<string, string | null>;
}

interface AnalysisPhaseResult {
  techStack: TechStack;
  depMap: DependencyMap;
}

interface ReportPhaseResult {
  summary: AISummary;
  diagrams: Diagrams;
  health: HealthScore;
}

// Phase 1: Fetch repository metadata
async function metadataPhase(
  github: GitHubService,
  onProgress?: ProgressCallback
): Promise<MetadataPhaseResult> {
  onProgress?.({ phase: "metadata", message: ANALYSIS_CONFIG.progressLabels.metadata });

  const [meta, readmeContent, languageBytes] = await Promise.all([
    github.getRepoMeta(),
    github.getFileContent("README.md"),
    github.listLanguages(),
  ]);

  return { meta, readmeContent, languageBytes };
}

// Phase 2: Scan file structure
async function structurePhase(
  github: GitHubService,
  onProgress?: ProgressCallback
): Promise<StructurePhaseResult> {
  onProgress?.({ phase: "structure", message: ANALYSIS_CONFIG.progressLabels.structure });

  const fileTree = await github.getFileTree();
  const configFilePaths = extractConfigFileNames(fileTree);
  const configFileContents = await github.getMultipleFiles(configFilePaths);
  const directoryPatterns = identifyDirectoryPatterns(fileTree);

  return { fileTree, directoryPatterns, configFileContents };
}

// Phase 3: Analyze tech stack and dependencies
async function analysisPhase(
  github: GitHubService,
  fileTree: FileTreeNode,
  configFileContents: Record<string, string | null>,
  languageBytes: Record<string, number>,
  onProgress?: ProgressCallback
): Promise<AnalysisPhaseResult> {
  onProgress?.({ phase: "analysis", message: ANALYSIS_CONFIG.progressLabels.analysis });

  const parseablePaths = collectParseableFilePaths(fileTree).slice(0, ANALYSIS_CONFIG.maxFilesToParse);
  const parseableContents = await github.getMultipleFiles(parseablePaths);
  const fileContentsMap = new Map<string, string>();
  for (const [path, content] of Object.entries(parseableContents)) {
    if (content) fileContentsMap.set(path, content);
  }

  const [techStack, depMap] = await Promise.all([
    Promise.resolve(identifyTechStack(configFileContents, languageBytes)),
    Promise.resolve(parseDependencies(fileContentsMap, ANALYSIS_CONFIG.maxFilesToParse)),
  ]);

  return { techStack, depMap };
}

// Phase 4: Generate report artifacts
async function reportPhase(
  meta: RepoMeta,
  fileTree: FileTreeNode,
  directoryPatterns: DirectoryPattern[],
  depMap: DependencyMap,
  configFileContents: Record<string, string | null>,
  techStack: TechStack,
  github: GitHubService,
  readmeContent: string | null,
  onProgress?: ProgressCallback
): Promise<ReportPhaseResult> {
  onProgress?.({ phase: "report", message: ANALYSIS_CONFIG.progressLabels.report });

  const baseSummary = generateBaseSummary(
    meta,
    fileTree,
    techStack,
    directoryPatterns,
    depMap,
    configFileContents as Record<string, string>
  );

  const [summary, diagrams, health] = await Promise.all([
    refineSummary(baseSummary, { owner: meta.owner, name: meta.name, description: meta.description }),
    Promise.resolve(generateDiagrams(depMap, fileTree, directoryPatterns)),
    calculateHealthScore(github, readmeContent),
  ]);

  return { summary, diagrams, health };
}

// Main pipeline executor
export async function executePipeline(
  url: string,
  token?: string,
  onProgress?: ProgressCallback
): Promise<{
  meta: RepoMeta;
  readmeContent: string | null;
  languageBytes: Record<string, number>;
  fileTree: FileTreeNode;
  directoryPatterns: DirectoryPattern[];
  configFileContents: Record<string, string | null>;
  techStack: TechStack;
  depMap: DependencyMap;
  summary: AISummary;
  diagrams: Diagrams;
  health: HealthScore;
}> {
  const github = GitHubService.fromUrl(url, token);

  // Phase 1: Metadata
  const metadata = await metadataPhase(github, onProgress);

  // Phase 2: Structure
  const structure = await structurePhase(github, onProgress);

  // Phase 3: Analysis
  const analysis = await analysisPhase(
    github,
    structure.fileTree,
    structure.configFileContents,
    metadata.languageBytes,
    onProgress
  );

  // Phase 4: Report
  const report = await reportPhase(
    metadata.meta,
    structure.fileTree,
    structure.directoryPatterns,
    analysis.depMap,
    structure.configFileContents,
    analysis.techStack,
    github,
    metadata.readmeContent,
    onProgress
  );

  return {
    ...metadata,
    ...structure,
    ...analysis,
    ...report,
  };
}
