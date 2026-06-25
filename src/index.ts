import express from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import router from './routes';
import { DbService } from './services/db.service';
import { ProjectService } from './services/project.service';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3030;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Mount the API router
app.use('/api', router);

// Serve static assets if any
app.use('/data', express.static(path.join(__dirname, '../data')));

// Serve frontend build if in production
if (fs.existsSync(path.join(__dirname, '../frontend/dist'))) {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

// Start Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 AutoQA AI Backend Server running on port ${PORT}`);
  console.log(`💻 Ready for repository scanning & autonomous healing`);
  console.log(`==================================================`);

  // Auto-register default sample project for immediate out-of-the-box action
  try {
    const samplePath = path.resolve('src/test-samples/sample-ecommerce');
    const existing = DbService.getProjects();
    if (existing.length === 0 && fs.existsSync(samplePath)) {
      console.log('Initializing platform with default Sample E-commerce project...');
      ProjectService.analyze(samplePath, 'Sample E-commerce Project')
        .then(proj => {
          DbService.saveProject(proj);
          console.log(`Successfully registered default project: ${proj.name} [ID: ${proj.id}]`);
        })
        .catch(err => {
          console.error('Failed to analyze default project on startup:', err.message);
        });
    }
  } catch (e: any) {
    console.error('Error auto-registering default project:', e.message);
  }
});
