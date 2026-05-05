/**
 * uninstall.js — One-Click Environment Removal
 * Removes SDK folders and cleans up PATH/Environment variables
 */

import fs    from 'fs';
import path  from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { detectOS } from './detect.js';
import { Spinner } from './installers/base.js';

export async function runUninstall() {
  const osInfo = detectOS();
  const { isWindows, flutterDir, androidDir } = osInfo;

  console.log(chalk.bold.red('\n  🗑️  Flutter Environment Uninstaller'));
  console.log(chalk.gray('  ─────────────────────────────────────'));

  const { confirm } = await inquirer.prompt([{
    type: 'checkbox',
    name: 'targets',
    message: chalk.yellow('Select what to remove:'),
    choices: [
      { name: `Flutter SDK (${flutterDir})`, value: 'flutter', checked: true },
      { name: `Android SDK (${androidDir})`, value: 'android', checked: true },
      { name: 'Environment Variables (PATH, ANDROID_HOME, etc.)', value: 'path', checked: true },
    ],
  }, {
    type: 'confirm',
    name: 'confirm',
    message: chalk.red.bold('Are you ABSOLUTELY sure? This cannot be undone.'),
    default: false,
    when: (answers) => answers.targets.length > 0,
  }]);

  if (!confirm) {
    console.log(chalk.cyan('\n  Uninstall cancelled.'));
    return;
  }

  // ─── 1. Remove Folders ────────────────────────────────────────────────────
  if (confirm.targets?.includes('flutter') && fs.existsSync(flutterDir)) {
    const spin = new Spinner('Removing Flutter SDK...');
    spin.start();
    try {
      fs.rmSync(flutterDir, { recursive: true, force: true });
      spin.succeed('Flutter SDK removed');
    } catch (e) {
      spin.fail(`Failed to remove Flutter SDK: ${e.message}`);
    }
  }

  if (confirm.targets?.includes('android') && fs.existsSync(androidDir)) {
    const spin = new Spinner('Removing Android SDK...');
    spin.start();
    try {
      fs.rmSync(androidDir, { recursive: true, force: true });
      spin.succeed('Android SDK removed');
    } catch (e) {
      spin.fail(`Failed to remove Android SDK: ${e.message}`);
    }
  }

  // ─── 2. PATH Cleanup ──────────────────────────────────────────────────────
  if (confirm.targets?.includes('path')) {
    const spin = new Spinner('Cleaning up environment variables...');
    spin.start();
    try {
      if (isWindows) {
        // Windows PATH cleanup is hard via CLI without external tools, 
        // we'll advise the user for now to keep it safe.
        spin.warn('Please manually remove ANDROID_HOME and JAVA_HOME from Windows Environment Variables');
      } else {
        // Mac/Linux: Remove the block we added
        const shellFiles = ['.zshrc', '.bashrc', '.bash_profile'];
        const home = process.env.HOME;
        let cleaned = false;

        for (const file of shellFiles) {
          const filePath = path.join(home, file);
          if (fs.existsSync(filePath)) {
            let content = fs.readFileSync(filePath, 'utf8');
            const startMarker = '# >>> DevTool Flutter Setup >>>';
            const endMarker   = '# <<< DevTool Flutter Setup <<<';
            
            if (content.includes(startMarker)) {
              const regex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`, 'g');
              content = content.replace(regex, '');
              fs.writeFileSync(filePath, content.trim() + '\n');
              cleaned = true;
            }
          }
        }
        if (cleaned) spin.succeed('Shell config files cleaned');
        else spin.info('No setup markers found in shell config');
      }
    } catch (e) {
      spin.fail(`Cleanup failed: ${e.message}`);
    }
  }

  console.log(chalk.green.bold('\n  ✨ Uninstall complete!'));
  console.log(chalk.gray('  Restart your terminal to finish the cleanup.\n'));
}
