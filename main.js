global.File = class File { };

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const ytSearch = require('yt-search');
const { exec, spawn } = require('child_process');
const fs = require('fs');

const isWin = process.platform === 'win32';
const YT_DLP_NAME = isWin ? 'yt-dlp.exe' : 'yt-dlp';
const USER_DATA_PATH = app.getPath('userData');
const YT_DLP_TARGET_PATH = path.join(USER_DATA_PATH, YT_DLP_NAME);

const streamCache = {};
const CACHE_EXPIRY = 3600000;

function getExecutablePath() {
  if (fs.existsSync(YT_DLP_TARGET_PATH)) return YT_DLP_TARGET_PATH;
  const packagedPath = path.join(process.resourcesPath, YT_DLP_NAME);
  if (app.isPackaged && fs.existsSync(packagedPath)) return packagedPath;
  const localPath = path.join(__dirname, YT_DLP_NAME);
  if (fs.existsSync(localPath)) return localPath;
  return 'yt-dlp';
}

function createWindow() {
  const win = new BrowserWindow({
    width: 350,
    height: 680,
    frame: false,
    transparent: true,
    resizable: false,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  win.loadFile('index.html');

  ipcMain.on('minimize-app', () => {
    win.minimize();
  });

  ipcMain.on('resize-window', (event, width, height) => {
    win.setSize(width, height);
  });

  ipcMain.on('get-user-data-path', (event) => {
    event.returnValue = USER_DATA_PATH;
  });
}

ipcMain.handle('yt-search-list', async (event, query) => {
  try {
    const r = await ytSearch(query);
    return r.videos.slice(0, 15).map(v => ({
      title: v.title,
      timestamp: v.timestamp,
      videoId: v.videoId,
      thumbnail: v.thumbnail,
      url: v.url
    }));
  } catch (e) {
    return [];
  }
});

ipcMain.handle('yt-get-stream', async (event, videoUrl) => {
  const now = Date.now();
  if (streamCache[videoUrl] && now - streamCache[videoUrl].time < CACHE_EXPIRY) {
    return { success: true, url: streamCache[videoUrl].url };
  }

  const ytDlpExecutable = getExecutablePath();
  const command = `"${ytDlpExecutable}" -f bestaudio -g "${videoUrl}"`;

  return new Promise((resolve) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: "Dönüştürme hatası!" });
        return;
      }
      const streamUrl = stdout.trim();
      if (streamUrl && streamUrl.startsWith('http')) {
        streamCache[videoUrl] = { url: streamUrl, time: Date.now() };
        resolve({ success: true, url: streamUrl });
      } else {
        resolve({ success: false, error: "Link bulunamadı." });
      }
    });
  });
});

app.whenReady().then(() => {
  createWindow();

  try {
    const sourcePath = app.isPackaged
      ? path.join(process.resourcesPath, YT_DLP_NAME)
      : path.join(__dirname, YT_DLP_NAME);

    if (!fs.existsSync(YT_DLP_TARGET_PATH)) {
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, YT_DLP_TARGET_PATH);
      }
    }

    const execPath = fs.existsSync(YT_DLP_TARGET_PATH) ? YT_DLP_TARGET_PATH : (fs.existsSync(sourcePath) ? sourcePath : null);
    if (execPath) {
      const updateProcess = spawn(execPath, ['-U'], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      });
      updateProcess.unref();
    }

  } catch (err) {
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});