/**
 * @module preload
 */

import {sha256sum} from './nodeCrypto.js';
import {versions} from './versions.js';

// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import type {IpcRendererEvent} from 'electron';
import {contextBridge, ipcRenderer} from 'electron';

export type Channels = 'ipc';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },

    convertPathToUrl: (filePath: string) => ipcRenderer.invoke('convert-path-to-url', filePath),
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) => func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    openUrl: (url: string) => {
      ipcRenderer.send('open-url', url);
    },
    initIntegrations: () => ipcRenderer.send('integrations-init'),
    getIntegrationsFolder: () => ipcRenderer.invoke('get-integrations-folder'),
    getSources: () => ipcRenderer.invoke('get-sources'),
    getScreenshot: () => ipcRenderer.invoke('get-screenshot'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getAutoUpdates: (callback: (event: IpcRendererEvent, ...args: any[]) => void) => {
      ipcRenderer.on('auto-update', callback);
    },
    restartAndInstall: () => {
      ipcRenderer.invoke('update-and-restart');
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fromOtherWindows: (callback: (event: IpcRendererEvent, ...args: any[]) => void) => {
      ipcRenderer.on('from-windows', callback);
    },

    // used to talk between windows
    sendToMain: ({type, id}: {type: string; id: string}) => {
      // Send the message to main process using a specific channel
      ipcRenderer.send('from-quick-window', {type, id});
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;

export {sha256sum, versions};
