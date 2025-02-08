import 'styles/globals.css';

import '@tegonhq/ui/index.css';
import '@tegonhq/ui/global.css';

import type { AppLayoutProps } from 'next/app';

import { cn } from '@tegonhq/ui';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import React from 'react';
import { Hydrate } from 'react-query';

import { Provider } from 'modules/provider';
import { AddTaskDialog } from 'modules/tasks/add-task';

import { initSuperTokens } from 'common/init-config';

TimeAgo.addDefaultLocale(en);

initSuperTokens();

export const MyApp = ({
  Component,
  pageProps: { dehydratedState, ...pageProps },
}: AppLayoutProps) => {
  const getLayout = Component.getLayout || ((page: React.ReactNode) => page);

  return (
    <Provider>
      <Hydrate state={dehydratedState}>
        <div
          className={cn(
            'h-[100vh] w-[100vw] font-sans antialiased flex flex-col items-center justify-center',
            GeistSans.variable,
            GeistMono.variable,
          )}
        >
          {getLayout(<Component {...pageProps} />)}

          <AddTaskDialog />
        </div>
      </Hydrate>
    </Provider>
  );
};

export default MyApp;
