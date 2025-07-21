import { createAuthEndpoint } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { BetterAuthPlugin } from 'better-auth/plugins';

import { auth } from './auth.config';

export const pluginAuth = () => {
  return {
    id: 'my-plugin',
    endpoints: {
      getTokenRefresh: createAuthEndpoint(
        '/electron/refresh',
        {
          method: 'GET',
        },
        async (ctx) => {
          console.log('ctx.context.returned', ctx);
          console.log('ctx.context.options', ctx.context.options.session);

          const authHeader = ctx.headers.get('authorization');
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return;
          }

          const token = authHeader.replace('Bearer ', '');

          const result = await auth.api.verifyApiKey({
            body: { key: token },
          });

          console.log('result', result);
          if (!result.valid || !result.key) {
            return;
          }

          const session = ctx.context.session;

          //   const session = await auth.api.getSession({
          //     query: {
          //       disableCookieCache: true,
          //     },
          //     headers: ctx.headers, // pass the headers
          //   });

          console.log('session', session);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await setSessionCookie(ctx, {
            session: session.session,
            user: session.user,
          });
        },
      ),
    },
  } satisfies BetterAuthPlugin;
};
