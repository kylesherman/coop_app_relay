const { app, BrowserWindow, ipcMain } = require('electron');
const { createTray, setMainWindow } = require('./tray');

const relayState = require('./relayState');


require('dotenv').config(); // Load .env file for the main process
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 850,
    title: 'Coop Relay',
    webPreferences: {
      nodeIntegration: true, // Be cautious with this in production
      contextIsolation: false, // Be cautious with this in production
      // preload: path.join(__dirname, 'preload.js') // Optional: if you need a preload script
    },
    titleBarStyle: 'hiddenInset', // Optional: macOS-style title bar
    show: true // We'll manage show/hide manually
  });

  // Load the index.html from the Vite build output directory
  win.loadFile(path.join(__dirname, 'dist', 'index.html'));

  // Set up tray integration
  setMainWindow(win);
  createTray();

  // Hide window instead of quitting on close
  win.on('close', (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      win.hide();
      if (process.platform === 'darwin') app.dock.hide();
    }
  });

  // Restore dock icon on show (macOS)
  win.on('show', () => {
    if (process.platform === 'darwin') app.dock.show();
  });

  return win;
}


// IPC handler to provide environment variables to the renderer process
ipcMain.handle('get-env-vars', async (event) => {
  return {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
    COOP_BACKEND_URL: process.env.COOP_BACKEND_URL,
  };
});

let mainWin;
ipcMain.on('relay-ready', (event, payload) => {
  relayState.currentRelayState.relayId = payload.relayId;
  relayState.currentRelayState.rtspUrl = payload.rtspUrl;
});

app.whenReady().then(() => {
  mainWin = createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWin = createWindow();
    } else if (mainWin) {
      mainWin.show();
      if (process.platform === 'darwin') app.dock.show();
    }
  });
});

// Prevent app from quitting when all windows are closed
app.on('window-all-closed', (e) => {
  e.preventDefault();
  // On macOS, hide dock icon
  if (process.platform === 'darwin') app.dock.hide();
});

// Optional: Set app icon (macOS)
if (process.platform === 'darwin') {
  // app.dock.setIcon(path.join(__dirname, 'assets', 'icon.png')); // Adjust path to your icon
}
