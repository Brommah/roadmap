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

// Parse a line and extract any URLs (both raw and markdown-style), making them clickable
const renderTextWithLinks = (text: string): React.ReactNode => {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;
  
  const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = markdownLinkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index);
      parts.push(...renderRawUrls(beforeText, keyIndex));
      keyIndex += 10;
    }
    
    const linkText = match[1];
    const url = match[2];
    parts.push(
      <a
        key={`md-${keyIndex++}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-violet-400 hover:text-violet-300 hover:underline inline-flex items-center gap-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        {linkText}
        <ExternalLink size={10} className="inline shrink-0" />
      </a>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < text.length) {
    const afterText = text.slice(lastIndex);
    parts.push(...renderRawUrls(afterText, keyIndex));
  }
  
  return parts.length > 0 ? parts : text;
};

const renderRawUrls = (text: string, startKey: number): React.ReactNode[] => {
  const urlRegex = /(https?:\/\/[^\s<>"\]\)]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      let url = part;
      let trailing = '';
      if (url.endsWith('.') || url.endsWith(',')) {
        trailing = url.slice(-1);
        url = url.slice(0, -1);
      }
      
      return (
        <React.Fragment key={`raw-${startKey}-${i}`}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-400 hover:text-violet-300 hover:underline inline-flex items-center gap-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            {url.length > 50 ? url.substring(0, 50) + '...' : url}
            <ExternalLink size={10} className="inline shrink-0" />
          </a>
          {trailing}
        </React.Fragment>
      );
    }
    return <span key={`text-${startKey}-${i}`}>{part}</span>;
  });
};

export const NotesRenderer: React.FC<NotesRendererProps> = ({ notes }) => {
  const [expandedToggles, setExpandedToggles] = useState<Set<number>>(new Set());

  const { toggles, standaloneLines } = useMemo(() => {
    const lines = notes.split('\n');
    const toggles: Toggle[] = [];
    const standaloneLines: ParsedLine[] = [];
    
    let currentToggle: Toggle | null = null;
    let toggleIndex = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('▸ ')) {
        if (currentToggle) {
          toggles.push(currentToggle);
        }
        
        const content = trimmed.replace('▸ ', '');
        const urlMatch = content.match(/(https?:\/\/[^\s]+)/);
        
        currentToggle = {
          title: urlMatch ? content.replace(urlMatch[1], '').trim() || content : content,
          titleUrl: urlMatch ? urlMatch[1] : undefined,
          content: []
        };
        toggleIndex++;
        continue;
      }
      
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
      
      if (line.startsWith('  ') && currentToggle) {
        const depth = (line.match(/^(\s+)/)?.[1]?.length || 2) / 2;
        currentToggle.content.push({
          type: 'toggle-content',
          content: trimmed,
          depth
        });
        continue;
      }
      
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
      
      if (trimmed) {
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
            className="flex items-center gap-1.5 text-violet-400 hover:text-violet-300 hover:underline py-0.5 pl-2"
            onClick={(e) => e.stopPropagation()}
          >
            🔗 {line.url && line.url.length > 60 ? line.url.substring(0, 60) + '...' : line.content}
            <ExternalLink size={12} className="shrink-0" />
          </a>
        );
      
      case 'bullet':
        return (
          <div key={key} className="flex items-start gap-2 py-0.5 pl-2">
            <span className="text-slate-500 mt-0.5">•</span>
            <span className="text-slate-300">{renderTextWithLinks(line.content)}</span>
          </div>
        );
      
      case 'toggle-content':
        const paddingClass = (line.depth || 1) >= 2 ? 'pl-8' : 'pl-4';
        return (
          <p key={key} className={`${paddingClass} text-slate-400 text-xs leading-relaxed py-0.5`}>
            {renderTextWithLinks(line.content)}
          </p>
        );
      
      default:
        return (
          <p key={key} className="text-slate-300 py-0.5">
            {renderTextWithLinks(line.content)}
          </p>
        );
    }
  };

  return (
    <div className="text-sm leading-relaxed space-y-1">
      {standaloneLines.map((line, idx) => renderLine(line, `standalone-${idx}`))}
      
      {toggles.map((toggle, idx) => {
        const isExpanded = expandedToggles.has(idx);
        const hasContent = toggle.content.length > 0;
        
        return (
          <div key={`toggle-${idx}`} className="border-l-2 border-slate-700 ml-1">
            <button
              onClick={() => hasContent && toggleExpanded(idx)}
              className={`
                w-full flex items-center gap-1.5 py-1 px-2 text-left rounded-r
                ${hasContent ? 'hover:bg-slate-700/50 cursor-pointer' : 'cursor-default'}
                transition-colors
              `}
            >
              {hasContent ? (
                isExpanded ? (
                  <ChevronDown size={14} className="text-slate-500 shrink-0" />
                ) : (
                  <ChevronRight size={14} className="text-slate-500 shrink-0" />
                )
              ) : (
                <span className="w-3.5" />
              )}
              
              <span className="font-medium text-slate-200 flex-1">
                {toggle.titleUrl ? (
                  <a
                    href={toggle.titleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-400 hover:text-violet-300 hover:underline inline-flex items-center gap-1"
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
                <span className="text-xs text-slate-500">
                  {toggle.content.length} item{toggle.content.length !== 1 ? 's' : ''}
                </span>
              )}
            </button>
            
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
