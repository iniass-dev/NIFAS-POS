const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const Store = require("electron-store");

const store = new Store();

function getServerUrl() {
  return store.get("server_url", "http://localhost:8000");
}

function getRegisterId() {
  return store.get("register_id", null);
}

async function showConfigWindow() {
  const config = new BrowserWindow({
    width: 480,
    height: 320,
    resizable: false,
    webPreferences: { contextIsolation: true, preload: path.join(__dirname, "preload-config.js") },
    title: "Configuration NIFAS Caisse",
    autoHideMenuBar: true,
  });

  config.loadFile(path.join(__dirname, "config.html"));
  return new Promise((resolve) => {
    ipcMain.once("config-saved", (_, data) => {
      store.set("server_url", data.server_url);
      store.set("register_id", data.register_id);
      config.close();
      resolve();
    });
  });
}

function createPosWindow(serverUrl, registerId) {
  const win = new BrowserWindow({
    fullscreen: true,
    kiosk: true,
    frame: false,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload-pos.js"),
    },
    title: "NIFAS — Caisse",
    backgroundColor: "#131a2e",
  });

  if (process.env.NODE_ENV === "development") {
    win.loadURL("http://localhost:5174");
  } else {
    win.loadFile(path.join(__dirname, "../frontend/dist/pos/index.html"));
  }

  // Injecte la config dans le localStorage au démarrage
  win.webContents.on("did-finish-load", () => {
    win.webContents.executeJavaScript(`
      localStorage.setItem('register_id', '${registerId}');
      localStorage.setItem('server_url', '${serverUrl}');
    `);
  });
}

app.whenReady().then(async () => {
  const serverUrl = getServerUrl();
  const registerId = getRegisterId();

  // Premier lancement ou config manquante → afficher l'écran de config
  if (!registerId) {
    await showConfigWindow();
  }

  createPosWindow(store.get("server_url"), store.get("register_id"));
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
