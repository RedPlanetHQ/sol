import './global.css';
import '@redplanethq/ui/index.css';
import '@redplanethq/ui/global.css';
import '../styles/changelog.css';

import type { AppLayoutProps } from 'next/app';

import { cn, TooltipProvider } from '@redplanethq/ui';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import React from 'react';

import { ThemeProvider } from 'common/theme-provider';

export const MyApp = ({ Component, pageProps }: AppLayoutProps) => {
  const getLayout = Component.getLayout || ((page: React.ReactNode) => page);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider delayDuration={1000}>
        <div
          className={cn(
            'relative flex min-h-screen flex-col',
            GeistSans.variable,
            GeistMono.variable,
          )}
        >
          <main className="flex-1">
            {getLayout(<Component {...pageProps} />)}
          </main>
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
};

export default MyApp;
