// tray.js - Electron Tray logic for Coop Relay
const { app, Menu, Tray, ipcMain, nativeImage, BrowserWindow, dialog } = require('electron');
const path = require('path');

let tray = null;
let mainWindow = null;
let isPaired = false;
let relayId = null;

function setMainWindow(win) {
  mainWindow = win;
}

function setPairedState(paired, id) {
  isPaired = paired;
  relayId = id;
  updateTrayMenu();
}

function createTray() {
  if (tray) return tray;

  // Pick best icon for platform
  let iconPath = path.join(__dirname, 'iconTemplate.png');
  if (process.platform === 'darwin' && process.env.APP_BUNDLED) {
    iconPath = path.join(__dirname, 'macos.icns');
  }
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  tray.setToolTip(isPaired ? `Coop Relay – Paired` : 'Coop Relay – Not Paired');
  updateTrayMenu();
  return tray;
}

function updateTrayMenu() {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    {
      label: isPaired && relayId ? `Paired (ID: ${relayId.substring(0,8)}...)` : 'Not Paired',
      enabled: false,
      type: 'normal',
      icon: isPaired ? undefined : undefined,
      checked: isPaired,
    },
    { type: 'separator' },
    {
      label: 'Show App',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          if (process.platform === 'darwin') app.dock.show();
        }
      }
    },
    {
      label: 'Capture Snapshot Now',
      click: () => {
        // Use currentRelayState from main process
        let relayId, rtspUrl;
        try {
          const { currentRelayState } = require('./relayState');
          ({ relayId, rtspUrl } = currentRelayState || {});
        } catch (e) {
          relayId = undefined;
          rtspUrl = undefined;
        }
        if (!relayId || !rtspUrl) {
          dialog.showErrorBox('Snapshot Error', 'Relay ID or RTSP URL not available. Pairing may not be complete.');
          return;
        }
        if (mainWindow) {
          mainWindow.webContents.send('tray-capture-snapshot', { relayId, rtspUrl });
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit()
    }
  ]);
  tray.setContextMenu(menu);
  tray.setToolTip(isPaired ? `Coop Relay – Paired` : 'Coop Relay – Not Paired');
}

// Listen for pairing state updates from renderer
ipcMain.on('tray-set-paired', (event, paired, id) => {
  setPairedState(paired, id);
});

module.exports = { createTray, setMainWindow, setPairedState };
