# FBX → glTF Converter (Electron GUI)

A simple GUI to run `FBX2glTF-windows-x64.exe` locally on Windows.

## Prerequisites
- Windows 10/11
- Node.js 18+ (includes npm)
- The `FBX2glTF-windows-x64.exe` file placed in the project root (it is already in this repo folder)

## Getting started

```powershell
# From the project folder
npm.cmd install
npm.cmd start
```

> Tip: In PowerShell, using `npm.cmd` ensures the correct Windows shim is executed if script execution policies interfere.

## Usage
1. Open the app, click "Choose files…" and select one or more `.fbx` files.
2. Choose the output folder (where converted files will be saved).
3. Pick options:
   - Format: GLB (single file) or glTF (+ resources). For glTF you can tick "Embed resources" to inline buffers in the JSON.
   - Materials: Auto (default), PBR metallic-roughness, or Unlit.
   - UV: Flip U/V.
   - Index size, normals computation, animation FPS.
   - Draco compression (level and per-attribute bit precision).
4. Click "Convert". The log stream appears at the bottom. Each input file is written as
   `<OutputFolder>/<filename>.glb` or `.gltf` depending on your selection.

## Supported CLI flags
The app maps to FBX2glTF flags, for example:
- `--input`, `--output`
- `--binary`, `--embed`
- `--verbose`, `--user-properties`
- `--pbr-metallic-roughness`, `--khr-materials-unlit`
- `--flip-u`, `--flip-v`, `--no-flip-u`, `--no-flip-v`
- `--long-indices`, `--compute-normals`, `--anim-framerate`
- `--draco` + `--draco-*` bit options

See the FBX2glTF project for full documentation:
https://github.com/facebookincubator/FBX2glTF

## Packaging
This setup targets development mode. For packaging, ensure the executable is bundled with the app resources. The code looks for the exe in `process.resourcesPath` when packaged, and in the project root during development. Popular choices for packaging are
`electron-builder` or `electron-forge`.

## Troubleshooting
- If nothing happens when you run: verify `FBX2glTF-windows-x64.exe` is in the same folder as `main.js` (project root) during development.
- Open DevTools (Ctrl+Shift+I) to see UI console logs.
- Run `FBX2glTF-windows-x64.exe --help` in a terminal to verify the exe works.
