import type {BrowserWindow, IpcMainEvent} from 'electron';
import {app, ipcMain, shell, screen} from 'electron';
import path from 'node:path';
import log from 'electron-log';
import {getAccessToken, integrationsInit} from '../src/integrations-init';
import screenshot from 'screenshot-desktop';

import {randomUUID} from 'crypto';
import axios from 'axios';
import {PORT} from '../utils';
import * as fs from 'fs/promises';

export function listeners(window: BrowserWindow) {
  // Listen for URL open requests
  ipcMain.on('open-url', (_event, url) => {
    log.info(url);
    shell.openExternal(url);
  });

  ipcMain.on('integrations-init', async () => {
    await integrationsInit();
  });

  ipcMain.handle('get-integrations-folder', () => {
    return path.join(app.getPath('userData'), 'integrations');
  });

  ipcMain?.handle('get-screenshot', async (_event: IpcMainEvent) => {
    try {
      const cursorPoint = screen.getCursorScreenPoint();
      const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);

      const accessToken = await getAccessToken();

      // Take screenshot for the matched display and save to a temp file with a random id
      const randomId = randomUUID();
      const tempFilePath = path.join(app.getPath('userData'), `screenshot-${randomId}.png`);

      // Take screenshot and save to file
      await screenshot({
        screen: currentDisplay.id - 1,
        filename: tempFilePath,
      });

      // Read the file buffer from disk to ensure correct data is uploaded
      const imgBuffer = await fs.readFile(tempFilePath);

      // Simulate a browser File object for upload
      const file = {
        name: 'screenshot.png',
        type: 'image/png',
        size: imgBuffer.length,
      };

      // Inline the onUploadFile logic here (from apps/webapp/common/editor/utils.ts)
      // (Assume axios is available in this context, or require/import it at the top)

      const {
        data: {url, attachment},
      } = await axios.post(
        `http://localhost:${PORT}/api/v1/attachment/get-signed-url`,
        {
          fileName: file.name,
          contentType: file.type,
          mimetype: file.type,
          size: file.size,
          originalName: file.name,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      await axios.put(url, imgBuffer, {
        headers: {'Content-Type': file.type},
        // No progress callback in Electron main process
      });

      // The attachment should contain the uploaded file info, including the public URL
      const publicURL = attachment?.publicURL || attachment?.url || null;

      // Optionally, clean up the temp file
      try {
        await fs.unlink(tempFilePath);
      } catch (e) {
        log.warn('Failed to remove temp screenshot file:', e);
      }

      return publicURL;
    } catch (error) {
      log.error('Failed to take/upload screenshot:', error);
      return null;
    }
  });

  // Main window communication
  // Handle window-to-window communication
  ipcMain.on('from-quick-window', (_event, message) => {
    // Log the received message
    log.info('Window communication received:', message);

    // Forward the message to the main window if it exists
    if (window && !window.isDestroyed()) {
      if (!window.isFocused()) {
        window.focus();
        window.show();
      }

      window.webContents.send('from-windows', message);
    }
  });
}
