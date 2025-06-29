import {app, session} from 'electron';
import axios from 'axios';
import path from 'node:path';
import fs from 'fs';
import log from 'electron-log';
import {PORT} from '../utils';

export async function getAccessToken(): Promise<string | null> {
  const keyName = 'sAccessToken';
  const currentSession = session.defaultSession;

  try {
    // Get all cookies for the current session
    const cookies = await currentSession.cookies.get({});

    // Find the cookie with the specific key
    const accessTokenCookie = cookies.find(cookie => cookie.name === keyName);

    // Return the value of the cookie, or null if not found
    return accessTokenCookie ? accessTokenCookie.value : null;
  } catch (error) {
    log.error(`Error retrieving cookie '${keyName}':`, error);
    return null;
  }
}

export const integrationsInit = async () => {
  const accessToken = await getAccessToken();
  const {data} = await axios.get(`http://localhost:${PORT}/api/v1/integration_definition`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  downloadContentToSystem(data);
};

interface Item {
  id: string;
  name: string;
  url: string | null;
  version: string;
}

export async function downloadContentToSystem(items: Item[]) {
  try {
    // Define a persistent folder path
    const persistentFolder = path.join(app.getPath('userData'), 'integrations');

    for (const item of items) {
      if (!item.url) {
        log.warn(`No URL provided for item with ID ${item.id}`);
        continue;
      }

      log.log(`Processing item: ${item.name}`);

      // Define the item's folder based on its `name`
      const itemFolder = path.join(persistentFolder, item.name || item.id, item.version);

      if (fs.existsSync(itemFolder)) {
        return;
      }

      if (!fs.existsSync(itemFolder)) {
        fs.mkdirSync(itemFolder, {recursive: true});
      }

      // Define file URLs to download
      const filesToDownload = [
        {
          url: `${item.url}/${item.version}/frontend/index.js`,
          subFolder: 'frontend',
          fileName: 'index.js',
        },
        {url: `${item.url}/${item.version}/spec.json`, subFolder: null, fileName: 'spec.json'},
      ];

      for (const {url, subFolder, fileName} of filesToDownload) {
        const targetFolder = subFolder ? path.join(itemFolder, subFolder) : itemFolder;
        const filePath = path.join(targetFolder, fileName);

        // Ensure sub-folder exists if applicable
        if (subFolder) {
          fs.mkdirSync(targetFolder, {recursive: true});
        }

        // Download the file
        const response = await fetch(url);
        if (!response.ok) {
          log.error(`Failed to download from URL ${url}: ${response.statusText}`);
          continue;
        }

        const fileData = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(filePath, fileData);
      }
    }
  } catch (error) {
    log.error('Error while downloading content:', error);
  }
}
