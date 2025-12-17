import React from 'react';
import { StickyNote, StickyStatus } from '../types';
import { extractOutcome } from '../utils';

interface StickyCardProps {
  note: StickyNote;
  colorClass: string;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
  onEdit: (note: StickyNote) => void;
  compact?: boolean;
}

const STATUS_COLORS: Record<StickyStatus, string> = {
  green: 'bg-green-500',
  yellow: 'bg-amber-400',
  red: 'bg-red-500',
};

export const StickyCard: React.FC<StickyCardProps> = ({ 
  note, 
  colorClass, 
  onDelete, 
  onDragStart,
  onEdit,
  compact = false
}) => {
  const displayTitle = extractOutcome(note.title);
  
  // Compact card for timeline view
  if (compact) {
    return (
      <div
        draggable
        onDragStart={(e) => onDragStart(e, note.id)}
        onClick={() => onEdit(note)}
        className={`
          p-2 bg-white border border-gray-200 rounded-md
          cursor-grab active:cursor-grabbing hover:border-gray-300 hover:-translate-y-px
          ${note.isDone ? 'opacity-50' : ''}
        `}
      >
        <div className="flex items-start gap-2">
          <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${STATUS_COLORS[note.status]}`}></span>
          <span 
            className={`text-xs font-medium leading-tight line-clamp-2 ${note.isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}
          >
            {displayTitle}
          </span>
        </div>
      </div>
    );
  }

  // Full card
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, note.id)}
      onClick={() => onEdit(note)}
      className={`
        p-3 bg-white border border-gray-200 rounded-md
        cursor-grab active:cursor-grabbing hover:border-gray-300 hover:-translate-y-px
        ${note.isDone ? 'opacity-50' : ''}
      `}
    >
      <div className="flex items-start gap-2">
        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${STATUS_COLORS[note.status]}`}></span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-snug ${note.isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {displayTitle}
          </p>
          {note.owner && note.owner !== 'Unassigned' && (
            <p className="text-xs text-gray-400 mt-1">{note.owner}</p>
          )}
        </div>
      </div>
    </div>
  );
};
