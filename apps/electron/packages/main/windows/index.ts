import {globalShortcut, Menu, nativeImage, Tray, type BrowserWindow, screen} from 'electron';
import {createMainWindow} from './main';
import {createQuickWindow, registerQuickStates} from './quick';

import path, {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {registerDeepLink} from '../src/deeplink';
import log from 'electron-log';
import {setupAutoUpdater} from '../src/auto-update';
import type windowStateKeeper from 'electron-window-state';

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

/**
 * Restore an existing BrowserWindow or Create a new BrowserWindow.
 */
export async function restoreOrCreateQuickWindow(show = false) {
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
    // Move the window to the current display and ensure it is visible on all workspaces
    const cursorPoint = screen.getCursorScreenPoint();
    const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);
    const {workArea} = currentDisplay;

    console.log(cursorPoint, currentDisplay);
    // Center the window in the current workArea
    const windowWidth = 400;
    const windowHeight = 200;
    const x = Math.round(workArea.x + (workArea.width - windowWidth) / 2);
    const y = Math.round(workArea.y + (workArea.height - windowHeight) / 2);

    console.log(x, y, windowHeight, windowWidth);
    appWindows.quick.setBounds({x, y, width: windowWidth, height: windowHeight});

    appWindows.quick.setAlwaysOnTop(true, 'floating');
    appWindows.quick.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
    });
    appWindows.quick.setFullScreenable(false);

    console.log('coming here');
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
