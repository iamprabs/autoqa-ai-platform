import { Router, Request, Response } from 'express';
import { DbService } from './services/db.service';
import { ProjectService } from './services/project.service';
import { DocService } from './services/doc.service';
import { TestService } from './services/test.service';
import { GitService } from './services/git.service';
import { Project } from './types';

const router = Router();

// 1. Get all projects
router.get('/projects', (req: Request, res: Response) => {
  try {
    const projects = DbService.getProjects();
    res.json(projects);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Register / add new project
router.post('/projects', async (req: Request, res: Response) => {
  let { path: projectPath, name } = req.body;
  if (!projectPath) {
    return res.status(400).json({ error: 'Project absolute path or Git URL is required' });
  }

  try {
    const isGitUrl = projectPath.startsWith('http') || projectPath.startsWith('git@') || projectPath.includes('github.com');
    if (isGitUrl) {
      if (!name) {
        const parts = projectPath.split('/');
        const lastPart = parts[parts.length - 1];
        name = lastPart.endsWith('.git') ? lastPart.substring(0, lastPart.length - 4) : lastPart;
      }
      projectPath = await GitService.cloneRepo(projectPath);
    }

    const project = await ProjectService.analyze(projectPath, name);
    DbService.saveProject(project);
    res.status(201).json(project);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Re-analyze project structure
router.post('/projects/:id/analyze', async (req: Request, res: Response) => {
  const { id } = req.params;
  const project = DbService.getProject(id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  try {
    const updated = await ProjectService.analyze(project.path, project.name);
    // Keep documentation scan details if already analyzed
    updated.gapAnalysis = project.gapAnalysis;
    DbService.saveProject(updated);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Analyze docs & run Gap Analysis
router.post('/projects/:id/analyze-docs', async (req: Request, res: Response) => {
  const { id } = req.params;
  const project = DbService.getProject(id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  try {
    const files = project.knowledgeGraph?.nodes.filter(n => n.type !== 'folder').map(n => n.id) || [];
    const { analysis } = await DocService.analyzeSpecs(project.path, files);
    
    project.gapAnalysis = analysis;
    DbService.saveProject(project);
    res.json(project);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Get generated test cases
router.get('/projects/:id/tests', (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const tests = DbService.getTestCases(id);
    res.json(tests);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Generate test cases using AI
router.post('/projects/:id/generate-tests', async (req: Request, res: Response) => {
  const { id } = req.params;
  const project = DbService.getProject(id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  try {
    const files = project.knowledgeGraph?.nodes.filter(n => n.type !== 'folder').map(n => n.id) || [];
    const { content: specsContent } = await DocService.analyzeSpecs(project.path, files);

    const generated = await TestService.generate(id, project.path, files, specsContent);
    DbService.saveTestCases(id, generated);
    res.json(generated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Run generated test cases
router.post('/projects/:id/run-tests', async (req: Request, res: Response) => {
  const { id } = req.params;
  const project = DbService.getProject(id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  try {
    const tests = DbService.getTestCases(id);
    if (tests.length === 0) {
      return res.status(400).json({ error: 'No generated test cases. Run test case generation first.' });
    }

    const runResult = await TestService.execute(id, project.path, tests);
    DbService.saveTestRun(runResult);
    res.json(runResult);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Get test runs history
router.get('/projects/:id/runs', (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const runs = DbService.getTestRuns(id);
    res.json(runs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Trigger failure healing & RCA
router.post('/runs/:runId/heal', async (req: Request, res: Response) => {
  const { runId } = req.params;
  const { testId, testName, errorMessage, stackTrace } = req.body;

  if (!testId || !errorMessage) {
    return res.status(400).json({ error: 'testId and errorMessage are required' });
  }

  try {
    const run = DbService.getTestRun(runId);
    if (!run) return res.status(404).json({ error: 'Test run not found' });

    const project = DbService.getProject(run.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const healedBug = await GitService.analyzeAndHeal(
      project.id,
      project.path,
      runId,
      testId,
      testName,
      errorMessage,
      stackTrace
    );

    DbService.saveHealedBug(healedBug);
    res.json(healedBug);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Commit healed bug and create branch/PR
router.post('/healed-bugs/:bugId/commit', async (req: Request, res: Response) => {
  const { bugId } = req.params;
  try {
    const bug = DbService.getHealedBug(bugId);
    if (!bug) return res.status(404).json({ error: 'Healed bug entry not found' });

    const project = DbService.getProject(bug.projectId);
    if (!project) return res.status(404).json({ error: 'Associated project not found' });

    // Commit changes and push branch
    await GitService.commitAndCreatePR(project.path, bug);

    bug.status = 'applied';
    DbService.saveHealedBug(bug);
    res.json(bug);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Get active healed bugs lists
router.get('/projects/:id/healed-bugs', (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const bugs = DbService.getHealedBugs(id);
    res.json(bugs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
