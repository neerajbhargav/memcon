import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const PLIST_NAME = 'com.memcon.daemon.plist';

export function installDaemon(): { success: boolean; message: string } {
  const platform = os.platform();
  const homeDir = os.homedir();

  if (platform === 'darwin') {
    const launchAgentsDir = path.join(homeDir, 'Library', 'LaunchAgents');
    if (!fs.existsSync(launchAgentsDir)) {
      fs.mkdirSync(launchAgentsDir, { recursive: true });
    }

    const plistPath = path.join(launchAgentsDir, PLIST_NAME);
    const nodePath = process.execPath;
    const memconBin = path.join(homeDir, 'memcon', 'dist', 'cli', 'bin.js');

    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.memcon.daemon</string>
    <key>ProgramArguments</key>
    <array>
        <string>${nodePath}</string>
        <string>${memconBin}</string>
        <string>serve</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${path.join(homeDir, '.memcon', 'daemon.log')}</string>
    <key>StandardErrorPath</key>
    <string>${path.join(homeDir, '.memcon', 'daemon.err')}</string>
</dict>
</plist>`;

    fs.writeFileSync(plistPath, plistContent, 'utf-8');

    try {
      execSync(`launchctl unload "${plistPath}" 2>/dev/null || true`);
      execSync(`launchctl load "${plistPath}"`);
      return { success: true, message: `macOS LaunchAgent daemon installed & started: ${plistPath}` };
    } catch (e: any) {
      return { success: false, message: `Failed to load launchctl: ${e.message}` };
    }
  }

  if (platform === 'linux') {
    const systemdDir = path.join(homeDir, '.config', 'systemd', 'user');
    if (!fs.existsSync(systemdDir)) {
      fs.mkdirSync(systemdDir, { recursive: true });
    }

    const servicePath = path.join(systemdDir, 'memcon.service');
    const nodePath = process.execPath;
    const memconBin = path.join(homeDir, 'memcon', 'dist', 'cli', 'bin.js');

    const serviceContent = `[Unit]
Description=memcon Cross-Agent Memory Daemon
After=network.target

[Service]
ExecStart=${nodePath} ${memconBin} serve
Restart=always
RestartSec=5

[Install]
WantedBy=default.target`;

    fs.writeFileSync(servicePath, serviceContent, 'utf-8');

    try {
      execSync('systemctl --user daemon-reload');
      execSync('systemctl --user enable --now memcon.service');
      return { success: true, message: `Linux systemd user daemon installed & started: ${servicePath}` };
    } catch (e: any) {
      return { success: false, message: `Failed to enable systemctl: ${e.message}` };
    }
  }

  return { success: false, message: `Unsupported platform for daemon installation: ${platform}` };
}

export function uninstallDaemon(): { success: boolean; message: string } {
  const platform = os.platform();
  const homeDir = os.homedir();

  if (platform === 'darwin') {
    const plistPath = path.join(homeDir, 'Library', 'LaunchAgents', PLIST_NAME);
    if (fs.existsSync(plistPath)) {
      try {
        execSync(`launchctl unload "${plistPath}" 2>/dev/null || true`);
        fs.unlinkSync(plistPath);
        return { success: true, message: 'macOS LaunchAgent daemon uninstalled.' };
      } catch (e: any) {
        return { success: false, message: `Failed to unload: ${e.message}` };
      }
    }
  }

  if (platform === 'linux') {
    const servicePath = path.join(homeDir, '.config', 'systemd', 'user', 'memcon.service');
    if (fs.existsSync(servicePath)) {
      try {
        execSync('systemctl --user stop memcon.service 2>/dev/null || true');
        execSync('systemctl --user disable memcon.service 2>/dev/null || true');
        fs.unlinkSync(servicePath);
        return { success: true, message: 'Linux systemd daemon uninstalled.' };
      } catch (e: any) {
        return { success: false, message: `Failed to stop: ${e.message}` };
      }
    }
  }

  return { success: true, message: 'No active daemon plist/service found.' };
}

export function getDaemonStatus(): { installed: boolean; running: boolean; message: string } {
  const platform = os.platform();
  const homeDir = os.homedir();

  if (platform === 'darwin') {
    const plistPath = path.join(homeDir, 'Library', 'LaunchAgents', PLIST_NAME);
    const installed = fs.existsSync(plistPath);
    let running = false;
    if (installed) {
      try {
        const out = execSync('launchctl list | grep com.memcon.daemon || true', { encoding: 'utf-8' });
        running = out.trim().length > 0;
      } catch {
        running = false;
      }
    }
    return { installed, running, message: installed ? (running ? 'Running (LaunchAgent)' : 'Installed (Stopped)') : 'Not installed' };
  }

  return { installed: false, running: false, message: 'Not installed' };
}
