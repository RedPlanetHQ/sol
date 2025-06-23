/**
 * Checks whether the function is being invoked in Server or Client.
 * @returns True if this function is beinvoked in Next Server, False if it is in browser.
 */
export function isServer() {
  return typeof window === 'undefined';
}

/**
 * Checks whether the application is running in an Electron environment.
 * @returns True if running in Electron, False otherwise.
 */
export function isElectron() {
  if (typeof window === 'undefined') {
    return false;
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(window as any)?.electron;
}
