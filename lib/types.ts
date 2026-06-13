// Repository metadata from GitHub API
export interface RepoMeta {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  language: string | null;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  defaultBranch: string;
  license: string | null;
  size: number; // KB
  topics: string[];
}

// File tree node
export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "dir";
  size?: number;
  children?: FileTreeNode[];
}

// Technology stack
export interface TechStack {
  languages: LanguageInfo[];
  frameworks: FrameworkInfo[];
  packageManager: string | null;
}

export interface LanguageInfo {
  name: string;
  percentage: number;
  color: string;
}

export interface FrameworkInfo {
  name: string;
  version: string | null;
  category: "framework" | "library" | "tool";
}

// AI-generated summary
export interface AISummary {
  introduction: string;
  architecture: string;
  technicalAnalysis: string;
}

// Mermaid diagrams
export interface Diagrams {
  dependencyGraph: string; // Mermaid code
  directoryStructure: string; // Mermaid code
}

// Health score
export interface HealthScore {
  overall: number; // 0-100
  documentation: DimensionScore;
  issueActivity: DimensionScore;
  maintenance: DimensionScore;
}

export interface DimensionScore {
  score: number; // 0-100
  label: string; // "healthy" | "moderate" | "at-risk"
  details: ScoreDetail[];
}

export interface ScoreDetail {
  metric: string;
  value: string | number | boolean;
  points: number;
  maxPoints: number;
}

// Module dependency mapping
export interface DependencyMap {
  modules: ModuleInfo[];
  edges: DependencyEdge[];
}

export interface ModuleInfo {
  name: string;
  path: string;
  language: string;
  imports: string[];
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: "import" | "re-export";
}

// Full analysis report
export interface AnalysisReport {
  id: string;
  meta: RepoMeta;
  structure: FileTreeNode;
  techStack: TechStack;
  summary: AISummary;
  diagrams: Diagrams;
  health: HealthScore;
  analyzedAt: string;
}

// API request/response
export interface AnalyzeRequest {
  url: string;
  token?: string;
}

// Directory pattern recognition
export interface DirectoryPattern {
  path: string;
  purpose: string;
}

// Pipeline progress
export type PipelinePhase = "metadata" | "structure" | "analysis" | "report";

export interface PipelineProgress {
  phase: PipelinePhase;
  message: string;
}
