const { app, BrowserWindow, ipcMain, dialog, nativeImage } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

function resolveExecutablePath() {
  const exeName = process.platform === 'win32' ? 'FBX2glTF-windows-x64.exe' : 'FBX2glTF';
  // In dev, app.getAppPath() points to project dir. When packaged, use process.resourcesPath.
  if (app.isPackaged) {
    return path.join(process.resourcesPath, exeName);
  }
  return path.join(app.getAppPath(), exeName);
}

function resolveDefaultOutputDir() {
  // "Programmet befinner sig i" tolkas som:
  // - Packad app: samma mapp som exe (process.execPath)
  // - Dev: projektroten (app.getAppPath())
  try {
    if (app.isPackaged) {
      return path.dirname(process.execPath);
    }
    return app.getAppPath();
  } catch {
    return process.cwd();
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: true
    }
  });

  win.removeMenu?.();
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('pick-input-files', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Välj FBX-fil(er)',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'FBX Models', extensions: ['fbx'] }]
  });
  return canceled ? [] : filePaths;
});

ipcMain.handle('pick-output-dir', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Välj utdatakatalog',
    properties: ['openDirectory', 'createDirectory']
  });
  return canceled ? '' : (filePaths[0] || '');
});

function buildArgs(inputFile, outputDir, options) {
  const args = [];
  // Input/output
  args.push('--input', inputFile);
  // Output without suffix; we'll derive name from input
  const baseName = path.parse(inputFile).name;
  const outBase = path.join(outputDir, baseName);
  args.push('--output', outBase);

  // Format options
  if (options.binary) args.push('--binary');
  if (options.embed && !options.binary) args.push('--embed');

  // Verbose
  if (options.verbose) args.push('--verbose');

  // Materials
  if (options.material === 'pbr') args.push('--pbr-metallic-roughness');
  if (options.material === 'unlit') args.push('--khr-materials-unlit');

  // Flip UV
  if (options.flipU === true) args.push('--flip-u');
  if (options.flipU === false) args.push('--no-flip-u');
  if (options.flipV === true) args.push('--flip-v');
  if (options.flipV === false) args.push('--no-flip-v');

  // Long indices
  if (options.longIndices && ['never', 'auto', 'always'].includes(options.longIndices)) {
    args.push('--long-indices', options.longIndices);
  }

  // Compute normals
  if (options.computeNormals && ['never', 'broken', 'missing', 'always'].includes(options.computeNormals)) {
    args.push('--compute-normals', options.computeNormals);
  }

  // Anim framerate
  if (options.animFramerate && ['bake24', 'bake30', 'bake60'].includes(options.animFramerate)) {
    args.push('--anim-framerate', options.animFramerate);
  }

  // User properties
  if (options.userProperties) args.push('--user-properties');

  // Draco
  if (options.draco) {
    args.push('--draco');
    if (Number.isInteger(options.dracoCompressionLevel)) {
      args.push('--draco-compression-level', String(options.dracoCompressionLevel));
    }
    const dracoBits = options.dracoBits || {};
    if (Number.isInteger(dracoBits.position)) args.push('--draco-bits-for-position', String(dracoBits.position));
    if (Number.isInteger(dracoBits.uv)) args.push('--draco-bits-for-uv', String(dracoBits.uv));
    if (Number.isInteger(dracoBits.normals)) args.push('--draco-bits-for-normals', String(dracoBits.normals));
    if (Number.isInteger(dracoBits.colors)) args.push('--draco-bits-for-colors', String(dracoBits.colors));
    if (Number.isInteger(dracoBits.other)) args.push('--draco-bits-for-other', String(dracoBits.other));
  }

  // Keep attributes (advanced)
  if (Array.isArray(options.keepAttributes) && options.keepAttributes.length > 0) {
    for (const attr of options.keepAttributes) {
      args.push('--keep-attribute', attr);
    }
  }

  // FBX temp dir
  if (options.fbxTempDir) {
    args.push('--fbx-temp-dir', options.fbxTempDir);
  }

  return args;
}

ipcMain.handle('run-conversion', async (event, payload) => {
  const { inputFiles, outputDir, options } = payload || {};
  const win = BrowserWindow.getFocusedWindow();
  const exePath = resolveExecutablePath();

  function log(msg) {
    win?.webContents.send('run-log', msg);
  }

  if (!Array.isArray(inputFiles) || inputFiles.length === 0) {
    log('Inga indatafiler valda.');
    return { ok: false, converted: 0 };
  }
  const finalOutputDir = outputDir && String(outputDir).trim().length > 0 ? outputDir : resolveDefaultOutputDir();
  if (!outputDir) {
    log(`Ingen utdatakatalog vald – använder programmets katalog: ${finalOutputDir}`);
  }

  let success = 0;
  const results = [];
  for (const file of inputFiles) {
    const args = buildArgs(file, finalOutputDir, options || {});
    log(`\nKör: ${path.basename(exePath)} ${args.map(a => (a.includes(' ') ? '"' + a + '"' : a)).join(' ')}`);

    await new Promise((resolve) => {
      const child = spawn(exePath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      child.stdout.on('data', (data) => log(data.toString()))
      child.stderr.on('data', (data) => log(data.toString()))
      child.on('error', (err) => {
        log(`Fel: ${err.message}`);
      });
      child.on('close', (code) => {
        const outBase = args[args.indexOf('--output') + 1];
        const isBinary = args.includes('--binary');
        const outPath = isBinary ? `${outBase}.glb` : `${outBase}.gltf`;
        const record = { ok: code === 0, outputPath: outPath, outputName: path.basename(outPath), input: file };
        if (code === 0) {
          success += 1;
          log(`Klar: ${path.basename(file)} (exit ${code})`);
        } else {
          log(`Misslyckades: ${path.basename(file)} (exit ${code})`);
        }
        results.push(record);
        resolve();
      });
    });
  }

  const summary = { ok: success === inputFiles.length, converted: success, total: inputFiles.length, results };
  win?.webContents.send('run-finished', summary);
  return summary;
});


// Handle drag-out of generated file to Explorer
ipcMain.on('start-file-drag', (event, filePath) => {
  try {
    // Create a slightly larger icon for Windows reliability
    const px1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=';
    const icon = nativeImage.createFromDataURL(px1).resize({ width: 32, height: 32, quality: 'best' });
    event.sender.startDrag({ file: filePath, icon });
  } catch (e) {
    // no-op
  }
});
