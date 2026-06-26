import { app, BrowserWindow } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 850,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: "AutoQA AI Platform - Desktop App",
    backgroundColor: "#030712",
  });

  // Load the backend server address (which serves the statically built frontend)
  mainWindow.loadURL('http://localhost:3030');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Start backend server internally as part of the Electron process lifecycle
function startBackendServer() {
  try {
    console.log('[Electron Main] Starting local Express backend server...');
    // Load backend main file (relative to dist/ folder where this will be run)
    require('./index.js');
    console.log('[Electron Main] Express backend loaded successfully.');
  } catch (err: any) {
    console.error('[Electron Main] Error starting backend server:', err.message);
  }
}

app.whenReady().then(() => {
  // Start the server
  startBackendServer();

  // Wait a moment for server to bind to port 3030 before opening the window
  setTimeout(createWindow, 1500);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
