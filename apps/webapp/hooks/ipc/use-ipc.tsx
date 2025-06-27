/* eslint-disable @typescript-eslint/no-explicit-any */
export interface IPCRenderer {
  sendMessage(channel: string, ...args: any[]): void;
  on(channel: string[], listener: (event: any, ...args: any[]) => void): void;
  once(channel: string, listener: (event: any, ...args: any[]) => void): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAutoUpdates(callback: (event: any, ...args: any[]) => void): void;
  openUrl: (url: string) => void;
  getIntegrationsFolder: () => Promise<string>;
  getScreenshot: () => Promise<string>;
  initIntegrations: () => void;
  restartAndInstall: () => void;

  // For other window communication
  sendToMain: ({ type, id }: { type: string; id: string }) => void;
  fromOtherWindows(callback: (event: any, ...args: any[]) => void): void;
}

export const useIPC = (): IPCRenderer => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any)?.electron?.ipcRenderer;
};
