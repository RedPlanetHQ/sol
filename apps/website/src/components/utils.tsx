import { Button, Checkbox, cn } from '@redplanethq/ui';
import { RiAppleFill, RiGithubFill } from '@remixicon/react';
import Heading from '@tiptap/extension-heading';
import { mergeAttributes } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React from 'react';

import { Gmail } from '../icons/gmail';

export function Container({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'max-w-5xl mx-auto w-full flex flex-col pt-7 lg:pt-9',
        className,
      )}
      id={id}
    >
      {children}
    </div>
  );
}

export function Section({
  name,
  id,
  color,
  children,
  className,
}: {
  name: string;
  id?: string;
  color: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Container id={id} className={className}>
      <div className="flex flex-col">
        <h2 className="text-lg font-medium text-left" style={{ color }}>
          {name}
        </h2>

        {children}
      </div>
    </Container>
  );
}

export const TaskItem = ({
  number,
  title,
  github,
  google,
}: {
  number: string;
  title: string;
  github?: boolean;
  google?: boolean;
}) => {
  return (
    <button
      className={cn(
        'inline-flex max-w-[200px] h-5 items-center text-left mr-1 bg-grayAlpha-100 hover:bg-grayAlpha-200 p-1 text-sm rounded-sm relative top-[2px]',
      )}
    >
      <Checkbox className="shrink-0 h-[14px] w-[14px] ml-1 mr-1 rounded-[6px]" />
      <span className="text-muted-foreground font-mono shrink-0 mr-1">
        T-{number}
      </span>

      <div className="inline-flex items-center justify-start shrink min-w-[0px] min-h-[24px]">
        <div className={cn('text-left truncate text-sm')}>{title}</div>
        {github && <RiGithubFill size={14} className="ml-1 shrink-0" />}
        {google && <Gmail size={14} className="ml-1 shrink-0" />}
      </div>
    </button>
  );
};

export const TaskItemBig = ({
  number,
  title,
  github,
  google,
  checked,
}: {
  number: string;
  title: string;
  github?: boolean;
  google?: boolean;
  checked?: boolean;
}) => {
  return (
    <button
      className={cn(
        'inline-flex max-w-[300px] h-7 items-center text-left mr-1 hover:bg-grayAlpha-100 p-1 text-sm rounded-sm relative top-[2px]',
      )}
    >
      <Checkbox
        className="shrink-0 h-[18px] w-[18px] ml-1 mr-2 rounded-[6px]"
        checked={checked}
      />
      <span className="text-muted-foreground font-mono shrink-0 mr-1">
        T-{number}
      </span>

      <div className="inline-flex items-center justify-start shrink min-w-[0px] min-h-[24px]">
        <div
          className={cn(
            'text-left truncate text-sm',
            checked &&
              'line-through opacity-60 decoration-[1px] decoration-muted-foreground',
          )}
        >
          {title}
        </div>
        {github && <RiGithubFill size={14} className="ml-1 shrink-0" />}
        {google && <Gmail size={14} className="ml-1 shrink-0" />}
      </div>
    </button>
  );
};

const heading = Heading.extend({
  renderHTML({ node, HTMLAttributes }) {
    const hasLevel = this.options.levels.includes(node.attrs.level);
    const level: 1 | 2 | 3 = hasLevel
      ? node.attrs.level
      : this.options.levels[0];
    const levelMap = { 1: 'text-2xl', 2: 'text-xl', 3: 'text-lg' };

    return [
      `h${level}`,
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: `heading-node h${node.attrs.level}-style ${levelMap[level]} mt-[1rem] font-medium`,
      }),
      0,
    ];
  },
}).configure({ levels: [1, 2, 3] });

const starterKit = StarterKit.configure({
  bulletList: {
    HTMLAttributes: {
      class: cn('list-disc list-outside pl-4 leading-1 my-1 mb-1.5'),
    },
  },
  orderedList: {
    HTMLAttributes: {
      class: cn('list-decimal list-outside pl-4 leading-1 my-1'),
    },
  },
  listItem: {
    HTMLAttributes: {
      class: cn('mt-1.5'),
    },
  },
  blockquote: {
    HTMLAttributes: {
      class: cn('border-l-4 border-gray-400 dark:border-gray-500'),
    },
  },
  paragraph: {
    HTMLAttributes: {
      class: cn('leading-[24px] paragraph-node'),
    },
  },
  codeBlock: false,
  code: {
    HTMLAttributes: {
      class: cn(
        'rounded-md bg-grayAlpha-100 text-[#BF4594] px-1.5 py-1 font-mono font-medium border-none',
      ),
      spellcheck: 'false',
    },
  },
  horizontalRule: false,
  dropcursor: {
    color: '#DBEAFE',
    width: 4,
  },
  heading: false,
  gapcursor: false,
});

export const contextExtensions = [starterKit, heading];

export const CONTENT = `<h2 class="heading-node h2-style text-xl mt-[1rem] font-medium">Work and projects</h2><ul class="list-disc list-outside pl-4 leading-1 my-1 mb-1.5"><li class="mt-1.5"><p class="leading-[24px] mt-[1rem] paragraph-node">Building sigma, a todo app with personal assistant</p></li><li class="mt-1.5"><p class="leading-[24px] mt-[1rem] paragraph-node">Into coding in typescript</p><p class="leading-[24px] mt-[1rem] paragraph-node"></p></li></ul><h1 class="heading-node h1-style text-2xl mt-[1rem] font-medium">Automation</h1><p class="leading-[24px] mt-[1rem] paragraph-node">When an email with Meeting summary is received create actionable items for me out of that summary</p><p class="leading-[24px] mt-[1rem] paragraph-node">When I get an email from my CA (Akash) create actionable items and add them to \`Tax Documentation\`</p>`;

export const DownloadButton = () => {
  const [latestVersion, setLatestVersion] = React.useState('0.1.24'); // Default fallback version

  React.useEffect(() => {
    // Fetch the latest release version from GitHub API
    fetch('https://api.github.com/repos/RedPlanetHQ/sol/releases/latest')
      .then((response) => response.json())
      .then((data) => {
        if (data.tag_name) {
          // Remove 'v' prefix if present
          const version = data.tag_name.replace(/^v/, '');
          setLatestVersion(version);
        }
      })
      .catch((error) => {
        console.error('Failed to fetch latest version:', error);
        // Keep using the default version on error
      });
  }, []);

  const handleDownload = () => {
    const downloadUrl = `https://github.com/RedPlanetHQ/sol/releases/download/${latestVersion}/sol-${latestVersion}-universal.dmg`;
    window.open(downloadUrl, '_blank');
  };

  return (
    <Button
      size="xl"
      variant="default"
      className="gap-2 items-center w-fit"
      onClick={handleDownload}
    >
      <RiAppleFill size={14} />
      Download
    </Button>
  );
};
