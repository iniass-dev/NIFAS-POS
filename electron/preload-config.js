const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronConfig", {
  save: (data) => ipcRenderer.send("config-saved", data),
});
