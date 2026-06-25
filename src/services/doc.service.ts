import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';
import { GapAnalysis } from '../types';
import { AIService } from './ai.service';

export class DocService {
  public static async analyzeSpecs(projectPath: string, files: string[]): Promise<{ content: string; analysis: GapAnalysis }> {
    const absolutePath = path.resolve(projectPath);

    // Look for markdown spec files or txt specifications
    const specFiles = globSync('**/*.{md,txt,json}', {
      cwd: absolutePath,
      nodir: true,
      ignore: ['**/node_modules/**', '**/.git/**', '**/package.json', '**/tsconfig.json', '**/frontend/**']
    }).filter(f => {
      const name = path.basename(f).toLowerCase();
      return name.includes('readme') || name.includes('spec') || name.includes('prd') || name.includes('brd') || name.includes('requirements') || name.includes('documentation');
    });

    let mergedSpecsContent = '';
    if (specFiles.length > 0) {
      specFiles.forEach(file => {
        const fullPath = path.join(absolutePath, file);
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          mergedSpecsContent += `\n--- FILE: ${file} ---\n${content}\n`;
        } catch (e) {
          // ignore unreadable
        }
      });
    } else {
      // Default placeholder specs if none found
      mergedSpecsContent = `AutoQA AI Platform Specification
      
Requirements:
1. Server should host REST API.
2. Store information securely.
3. Generate test cases automatically.
4. Auto-healing test runner with Unified Diff support.`;
    }

    // Call AI Service to compare spec requirements with actual code implementation
    const analysis = await AIService.analyzeDocs(mergedSpecsContent, files);

    return {
      content: mergedSpecsContent,
      analysis
    };
  }
}
