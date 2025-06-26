import {app} from 'electron';
import './security-restrictions';

import {registerShortcut, restoreOrCreateQuickWindow, restoreOrCreateWindow} from '../windows';
import {platform} from 'node:process';
import updater from 'electron-updater';
import {startAPI} from './api';
import {listeners} from '../windows/listeners';
import {registerStore} from './store';
import log from 'electron-log';

/**
 * Prevent electron from running multiple instances.
 */
const isSingleInstance = app.requestSingleInstanceLock();
if (!isSingleInstance) {
  app.quit();
  process.exit(0);
}
app.on('second-instance', restoreOrCreateWindow);

/**
 * Disable Hardware Acceleration to save more system resources.
 */
app.disableHardwareAcceleration();

/**
 * Shout down background process if all windows was closed
 */
app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit();
  }
});

/**
 * @see https://www.electronjs.org/docs/latest/api/app#event-activate-macos Event: 'activate'.
 */
app.on('activate', restoreOrCreateWindow);

/**
 * Create the application window when the background process is ready.
 */
app
  .whenReady()
  .then(async () => {
    registerStore();
    const window = await restoreOrCreateWindow();
    listeners(window);
    restoreOrCreateQuickWindow(true);
    registerShortcut();

    // setTray();
  })
  .catch(e => log.error('Failed create window:', e));

/**
 * Check for app updates, install it in background and notify user that new version was installed.
 * No reason run this in non-production build.
 * @see https://www.electron.build/auto-update.html#quick-setup-guide
 *
 * Note: It may throw "ENOENT: no such file app-update.yml"
 * if you compile production app without publishing it to distribution server.
 * Like `npm run compile` does. It's ok 😅
 */
if (import.meta.env.PROD) {
  app
    .whenReady()
    .then(() => updater.autoUpdater.checkForUpdatesAndNotify())
    .catch(e => log.error('Failed check and install updates:', e));
}

startAPI(app);
