export interface Project {
  id: string;
  name: string;
  path: string;
  language: string;
  framework: string;
  folderStructure?: any;
  knowledgeGraph?: KnowledgeGraph;
  gapAnalysis?: GapAnalysis;
  createdAt: string;
}

export interface KnowledgeNode {
  id: string;
  label: string;
  type: 'file' | 'folder' | 'component' | 'route' | 'model' | 'service';
  size: number;
}

export interface KnowledgeLink {
  source: string;
  target: string;
  type: 'imports' | 'calls' | 'uses';
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  links: KnowledgeLink[];
}

export interface GapAnalysis {
  implementedFeatures: string[];
  missingFeatures: string[];
  unexpectedFeatures: string[];
  deprecatedFeatures: string[];
  matchingScore: number; // 0 to 100
}

export interface TestCase {
  id: string;
  projectId: string;
  name: string;
  category: 'Functional' | 'UI' | 'API' | 'Security' | 'Performance';
  description: string;
  file: string;
  code: string;
  expectedResult: string;
}

export interface TestCaseResult {
  testId: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number; // ms
  error?: {
    message: string;
    stack?: string;
    line?: number;
    file?: string;
  };
  logs: string[];
  screenshot?: string; // base64 or file path
  video?: string; // base64 or file path
}

export interface TestRun {
  id: string;
  projectId: string;
  timestamp: string;
  status: 'passed' | 'failed';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TestCaseResult[];
  consoleLogs: string;
}

export interface HealedBug {
  id: string;
  projectId: string;
  runId: string;
  testId: string;
  filePath: string;
  rootCause: string;
  proposedFix: string;
  codeDiff: string;
  prBranch: string;
  prTitle: string;
  prDescription: string;
  status: 'pending' | 'approved' | 'applied';
  confidenceScore: number;
}
