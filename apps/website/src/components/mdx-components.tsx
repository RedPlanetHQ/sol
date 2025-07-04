import Image from 'next/image';
import React from 'react';

import { cn } from '@redplanethq/ui';

type ImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

const MdxImage = ({ src, alt, width, height }: ImageProps) => {
  return (
    <div className="my-4 overflow-hidden rounded-md">
      <Image
        src={src}
        alt={alt}
        width={width || 800}
        height={height || 450}
        className="w-full object-cover"
        unoptimized
      />
    </div>
  );
};

const Heading1 = ({ children }: { children: React.ReactNode }) => (
  <h1 className="mt-8 mb-4 text-3xl font-bold tracking-tight">{children}</h1>
);

const Heading2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mt-8 mb-4 text-2xl font-semibold tracking-tight">{children}</h2>
);

const Heading3 = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mt-6 mb-3 text-xl font-semibold tracking-tight">{children}</h3>
);

const Paragraph = ({ children }: { children: React.ReactNode }) => (
  <p className="leading-7 [&:not(:first-child)]:mt-4">{children}</p>
);

const List = ({ children, className, ...props }: React.ComponentProps<'ul'>) => (
  <ul className={cn('my-4 ml-6 list-disc', className)} {...props}>
    {children}
  </ul>
);

const ListItem = ({ children, className, ...props }: React.ComponentProps<'li'>) => (
  <li className={cn('mt-2', className)} {...props}>
    {children}
  </li>
);

const Blockquote = ({ children, className, ...props }: React.ComponentProps<'blockquote'>) => (
  <blockquote
    className={cn(
      'mt-6 border-l-2 border-muted pl-6 italic text-muted-foreground',
      className
    )}
    {...props}
  >
    {children}
  </blockquote>
);

const Link = ({ className, ...props }: React.ComponentProps<'a'>) => (
  <a
    className={cn('font-medium underline underline-offset-4 text-primary', className)}
    {...props}
  />
);

const Code = ({ className, ...props }: React.ComponentProps<'code'>) => (
  <code
    className={cn(
      'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm',
      className
    )}
    {...props}
  />
);

export const components = {
  h1: Heading1,
  h2: Heading2,
  h3: Heading3,
  p: Paragraph,
  ul: List,
  li: ListItem,
  blockquote: Blockquote,
  a: Link,
  code: Code,
  img: MdxImage,
};