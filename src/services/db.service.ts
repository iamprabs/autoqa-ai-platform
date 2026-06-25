import * as fs from 'fs';
import * as path from 'path';
import { Project, TestCase, TestRun, HealedBug } from '../types';

const DB_PATH = path.resolve('data', process.env.DB_NAME || 'db.json');

interface DatabaseSchema {
  projects: Project[];
  testCases: TestCase[];
  testRuns: TestRun[];
  healedBugs: HealedBug[];
}

export class DbService {
  private static initDb() {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
      const initialSchema: DatabaseSchema = {
        projects: [],
        testCases: [],
        testRuns: [],
        healedBugs: []
      };
      fs.writeFileSync(DB_PATH, JSON.stringify(initialSchema, null, 2), 'utf8');
    }
  }

  private static readDb(): DatabaseSchema {
    this.initDb();
    try {
      const content = fs.readFileSync(DB_PATH, 'utf8');
      return JSON.parse(content);
    } catch (e) {
      console.error('Failed to read local DB, resetting...', e);
      const resetSchema = { projects: [], testCases: [], testRuns: [], healedBugs: [] };
      fs.writeFileSync(DB_PATH, JSON.stringify(resetSchema, null, 2), 'utf8');
      return resetSchema;
    }
  }

  private static writeDb(db: DatabaseSchema) {
    this.initDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  }

  // Projects CRUD
  public static getProjects(): Project[] {
    return this.readDb().projects;
  }

  public static getProject(id: string): Project | undefined {
    return this.readDb().projects.find(p => p.id === id);
  }

  public static saveProject(project: Project): Project {
    const db = this.readDb();
    const index = db.projects.findIndex(p => p.id === project.id);
    if (index !== -1) {
      db.projects[index] = project;
    } else {
      db.projects.push(project);
    }
    this.writeDb(db);
    return project;
  }

  // Test Cases CRUD
  public static getTestCases(projectId: string): TestCase[] {
    return this.readDb().testCases.filter(t => t.projectId === projectId);
  }

  public static saveTestCases(projectId: string, cases: TestCase[]) {
    const db = this.readDb();
    // Clear old test cases for this project
    db.testCases = db.testCases.filter(t => t.projectId !== projectId);
    db.testCases.push(...cases);
    this.writeDb(db);
  }

  // Test Runs CRUD
  public static getTestRuns(projectId: string): TestRun[] {
    return this.readDb().testRuns.filter(r => r.projectId === projectId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public static getTestRun(id: string): TestRun | undefined {
    return this.readDb().testRuns.find(r => r.id === id);
  }

  public static saveTestRun(run: TestRun): TestRun {
    const db = this.readDb();
    db.testRuns.push(run);
    this.writeDb(db);
    return run;
  }

  // Healed Bugs CRUD
  public static getHealedBugs(projectId: string): HealedBug[] {
    return this.readDb().healedBugs.filter(b => b.projectId === projectId);
  }

  public static getHealedBug(id: string): HealedBug | undefined {
    return this.readDb().healedBugs.find(b => b.id === id);
  }

  public static saveHealedBug(bug: HealedBug): HealedBug {
    const db = this.readDb();
    const index = db.healedBugs.findIndex(b => b.id === bug.id);
    if (index !== -1) {
      db.healedBugs[index] = bug;
    } else {
      db.healedBugs.push(bug);
    }
    this.writeDb(db);
    return bug;
  }
}
