import { Tray, Menu, nativeImage, app } from 'electron';
import { getConfig, setPosition, type OverlayPosition } from './store';

let tray: Tray | null = null;

const POSITIONS: { label: string; value: OverlayPosition }[] = [
  { label: 'Top Left', value: 'top-left' },
  { label: 'Top Center', value: 'top-center' },
  { label: 'Top Right', value: 'top-right' },
  { label: 'Bottom Left', value: 'bottom-left' },
  { label: 'Bottom Center', value: 'bottom-center' },
  { label: 'Bottom Right', value: 'bottom-right' },
];

export function createTray(onQuit: () => void, onPositionChange: () => void) {
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA' +
    'mElEQVQ4T2NkoBAwUqifYdAY8B8E/v8HsxkZGRnBbJIMABkA0wBiE2UAyACQJhAbpxeI' +
    'NQBkAEgT2AuEDCDWAJABIE0wL+A0gBgDQAaANMEMwDSAkAEgTTADMA0gZADIAJAmZBfg' +
    'MoCQASBNyAbgNICQASBNIAPQXUDIAJAmkAEwF+AygJABIE1gA3AZQKwBAABnWikRdwczcA' +
    'AAAASUVORK5CYII='
  );

  icon.setTemplateImage(true);
  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  function buildMenu() {
    const current = getConfig().position;
    return Menu.buildFromTemplate([
      { label: 'Claude Pop', enabled: false },
      { type: 'separator' },
      {
        label: 'Position',
        submenu: POSITIONS.map(p => ({
          label: p.label,
          type: 'radio' as const,
          checked: current === p.value,
          click: () => {
            setPosition(p.value);
            onPositionChange();
            tray?.setContextMenu(buildMenu());
          },
        })),
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          onQuit();
          app.quit();
        },
      },
    ]);
  }

  tray.setToolTip('Claude Pop');
  tray.setContextMenu(buildMenu());

  return tray;
}
