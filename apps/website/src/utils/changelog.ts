import fs from 'fs';
import path from 'path';

import { format, parseISO } from 'date-fns';

type ChangelogMeta = {
  title: string;
  date: string;
  version: string;
  slug: string;
  formattedDate: string;
};

export function getChangelogEntries(): ChangelogMeta[] {
  const changelogDirectory = path.join(process.cwd(), 'src/changelog');
  
  // Check if directory exists
  if (!fs.existsSync(changelogDirectory)) {
    return [];
  }
  
  const filenames = fs.readdirSync(changelogDirectory);
  const mdxFiles = filenames.filter((filename) => filename.endsWith('.mdx'));
  
  const entries = mdxFiles.map((filename) => {
    const filePath = path.join(changelogDirectory, filename);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Extract frontmatter from MDX
    const frontmatter = fileContent
      .split('---')[1]
      .trim()
      .split('\n')
      .reduce((acc, line) => {
        const [key, ...valueArr] = line.split(':');
        const value = valueArr.join(':').trim().replace(/"/g, '');
        if (key && value) {
          acc[key.trim()] = value;
        }
        return acc;
      }, {} as Record<string, string>);
    
    const slug = filename.replace('.mdx', '');
    
    // Format the date
    const dateObj = parseISO(frontmatter.date);
    const formattedDate = format(dateObj, 'MMMM d, yyyy');
    
    return {
      title: frontmatter.title,
      date: frontmatter.date,
      version: frontmatter.version,
      slug,
      formattedDate,
    };
  });
  
  // Sort by date (newest first)
  return entries.sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}