import { execSync } from 'child_process';

console.log('==================================================');
console.log('  Mobinex Corp Admin - Desktop App Auto-Updater');
console.log('==================================================');
console.log('');

try {
  console.log('[1/3] Verifying dependencies...');
  execSync('npm install', { stdio: 'inherit' });

  console.log('[2/3] Compiling Web Application Bundle (Vite)...');
  execSync('npm run build', { stdio: 'inherit' });

  console.log('[3/3] Compiling Standalone Windows .EXE App...');
  execSync('npm run dist', { stdio: 'inherit' });

  console.log('');
  console.log('==================================================');
  console.log('  UPDATE COMPLETED SUCCESSFULLY!');
  console.log('  New EXE generated inside the /release folder.');
  console.log('==================================================');
} catch (error) {
  console.error('ERROR: Build failed during update execution.', error);
  process.exit(1);
}
