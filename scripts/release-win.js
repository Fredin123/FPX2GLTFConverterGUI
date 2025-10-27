const { execFileSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function hasIcon() {
  const iconPath = path.resolve(__dirname, '..', 'build', 'icon.ico');
  return fs.existsSync(iconPath) ? iconPath : null;
}

function runPackager() {
  const projectRoot = path.resolve(__dirname, '..');
  const outDir = path.join(projectRoot, 'dist');
  const args = [
    '.',
    'FBX2glTF Converter',
    '--platform=win32',
    '--arch=x64',
    `--out=${outDir}`,
    '--overwrite',
    '--prune=true',
    '--extra-resource', 'FBX2glTF-windows-x64.exe'
  ];
  const icon = hasIcon();
  if (icon) {
    args.push('--icon', icon);
    console.log(`Using icon: ${icon}`);
  } else {
    console.log('No icon found at build/icon.ico — using default Electron icon.');
  }
  console.log('Running electron-packager with args:', args.join(' '));
  const win = process.platform === 'win32';
  const bin = win
    ? path.join(projectRoot, 'node_modules', '.bin', 'electron-packager.cmd')
    : path.join(projectRoot, 'node_modules', '.bin', 'electron-packager');
  if (win) {
    execFileSync('cmd.exe', ['/c', bin, ...args], { stdio: 'inherit', cwd: projectRoot });
  } else {
    execFileSync(bin, args, { stdio: 'inherit', cwd: projectRoot });
  }
}

function zipFolder() {
  const projectRoot = path.resolve(__dirname, '..');
  const folder = path.join(projectRoot, 'dist', 'FBX2glTF Converter-win32-x64');
  const zipPath = path.join(projectRoot, 'dist', 'FBX2glTF-Converter-win32-x64.zip');
  if (!fs.existsSync(folder)) {
    console.error(`Cannot zip: folder does not exist: ${folder}`);
    process.exit(1);
  }
  console.log(`Zipping folder to ${zipPath}`);
  const psCmd = `Compress-Archive -Path "${folder}/*" -DestinationPath "${zipPath}" -Force`;
  const result = spawnSync('powershell', ['-NoProfile', '-Command', psCmd], { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

const mode = process.argv[2] || 'all';
if (mode === 'dir' || mode === 'all') {
  runPackager();
}
if (mode === 'zip' || mode === 'all') {
  zipFolder();
}
console.log('Done.');
