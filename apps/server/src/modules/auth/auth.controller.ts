import { All, Controller, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';

import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Handle all Better Auth routes
   * This includes OAuth flows, session management, etc.
   */
  @All('*')
  async handleAuth(@Req() req: Request, @Res() res: Response) {
    const auth = this.authService.getAuth();

    // Convert Express Request to Web API Request format
    const webRequest = new Request(req.url, {
      method: req.method,
      headers: req.headers as HeadersInit,
      body:
        req.method !== 'GET' && req.method !== 'HEAD'
          ? JSON.stringify(req.body)
          : undefined,
    });

    try {
      const response = await auth.handler(webRequest);

      // Copy response headers
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      // Set status code
      res.status(response.status);

      // Send response body
      const body = await response.text();
      if (body) {
        res.send(body);
      } else {
        res.end();
      }
    } catch (error) {
      console.error('Auth handler error:', error);
      res.status(500).json({ error: 'Authentication error' });
    }
  }
}
