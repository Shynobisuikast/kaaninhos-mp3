global.File = class File { };

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const ytSearch = require('yt-search');
const { exec, spawn } = require('child_process');
const fs = require('fs');

const USER_DATA_PATH = app.getPath('userData');
const YT_DLP_TARGET_PATH = path.join(USER_DATA_PATH, 'yt-dlp.exe');

const streamCache = {};
const CACHE_EXPIRY = 3600000;

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

  const ytDlpExecutable = fs.existsSync(YT_DLP_TARGET_PATH)
    ? YT_DLP_TARGET_PATH
    : (app.isPackaged ? path.join(process.resourcesPath, 'yt-dlp.exe') : path.join(__dirname, 'yt-dlp.exe'));

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
      ? path.join(process.resourcesPath, 'yt-dlp.exe')
      : path.join(__dirname, 'yt-dlp.exe');

    if (!fs.existsSync(YT_DLP_TARGET_PATH)) {
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, YT_DLP_TARGET_PATH);
      }
    }

    if (fs.existsSync(YT_DLP_TARGET_PATH)) {
      const updateProcess = spawn(YT_DLP_TARGET_PATH, ['-U'], {
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