import React from 'react';

import { ChevronDownIcon } from '@radix-ui/react-icons';
import { ScrollArea } from '@redplanethq/ui';

import { Footer, Header } from '../components';

// For simplicity in this static site, we'll hardcode the changelog entries
// In a real implementation, these would be dynamically loaded from MDX files
const CHANGELOG_ENTRIES = [
  {
    version: "0.1.27",
    date: "July 4, 2025",
    sections: {
      newFeatures: [
        "Changelog UI: Added a dedicated changelog page with a vertical timeline interface.",
        "Dark Mode Improvements: Enhanced dark mode experience with better color contrast and readability.",
        "Team Collaboration: New team collaboration features with shared workspaces and real-time updates."
      ],
      improvements: [
        "Enhanced performance for large projects with optimized loading times",
        "Improved search functionality with filters for task type and priority",
        "More intuitive navigation with sidebar improvements",
        "Better error handling with detailed error messages",
        "Added context-specific help throughout the interface"
      ],
      bugFixes: [
        "Fixed sync issues when working offline",
        "Resolved UI glitches in the calendar view",
        "Fixed keyboard navigation in dropdown menus",
        "Corrected timezone display issues for international users",
        "Fixed data migration issues from earlier versions"
      ],
      screenshot: "/command.png"
    }
  },
  {
    version: "0.1.26",
    date: "June 1, 2025",
    sections: {
      newFeatures: [
        "Advanced Filtering: Added new filtering options for task lists, allowing users to filter by priority, due date, and assignee.",
        "Custom Dashboard Widgets: Users can now customize their dashboard with various widgets for better productivity tracking.",
        "Email Notifications: Added configurable email notifications for task due dates and important events."
      ],
      improvements: [
        "Enhanced search functionality with better keyword matching and result ranking",
        "Improved calendar view with multi-day event support",
        "Optimized API calls for faster loading times",
        "Better mobile responsiveness across all screens",
        "Added keyboard shortcuts for common actions"
      ],
      bugFixes: [
        "Fixed issue with task assignment not updating in real-time",
        "Resolved authentication token expiration problems",
        "Fixed dark mode color inconsistencies in some components",
        "Corrected date calculation errors in recurring tasks",
        "Fixed PDF export functionality"
      ],
      screenshot: "/busy.png"
    }
  },
  {
    version: "0.1.25",
    date: "May 15, 2025",
    sections: {
      newFeatures: [
        "GitHub Integration: Added seamless integration with GitHub for issue tracking and PR management.",
        "Activity Timeline: New activity timeline view showing all user actions in chronological order.",
        "Task Dependencies: Tasks can now have dependencies on other tasks, with visual indicators."
      ],
      improvements: [
        "Improved UI performance with virtualized lists for large datasets",
        "Enhanced data synchronization between devices",
        "Streamlined onboarding process for new users",
        "Better error messages and recovery options",
        "Added import/export functionality for workspaces"
      ],
      bugFixes: [
        "Fixed permissions issue in team workspaces",
        "Resolved data inconsistencies in offline mode",
        "Fixed rendering issues in the calendar view",
        "Corrected timezone handling for international users",
        "Fixed memory leaks in long-running sessions"
      ],
      screenshot: "/memory.png"
    }
  }
];

export default function Changelog() {
  return (
    <div className="flex min-h-svh h-[100vh] flex-col items-center justify-start overflow-hidden bg-background-2">
      <ScrollArea className="overflow-auto flex flex-col h-full w-full">
        <div className="p-6">
          <Header />
          <div className="max-w-4xl mx-auto pt-12 pb-20">
            <h1 className="text-3xl font-bold mb-8">Changelog</h1>
            <p className="text-muted-foreground mb-12">
              A record of all notable changes made to Sol.
            </p>
            
            <div className="changelog-timeline">
              <div className="changelog-timeline-line"></div>
              
              {CHANGELOG_ENTRIES.map((entry, index) => (
                <ChangelogEntry 
                  key={entry.version} 
                  entry={entry} 
                  isLast={index === CHANGELOG_ENTRIES.length - 1} 
                />
              ))}
            </div>
          </div>
        </div>
        <Footer />
      </ScrollArea>
    </div>
  );
}

function ChangelogEntry({ 
  entry, 
  isLast 
}: { 
  entry: typeof CHANGELOG_ENTRIES[0];
  isLast: boolean;
}) {
  return (
    <div className={`changelog-entry ${isLast ? '' : ''}`}>
      <div className="changelog-dot"></div>
      
      <div className="changelog-content">
        <div className="changelog-header">
          <time className="changelog-date">{entry.date}</time>
          <div className="changelog-version">
            {entry.version}
          </div>
        </div>
        
        <div className="prose prose-invert max-w-none">
          <h2 className="changelog-section-title">New Features</h2>
          <ul className="changelog-list">
            {entry.sections.newFeatures.map((feature, i) => (
              <li key={i} className="changelog-list-item">{feature}</li>
            ))}
          </ul>
          
          <CollapsibleSection title="Improvements">
            <ul className="changelog-list">
              {entry.sections.improvements.map((item, i) => (
                <li key={i} className="changelog-list-item">{item}</li>
              ))}
            </ul>
          </CollapsibleSection>
          
          <CollapsibleSection title="Bug Fixes">
            <ul className="changelog-list">
              {entry.sections.bugFixes.map((item, i) => (
                <li key={i} className="changelog-list-item">{item}</li>
              ))}
            </ul>
          </CollapsibleSection>
          
          {entry.sections.screenshot && (
            <div className="changelog-screenshot">
              <h3 className="changelog-screenshot-title">Screenshots</h3>
              <div className="changelog-image-container">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={entry.sections.screenshot} 
                  alt={`Screenshot for version ${entry.version}`} 
                  className="changelog-image"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CollapsibleSection({ 
  title, 
  children 
}: { 
  title: string;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <div className="changelog-collapsible">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="changelog-collapsible-button"
      >
        <span>{title}</span>
        <ChevronDownIcon
          className={`changelog-chevron ${isOpen ? 'changelog-chevron-expanded' : ''}`}
        />
      </button>
      {isOpen && <div className="pt-2">{children}</div>}
    </div>
  );
}