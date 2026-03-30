import { Tray, Menu, nativeImage, app } from 'electron';
import { join } from 'path';

let tray: Tray | null = null;

export function createTray(onQuit: () => void) {
  // Create a simple 16x16 tray icon using a data URL (circle)
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA' +
    'mElEQVQ4T2NkoBAwUqifYdAY8B8E/v8HsxkZGRnBbJIMABkA0wBiE2UAyACQJhAbpxeI' +
    'NQBkAEgT2AuEDCDWAJABIE0wL+A0gBgDQAaANMEMwDSAkAEgTTADMA0gZADIAJAmZBfg' +
    'MoCQASBNyAbgNICQASBNIAPQXUDIAJAmkAEwF+AygJABIE1gA3AZQKwBAABnWikRdwczcA' +
    'AAAASUVORK5CYII='
  );

  icon.setTemplateImage(true);
  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Claude Overlay', enabled: false },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        onQuit();
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Claude Overlay');
  tray.setContextMenu(contextMenu);

  return tray;
}
