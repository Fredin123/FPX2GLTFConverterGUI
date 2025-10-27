# FBX → glTF Konverterare (Electron GUI)

Ett enkelt GUI för att köra `FBX2glTF-windows-x64.exe` lokalt på Windows.

## Förutsättningar
- Windows 10/11
- Node.js 18+ (inkluderar npm)
- Filen `FBX2glTF-windows-x64.exe` placerad i projektroten (den finns redan här i repo-mappen)

## Starta

```powershell
# I projektmappen
npm.cmd install
npm.cmd start
```

> Tips: I PowerShell kan `npm` blockeras av ExecutionPolicy. Använd `npm.cmd` som ovan.

## Användning
1. Öppna appen, klicka "Välj filer…" och markera en eller flera `.fbx`-filer.
2. Välj utdatakatalog (var konverterade filer ska hamna).
3. Välj alternativ:
   - Format: GLB (enfil) eller glTF (+ resurser). Vid glTF kan du markera "Bädda in" för att inlinea resurser i JSON.
   - Material: Auto, PBR metallic-roughness eller Unlit.
   - UV: Flip U/V.
   - Indexstorlek, normal-beräkning, animation FPS.
   - Draco-komprimering (nivå och bitdjup per attribut).
4. Klicka "Konvertera". Loggflödet visas nederst. Varje indatafil skrivs ut som
   `<Utdatakatalog>/<filnamn>.glb` eller `.gltf` beroende på val.

## Stöd för CLI-flaggor
Appen mappar till FBX2glTFs flaggor, t.ex.:
- `--input`, `--output`
- `--binary`, `--embed`
- `--verbose`, `--user-properties`
- `--pbr-metallic-roughness`, `--khr-materials-unlit`
- `--flip-u`, `--flip-v`, `--no-flip-u`, `--no-flip-v`
- `--long-indices`, `--compute-normals`, `--anim-framerate`
- `--draco` + `--draco-*` bitflaggor

Se projektet för FBX2glTF för fullständig dokumentation:
https://github.com/facebookincubator/FBX2glTF

## Packetering
Denna setup är fokuserad på utvecklingsläge. Vid packetering behöver exekverbara
filen inkluderas i appens resurser. Koden försöker hitta exe i `process.resourcesPath`
vid packad app, och i projektroten i dev. Populära val för packetering är
`electron-builder` eller `electron-forge`.

## Felsökning
- Om inget händer vid körning: kontrollera att `FBX2glTF-windows-x64.exe` ligger i
  samma mapp som `main.js` (projektroten) i utvecklingsläge.
- Öppna DevTools (Ctrl+Shift+I) för konsolloggar i UI.
- Kör `FBX2glTF-windows-x64.exe --help` i terminal för att verifiera att exe fungerar.
