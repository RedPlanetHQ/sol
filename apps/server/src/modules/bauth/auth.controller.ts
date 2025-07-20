import { Controller, All, Req, Inject, Res } from '@nestjs/common';
import { Request } from 'express';

import { AUTH_INSTANCE_KEY } from './symbols';
import { getRequest, setResponse } from './utils';

@Controller({
  path: 'auth',
})
export class AuthController {
  constructor(
    @Inject(AUTH_INSTANCE_KEY)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly auth: any,
  ) {}

  @All('*')
  async handleAllAuthPaths(@Req() req: Request, @Res() res: Response) {
    // Get basePath from options or use default
    let basePath = this.auth.options.basePath ?? '/api/auth';

    // Ensure basePath starts with /
    if (!basePath.startsWith('/')) {
      basePath = `/${basePath}`;
    }

    // Ensure basePath doesn't end with /
    if (basePath.endsWith('/')) {
      basePath = basePath.slice(0, -1);
    }

    const protocol =
      req.headers['x-forwarded-proto'] ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((req.socket as any).encrypted ? 'https' : 'http');
    const base = `${protocol}://${req.headers[':authority'] || req.headers.host}`;
    const response = await this.auth.handler(
      getRequest({ base, request: req }),
    );
    setResponse(res, response);
  }
}
