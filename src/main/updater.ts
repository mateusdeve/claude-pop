import { autoUpdater } from 'electron-updater';
import { app } from 'electron';

export function initAutoUpdater() {
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    console.log(`[updater] Update available: v${info.version}`);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log(`[updater] Update downloaded: v${info.version} — will install on quit`);
  });

  autoUpdater.on('error', (err) => {
    console.error('[updater] Error:', err.message);
  });

  // Check now, then every 30 minutes
  autoUpdater.checkForUpdates().catch(() => {});
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 30 * 60 * 1000);
}
