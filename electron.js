import { app, BrowserWindow, Menu, dialog, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { autoUpdater } = require('electron-updater');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let updateCheckInProgress = false;
let updateReady = false;

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowPrerelease = false;

autoUpdater.on('checking-for-update', () => {
  updateCheckInProgress = true;
});

autoUpdater.on('update-available', async (info) => {
  updateCheckInProgress = false;

  const result = await dialog.showMessageBox(mainWindow ?? undefined, {
    type: 'info',
    title: 'Update Available',
    message: `MobinexCorpAdmin ${info.version} is available.`,
    detail: `You are currently using version ${app.getVersion()}. Download the update now?`,
    buttons: ['Download Update', 'Later'],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  });

  if (result.response === 0) {
    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      showUpdateError(error);
    }
  }
});

autoUpdater.on('update-not-available', () => {
  updateCheckInProgress = false;
});

autoUpdater.on('download-progress', (progress) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.setProgressBar(progress.percent / 100);
});

autoUpdater.on('update-downloaded', async (info) => {
  updateReady = true;
  updateCheckInProgress = false;
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setProgressBar(-1);

  const result = await dialog.showMessageBox(mainWindow ?? undefined, {
    type: 'info',
    title: 'Update Ready',
    message: `MobinexCorpAdmin ${info.version} is ready to install.`,
    detail: 'Restart the application to finish installing the update. Your local app data will remain in place.',
    buttons: ['Restart and Install', 'Install When I Exit'],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  });

  if (result.response === 0) {
    setImmediate(() => autoUpdater.quitAndInstall(false, true));
  }
});

autoUpdater.on('error', (error) => {
  updateCheckInProgress = false;
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setProgressBar(-1);
  console.error('Auto-update error:', error);
});

function showUpdateError(error) {
  console.error('Update failed:', error);
  dialog.showMessageBox(mainWindow ?? undefined, {
    type: 'error',
    title: 'Update Failed',
    message: 'MobinexCorpAdmin could not download the update.',
    detail: error instanceof Error ? error.message : String(error),
  });
}

async function checkForUpdates({ manual = false } = {}) {
  if (!app.isPackaged) {
    if (manual) {
      await dialog.showMessageBox(mainWindow ?? undefined, {
        type: 'info',
        title: 'Development Mode',
        message: 'Update checks only run in the installed production app.',
      });
    }
    return;
  }

  if (updateReady) {
    if (manual) {
      const result = await dialog.showMessageBox(mainWindow ?? undefined, {
        type: 'info',
        title: 'Update Ready',
        message: 'An update has already been downloaded.',
        buttons: ['Restart and Install', 'Cancel'],
        defaultId: 0,
        cancelId: 1,
      });
      if (result.response === 0) autoUpdater.quitAndInstall(false, true);
    }
    return;
  }

  if (updateCheckInProgress) return;

  try {
    const result = await autoUpdater.checkForUpdates();
    if (manual && !result?.updateInfo) {
      await dialog.showMessageBox(mainWindow ?? undefined, {
        type: 'info',
        title: 'No Update Found',
        message: `You are using MobinexCorpAdmin ${app.getVersion()}.`,
      });
    }
  } catch (error) {
    if (manual) showUpdateError(error);
    else console.error('Automatic update check failed:', error);
  }
}

function buildApplicationMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates',
          click: () => checkForUpdates({ manual: true }),
        },
        {
          label: `About MobinexCorpAdmin ${app.getVersion()}`,
          click: () => dialog.showMessageBox(mainWindow ?? undefined, {
            type: 'info',
            title: 'About MobinexCorpAdmin',
            message: `MobinexCorpAdmin ${app.getVersion()}`,
            detail: 'Device IMEI, vendor, and sales record desktop application.',
          }),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 900,
    minHeight: 600,
    title: 'MobinexCorpAdmin - IMEI, Vendor & Sales Ledger',
    icon: path.join(__dirname, 'public/favicon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
    autoHideMenuBar: false,
    backgroundColor: '#1a1c1e',
  });

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  buildApplicationMenu();
  createWindow();

  if (app.isPackaged) {
    setTimeout(() => checkForUpdates(), 5000);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
