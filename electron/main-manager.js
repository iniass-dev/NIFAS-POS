const { app, BrowserWindow, shell } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let backendProcess = null;

function startBackend() {
  const backendPath = path.join(process.resourcesPath, "backend");
  const uvicornCmd = path.join(backendPath, "venv", "Scripts", "uvicorn.exe");

  backendProcess = spawn(uvicornCmd, ["app.main:app", "--host", "0.0.0.0", "--port", "8000"], {
    cwd: backendPath,
    env: { ...process.env, PYTHONPATH: backendPath },
    windowsHide: true,
  });

  backendProcess.stderr.on("data", (data) => console.log("[backend]", data.toString()));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: { contextIsolation: true },
    titleBarStyle: "default",
    title: "NIFAS — Gestion",
  });

  // En dev : charge le serveur Vite
  if (process.env.NODE_ENV === "development") {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../frontend/dist/manager/index.html"));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  if (process.env.NODE_ENV !== "development") startBackend();
  createWindow();
});

app.on("window-all-closed", () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== "darwin") app.quit();
});
