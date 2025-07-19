import { Container } from '../components';
import { CoreHeader } from '../core/header';
import { CoreHero } from '../core/hero';
import { CoreFooter } from '../core/footer';
import { UnifiedMemory } from '../core/unified_memory';
import { Button } from '@redplanethq/ui';
import Image from 'next/image';
import { useState } from 'react';
import { Dialog, DialogContent } from '@redplanethq/ui';
import { ChatWithMemory } from '../core/chat_with_memory';
import { OpenSource } from '../core/open_source';

const CorePage = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-background-2">
      <CoreHeader />
      <CoreHero />
      <UnifiedMemory />
      <ChatWithMemory />
      <OpenSource />
      <CoreFooter />
    </div>
  );
};

export default CorePage; 