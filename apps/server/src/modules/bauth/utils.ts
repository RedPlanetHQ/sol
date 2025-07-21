/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// src/adapters/node/request.ts

import { Readable } from 'stream';

import * as setCookieParser from 'set-cookie-parser';

// eslint-disable-next-line @typescript-eslint/no-explicit-any

function getRequest({ request, base }: any) {
  let bodyStream: any = undefined;

  if (request.body) {
    let bodyString: string;
    if (typeof request.body === 'object') {
      bodyString = JSON.stringify(request.body);
    } else {
      bodyString = String(request.body);
    }
    // Convert the string body into a readable stream
    bodyStream = Readable.from([bodyString]);
  }

  return new Request(base + request.url, {
    // @ts-expect-error
    duplex: 'half',
    method: request.method,
    body: bodyStream,
    headers: request.headers,
  });
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function setResponse(res: any, response: any) {
  if (!(response instanceof Response)) {
    return res.json(response);
  }

  // Set headers, handling set-cookie as an array if needed
  for (const [key, value] of response.headers) {
    try {
      if (key.toLowerCase() === 'set-cookie') {
        // Some fetch impls join cookies as a single string, Express expects array
        const cookies = setCookieParser.splitCookiesString(
          response.headers.get(key),
        );
        res.setHeader(key, cookies);
      } else {
        res.setHeader(key, value);
      }
    } catch (error) {
      res.getHeaderNames().forEach((name: string) => res.removeHeader(name));
      res.writeHead(500).end(String(error));
      return;
    }
  }

  res.writeHead(response.status);

  // Handle JSON body
  if (!response.body) {
    res.end();
    return;
  }
  if (response.body.locked) {
    res.end(
      "Fatal error: Response body is locked. This can happen when the response was already read (for example through 'response.json()' or 'response.text()').",
    );
    return;
  }

  // If content-type is application/json, buffer and send as JSON
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    // Read the full body and send as JSON
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        if (value) {
          chunks.push(value);
          total += value.length;
        }
      }
      const buffer = Buffer.concat(chunks, total);
      res.end(buffer);
    } catch (error) {
      res.writeHead(500).end(String(error));
    }
    return;
  }

  // Otherwise, stream the body as-is (for non-JSON)
  const reader = response.body.getReader();
  if (res.destroyed) {
    reader.cancel();
    return;
  }

  let finished = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cancel = (error: any) => {
    if (finished) {
      return;
    }
    finished = true;
    res.off('close', cancel);
    res.off('error', cancel);
    reader.cancel(error).catch(() => {});
    if (error) {
      res.destroy(error);
    }
  };

  res.on('close', cancel);
  res.on('error', cancel);

  (async function next() {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        if (!res.write(value)) {
          res.once('drain', next);
          return;
        }
      }
      if (!finished) {
        finished = true;
        res.end();
      }
    } catch (error) {
      cancel(error instanceof Error ? error : new Error(String(error)));
    }
  })();
}

export { getRequest, setResponse };
// # sourceMappingURL=node.js.map
