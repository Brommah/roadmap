import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, ExternalLink } from 'lucide-react';

interface NotesRendererProps {
  notes: string;
}

interface ParsedLine {
  type: 'text' | 'link' | 'toggle' | 'toggle-content' | 'bullet';
  content: string;
  url?: string;
  depth?: number;
  toggleIndex?: number;
}

interface Toggle {
  title: string;
  titleUrl?: string;
  content: ParsedLine[];
}

// Parse a line and extract any URLs, making them clickable
const renderTextWithLinks = (text: string): React.ReactNode => {
  // URL regex that matches http(s) URLs
  const urlRegex = /(https?:\/\/[^\s<>"\]]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      // Clean up trailing punctuation that might be accidentally captured
      let url = part;
      let trailing = '';
      if (url.endsWith(')') && !url.includes('(')) {
        trailing = ')';
        url = url.slice(0, -1);
      }
      if (url.endsWith('.') || url.endsWith(',')) {
        trailing = url.slice(-1) + trailing;
        url = url.slice(0, -1);
      }
      
      return (
        <React.Fragment key={i}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            {url.length > 50 ? url.substring(0, 50) + '...' : url}
            <ExternalLink size={10} className="inline shrink-0" />
          </a>
          {trailing}
        </React.Fragment>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

export const NotesRenderer: React.FC<NotesRendererProps> = ({ notes }) => {
  const [expandedToggles, setExpandedToggles] = useState<Set<number>>(new Set());

  // Parse notes into structured format
  const { toggles, standaloneLines } = useMemo(() => {
    const lines = notes.split('\n');
    const toggles: Toggle[] = [];
    const standaloneLines: ParsedLine[] = [];
    
    let currentToggle: Toggle | null = null;
    let toggleIndex = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Toggle header (▸)
      if (trimmed.startsWith('▸ ')) {
        // Save previous toggle if exists
        if (currentToggle) {
          toggles.push(currentToggle);
        }
        
        const content = trimmed.replace('▸ ', '');
        // Check if toggle title contains a URL
        const urlMatch = content.match(/(https?:\/\/[^\s]+)/);
        
        currentToggle = {
          title: urlMatch ? content.replace(urlMatch[1], '').trim() || content : content,
          titleUrl: urlMatch ? urlMatch[1] : undefined,
          content: []
        };
        toggleIndex++;
        continue;
      }
      
      // Link line (🔗)
      if (trimmed.startsWith('🔗 ')) {
        const url = trimmed.replace('🔗 ', '');
        const parsed: ParsedLine = { type: 'link', content: url, url };
        
        if (currentToggle) {
          currentToggle.content.push(parsed);
        } else {
          standaloneLines.push(parsed);
        }
        continue;
      }
      
      // Indented content (toggle children)
      if (line.startsWith('  ') && currentToggle) {
        const depth = (line.match(/^(\s+)/)?.[1]?.length || 2) / 2;
        currentToggle.content.push({
          type: 'toggle-content',
          content: trimmed,
          depth
        });
        continue;
      }
      
      // Bullet point
      if (trimmed.startsWith('• ') || trimmed.startsWith('∙ ')) {
        const content = trimmed.replace(/^[•∙]\s*/, '');
        const parsed: ParsedLine = { type: 'bullet', content };
        
        if (currentToggle) {
          currentToggle.content.push(parsed);
        } else {
          standaloneLines.push(parsed);
        }
        continue;
      }
      
      // Regular text
      if (trimmed) {
        // End current toggle if we hit non-indented regular text
        if (currentToggle && !line.startsWith('  ')) {
          toggles.push(currentToggle);
          currentToggle = null;
        }
        
        if (currentToggle) {
          currentToggle.content.push({ type: 'text', content: trimmed });
        } else {
          standaloneLines.push({ type: 'text', content: trimmed });
        }
      }
    }
    
    // Don't forget the last toggle
    if (currentToggle) {
      toggles.push(currentToggle);
    }
    
    return { toggles, standaloneLines };
  }, [notes]);

  const toggleExpanded = (index: number) => {
    setExpandedToggles(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const renderLine = (line: ParsedLine, key: string | number) => {
    switch (line.type) {
      case 'link':
        return (
          <a
            key={key}
            href={line.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline py-0.5 pl-2"
            onClick={(e) => e.stopPropagation()}
          >
            🔗 {line.url && line.url.length > 60 ? line.url.substring(0, 60) + '...' : line.content}
            <ExternalLink size={12} className="shrink-0" />
          </a>
        );
      
      case 'bullet':
        return (
          <div key={key} className="flex items-start gap-2 py-0.5 pl-2">
            <span className="text-gray-400 mt-0.5">•</span>
            <span className="text-gray-600">{renderTextWithLinks(line.content)}</span>
          </div>
        );
      
      case 'toggle-content':
        const paddingClass = (line.depth || 1) >= 2 ? 'pl-8' : 'pl-4';
        return (
          <p key={key} className={`${paddingClass} text-gray-500 text-xs leading-relaxed py-0.5`}>
            {renderTextWithLinks(line.content)}
          </p>
        );
      
      default:
        return (
          <p key={key} className="text-gray-600 py-0.5">
            {renderTextWithLinks(line.content)}
          </p>
        );
    }
  };

  return (
    <div className="text-sm leading-relaxed space-y-1">
      {/* Standalone lines (before any toggles) */}
      {standaloneLines.map((line, idx) => renderLine(line, `standalone-${idx}`))}
      
      {/* Toggles */}
      {toggles.map((toggle, idx) => {
        const isExpanded = expandedToggles.has(idx);
        const hasContent = toggle.content.length > 0;
        
        return (
          <div key={`toggle-${idx}`} className="border-l-2 border-gray-100 ml-1">
            {/* Toggle header */}
            <button
              onClick={() => hasContent && toggleExpanded(idx)}
              className={`
                w-full flex items-center gap-1.5 py-1 px-2 text-left rounded-r
                ${hasContent ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'}
                transition-colors
              `}
            >
              {hasContent ? (
                isExpanded ? (
                  <ChevronDown size={14} className="text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight size={14} className="text-gray-400 shrink-0" />
                )
              ) : (
                <span className="w-3.5" />
              )}
              
              <span className="font-medium text-gray-800 flex-1">
                {toggle.titleUrl ? (
                  <a
                    href={toggle.titleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {toggle.title || 'Open Link'}
                    <ExternalLink size={12} />
                  </a>
                ) : (
                  renderTextWithLinks(toggle.title)
                )}
              </span>
              
              {hasContent && !isExpanded && (
                <span className="text-xs text-gray-400">
                  {toggle.content.length} item{toggle.content.length !== 1 ? 's' : ''}
                </span>
              )}
            </button>
            
            {/* Toggle content */}
            {isExpanded && hasContent && (
              <div className="pl-4 pb-1 space-y-0.5">
                {toggle.content.map((line, lineIdx) => renderLine(line, `toggle-${idx}-line-${lineIdx}`))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
