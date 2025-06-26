import { Button } from '@redplanethq/ui';
import { RiGithubFill, RiCloseLine, RiStarFill } from '@remixicon/react';
import { useState, useEffect } from 'react';

export const GitHubBanner = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [starCount, setStarCount] = useState('...');

  useEffect(() => {
    // Fetch star count from GitHub API
    fetch('https://api.github.com/repos/RedPlanetHQ/sol')
      .then(response => response.json())
      .then(data => {
        if (data.stargazers_count !== undefined) {
          setStarCount(data.stargazers_count.toLocaleString());
        }
      })
      .catch(() => {
        setStarCount('Star');
      });
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 px-4">
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-2xl rounded-full px-6 py-3 flex items-center gap-3 group hover:shadow-xl transition-all duration-300 hover:scale-105">
        <RiGithubFill className="w-5 h-5 flex-shrink-0" />
        <span className="font-semibold text-sm whitespace-nowrap">Star us on GitHub</span>
        
        <Button 
          size="sm" 
          className="bg-white text-orange-600 hover:bg-gray-100 font-bold px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 ml-1 transition-colors duration-200"
          onClick={() => window.open('https://github.com/RedPlanetHQ/sol', '_blank')}
        >
          <RiStarFill className="w-3 h-3" />
          <span>{starCount}</span>
        </Button>
        
        <button 
          onClick={() => setIsVisible(false)}
          className="hover:bg-white/20 rounded-full p-1.5 transition-colors ml-1 flex-shrink-0"
          aria-label="Close banner"
        >
          <RiCloseLine className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}; 