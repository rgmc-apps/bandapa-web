const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const htmlFile = path.resolve('bandapa-profile-preview.html');
const outFile = path.resolve('bandapa-profile-design.png');
const fileUrl = 'file:///' + htmlFile.replace(/\\/g, '/');

console.log('Chrome path:', chrome);
console.log('HTML file:', htmlFile);
console.log('Output:', outFile);
console.log('URL:', fileUrl);

const result = spawnSync(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--screenshot=' + outFile,
  '--window-size=1280,800',
  '--force-device-scale-factor=1',
  fileUrl
], { timeout: 30000, encoding: 'utf8' });

console.log('Exit code:', result.status);
if (result.stderr) console.log('Stderr:', result.stderr.substring(0, 800));
if (result.stdout) console.log('Stdout:', result.stdout.substring(0, 300));

if (fs.existsSync(outFile)) {
  const stat = fs.statSync(outFile);
  console.log('PNG created! Size:', stat.size, 'bytes');
} else {
  console.log('PNG not found at:', outFile);
  // Check current dir for any .png files
  const files = fs.readdirSync('.').filter(f => f.endsWith('.png'));
  console.log('PNG files in dir:', files);
}
