import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GapAnalysis, TestCase } from '../types';

export class AIService {
  private static async callLLM(prompt: string, systemPrompt: string): Promise<string> {
    const nvidiaKey = process.env.NVIDIA_API_KEY;
    if (nvidiaKey) {
      try {
        const response = await axios.post(
          'https://integrate.api.nvidia.com/v1/chat/completions',
          {
            model: 'meta/llama-3.1-70b-instruct',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            top_p: 0.95
          },
          {
            headers: {
              'Authorization': `Bearer ${nvidiaKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 8000 // 8 seconds timeout to allow fast fallback to OpenRouter
          }
        );
        return response.data.choices[0].message.content;
      } catch (err: any) {
        console.error('Nvidia API failed, falling back...', err?.response?.data || err.message);
      }
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (anthropicKey) {
      try {
        const response = await axios.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 4000,
            system: systemPrompt,
            messages: [{ role: 'user', content: prompt }]
          },
          {
            headers: {
              'x-api-key': anthropicKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json'
            },
            timeout: 8000
          }
        );
        return response.data.content[0].text;
      } catch (err: any) {
        console.error('Anthropic API failed, falling back...', err?.response?.data || err.message);
      }
    }

    if (openrouterKey) {
      try {
        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: 'meta-llama/llama-3.1-70b-instruct',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt }
            ]
          },
          {
            headers: {
              'Authorization': `Bearer ${openrouterKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 8000
          }
        );
        return response.data.choices[0].message.content;
      } catch (err: any) {
        console.error('OpenRouter API failed, falling back...', err?.response?.data || err.message);
      }
    }

    if (geminiKey) {
      try {
        const ai = new GoogleGenerativeAI(geminiKey);
        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nUser request:\n${prompt}` }] }]
        });
        return result.response.text();
      } catch (err: any) {
        console.error('Gemini API failed, falling back...', err.message);
      }
    }

    // Default simulation fallback if no API keys exist
    return this.runSimulation(prompt);
  }

  public static async analyzeProject(
    files: string[],
    packageJsonContent?: string
  ): Promise<{ language: string; framework: string }> {
    const prompt = `Analyze these project files: ${JSON.stringify(files)}. Package.json: ${packageJsonContent || 'none'}. Determine language and framework. Return JSON format: {"language": "...", "framework": "..."}`;
    const system = `You are a Senior Project Architect. Analyze codebase inputs and return standard JSON.`;

    try {
      const responseText = await this.callLLM(prompt, system);
      const jsonStart = responseText.indexOf('{');
      const jsonEnd = responseText.lastIndexOf('}') + 1;
      if (jsonStart !== -1 && jsonEnd !== -1) {
        return JSON.parse(responseText.substring(jsonStart, jsonEnd));
      }
    } catch (e) {
      console.warn('Failed to parse AI project analysis, using heuristics');
    }

    // Heuristics fallback
    let language = 'JavaScript';
    let framework = 'Express.js';
    if (files.some(f => f.endsWith('.ts') || f.endsWith('.tsx'))) {
      language = 'TypeScript';
    } else if (files.some(f => f.endsWith('.py'))) {
      language = 'Python';
      framework = files.some(f => f.includes('fastapi') || f.includes('main.py')) ? 'FastAPI' : 'Django/Flask';
    }
    if (files.some(f => f.includes('vite') || f.includes('next.config'))) {
      framework = files.some(f => f.includes('next.config')) ? 'Next.js' : 'React/Vite';
    }
    return { language, framework };
  }

  public static async analyzeDocs(docsContent: string, codebaseFiles: string[]): Promise<GapAnalysis> {
    const prompt = `Specs:\n${docsContent}\n\nCodebase Files:\n${JSON.stringify(codebaseFiles)}`;
    const system = `You are a QA Business Analyst. Compare documentation requirements against actual implementation. Identify:
1. Implemented features.
2. Missing features (documented but not found in files).
3. Unexpected features (found in files but not in specs).
4. Deprecated features.
5. Overall matching percentage score (0-100).
Return JSON matching the GapAnalysis interface. Example format:
{
  "implementedFeatures": ["User login", "Get cart items"],
  "missingFeatures": ["Pay via Stripe credit card"],
  "unexpectedFeatures": ["Admin bypass backdoor login"],
  "deprecatedFeatures": [],
  "matchingScore": 85
}`;

    try {
      const responseText = await this.callLLM(prompt, system);
      const jsonStart = responseText.indexOf('{');
      const jsonEnd = responseText.lastIndexOf('}') + 1;
      if (jsonStart !== -1 && jsonEnd !== -1) {
        return JSON.parse(responseText.substring(jsonStart, jsonEnd));
      }
    } catch (e) {
      console.warn('Failed to parse AI gap analysis, using heuristics');
    }

    // Simulation fallback
    if (docsContent.toLowerCase().includes('ecommerce') || docsContent.toLowerCase().includes('shopping')) {
      return {
        implementedFeatures: [
          'User signup & login (validate inputs)',
          'Product catalog search',
          'Add items to shopping cart',
          'Checkout process endpoint'
        ],
        missingFeatures: [
          'Billing invoice PDF generation',
          'Coupon discount validations'
        ],
        unexpectedFeatures: [
          'Backdoor test login endpoint (/api/backdoor/login)'
        ],
        deprecatedFeatures: [
          'Legacy guest checkout without validation'
        ],
        matchingScore: 78
      };
    }

    return {
      implementedFeatures: ['Core routes configuration', 'File reading system'],
      missingFeatures: ['API validation checks', 'Rate limit controls'],
      unexpectedFeatures: ['Unused mock assets'],
      deprecatedFeatures: [],
      matchingScore: 90
    };
  }

  public static async generateTests(projectPath: string, files: string[], specs: string): Promise<TestCase[]> {
    const prompt = `Files:\n${JSON.stringify(files)}\n\nSpecs:\n${specs}`;
    const system = `You are an AI Test Architect. Generate high-quality test cases for this application. Categorize them under Functional, UI, API, Security, Performance. For each test, provide a name, category, description, expectedResult, and mock test script code in Playwright (if UI) or Jest/Vitest (if API/Functional). Return a JSON array of test cases. Example:
[
  {
    "id": "tc-1",
    "projectId": "",
    "name": "User Registration Validation",
    "category": "Functional",
    "description": "Checks if register fails with invalid email format",
    "file": "tests/register.test.js",
    "code": "describe('Auth API', () => { ... })",
    "expectedResult": "API responds with status 400 and error message"
  }
]`;

    try {
      const responseText = await this.callLLM(prompt, system);
      const jsonStart = responseText.indexOf('[');
      const jsonEnd = responseText.lastIndexOf(']') + 1;
      if (jsonStart !== -1 && jsonEnd !== -1) {
        return JSON.parse(responseText.substring(jsonStart, jsonEnd));
      }
    } catch (e) {
      console.warn('Failed to parse AI generated test cases, using simulation');
    }

    // Simulation / E-commerce specific test cases
    return this.getSimulatedTests();
  }

  public static async analyzeFailure(
    testName: string,
    errorMsg: string,
    stackTrace: string,
    fileContent: string,
    fileName: string
  ): Promise<{ rootCause: string; proposedFix: string; explanation: string; confidenceScore: number }> {
    const prompt = `Failed Test: ${testName}\nError: ${errorMsg}\nStack:\n${stackTrace}\n\nFile Content (${fileName}):\n${fileContent}`;
    const system = `You are a Senior Root Cause Analysis Agent. Identify the exact line of bug, write a concise explanation, and provide the corrected code segment. Return JSON format:
{
  "rootCause": "Detail of root cause.",
  "explanation": "Brief explanation of how the bug occurred.",
  "proposedFix": "Exact replacement code block or patch.",
  "confidenceScore": 95
}`;

    try {
      const responseText = await this.callLLM(prompt, system);
      const jsonStart = responseText.indexOf('{');
      const jsonEnd = responseText.lastIndexOf('}') + 1;
      if (jsonStart !== -1 && jsonEnd !== -1) {
        return JSON.parse(responseText.substring(jsonStart, jsonEnd));
      }
    } catch (e) {
      console.warn('Failed to parse AI failure analysis, using simulation');
    }

    // Simulation fallback for the checkout validator bug in our sample
    if (testName.toLowerCase().includes('checkout') || errorMsg.includes('checkout') || fileContent.includes('checkout')) {
      return {
        rootCause: `In ${fileName}, the email verification regex '/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/' causes an unhandled crash or rejects valid checkout requests containing special sub-domains (e.g. 'user+test@domain.co.uk') due to rigid character checking, raising an validation error 400.`,
        explanation: 'The email validation logic in the checkout endpoint uses an overly restrictive regex check, failing checkout validation for valid emails with plus signs or multiple domain parts, returning HTTP status 400.',
        proposedFix: `// FIX: Replace the rigid regex check with a standard, permissive email validation check in checkout
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;
if (!email || !emailRegex.test(email)) {
  return res.status(400).json({ success: false, error: "Invalid checkout email address format" });
}`,
        confidenceScore: 98
      };
    }

    return {
      rootCause: `Unexpected test failure due to timeout/mock response.`,
      explanation: `Heuristics identified an exception assertion failure in the test suite.`,
      proposedFix: `// Proposed standard validation fix\nif (input === undefined) return false;`,
      confidenceScore: 80
    };
  }

  private static runSimulation(prompt: string): string {
    // Simply returns a simulated response based on keywords
    if (prompt.includes('Analyze these project files')) {
      return JSON.stringify({ language: 'JavaScript', framework: 'Express.js' });
    }
    return '';
  }

  private static getSimulatedTests(): TestCase[] {
    return [
      {
        id: 'tc-1',
        projectId: '',
        name: 'Successful User Signup',
        category: 'Functional',
        description: 'Verify new users can signup with valid data.',
        file: 'tests/auth.test.js',
        code: `const request = require('supertest');
const app = require('../app');

describe('POST /api/signup', () => {
  it('should register a new user account', async () => {
    const res = await request(app)
      .post('/api/signup')
      .send({
        username: 'testuser',
        email: 'testuser@qa.com',
        password: 'Password123!'
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
  });
});`,
        expectedResult: 'User created in DB, response returns success: true and status 201.'
      },
      {
        id: 'tc-2',
        projectId: '',
        name: 'Prevent Duplicate Username signup',
        category: 'Security',
        description: 'Ensure username collision prevention.',
        file: 'tests/auth.test.js',
        code: `const request = require('supertest');
const app = require('../app');

describe('POST /api/signup - Duplicate Username', () => {
  it('should reject registration if username exists', async () => {
    const res = await request(app)
      .post('/api/signup')
      .send({
        username: 'admin', // already exists
        email: 'admin2@qa.com',
        password: 'Password123!'
      });
    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toContain('Username already taken');
  });
});`,
        expectedResult: 'Validation fails, server returns status 400 and error message.'
      },
      {
        id: 'tc-3',
        projectId: '',
        name: 'Retrieve Shopping Cart Items',
        category: 'API',
        description: 'Get current contents of shopping cart.',
        file: 'tests/cart.test.js',
        code: `const request = require('supertest');
const app = require('../app');

describe('GET /api/cart', () => {
  it('should fetch the items from current session cart', async () => {
    const res = await request(app)
      .get('/api/cart')
      .set('Cookie', ['sessionId=test-session-token']);
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });
});`,
        expectedResult: 'Returns status 200 and list of cart items.'
      },
      {
        id: 'tc-4',
        projectId: '',
        name: 'Checkout Flow validation (Sub-domain email test)',
        category: 'Functional',
        description: 'Verify checkout completes successfully with standard email subdomains (e.g. developer+test@dev.co.uk).',
        file: 'tests/checkout.test.js',
        code: `const request = require('supertest');
const app = require('../app');

describe('POST /api/checkout', () => {
  it('should complete order checkout process with sub-domain email address', async () => {
    const res = await request(app)
      .post('/api/checkout')
      .send({
        email: 'developer+test@dev.co.uk',
        cartId: 'cart-1001',
        paymentMethod: 'stripe'
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body.orderId).toBeDefined();
    expect(res.body.success).toBe(true);
  });
});`,
        expectedResult: 'Order completes, returns orderId and success: true.'
      },
      {
        id: 'tc-5',
        projectId: '',
        name: 'Backdoor Endpoint SQL Injection Protection',
        category: 'Security',
        description: 'Verifies SQL injection attempts on hidden login are blocked.',
        file: 'tests/security.test.js',
        code: `const request = require('supertest');
const app = require('../app');

describe('POST /api/backdoor/login', () => {
  it('should prevent SQL injection payload in credentials', async () => {
    const res = await request(app)
      .post('/api/backdoor/login')
      .send({
        username: "admin' OR 1=1 --",
        password: "xyz"
      });
    expect(res.statusCode).toEqual(401);
  });
});`,
        expectedResult: 'SQL payload rejected, returns status 401 Unauthorized.'
      }
    ];
  }
}
