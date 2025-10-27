(() => {
  const byId = (id) => document.getElementById(id);
  const inputList = byId('inputList');
  const inputFilesLabel = byId('inputFilesLabel');
  const outputDirLabel = byId('outputDirLabel');
  const logEl = byId('log');
  const runStatus = byId('runStatus');

  let inputFiles = [];
  let outputDir = '';
  let lastOutputFile = '';

  function setInputFiles(files) {
    inputFiles = files || [];
    inputFilesLabel.textContent = inputFiles.length ? `${inputFiles.length} fil(er) valda` : 'Inga filer valda';
    inputList.innerHTML = '';
    inputFiles.forEach(f => {
      const li = document.createElement('li');
      li.textContent = f;
      inputList.appendChild(li);
    });
  }

  function setOutputDir(dir) {
    outputDir = dir || '';
    outputDirLabel.textContent = outputDir || 'Ingen katalog vald';
  }

  function appendLog(msg) {
    logEl.textContent += msg.endsWith('\n') ? msg : (msg + '\n');
    logEl.scrollTop = logEl.scrollHeight;
  }

  function collectOptions() {
    const format = document.querySelector('input[name="format"]:checked').value;
    const embed = byId('optEmbed').checked;
    const material = byId('optMaterial').value;
    const flipU = byId('optFlipU').checked;
    const flipV = byId('optFlipV').checked;
    const longIndices = byId('optLongIndices').value; // auto|never|always
    const computeNormals = byId('optComputeNormals').value; // broken|missing|always|never
    const animFramerate = byId('optAnimFramerate').value; // ''|bake24|bake30|bake60
    const userProperties = byId('optUserProps').checked;
    const verbose = byId('optVerbose').checked;

    const draco = byId('optDraco').checked;
    const dracoCompressionLevel = parseInt(byId('optDracoLevel').value, 10);
    const dracoBits = {
      position: parseInt(byId('optBitsPos').value, 10),
      uv: parseInt(byId('optBitsUV').value, 10),
      normals: parseInt(byId('optBitsNrm').value, 10),
      colors: parseInt(byId('optBitsCol').value, 10),
      other: parseInt(byId('optBitsOther').value, 10)
    };

    return {
      binary: format === 'glb',
      embed,
      material: material === 'auto' ? undefined : material,
      flipU,
      flipV,
      longIndices,
      computeNormals,
      animFramerate: animFramerate || undefined,
      userProperties,
      verbose,
      draco,
      dracoCompressionLevel,
      dracoBits
    };
  }

  // Wire up buttons
  byId('btnPickInput').addEventListener('click', async () => {
    const files = await window.api.pickInputFiles();
    setInputFiles(files);
  });

  byId('btnPickOutput').addEventListener('click', async () => {
    const dir = await window.api.pickOutputDir();
    setOutputDir(dir);
  });

  // Format -> embed availability
  const radioGlb = document.querySelector('input[name="format"][value="glb"]');
  const radioGltf = document.querySelector('input[name="format"][value="gltf"]');
  const chkEmbed = byId('optEmbed');
  const dracoLevelVal = byId('dracoLevelVal');

  function updateEmbedAvailability() {
    if (radioGlb.checked) {
      chkEmbed.disabled = true;
      chkEmbed.checked = false;
    } else {
      chkEmbed.disabled = false;
    }
  }

  radioGlb.addEventListener('change', updateEmbedAvailability);
  radioGltf.addEventListener('change', updateEmbedAvailability);
  updateEmbedAvailability();

  byId('optDracoLevel').addEventListener('input', (e) => {
    dracoLevelVal.textContent = e.target.value;
  });

  byId('btnRun').addEventListener('click', async () => {
    logEl.textContent = '';
    runStatus.textContent = 'Kör konvertering…';
    const options = collectOptions();
    const summary = await window.api.runConversion({ inputFiles, outputDir, options });
    if (summary.ok) {
      runStatus.textContent = `Klar: ${summary.converted}/${summary.total}`;
    } else {
      runStatus.textContent = `Klar med fel: ${summary.converted}/${summary.total}`;
    }
  });

  // Subscribe to logs
  window.api.onLog((msg) => appendLog(String(msg)));
  window.api.onRunFinished((summary) => {
    appendLog(`\nSammanfattning: ${summary.converted}/${summary.total} lyckades.`);
    // Show result for first successful file if provided
    if (summary && Array.isArray(summary.results) && summary.results.length > 0) {
      const res = summary.results.find(r => r.ok) || summary.results[0];
      if (res && res.outputPath) {
        lastOutputFile = res.outputPath;
        const card = document.getElementById('resultCard');
        const nameEl = document.getElementById('resultName');
        const pathEl = document.getElementById('resultPath');
        nameEl.textContent = res.outputName || res.outputPath.split('\\').pop();
        pathEl.textContent = res.outputPath;
        card.classList.remove('hidden');
      }
    }
  });

  // Drag-out: start native drag from dragHandle
  const dragHandle = document.getElementById('dragHandle');
  dragHandle.addEventListener('dragstart', (e) => {
    if (!lastOutputFile) {
      e.preventDefault();
      return;
    }
    // Prevent default so Electron's startDrag controls the drag operation
    e.preventDefault();
    // Defer to main process to start native drag with file
    window.api.startFileDrag(lastOutputFile);
  });

  // Drop zone for input FBX files
  const dropZone = document.getElementById('dropZone');
  const updateDZ = (over) => dropZone.classList.toggle('dragover', !!over);

  ['dragenter','dragover'].forEach(ev => dropZone.addEventListener(ev, (e) => {
    e.preventDefault();
    e.stopPropagation();
    updateDZ(true);
  }));
  ['dragleave','drop'].forEach(ev => dropZone.addEventListener(ev, (e) => {
    e.preventDefault();
    e.stopPropagation();
    updateDZ(false);
  }));
  dropZone.addEventListener('drop', (e) => {
    const files = Array.from(e.dataTransfer.files || [])
      .filter(f => f.path && f.name.toLowerCase().endsWith('.fbx'))
      .map(f => f.path);
    if (files.length) setInputFiles(files);
  });
})();
