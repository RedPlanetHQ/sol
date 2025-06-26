import {app, BrowserWindow, ipcMain, screen} from 'electron';
import path, {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PORT} from '../utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Always center the window on the current display when shown
export function centerOnCurrentDisplay(quickWindow: BrowserWindow) {
  const windowWidth = 400;
  const windowHeight = 200;

  const cursorPoint = screen.getCursorScreenPoint();
  const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);

  const {bounds} = currentDisplay;
  const x = Math.round(bounds.x + (bounds.width - windowWidth) / 2);
  const y = Math.round(bounds.y + (bounds.height - windowHeight) / 2);
  quickWindow.setBounds({x, y, width: windowWidth, height: windowHeight});
}

export async function createQuickWindow(show = false) {
  // Desired input box size
  const windowWidth = 400;
  const windowHeight = 200;

  // Get the current display nearest to the cursor
  const cursorPoint = screen.getCursorScreenPoint();
  const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);
  const {bounds} = currentDisplay;

  // Center the window on the current display
  const x = Math.round(bounds.x + (bounds.width - windowWidth) / 2);
  const y = Math.round(bounds.y + (bounds.height - windowHeight) / 2);

  const quickWindow = new BrowserWindow({
    show: false,
    width: windowWidth,
    height: windowHeight,
    icon: path.join(__dirname, '/../../../buildResources/icon.png'),
    resizable: false,
    x,
    y,
    movable: false, // Not movable, always centered
    minimizable: false,
    modal: true,
    visualEffectState: 'active',
    maximizable: false,
    autoHideMenuBar: true,
    frame: false,
    skipTaskbar: true,
    hasShadow: false,
    type: process.platform === 'darwin' ? 'toolbar' : 'toolbar',
    alwaysOnTop: true,
    center: false,
    webPreferences: {
      nodeIntegration: true,
      backgroundThrottling: false,
      preload: join(app.getAppPath(), 'packages/preload/dist/index.mjs'),
    },
    vibrancy: 'fullscreen-ui',
    transparent: true,
  });

  quickWindow.setAlwaysOnTop(true, 'floating');
  quickWindow.setVibrancy('fullscreen-ui');
  quickWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
  });
  quickWindow.setFullScreenable(false);

  if (app.dock) app.dock.show();

  quickWindow.on('ready-to-show', () => {
    if (show) {
      quickWindow.show();
      if (import.meta.env.DEV) {
        // quickWindow?.webContents.openDevTools();
      }
    }
  });

  // Hide the window when it loses focus (blur)
  quickWindow.on('blur', () => {
    quickWindow.hide();
  });

  // Hide the window if it is moved out of the current screen
  quickWindow.on('move', () => {
    // Get the current window bounds and the display it's supposed to be on
    const winBounds = quickWindow.getBounds();
    const display = screen.getDisplayMatching(winBounds);
    const cursorDisplay = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    // If the window is not on the same display as the cursor, hide it
    if (display.id !== cursorDisplay.id) {
      quickWindow.hide();
    }
  });

  /**
   * Load the main page of the quick window.
   */
  quickWindow.loadURL(`http://localhost:${PORT}/dashboard`);

  return {window: quickWindow, state: null};
}

export function registerQuickStates(window: BrowserWindow) {
  // Listen for events from the renderer process
  ipcMain.on('quick-window-close', () => {
    window.hide();
  });
}
