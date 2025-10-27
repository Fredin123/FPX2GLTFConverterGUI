const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  pickInputFiles: () => ipcRenderer.invoke('pick-input-files'),
  pickOutputDir: () => ipcRenderer.invoke('pick-output-dir'),
  runConversion: (payload) => ipcRenderer.invoke('run-conversion', payload),
  startFileDrag: (filePath) => ipcRenderer.send('start-file-drag', filePath),
  onLog: (callback) => {
    const listener = (_event, msg) => callback(msg);
    ipcRenderer.on('run-log', listener);
    return () => ipcRenderer.removeListener('run-log', listener);
  },
  onRunFinished: (callback) => {
    const listener = (_event, summary) => callback(summary);
    ipcRenderer.on('run-finished', listener);
    return () => ipcRenderer.removeListener('run-finished', listener);
  }
});
