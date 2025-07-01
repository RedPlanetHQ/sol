import {globalShortcut, Menu, nativeImage, Tray, type BrowserWindow, screen, app} from 'electron';
import {createMainWindow} from './main';
import {createQuickWindow, registerQuickStates} from './quick';
// import screenshot from 'screenshot-desktop';

import path, {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {registerDeepLink} from '../src/deeplink';
import log from 'electron-log';
import {setupAutoUpdater} from '../src/auto-update';
import type windowStateKeeper from 'electron-window-state';

import {randomUUID} from 'node:crypto';
import {setScreenshotPath} from './listeners';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface Windows {
  main: BrowserWindow | null;
  quick: BrowserWindow | null;
  quickState: windowStateKeeper.State | null;
  tray: Tray | null;
}

export const appWindows: Windows = {
  main: null,
  quick: null,
  quickState: null,
  tray: null,
};

/**
 * Restore an existing BrowserWindow or Create a new BrowserWindow.
 */
export async function restoreOrCreateWindow() {
  if (!appWindows.main || appWindows.main.isDestroyed()) {
    appWindows.main = await createMainWindow();
    registerDeepLink(appWindows.main);
    setupAutoUpdater();
  }

  if (appWindows.main.isMinimized()) {
    appWindows.main.restore();
  }

  if (!appWindows.main.isVisible()) {
    appWindows.main.show();
  }

  appWindows.main.focus();

  //Getting user devices:
  return appWindows.main;
}

export function registerShortcut() {
  // Register a global shortcut
  const isRegistered = globalShortcut.register('CommandOrControl+;', () => {
    restoreOrCreateQuickWindow(true);
  });

  if (isRegistered) {
    log.info('Global shortcut registered successfully!');
  } else {
    log.info('Failed to register the global shortcut.');
  }
}

export function listenerForMainFullscreen() {
  if (!appWindows.main) return;

  // Remove any previous listeners to avoid duplicate handlers
  appWindows.main.removeAllListeners('leave-full-screen');

  const recreateQuickWindow = async () => {
    // Destroy the previous quick window if it exists
    if (appWindows.quick && !appWindows.quick.isDestroyed()) {
      appWindows.quick.destroy();
      appWindows.quick = null;
    }
    // Create a new quick window (hidden)
    const {window} = await createQuickWindow(true);
    appWindows.quick = window;
    registerQuickStates(appWindows.quick);
  };

  // appWindows.main.on('enter-full-screen', recreateQuickWindow);
  appWindows.main.on('leave-full-screen', recreateQuickWindow);
}

/**
 * Restore an existing BrowserWindow or Create a new BrowserWindow.
 */
export async function restoreOrCreateQuickWindow(show = false) {
  // Move the window to the current display and ensure it is visible on all workspaces
  const cursorPoint = screen.getCursorScreenPoint();
  const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);

  // Take screenshot for the matched display and save to a temp file with a random id
  const randomId = randomUUID();
  const tempFilePath = path.join(app.getPath('userData'), `screenshot-${randomId}.png`);

  // Take screenshot and save to file
  // await screenshot({
  //   screen: currentDisplay.id - 1,
  //   filename: tempFilePath,
  // });

  setScreenshotPath(tempFilePath);

  if (!appWindows.quick || appWindows.quick.isDestroyed()) {
    // Always create the quick window centered on the current display
    const {window} = await createQuickWindow(show);
    appWindows.quick = window;
    registerQuickStates(appWindows.quick);

    if (!show) {
      return;
    }
  }

  if (!appWindows.quick.isVisible()) {
    const {workArea} = currentDisplay;

    // Center the window in the current workArea
    const windowWidth = 600;
    const windowHeight = 500;
    const x = Math.round(workArea.x + (workArea.width - windowWidth) / 2);
    const y = Math.round(workArea.y + (workArea.height - windowHeight) / 2);

    appWindows.quick.setBounds({x, y, width: windowWidth, height: windowHeight});

    appWindows.quick.setAlwaysOnTop(true, 'modal-panel');

    if (app.dock) app.dock.show();
    appWindows.quick.show();
  }
}

export async function setTray() {
  if (appWindows.tray) {
    return appWindows.tray;
  }

  const icon = nativeImage.createFromPath(
    path.join(__dirname, '/../../../buildResources/iconTemplate.png'),
  );
  appWindows.tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([{role: 'quit'}]);

  appWindows.tray.setContextMenu(contextMenu);

  return appWindows.tray;
}
