import React, { useState, useEffect, useMemo } from 'react';
import { StickyCard } from './components/StickyCard';
import { Modal } from './components/Modal';
import { NotesRenderer } from './components/NotesRenderer';
import { CEF_LANES, CERE_LANES, QUARTERS, INITIAL_STICKIES, INITIAL_MILESTONES } from './constants';
import { StickyNote, Milestone, StickyStatus, Lane, Quarter } from './types';
import { 
  Plus, Flag, Search, ChevronDown, ChevronRight, Save, Trash2, 
  Filter, Calendar, Info, CheckCircle, AlertTriangle, BookOpen, 
  Folder, FolderOpen, ExternalLink, RefreshCw, Copy, XCircle, Loader2, Globe,
  ZoomIn, ZoomOut
} from 'lucide-react';
import { getUniqueOwners, getUniqueGroups, formatNotionId, findLane, findQuarter, getDatePositionInQuarter, sortStickyByDate, getQuarterFromDate, getTodayPosition, extractOutcome } from './utils';

// Helper to extract text WITH embedded links from Notion rich_text
// Returns text with links formatted as [text](url) markdown-style for easy parsing
const extractRichTextWithLinks = (richText: any[]): string => {
  if (!Array.isArray(richText)) return '';
  
  return richText.map(rt => {
    const text = rt.plain_text || '';
    
    // Check for direct href (hyperlink)
    if (rt.href) {
      const url = rt.href.startsWith('/') 
        ? `https://www.notion.so${rt.href}`
        : rt.href;
      return `[${text}](${url})`;
    }
    
    // Check for page mention
    if (rt.type === 'mention' && rt.mention?.type === 'page') {
      const pageId = rt.mention.page.id.replace(/-/g, '');
      return `[${text}](https://www.notion.so/${pageId})`;
    }
    
    // Check for link preview mention
    if (rt.type === 'mention' && rt.mention?.type === 'link_preview') {
      return `[${text}](${rt.mention.link_preview.url})`;
    }
    
    // Check for URL mention
    if (rt.type === 'mention' && rt.mention?.type === 'url') {
      return `[${text}](${rt.mention.url})`;
    }
    
    return text;
  }).join('');
};

// Zoom level type
type ZoomLevel = 'week' | 'month' | 'quarter' | 'year';

// Column type for dynamic timeline
interface TimelineColumn {
  id: string;
  label: string;
  sublabel?: string;
  startDate: Date;
  endDate: Date;
}

// Get week number in month (1-5)
function getWeekOfMonth(date: Date): number {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayOfWeek = firstDay.getDay();
  const offsetDate = date.getDate() + firstDayOfWeek - 1;
  return Math.ceil(offsetDate / 7);
}

// Get ISO week number (1-52/53)
function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Generate columns based on zoom level
function generateTimelineColumns(zoomLevel: ZoomLevel, referenceDate: Date = new Date()): TimelineColumn[] {
  const columns: TimelineColumn[] = [];
  
  switch (zoomLevel) {
    case 'week': {
      // Show current week: 7 columns (Mon-Sun)
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const dayOfWeek = referenceDate.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(referenceDate);
      monday.setDate(referenceDate.getDate() + mondayOffset);
      monday.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < 7; i++) {
        const dayStart = new Date(monday);
        dayStart.setDate(monday.getDate() + i);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);
        
        columns.push({
          id: `day-${i}`,
          label: dayNames[i],
          sublabel: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          startDate: dayStart,
          endDate: dayEnd,
        });
      }
      break;
    }
    
    case 'month': {
      // Show current month: 4-5 week columns
      const year = referenceDate.getFullYear();
      const month = referenceDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      // Find the Monday of the week containing the 1st
      const firstDayOfWeek = firstDay.getDay();
      const mondayOffset = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek;
      let weekStart = new Date(firstDay);
      weekStart.setDate(firstDay.getDate() + mondayOffset);
      
      let weekNum = 1;
      while (weekStart <= lastDay) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        const weekStartDisplay = new Date(Math.max(weekStart.getTime(), firstDay.getTime()));
        const weekEndDisplay = new Date(Math.min(weekEnd.getTime(), lastDay.getTime()));
        
        const isoWeek = getISOWeekNumber(weekStart);
        columns.push({
          id: `week-${isoWeek}`,
          label: `Week ${isoWeek}`,
          sublabel: `${weekStartDisplay.getDate()}-${weekEndDisplay.getDate()}`,
          startDate: new Date(weekStart),
          endDate: weekEnd,
        });
        
        weekStart.setDate(weekStart.getDate() + 7);
        weekNum++;
        
        if (weekNum > 6) break; // Safety limit
      }
      break;
    }
    
    case 'quarter': {
      // Show 8 quarters (current behavior)
      return QUARTERS.map(q => {
        const qNum = parseInt(q.label.replace('Q', ''));
        const quarterStartMonth = (qNum - 1) * 3;
        const startDate = new Date(q.year, quarterStartMonth, 1);
        const endDate = new Date(q.year, quarterStartMonth + 3, 0, 23, 59, 59, 999);
        
        return {
          id: q.id,
          label: q.label,
          sublabel: q.year.toString(),
          startDate,
          endDate,
        };
      });
    }
    
    case 'year': {
      // Show current year: 4 quarters compressed
      const year = referenceDate.getFullYear();
      for (let q = 1; q <= 4; q++) {
        const quarterStartMonth = (q - 1) * 3;
        const startDate = new Date(year, quarterStartMonth, 1);
        const endDate = new Date(year, quarterStartMonth + 3, 0, 23, 59, 59, 999);
        
        columns.push({
          id: `${year}-Q${q}`,
          label: `Q${q}`,
          sublabel: year.toString(),
          startDate,
          endDate,
        });
      }
      break;
    }
  }
  
  return columns;
}

// Get position of a date within a column (0-100%)
function getPositionInColumn(deliveryDate: string | undefined, column: TimelineColumn): number {
  if (!deliveryDate) return 50;
  
  let date: Date;
  try {
    date = new Date(deliveryDate);
    if (isNaN(date.getTime())) return 50;
  } catch {
    return 50;
  }
  
  const columnDuration = column.endDate.getTime() - column.startDate.getTime();
  const dateOffset = date.getTime() - column.startDate.getTime();
  
  return Math.max(5, Math.min(95, (dateOffset / columnDuration) * 100));
}

// Check if a sticky belongs in a column based on its delivery date
function stickyBelongsInColumn(sticky: StickyNote, column: TimelineColumn): boolean {
  if (!sticky.deliveryDate) return false;
  
  let date: Date;
  try {
    date = new Date(sticky.deliveryDate);
    if (isNaN(date.getTime())) return false;
  } catch {
    return false;
  }
  
  return date >= column.startDate && date <= column.endDate;
}

// Get card size class based on zoom level
function getCardSizeClass(zoomLevel: ZoomLevel): { minHeight: string; fontSize: string; padding: string } {
  switch (zoomLevel) {
    case 'week':
      return { minHeight: 'min-h-[200px]', fontSize: 'text-sm', padding: 'p-3' };
    case 'month':
      return { minHeight: 'min-h-[150px]', fontSize: 'text-xs', padding: 'p-2.5' };
    case 'quarter':
      return { minHeight: 'min-h-[100px]', fontSize: 'text-xs', padding: 'p-2' };
    case 'year':
      return { minHeight: 'min-h-[60px]', fontSize: 'text-[10px]', padding: 'p-1.5' };
  }
}

// Get column width based on zoom level
function getColumnWidth(zoomLevel: ZoomLevel): number {
  switch (zoomLevel) {
    case 'week':
      return 200;
    case 'month':
      return 240;
    case 'quarter':
      return 360;
    case 'year':
      return 280;
  }
}

// Notion configuration - set these in .env.local (dev) or Vercel env vars (prod)
// Page IDs for each view
const PAGE_IDS = {
  cef: import.meta.env.VITE_NOTION_PAGE_ID || '2cbd800083d680c8b22ced2c9c9b1cf2',
  cere: '2ced800083d6807bba83f09eda27d75d',
};
// API key is only needed for local dev - in production, serverless function uses server-side env var
const NOTION_API_KEY = import.meta.env.VITE_NOTION_API_KEY || '';

// Recursive function to fetch toggle content at any depth
async function fetchToggleContentRecursive(
  blockId: string, 
  depth: number = 0, 
  maxDepth: number = 10
): Promise<string[]> {
  if (depth >= maxDepth) {
    console.log(`⚠️ Toggle depth truncated at ${depth} (maxDepth=${maxDepth}) for block ${blockId}`);
    return [];
  }
  
  const indent = '  '.repeat(depth + 1);
  const content: string[] = [];
  
  try {
    const res = await fetch(`/api/notion/v1/blocks/${blockId}/children?page_size=50`, {
      headers: { 'Authorization': `Bearer ${NOTION_API_KEY}` }
    });
    
    if (!res.ok) return content;
    
    const data = await res.json();
    
    for (const block of data.results) {
      const type = block.type;
      const richText = block[type]?.rich_text;
      
      if (type === 'toggle') {
        // Toggle header - use extractRichTextWithLinks to preserve embedded links
        const toggleTitle = richText ? extractRichTextWithLinks(richText) : '';
        if (toggleTitle.trim()) {
          content.push(`${indent}▸ ${toggleTitle}`);
        }
        // Recursively fetch toggle children
        if (block.has_children) {
          const nestedContent = await fetchToggleContentRecursive(block.id, depth + 1, maxDepth);
          content.push(...nestedContent);
        }
      } else if (type === 'child_page') {
        const pageName = block.child_page?.title || '';
        if (pageName && pageName !== 'Untitled') {
          content.push(`${indent}📄 ${pageName}`);
        }
      } else if (type === 'link_to_page') {
        const pageId = block.link_to_page?.page_id;
        if (pageId) {
          // Try to fetch page title
          try {
            const pageRes = await fetch(`/api/notion/v1/pages/${pageId}`, {
              headers: { 'Authorization': `Bearer ${NOTION_API_KEY}` }
            });
            if (pageRes.ok) {
              const pageData = await pageRes.json();
              const titleProp = pageData.properties?.title?.title || pageData.properties?.Name?.title;
              const pageTitle = titleProp?.map((t: any) => t.plain_text).join('') || '';
              if (pageTitle) {
                content.push(`${indent}📄 ${pageTitle}`);
              }
            }
          } catch {
            content.push(`${indent}📄 https://www.notion.so/${pageId.replace(/-/g, '')}`);
          }
        }
      } else if (Array.isArray(richText)) {
        // Text content (paragraph, bullet, heading, etc.) - preserve embedded links
        const textWithLinks = extractRichTextWithLinks(richText);
        if (textWithLinks.trim()) {
          const prefix = type === 'bulleted_list_item' ? '• ' : 
                        type === 'numbered_list_item' ? '∙ ' : 
                        type.startsWith('heading') ? '▪ ' : '';
          content.push(`${indent}${prefix}${textWithLinks}`);
        }
        // Also check for nested children in non-toggle blocks
        if (block.has_children && type !== 'toggle') {
          const nestedContent = await fetchToggleContentRecursive(block.id, depth + 1, maxDepth);
          content.push(...nestedContent);
        }
      }
    }
  } catch (e) {
    console.warn(`Failed to fetch toggle content at depth ${depth}:`, e);
  }
  
  return content;
}

// Helper to get headers for Notion API calls
// In dev: include Authorization header for Vite proxy
// In prod: serverless function handles auth, but we still pass it for compatibility
const getNotionHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (NOTION_API_KEY) {
    headers['Authorization'] = `Bearer ${NOTION_API_KEY}`;
  }
  return headers;
};

export default function App() {
  // -- State --
  const [activeView, setActiveView] = useState<'cef' | 'cere'>('cef');
  const [stickies, setStickies] = useState<StickyNote[]>(INITIAL_STICKIES);
  const [milestones, setMilestones] = useState<Milestone[]>(INITIAL_MILESTONES);
  
  // Get lanes based on active view
  const LANES = activeView === 'cef' ? CEF_LANES : CERE_LANES;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StickyStatus | 'done' | 'all'>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  
  // Timeline zoom level (replaces timeframe filter)
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('quarter');
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());
  
  // Generate timeline columns based on zoom level
  const timelineColumns = useMemo(() => generateTimelineColumns(zoomLevel, referenceDate), [zoomLevel, referenceDate]);

  // Collapsed states for groups (lanes don't collapse anymore)
  // Start with all collapsed, then expand groups with content after data loads
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set([...CEF_LANES, ...CERE_LANES].map(l => l.group)));
  const [hasInitializedGroups, setHasInitializedGroups] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSticky, setEditingSticky] = useState<Partial<StickyNote> | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  
  // Drag & Drop Confirmation Modal
  const [pendingMove, setPendingMove] = useState<{
    stickyId: string;
    targetLaneId: string;
    targetQuarterId: string;
    newDeliveryDate: string;
  } | null>(null);

  // -- Notion API Fetch --
  useEffect(() => {
    async function fetchNotionData() {
      setLoading(true);
      setError(null);
      
      try {
        const pageId = formatNotionId(PAGE_IDS[activeView]);
        // Use Vite proxy to call Notion API directly
        const response = await fetch(`/api/notion/v1/blocks/${pageId}/children?page_size=100`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${NOTION_API_KEY}`,
          }
        });

        if (!response.ok) {
           throw new Error(`Notion API Error: ${response.statusText}`);
        }

        const data = await response.json();
        
        // DEBUG: Log all blocks to console with full detail
        console.log('=== NOTION BLOCKS ===');
        data.results.forEach((b: any, i: number) => {
          const text = b[b.type]?.rich_text?.map((rt: any) => rt.plain_text).join('') || b.child_page?.title || '';
          console.log(`Block ${i}: type=${b.type}, has_children=${b.has_children}, text="${text.substring(0, 50)}"`);
        });
        
        // Parse Logic
        const newMilestones: Milestone[] = [];
        const newStickies: StickyNote[] = [];

        let currentQuarterId = QUARTERS[0].id; // Default to first quarter
        let currentLaneId = LANES[0].id; // Default lane
        let currentMilestoneId: string | undefined = undefined;
        let currentMilestoneTitle: string | undefined = undefined;
        
        // Loop through blocks
        for (const block of data.results) {
          const type = block.type;
          
          // Handle different block types for text extraction
          let textContent: string | undefined;
          if (type === 'child_page') {
            textContent = block.child_page?.title;
          } else if (type === 'link_to_page') {
            textContent = undefined;
          } else {
            // Join ALL rich_text elements (links, mentions, etc. are separate elements)
            const richText = block[type]?.rich_text;
            if (Array.isArray(richText)) {
              textContent = richText.map((rt: any) => rt.plain_text).join('');
            }
          }
          
          // Treat child_page as H2 (lane marker) AND fetch its children for checkpoints
          if (type === 'child_page' && textContent) {
            const lane = findLane(textContent, LANES);
            if (lane) {
              currentLaneId = lane.id;
              console.log(`Found child_page "${textContent}" -> lane ${lane.id}, fetching children...`);
              
              // Fetch children of this child_page to find checkpoints
              try {
                const childPageRes = await fetch(`/api/notion/v1/blocks/${block.id}/children?page_size=100`, {
                  headers: { 'Authorization': `Bearer ${NOTION_API_KEY}` }
                });
                if (childPageRes.ok) {
                  const childPageData = await childPageRes.json();
                  console.log(`Child page "${textContent}" has ${childPageData.results.length} blocks`);
                  
                  // Process each block in the child page
                  for (const childBlock of childPageData.results) {
                    const childType = childBlock.type;
                    
                    // Handle synced_block inside child_page
                    if (childType === 'synced_block') {
                      console.log(`Found synced_block inside child_page "${textContent}"`);
                      const syncRes = await fetch(`/api/notion/v1/blocks/${childBlock.id}/children?page_size=100`, {
                        headers: { 'Authorization': `Bearer ${NOTION_API_KEY}` }
                      });
                      if (syncRes.ok) {
                        const syncData = await syncRes.json();
                        
                        // Find checkpoint indices
                        const deliverableIndices: number[] = [];
                        syncData.results.forEach((child: any, idx: number) => {
                          const cType = child.type;
                          const cRichText = child[cType]?.rich_text;
                          if (Array.isArray(cRichText)) {
                            const cText = cRichText.map((rt: any) => rt.plain_text).join('');
                            if ((cType === 'heading_3' && cText.toLowerCase().includes('checkpoint')) ||
                                cText.toLowerCase().startsWith('deliverable')) {
                              deliverableIndices.push(idx);
                            }
                          }
                        });
                        
                        console.log(`Found ${deliverableIndices.length} checkpoints in synced_block`);
                        
                        // Process each checkpoint
                        for (let i = 0; i < deliverableIndices.length; i++) {
                          const startIdx = deliverableIndices[i];
                          const endIdx = i < deliverableIndices.length - 1 ? deliverableIndices[i + 1] : syncData.results.length;
                          
                          const deliverableBlock = syncData.results[startIdx];
                          const deliverableRichText = deliverableBlock[deliverableBlock.type]?.rich_text || [];
                          const deliverableText = deliverableRichText.map((rt: any) => rt.plain_text).join('');
                          let deliverableTitle = deliverableText
                            .replace(/^checkpoint\s*\d*[:\s]*/i, '')
                            .replace(/^deliverable[:\s]*\d*[:\s]*/i, '')
                            .trim();
                          
                          if (deliverableTitle.length <= 3) continue;
                          
                          // Extract date from title
                          const dateMatch = deliverableText.match(/(\d{4}-\d{2}-\d{2})/);
                          let deliveryDate = '';
                          let assignedQuarterId = currentQuarterId;
                          
                          if (dateMatch) {
                            deliveryDate = dateMatch[1];
                            const quarterFromDate = getQuarterFromDate(deliveryDate);
                            if (quarterFromDate) assignedQuarterId = quarterFromDate;
                          }
                          
                          // Collect sibling data
                          let owner = 'Unassigned';
                          let ownerBlockId = '';
                          let extractedDeliveryDate = '';
                          let deliveryDateBlockId = '';
                          let extractedStatus: 'green' | 'yellow' | 'red' = 'green';
                          let extractedBlocker = '';
                          const noteItems: string[] = [];
                          
                          for (let j = startIdx + 1; j < endIdx; j++) {
                            const siblingBlock = syncData.results[j];
                            const siblingType = siblingBlock.type;
                            
                            if (siblingType === 'paragraph' || siblingType === 'bulleted_list_item' || siblingType === 'callout') {
                              // Handle callout blocks (colored background text) - rich_text is at different path
                              const siblingRichText = siblingType === 'callout' 
                                ? siblingBlock.callout?.rich_text || []
                                : siblingBlock[siblingType]?.rich_text || [];
                              const siblingText = siblingRichText.map((rt: any) => rt.plain_text).join('');
                              
                              console.log(`  Sibling block: "${siblingText.substring(0, 50)}..."`);
                              
                              if (siblingText.toLowerCase().startsWith('owner:')) {
                                ownerBlockId = siblingBlock.id;
                                let ownerFromMention = '';
                                for (const rt of siblingRichText) {
                                  if (rt.type === 'mention' && rt.mention?.type === 'user') {
                                    ownerFromMention = rt.mention.user?.name || rt.plain_text || '';
                                    break;
                                  }
                                  if (rt.type === 'mention' && rt.mention?.type === 'page') {
                                    ownerFromMention = rt.plain_text || '';
                                    break;
                                  }
                                }
                                owner = ownerFromMention || siblingText.replace(/^owner[:\s]*/i, '').trim();
                                console.log(`    -> Owner extracted: "${owner}"`);
                              } else if (siblingText.toLowerCase().includes('delivery date') || siblingText.toLowerCase().includes('delivery:')) {
                                deliveryDateBlockId = siblingBlock.id;
                                for (const rt of siblingRichText) {
                                  if (rt.type === 'mention' && rt.mention?.type === 'date') {
                                    extractedDeliveryDate = rt.mention.date.start;
                                    break;
                                  }
                                }
                                if (!extractedDeliveryDate) {
                                  const dMatch = siblingText.match(/(\d{4}-\d{2}-\d{2})/);
                                  if (dMatch) extractedDeliveryDate = dMatch[1];
                                }
                                if (!extractedDeliveryDate) {
                                  const textDateMatch = siblingText.match(/(?:delivery\s*date[:\s]*|delivery[:\s]*)(.+)/i);
                                  if (textDateMatch) {
                                    const dateStr = textDateMatch[1].trim();
                                    const parsed = new Date(dateStr);
                                    if (!isNaN(parsed.getTime())) {
                                      extractedDeliveryDate = parsed.toISOString().split('T')[0];
                                    }
                                  }
                                }
                                console.log(`    -> Delivery date extracted: "${extractedDeliveryDate}"`);
                              } else if (siblingText.toLowerCase().startsWith('status:')) {
                                // Extract status (Red/Yellow/Green)
                                const statusValue = siblingText.replace(/^status[:\s]*/i, '').trim().toLowerCase();
                                if (statusValue.includes('red') || statusValue.includes('<80%') || statusValue.includes('at risk')) {
                                  extractedStatus = 'red';
                                } else if (statusValue.includes('yellow') || statusValue.includes('>80%') || statusValue.includes('little off')) {
                                  extractedStatus = 'yellow';
                                } else {
                                  extractedStatus = 'green';
                                }
                                console.log(`    -> Status extracted: "${extractedStatus}"`);
                              } else if (siblingText.trim().toLowerCase().startsWith('blocker:') || siblingText.trim().toLowerCase().startsWith('blocker ')) {
                                // Extract blocker description - handle "Blocker:" or "Blocker " formats
                                extractedBlocker = siblingText.replace(/^\s*blocker[:\s]*/i, '').trim();
                                console.log(`    -> Blocker extracted: "${extractedBlocker}"`);
                              } else if (siblingText.length > 0) {
                                // Use extractRichTextWithLinks to preserve embedded links
                                const textWithLinks = extractRichTextWithLinks(siblingRichText);
                                noteItems.push(textWithLinks);
                              }
                            } else if (siblingType === 'toggle') {
                              const toggleRichText = siblingBlock.toggle?.rich_text || [];
                              const toggleTextWithLinks = extractRichTextWithLinks(toggleRichText);
                              if (toggleTextWithLinks) noteItems.push(`▸ ${toggleTextWithLinks}`);
                              // Fetch all nested content recursively
                              if (siblingBlock.has_children) {
                                try {
                                  const nestedContent = await fetchToggleContentRecursive(siblingBlock.id, 0, 10);
                                  noteItems.push(...nestedContent);
                                } catch (e) {
                                  console.warn('Failed to fetch toggle children:', e);
                                }
                              }
                            }
                          }
                          
                          if (!deliveryDate && extractedDeliveryDate) {
                            deliveryDate = extractedDeliveryDate;
                            const qFromDate = getQuarterFromDate(deliveryDate);
                            if (qFromDate) assignedQuarterId = qFromDate;
                          }
                          
                          console.log(`Creating sticky: "${deliverableTitle}", owner="${owner}", date="${deliveryDate}", status="${extractedStatus}", blocker="${extractedBlocker}"`);
                          
                          newStickies.push({
                            id: deliverableBlock.id,
                            title: deliverableTitle,
                            owner: owner,
                            laneId: lane.id,
                            quarterId: assignedQuarterId,
                            isDone: false,
                            status: extractedStatus,
                            blocker: extractedBlocker || undefined,
                            wikiUrl: '',
                            deliveryDate: deliveryDate,
                            notes: noteItems.join('\n'),
                            milestoneId: currentMilestoneId,
                            milestoneTitle: currentMilestoneTitle,
                            ownerBlockId: ownerBlockId || undefined,
                            deliveryDateBlockId: deliveryDateBlockId || undefined,
                            parentBlockId: childBlock.id
                          });
                        }
                      }
                    }
                    
                    // Also check for direct heading_3 checkpoints (not in synced_block)
                    if (childType === 'heading_3') {
                      const h3RichText = childBlock.heading_3?.rich_text || [];
                      const h3Text = h3RichText.map((rt: any) => rt.plain_text).join('');
                      if (h3Text.toLowerCase().includes('checkpoint')) {
                        console.log(`Found direct checkpoint in child_page: "${h3Text}"`);
                        // TODO: Handle direct checkpoints if needed
                      }
                    }
                  }
                }
              } catch (e) {
                console.warn(`Failed to fetch child_page "${textContent}" children:`, e);
              }
            }
            continue;
          }
          
          // Handle synced_block - fetch children to get actual content
          if (type === 'synced_block') {
            console.log(`Found synced_block, fetching children...`);
            try {
              const syncChildrenRes = await fetch(`/api/notion/v1/blocks/${block.id}/children?page_size=100`, {
                headers: { 'Authorization': `Bearer ${NOTION_API_KEY}` }
              });
              if (syncChildrenRes.ok) {
                const syncChildrenData = await syncChildrenRes.json();
                // First pass: find all deliverable/checkpoint indices
                // Look for heading_3 blocks with "Checkpoint" OR paragraphs with "Deliverable"
                const deliverableIndices: number[] = [];
                syncChildrenData.results.forEach((child: any, idx: number) => {
                  const childType = child.type;
                  const childRichText = child[childType]?.rich_text;
                  if (Array.isArray(childRichText)) {
                    const childText = childRichText.map((rt: any) => rt.plain_text).join('');
                    // Match "Checkpoint" in heading_3 OR "Deliverable" in any block
                    if ((childType === 'heading_3' && childText.toLowerCase().includes('checkpoint')) ||
                        childText.toLowerCase().startsWith('deliverable')) {
                      deliverableIndices.push(idx);
                    }
                  }
                });
                
                // Process each deliverable with its sibling content
                for (let i = 0; i < deliverableIndices.length; i++) {
                  const startIdx = deliverableIndices[i];
                  const endIdx = i < deliverableIndices.length - 1 ? deliverableIndices[i + 1] : syncChildrenData.results.length;
                  
                  const deliverableBlock = syncChildrenData.results[startIdx];
                  const deliverableRichText = deliverableBlock[deliverableBlock.type]?.rich_text || [];
                  const deliverableText = deliverableRichText.map((rt: any) => rt.plain_text).join('');
                  // Handle both "Checkpoint X: Title" and "Deliverable: Title" formats
                  let deliverableTitle = deliverableText
                    .replace(/^checkpoint\s*\d*[:\s]*/i, '')
                    .replace(/^deliverable[:\s]*\d*[:\s]*/i, '')
                    .trim();
                  
                  if (deliverableTitle.length <= 3) continue;
                  
                  // Extract date from title
                  const dateMatch = deliverableText.match(/(\d{4}-\d{2}-\d{2})/);
                  let deliveryDate = '';
                  let assignedQuarterId = currentQuarterId;
                  
                  if (dateMatch) {
                    deliveryDate = dateMatch[1];
                    const quarterFromDate = getQuarterFromDate(deliveryDate);
                    if (quarterFromDate) {
                      assignedQuarterId = quarterFromDate;
                    }
                  }
                  
                  // Collect sibling blocks as notes
                  let engineeringDeliverable = '';
                  let engineeringLink = '';
                  let owner = 'Unassigned';
                  let ownerBlockId = '';
                  let extractedDeliveryDate = '';
                  let deliveryDateBlockId = '';
                  let extractedStatus: 'green' | 'yellow' | 'red' = 'green';
                  let extractedBlocker = '';
                  const parentBlockId = block.id; // synced_block ID
                  const noteItems: string[] = [];
                  
                  for (let j = startIdx + 1; j < endIdx; j++) {
                    const siblingBlock = syncChildrenData.results[j];
                    const siblingType = siblingBlock.type;
                    
                    if (siblingType === 'paragraph' || siblingType === 'bulleted_list_item' || siblingType === 'callout') {
                      // Handle callout blocks (colored background text) - rich_text is at different path
                      const siblingRichText = siblingType === 'callout' 
                        ? siblingBlock.callout?.rich_text || []
                        : siblingBlock[siblingType]?.rich_text || [];
                      const siblingText = siblingRichText.map((rt: any) => rt.plain_text).join('');
                      
                      // Extract any links from the rich text
                      let itemLink = '';
                      for (const rt of siblingRichText) {
                        if (rt.href) {
                          // Fix relative Notion links
                          if (rt.href.startsWith('/')) {
                            itemLink = `https://www.notion.so${rt.href}`;
                          } else if (rt.href.startsWith('#')) {
                            // Block anchor link - use page URL + anchor
                            itemLink = `https://www.notion.so/${NOTION_PAGE_ID}${rt.href}`;
                          } else {
                            itemLink = rt.href;
                          }
                          break;
                        }
                        // Also check for page mentions
                        if (rt.type === 'mention' && rt.mention?.type === 'page') {
                          itemLink = `https://www.notion.so/${rt.mention.page.id.replace(/-/g, '')}`;
                          break;
                        }
                        // Check for block mentions (internal links)
                        if (rt.type === 'mention' && rt.mention?.type === 'link_preview') {
                          itemLink = rt.mention.link_preview.url;
                          break;
                        }
                      }
                      
                      if (siblingText.toLowerCase().includes('engineering deliverable')) {
                        engineeringDeliverable = siblingText.replace(/^engineering deliverable[:\s]*/i, '').trim();
                        engineeringLink = itemLink;
                      } else if (siblingText.toLowerCase().startsWith('owner:')) {
                        // Store the block ID for later sync
                        ownerBlockId = siblingBlock.id;
                        // Check for user mention first (e.g., @Person Name)
                        let ownerFromMention = '';
                        for (const rt of siblingRichText) {
                          if (rt.type === 'mention' && rt.mention?.type === 'user') {
                            ownerFromMention = rt.mention.user?.name || rt.plain_text || '';
                            break;
                          }
                          // Also handle page mentions (linking to person pages)
                          if (rt.type === 'mention' && rt.mention?.type === 'page') {
                            ownerFromMention = rt.plain_text || '';
                            break;
                          }
                        }
                        owner = ownerFromMention || siblingText.replace(/^owner[:\s]*/i, '').trim();
                      } else if (siblingText.toLowerCase().includes('delivery date') || siblingText.toLowerCase().includes('delivery:')) {
                        // Store the block ID for later sync
                        deliveryDateBlockId = siblingBlock.id;
                        // Extract delivery date - check for date mention first
                        for (const rt of siblingRichText) {
                          if (rt.type === 'mention' && rt.mention?.type === 'date') {
                            extractedDeliveryDate = rt.mention.date.start;
                            break;
                          }
                        }
                        // Fallback: extract date from text (YYYY-MM-DD format)
                        if (!extractedDeliveryDate) {
                          const dateMatch = siblingText.match(/(\d{4}-\d{2}-\d{2})/);
                          if (dateMatch) {
                            extractedDeliveryDate = dateMatch[1];
                          }
                        }
                        // Fallback: try to parse text date formats like "March 30, 2026"
                        if (!extractedDeliveryDate) {
                          const textDateMatch = siblingText.match(/(?:delivery\s*date[:\s]*|delivery[:\s]*)(.+)/i);
                          if (textDateMatch) {
                            const dateStr = textDateMatch[1].trim();
                            const parsed = new Date(dateStr);
                            if (!isNaN(parsed.getTime())) {
                              extractedDeliveryDate = parsed.toISOString().split('T')[0];
                            }
                          }
                        }
                      } else if (siblingText.toLowerCase().startsWith('status:')) {
                        // Extract status (Red/Yellow/Green)
                        const statusValue = siblingText.replace(/^status[:\s]*/i, '').trim().toLowerCase();
                        if (statusValue.includes('red') || statusValue.includes('<80%') || statusValue.includes('at risk')) {
                          extractedStatus = 'red';
                        } else if (statusValue.includes('yellow') || statusValue.includes('>80%') || statusValue.includes('little off')) {
                          extractedStatus = 'yellow';
                        } else {
                          extractedStatus = 'green';
                        }
                        console.log(`    -> Status extracted: "${extractedStatus}"`);
                      } else if (siblingText.trim().toLowerCase().startsWith('blocker:') || siblingText.trim().toLowerCase().startsWith('blocker ')) {
                        // Extract blocker description - handle "Blocker:" or "Blocker " formats
                        extractedBlocker = siblingText.replace(/^\s*blocker[:\s]*/i, '').trim();
                        console.log(`    -> Blocker extracted: "${extractedBlocker}"`);
                      } else if (siblingText.length > 0) {
                        // Use extractRichTextWithLinks to preserve embedded links
                        const textWithLinks = extractRichTextWithLinks(siblingRichText);
                        noteItems.push(`${siblingType === 'bulleted_list_item' ? '• ' : ''}${textWithLinks}`);
                      }
                    } else if (siblingType === 'toggle') {
                      const toggleRichText = siblingBlock.toggle?.rich_text || [];
                      // Use extractRichTextWithLinks to get toggle title with embedded links
                      let toggleText = extractRichTextWithLinks(toggleRichText);
                      let toggleLink = '';
                      
                      console.log('Toggle rich_text:', JSON.stringify(toggleRichText, null, 2));
                      
                      // Check rich_text for page mentions or links
                      for (const rt of toggleRichText) {
                        // Handle page mentions (linked pages)
                        if (rt.type === 'mention' && rt.mention?.type === 'page') {
                          const pageId = rt.mention.page.id;
                          toggleLink = rt.href || `https://www.notion.so/${pageId.replace(/-/g, '')}`;
                          
                          // Fetch the actual page title from Notion API
                          if (!toggleText || toggleText === 'Untitled' || toggleText.trim() === '') {
                            try {
                              const pageRes = await fetch(`/api/notion/v1/pages/${pageId}`, {
                                headers: { 'Authorization': `Bearer ${NOTION_API_KEY}` }
                              });
                              if (pageRes.ok) {
                                const pageData = await pageRes.json();
                                // Get title from page properties
                                const titleProp = pageData.properties?.title?.title || pageData.properties?.Name?.title;
                                if (titleProp && titleProp.length > 0) {
                                  toggleText = titleProp.map((t: any) => t.plain_text).join('');
                                }
                              }
                            } catch (e) {
                              console.warn('Failed to fetch page title:', e);
                            }
                          }
                        }
                        // Handle regular links
                        if (rt.href && !toggleLink) {
                          toggleLink = rt.href;
                        }
                        // Get plain text as fallback
                        if (rt.plain_text && (!toggleText || toggleText === 'Untitled')) {
                          if (rt.plain_text !== 'Untitled' && rt.plain_text.trim() !== '') {
                            toggleText = rt.plain_text;
                          }
                        }
                      }
                      
                      // ALWAYS fetch toggle children to get content (pages, text, nested toggles)
                      const toggleChildContent: string[] = [];
                      if (siblingBlock.has_children) {
                        try {
                          const toggleChildrenRes = await fetch(`/api/notion/v1/blocks/${siblingBlock.id}/children?page_size=50`, {
                            headers: { 'Authorization': `Bearer ${NOTION_API_KEY}` }
                          });
                          if (toggleChildrenRes.ok) {
                            const toggleChildrenData = await toggleChildrenRes.json();
                            console.log('Toggle children:', toggleChildrenData.results.map((c: any) => ({
                              type: c.type,
                              title: c.child_page?.title || c.link_to_page?.page_id || '',
                              text: c[c.type]?.rich_text?.map((rt: any) => rt.plain_text).join('') || ''
                            })));
                            
                            for (const toggleChild of toggleChildrenData.results) {
                              if (toggleChild.type === 'child_page') {
                                const pageName = toggleChild.child_page?.title || '';
                                if (pageName && pageName !== 'Untitled') {
                                  if (!toggleText || toggleText === 'Untitled') {
                                    toggleText = pageName;
                                    toggleLink = `https://www.notion.so/${toggleChild.id.replace(/-/g, '')}`;
                                  } else {
                                    toggleChildContent.push(`  📄 ${pageName}`);
                                  }
                                }
                              } else if (toggleChild.type === 'link_to_page') {
                                // Fetch the linked page to get its title
                                const linkedPageId = toggleChild.link_to_page?.page_id;
                                if (linkedPageId) {
                                  try {
                                    const linkedPageRes = await fetch(`/api/notion/v1/pages/${linkedPageId}`, {
                                      headers: { 'Authorization': `Bearer ${NOTION_API_KEY}` }
                                    });
                                    if (linkedPageRes.ok) {
                                      const linkedPageData = await linkedPageRes.json();
                                      const titleProp = linkedPageData.properties?.title?.title || linkedPageData.properties?.Name?.title;
                                      if (titleProp && titleProp.length > 0) {
                                        const linkedTitle = titleProp.map((t: any) => t.plain_text).join('');
                                        if (!toggleText || toggleText === 'Untitled') {
                                          toggleText = linkedTitle;
                                          toggleLink = `https://www.notion.so/${linkedPageId.replace(/-/g, '')}`;
                                        } else {
                                          toggleChildContent.push(`  📄 ${linkedTitle}`);
                                        }
                                      }
                                    }
                                  } catch (e) {
                                    console.warn('Failed to fetch linked page:', e);
                                  }
                                }
                              } else if (toggleChild.type === 'paragraph' || toggleChild.type === 'bulleted_list_item' || toggleChild.type === 'numbered_list_item') {
                                // Extract text content from inside the toggle
                                const childRichText = toggleChild[toggleChild.type]?.rich_text || [];
                                const childText = childRichText.map((rt: any) => rt.plain_text).join('');
                                if (childText.trim()) {
                                  const prefix = toggleChild.type === 'bulleted_list_item' ? '  • ' : 
                                                 toggleChild.type === 'numbered_list_item' ? '  ∙ ' : '  ';
                                  toggleChildContent.push(`${prefix}${childText}`);
                                }
                              } else if (toggleChild.type === 'heading_3' || toggleChild.type === 'heading_2') {
                                const childRichText = toggleChild[toggleChild.type]?.rich_text || [];
                                const childText = childRichText.map((rt: any) => rt.plain_text).join('');
                                if (childText.trim()) {
                                  toggleChildContent.push(`  ▪ ${childText}`);
                                }
                              } else if (toggleChild.type === 'toggle') {
                                // Nested toggle — get its title and recursively fetch all content
                                const nestedRichText = toggleChild.toggle?.rich_text || [];
                                const nestedTitle = nestedRichText.map((rt: any) => rt.plain_text).join('');
                                if (nestedTitle.trim()) {
                                  toggleChildContent.push(`  ▸ ${nestedTitle}`);
                                }
                                // Recursively fetch ALL nested toggle children (any depth)
                                if (toggleChild.has_children) {
                                  try {
                                    const nestedContent = await fetchToggleContentRecursive(toggleChild.id, 1, 10);
                                    toggleChildContent.push(...nestedContent);
                                  } catch (e) {
                                    console.warn('Failed to fetch nested toggle children:', e);
                                  }
                                }
                              }
                            }
                          }
                        } catch (e) {
                          console.warn('Failed to fetch toggle children:', e);
                        }
                      }
                      
                      if (toggleText && toggleText.length > 0) {
                        let toggleEntry = `▸ ${toggleText}`;
                        if (toggleLink) {
                          toggleEntry += `\n  🔗 ${toggleLink}`;
                        }
                        if (toggleChildContent.length > 0) {
                          toggleEntry += '\n' + toggleChildContent.join('\n');
                        }
                        noteItems.push(toggleEntry);
                      } else if (toggleChildContent.length > 0) {
                        // No toggle title but has content
                        noteItems.push(toggleChildContent.join('\n'));
                      }
                    } else if (siblingType === 'child_page') {
                      const pageName = siblingBlock.child_page?.title || '';
                      if (pageName) {
                        noteItems.push(`📄 ${pageName}`);
                      }
                    } else if (siblingType === 'link_to_page') {
                      // Handle link_to_page blocks (embedded page links)
                      const pageId = siblingBlock.link_to_page?.page_id;
                      if (pageId) {
                        noteItems.push(`📄 https://www.notion.so/${pageId.replace(/-/g, '')}`);
                      }
                    }
                  }
                  
                  // Use extracted delivery date if we didn't get one from title
                  if (!deliveryDate && extractedDeliveryDate) {
                    deliveryDate = extractedDeliveryDate;
                    const quarterFromDate = getQuarterFromDate(deliveryDate);
                    if (quarterFromDate) {
                      assignedQuarterId = quarterFromDate;
                    }
                  }
                  
                  // Build notes string with engineering link included
                  let notes = '';
                  if (engineeringDeliverable) {
                    if (engineeringLink) {
                      notes += `🔧 Engineering: ${engineeringDeliverable}\n🔗 ${engineeringLink}\n`;
                    } else {
                      notes += `🔧 Engineering: ${engineeringDeliverable}\n`;
                    }
                  }
                  if (noteItems.length > 0) {
                    notes += noteItems.join('\n');
                  }
                  
                  console.log(`Found deliverable: "${deliverableTitle}", date=${deliveryDate}, status="${extractedStatus}", blocker="${extractedBlocker}", milestone="${currentMilestoneTitle}"`);
                  newStickies.push({
                    id: deliverableBlock.id,
                    title: deliverableTitle,
                    owner: owner,
                    laneId: currentLaneId,
                    quarterId: assignedQuarterId,
                    isDone: false,
                    status: extractedStatus,
                    blocker: extractedBlocker || undefined,
                    wikiUrl: '', // Will be set from KNOWN_URLS based on lane
                    deliveryDate: deliveryDate,
                    notes: notes.trim(),
                    milestoneId: currentMilestoneId,
                    milestoneTitle: currentMilestoneTitle,
                    // Block IDs for Notion sync
                    ownerBlockId: ownerBlockId || undefined,
                    deliveryDateBlockId: deliveryDateBlockId || undefined,
                    parentBlockId: parentBlockId
                  });
                }
              }
            } catch (e) {
              console.warn('Failed to fetch synced block children:', e);
            }
            continue;
          }
          
          if (!textContent) {
            console.log(`Skipping block with no text: type=${type}`);
            continue;
          }
          console.log(`Processing block: type=${type}, text="${textContent.substring(0, 60)}..."`);
          

          // H1 = Key Milestone
          if (type === 'heading_1') {
            // Try to extract date from title (e.g., "by 2026-03-01" or "2025-12-22")
            const dateMatch = textContent.match(/(\d{4}-\d{2}-\d{2})/);
            let milestoneQuarterId = currentQuarterId;
            let milestoneDate = 'TBD';
            
            if (dateMatch) {
              const extractedDate = dateMatch[1];
              const dateQuarter = getQuarterFromDate(extractedDate);
              if (dateQuarter) {
                milestoneQuarterId = dateQuarter;
                currentQuarterId = dateQuarter; // Update current for following items
              }
              milestoneDate = new Date(extractedDate).toLocaleDateString('en-US', { 
                month: 'short', day: 'numeric', year: 'numeric' 
              });
            } else {
              // Fallback: try to find quarter from text like "Q1 2026"
            const q = findQuarter(textContent);
              if (q) {
                currentQuarterId = q.id;
                milestoneQuarterId = q.id;
                milestoneDate = `${q.label} ${q.year}`;
              }
            }
            
            const milestoneId = block.id;
            const milestoneTitle = textContent;
            
            newMilestones.push({
              id: milestoneId,
              title: milestoneTitle,
              quarterId: milestoneQuarterId,
              date: milestoneDate,
              status: 'green',
              colorClass: 'bg-blue-600',
              description: 'Imported from Notion Roadmap'
            });
            
            // Track current milestone for association with following deliverables
            currentMilestoneId = milestoneId;
            currentMilestoneTitle = milestoneTitle;
          }
          // H2 = Lane identifier, and possibly also a deliverable
          else if (type === 'heading_2') {
            const lane = findLane(textContent, LANES);
            
            // Check if this is a "lane header only" format like "A8b - Gaming Use Case (A8b)"
            // or "S1 - Demo Sales" - using dash separator
            const isLaneHeaderFormat = /^[A-Z]\d+[a-z]?\s*[-–]\s+/i.test(textContent);
            
            if (lane) {
              console.log(`H2 Lane found: "${textContent}" → ${lane.id}`);
              currentLaneId = lane.id;
              
              if (isLaneHeaderFormat) {
                // Fetch children of this lane header to find "Deliverable:" content
                if (block.has_children) {
                  try {
                    const childrenRes = await fetch(`/api/notion/v1/blocks/${block.id}/children?page_size=100`, {
                      headers: { 'Authorization': `Bearer ${NOTION_API_KEY}` }
                    });
                    if (childrenRes.ok) {
                      const childrenData = await childrenRes.json();
                      console.log(`Children of ${textContent}:`, childrenData.results.map((c: any) => ({
                        type: c.type,
                        text: c[c.type]?.rich_text?.map((rt: any) => rt.plain_text).join('') || ''
                      })));
                      
                      for (const child of childrenData.results) {
                        const childType = child.type;
                        
                        // Handle synced_block - fetch its children
                        if (childType === 'synced_block' && child.has_children) {
                          console.log('Found synced_block in H2, fetching its children...');
                          try {
                            const syncRes = await fetch(`/api/notion/v1/blocks/${child.id}/children?page_size=100`, {
                              headers: { 'Authorization': `Bearer ${NOTION_API_KEY}` }
                            });
                            if (syncRes.ok) {
                              const syncData = await syncRes.json();
                              // Process synced block content - reuse the synced_block parsing logic
                              // by adding these blocks to be processed
                              for (const syncChild of syncData.results) {
                                const syncChildType = syncChild.type;
                                const syncChildRichText = syncChild[syncChildType]?.rich_text;
                                if (Array.isArray(syncChildRichText)) {
                                  const syncChildText = syncChildRichText.map((rt: any) => rt.plain_text).join('');
                                  if (syncChildText.toLowerCase().startsWith('deliverable')) {
                                    const deliverableTitle = syncChildText.replace(/^deliverable[:\s]*\d*[:\s]*/i, '').trim();
                                    if (deliverableTitle.length > 3) {
                                      console.log(`Found deliverable in H2 synced block for ${lane.id}: "${deliverableTitle}"`);
                                      
                                      // Extract date and other info from title
                                      const dateMatch = syncChildText.match(/(\d{4}-\d{2}-\d{2})/);
                                      let deliveryDate = dateMatch ? dateMatch[1] : '';
                                      let assignedQuarterId = currentQuarterId;
                                      if (deliveryDate) {
                                        const qFromDate = getQuarterFromDate(deliveryDate);
                                        if (qFromDate) assignedQuarterId = qFromDate;
                                      }
                                      
                                      newStickies.push({
                                        id: syncChild.id,
                                        title: deliverableTitle,
                                        owner: 'Unassigned',
                                        laneId: lane.id,
                                        quarterId: assignedQuarterId,
                                        isDone: false,
                                        status: 'green',
                                        wikiUrl: '',
                                        deliveryDate: deliveryDate,
                                        notes: '',
                                        milestoneId: currentMilestoneId,
                                        milestoneTitle: currentMilestoneTitle
                                      });
                                    }
                                  }
                                }
                              }
                            }
                          } catch (e) {
                            console.warn('Failed to fetch synced block in H2:', e);
                          }
                          continue;
                        }
                        
                        const childRichText = child[childType]?.rich_text;
                        if (!Array.isArray(childRichText)) continue;
                        
                        const childText = childRichText.map((rt: any) => rt.plain_text).join('');
                        
                        // Look for "Deliverable:" lines
                        if (childText.toLowerCase().startsWith('deliverable')) {
                          const deliverableTitle = childText.replace(/^deliverable[:\s]*\d*[:\s]*/i, '').trim();
                          if (deliverableTitle.length > 3) {
                            console.log(`Found deliverable in ${lane.id}: "${deliverableTitle}"`);
                            
                            const dateMatch = childText.match(/(\d{4}-\d{2}-\d{2})/);
                            let deliveryDate = dateMatch ? dateMatch[1] : '';
                            let assignedQuarterId = currentQuarterId;
                            if (deliveryDate) {
                              const qFromDate = getQuarterFromDate(deliveryDate);
                              if (qFromDate) assignedQuarterId = qFromDate;
                            }
                            
              newStickies.push({
                              id: child.id,
                              title: deliverableTitle,
                              owner: 'Unassigned',
                              laneId: lane.id,
                              quarterId: assignedQuarterId,
                              isDone: false,
                              status: 'green',
                              wikiUrl: '',
                              deliveryDate: deliveryDate,
                              notes: '',
                              milestoneId: currentMilestoneId,
                              milestoneTitle: currentMilestoneTitle
                            });
                          }
                        }
                      }
                    }
                  } catch (e) {
                    console.warn('Failed to fetch lane children:', e);
                  }
                }
                continue;
              }
              // Descriptive heading (like "Demo Sales Collateral") - handled separately
            }
          }
          
          // ONLY H3 with "Checkpoint" creates a card on the roadmap
          // All other non-header content (toggles, paragraphs, bullets) are notes
          const isCheckpoint = type === 'heading_3' && textContent.toLowerCase().includes('checkpoint');
          console.log(`Block check: type=${type}, text="${textContent.substring(0, 50)}...", isCheckpoint=${isCheckpoint}`);
          
          // Skip non-checkpoint content at top level (it will be captured as notes by the checkpoint processing)
          if (!isCheckpoint) {
            // Skip H2 lane headers (already handled above)
            if (type === 'heading_2') {
              const isLaneHeaderFormat = /^[A-Z]\d+[a-z]?\s*[-–]\s+/i.test(textContent);
              if (isLaneHeaderFormat && findLane(textContent, LANES)) {
                continue;
              }
            }
            // Skip all other non-header content (toggles, paragraphs, bullets, etc.)
            // These are captured as notes by the preceding checkpoint
            continue;
          }
          
          // Process H3 Checkpoint - creates a card
          if (isCheckpoint) {
            // Clean up "Checkpoint X:" prefix
            const cleanTitle = textContent.replace(/^checkpoint\s*\d*[:\s]*/i, '').trim();
            
            // Only add if title has content
            if (cleanTitle.length > 3) {
              const sticky: StickyNote = {
                id: block.id,
                title: cleanTitle,
                owner: 'Unassigned',
                laneId: currentLaneId,
                quarterId: currentQuarterId,
                isDone: false,
                status: 'green',
                wikiUrl: '',
                deliveryDate: '',
                notes: '',
                milestoneId: currentMilestoneId,
                milestoneTitle: currentMilestoneTitle
              };
              
              // For heading_3 checkpoints, look at SIBLING blocks for Owner/Delivery Date
              if (type === 'heading_3' && isCheckpoint) {
                const blockIndex = data.results.indexOf(block);
                console.log(`Processing checkpoint "${cleanTitle}" at index ${blockIndex}, looking for sibling metadata...`);
                
                const noteItems: string[] = [];
                // Look at next few blocks until we hit another heading or divider
                for (let sibIdx = blockIndex + 1; sibIdx < data.results.length; sibIdx++) {
                  const siblingBlock = data.results[sibIdx];
                  const sibType = siblingBlock.type;
                  
                  // Stop at headings, dividers, or synced_blocks
                  if (sibType === 'heading_1' || sibType === 'heading_2' || sibType === 'heading_3' || 
                      sibType === 'divider' || sibType === 'synced_block') {
                    break;
                  }
                  
                  const sibRichText = siblingBlock[sibType]?.rich_text;
                  if (!Array.isArray(sibRichText)) continue;
                  
                  const sibText = sibRichText.map((rt: any) => rt.plain_text).join('');
                  console.log(`  Sibling ${sibIdx}: type=${sibType}, text="${sibText.substring(0, 50)}..."`);
                  
                  // Extract Owner
                  if (sibText.toLowerCase().startsWith('owner:')) {
                    sticky.ownerBlockId = siblingBlock.id;
                    let ownerFromMention = '';
                    for (const rt of sibRichText) {
                      if (rt.type === 'mention' && rt.mention?.type === 'user') {
                        ownerFromMention = rt.mention.user?.name || rt.plain_text || '';
                        break;
                      }
                      if (rt.type === 'mention' && rt.mention?.type === 'page') {
                        ownerFromMention = rt.plain_text || '';
                        break;
                      }
                    }
                    sticky.owner = ownerFromMention || sibText.replace(/^owner[:\s]*/i, '').trim();
                    console.log(`    -> Owner: "${sticky.owner}"`);
                  }
                  // Extract Delivery Date
                  else if (sibText.toLowerCase().includes('delivery date') || sibText.toLowerCase().includes('delivery:')) {
                    sticky.deliveryDateBlockId = siblingBlock.id;
                    for (const rt of sibRichText) {
                      if (rt.type === 'mention' && rt.mention?.type === 'date') {
                        sticky.deliveryDate = rt.mention.date.start;
                        break;
                      }
                    }
                    if (!sticky.deliveryDate) {
                      const dMatch = sibText.match(/(\d{4}-\d{2}-\d{2})/);
                      if (dMatch) sticky.deliveryDate = dMatch[1];
                    }
                    if (!sticky.deliveryDate) {
                      const textDateMatch = sibText.match(/(?:delivery\s*date[:\s]*|delivery[:\s]*)(.+)/i);
                      if (textDateMatch) {
                        const dateStr = textDateMatch[1].trim();
                        const parsed = new Date(dateStr);
                        if (!isNaN(parsed.getTime())) {
                          sticky.deliveryDate = parsed.toISOString().split('T')[0];
                        }
                      }
                    }
                    console.log(`    -> Delivery Date: "${sticky.deliveryDate}"`);
                  }
                  // Extract Status (Red/Amber/Yellow/Green)
                  else if (sibText.toLowerCase().startsWith('status:')) {
                    const statusText = sibText.toLowerCase();
                    if (statusText.includes('red') || statusText.includes('🔴') || statusText.includes('blocked')) {
                      sticky.status = 'red';
                    } else if (statusText.includes('yellow') || statusText.includes('amber') || statusText.includes('🟡') || statusText.includes('🟠') || statusText.includes('at risk')) {
                      sticky.status = 'yellow';
                    } else if (statusText.includes('green') || statusText.includes('🟢') || statusText.includes('on track')) {
                      sticky.status = 'green';
                    }
                    console.log(`    -> Status: "${sticky.status}"`);
                  }
                  // Collect other content as notes
                  else if (sibText.length > 0) {
                    if (sibType === 'bulleted_list_item') {
                      noteItems.push(`• ${sibText}`);
                    } else if (sibType === 'toggle') {
                      noteItems.push(`▸ ${sibText}`);
                      // Recursively fetch ALL toggle children (any depth)
                      if (siblingBlock.has_children) {
                        try {
                          const nestedContent = await fetchToggleContentRecursive(siblingBlock.id, 0, 10);
                          noteItems.push(...nestedContent);
                        } catch (e) {
                          console.warn('Failed to fetch toggle children:', e);
                        }
                      }
                    } else {
                      noteItems.push(sibText);
                    }
                  }
                  
                  // Also fetch children of sibling blocks (e.g., toggles nested inside paragraphs)
                  if (siblingBlock.has_children && sibType !== 'toggle') {
                    try {
                      const sibChildrenRes = await fetch(`/api/notion/v1/blocks/${siblingBlock.id}/children?page_size=50`, {
                        headers: { 'Authorization': `Bearer ${NOTION_API_KEY}` }
                      });
                      if (sibChildrenRes.ok) {
                        const sibChildrenData = await sibChildrenRes.json();
                        for (const sibChild of sibChildrenData.results) {
                          const scType = sibChild.type;
                          if (scType === 'toggle') {
                            const scRichText = sibChild.toggle?.rich_text || [];
                            const scText = scRichText.map((rt: any) => rt.plain_text).join('');
                            if (scText.trim()) {
                              noteItems.push(`▸ ${scText}`);
                              // Recursively fetch ALL nested toggle children (any depth)
                              if (sibChild.has_children) {
                                try {
                                  const nestedContent = await fetchToggleContentRecursive(sibChild.id, 0, 10);
                                  noteItems.push(...nestedContent);
                                } catch (e) {
                                  console.warn('Failed to fetch nested toggle children:', e);
                                }
                              }
                            }
                          } else {
                            const scRichText = sibChild[scType]?.rich_text;
                            if (Array.isArray(scRichText)) {
                              const scText = scRichText.map((rt: any) => rt.plain_text).join('');
                              if (scText.trim() && !scText.toLowerCase().startsWith('owner:') && !scText.toLowerCase().includes('delivery')) {
                                noteItems.push(`  ${scText}`);
                              }
                            }
                          }
                        }
                      }
                    } catch (e) {
                      console.warn('Failed to fetch sibling block children:', e);
                    }
                  }
                }
                
                if (noteItems.length > 0) {
                  sticky.notes = noteItems.join('\n');
                }
                
                // Auto-assign quarter based on delivery date
                if (sticky.deliveryDate) {
                  const dateQuarter = getQuarterFromDate(sticky.deliveryDate);
                  if (dateQuarter) {
                    sticky.quarterId = dateQuarter;
                  }
                }
                
                console.log(`Created checkpoint sticky: "${sticky.title}", owner="${sticky.owner}", date="${sticky.deliveryDate}", lane="${sticky.laneId}"`);
                newStickies.push(sticky);
              }
            }
          }
        }

        // Post-process: Associate known URLs with specific items
        const KNOWN_URLS: Record<string, string> = {
          'lane-a8b': 'https://www.notion.so/cere/Gaming-Use-Case-A8b-2a0d800083d68033a8dffa19cbaf0620', // Gaming Demo (A8b)
          'lane-a7': 'https://www.notion.so/cere/A7-Nightingale-Integration-Wiki', // NG Demo (A7)
          'lane-s1': 'https://www.notion.so/cere/S1-CEF-Demos-2ccd800083d680cc883bf8e4fa986e04', // CEF Demos (S1)
          'lane-s2': 'https://www.notion.so/cere/S2-CEF-Website-Vertical-Pages-2ccd800083d68020891ed6d9f4061b3e', // CEF Website (S2)
          'lane-s3': 'https://www.notion.so/cere/CEF-ICP-S3-2ccd800083d68003be72ddc9a1ce2f03', // CEF ICP (S3)
          'lane-s4': 'https://www.notion.so/cere/CEF-Campaigns-S4-2ccd800083d6808e9b92df0c93146347', // CEF Campaigns (S4)
          'lane-b3': 'https://www.notion.so/cere/CEF-AI-Product-Marketing-B3-293d800083d680fb9b48e6a9b47aaf77', // Product Marketing (B3)
          'lane-b4': 'https://www.notion.so/cere/B4-CEF-AI-Enterprise-G2M-Wiki', // Enterprise G2M (B4)
        };
        
        // Apply known URLs to stickies that don't have a wikiUrl yet
        for (const sticky of newStickies) {
          if (!sticky.wikiUrl && KNOWN_URLS[sticky.laneId]) {
            sticky.wikiUrl = KNOWN_URLS[sticky.laneId];
          }
        }

        console.log('Parsed milestones:', newMilestones);
        console.log('Parsed stickies:', newStickies);

        setMilestones(newMilestones);
        setStickies(newStickies);
        setLoading(false);

      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to fetch roadmap');
        setLoading(false);
      }
    }

    fetchNotionData();
  }, [activeView]);


  // -- Derived Data --
  const uniqueOwners = useMemo(() => getUniqueOwners(stickies), [stickies]);
  const uniqueGroups = useMemo(() => getUniqueGroups(LANES), []);

  const healthStats = useMemo(() => ({
    red: stickies.filter(s => s.status === 'red' && !s.isDone).length,
    yellow: stickies.filter(s => s.status === 'yellow' && !s.isDone).length,
    green: stickies.filter(s => s.status === 'green' && !s.isDone).length,
    done: stickies.filter(s => s.isDone).length,
  }), [stickies]);

  // Auto-expand groups that have stickies after data loads
  useEffect(() => {
    if (!hasInitializedGroups && stickies.length > 0 && !loading) {
      // Find which groups have stickies
      const groupsWithContent = new Set<string>();
      stickies.forEach(sticky => {
        const lane = LANES.find(l => l.id === sticky.laneId);
        if (lane) {
          groupsWithContent.add(lane.group);
        }
      });
      
      // Only collapse groups WITHOUT content
      const allGroups = new Set(LANES.map(l => l.group));
      const groupsToCollapse = new Set<string>();
      allGroups.forEach(group => {
        if (!groupsWithContent.has(group)) {
          groupsToCollapse.add(group);
        }
      });
      
      setCollapsedGroups(groupsToCollapse);
      setHasInitializedGroups(true);
    }
  }, [stickies, loading, hasInitializedGroups]);

  // -- Actions --

  const handleCopyPrompt = () => {
    const prompt = `Create a detailed Multi-Year Roadmap Board for 2026 and 2027.\nStructure:\nColumns: Q1-Q4 2026, Q1-Q4 2027.\nRows: 1. Product Features, 2. Core Platform, 3. Commercial, 4. Partnerships, 5. Team.\nContent: High density, past tense verbs (outcomes only). No "planning" or "research".`;
    navigator.clipboard.writeText(prompt);
    alert("Miro Prompt copied to clipboard!");
  };

  const toggleGroup = (groupName: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(groupName)) newCollapsed.delete(groupName);
    else newCollapsed.add(groupName);
    setCollapsedGroups(newCollapsed);
  };
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, laneId: string, columnId: string) => {
    e.preventDefault();
    if (!draggedId) return;
    
    // Find the sticky being moved
    const sticky = stickies.find(s => s.id === draggedId);
    if (!sticky) return;
    
    // Find the target column
    const column = timelineColumns.find(c => c.id === columnId);
    let suggestedDate = '';
    let targetQuarterId = columnId; // For quarter view, columnId is the quarterId
    
    if (column) {
      // Calculate a date in the middle of the column
      const midTime = (column.startDate.getTime() + column.endDate.getTime()) / 2;
      const midDate = new Date(midTime);
      suggestedDate = midDate.toISOString().split('T')[0];
      
      // For non-quarter views, we need to calculate the quarterId from the date
      if (zoomLevel !== 'quarter') {
        const qFromDate = getQuarterFromDate(suggestedDate);
        targetQuarterId = qFromDate || sticky.quarterId;
      }
    }
    
    // Open confirmation modal
    setPendingMove({
      stickyId: draggedId,
      targetLaneId: laneId,
      targetQuarterId: targetQuarterId,
      newDeliveryDate: sticky.deliveryDate || suggestedDate,
    });
    setDraggedId(null);
  };
  
  const confirmMove = async () => {
    if (!pendingMove) return;
    
    const stickyId = pendingMove.stickyId;
    const newDate = pendingMove.newDeliveryDate;
    
    // Update local state immediately
    setStickies(prev => prev.map(note => 
      note.id === stickyId 
        ? { 
            ...note, 
            laneId: pendingMove.targetLaneId, 
            quarterId: pendingMove.targetQuarterId,
            deliveryDate: newDate 
          } 
        : note
    ));
    setPendingMove(null);
    
    // Update Notion in background
    try {
      // Fetch children of the sticky block to find the "Delivery date:" block
      const childrenRes = await fetch(`/api/notion/v1/blocks/${stickyId}/children?page_size=100`, {
        headers: { 'Authorization': `Bearer ${NOTION_API_KEY}` }
      });
      
      if (!childrenRes.ok) {
        console.warn('Could not fetch sticky children for Notion update');
        return;
      }
      
      const childrenData = await childrenRes.json();
      
      // Find the delivery date block
      let deliveryDateBlockId: string | null = null;
      for (const child of childrenData.results) {
        const childType = child.type;
        const richText = child[childType]?.rich_text;
        if (Array.isArray(richText)) {
          const text = richText.map((rt: any) => rt.plain_text).join('').toLowerCase();
          if (text.includes('delivery date')) {
            deliveryDateBlockId = child.id;
            break;
          }
        }
      }
      
      if (deliveryDateBlockId) {
        // Update the delivery date block
        const formattedDate = new Date(newDate).toLocaleDateString('en-US', { 
          month: 'long', day: 'numeric', year: 'numeric' 
        });
        
        await fetch(`/api/notion/v1/blocks/${deliveryDateBlockId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${NOTION_API_KEY}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28'
          },
          body: JSON.stringify({
            paragraph: {
              rich_text: [{
                type: 'text',
                text: { content: `Delivery date: ${formattedDate}` }
              }]
            }
          })
        });
        console.log('✅ Notion updated with new delivery date:', newDate);
      } else {
        console.warn('Could not find Delivery date block in Notion to update');
      }
    } catch (e) {
      console.warn('Failed to update Notion:', e);
    }
  };
  
  const cancelMove = () => {
    setPendingMove(null);
  };

  const handleResetBoard = () => {
    if (window.confirm("Reload data from Notion?")) {
      window.location.reload();
    }
  };

  // Sticky Modal Handlers
  const openNewStickyModal = (laneId: string, quarterId: string) => {
    setEditingSticky({
      id: undefined, // New
      title: '',
      owner: '',
      laneId,
      quarterId,
      status: 'green',
      isDone: false,
      blocker: '',
      wikiUrl: '',
      deliveryDate: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (note: StickyNote) => {
    setEditingSticky({ ...note });
    setIsModalOpen(true);
  };

  const saveSticky = async () => {
    if (!editingSticky || !editingSticky.title) return;

    // Find original sticky to detect changes
    const originalSticky = stickies.find(s => s.id === editingSticky.id);

    if (editingSticky.id) {
      setStickies(prev => prev.map(s => s.id === editingSticky.id ? editingSticky as StickyNote : s));
    } else {
      const newNote: StickyNote = {
        ...(editingSticky as StickyNote),
        id: Date.now().toString(),
        owner: editingSticky.owner || 'Unassigned',
      };
      setStickies(prev => [...prev, newNote]);
    }
    setIsModalOpen(false);
    setEditingSticky(null);

    // Sync changes to Notion in background
    if (originalSticky && editingSticky.id) {
      try {
        // Sync Owner changes
        if (originalSticky.owner !== editingSticky.owner && editingSticky.ownerBlockId) {
          console.log(`Syncing owner change to Notion: ${originalSticky.owner} → ${editingSticky.owner}`);
          await fetch(`/api/notion/v1/blocks/${editingSticky.ownerBlockId}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${NOTION_API_KEY}`,
              'Content-Type': 'application/json',
              'Notion-Version': '2022-06-28'
            },
            body: JSON.stringify({
              paragraph: {
                rich_text: [{
                  type: 'text',
                  text: { content: `Owner: ${editingSticky.owner}` }
                }]
              }
            })
          });
          console.log('✅ Notion owner updated');
        }

        // Sync Delivery Date changes
        if (originalSticky.deliveryDate !== editingSticky.deliveryDate && editingSticky.deliveryDateBlockId) {
          console.log(`Syncing delivery date change to Notion: ${originalSticky.deliveryDate} → ${editingSticky.deliveryDate}`);
          const formattedDate = editingSticky.deliveryDate 
            ? new Date(editingSticky.deliveryDate).toLocaleDateString('en-US', { 
                month: 'long', day: 'numeric', year: 'numeric' 
              })
            : 'TBD';
          
          await fetch(`/api/notion/v1/blocks/${editingSticky.deliveryDateBlockId}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${NOTION_API_KEY}`,
              'Content-Type': 'application/json',
              'Notion-Version': '2022-06-28'
            },
            body: JSON.stringify({
              paragraph: {
                rich_text: [{
                  type: 'text',
                  text: { content: `Delivery Date: ${formattedDate}` }
                }]
              }
            })
          });
          console.log('✅ Notion delivery date updated');
        }
      } catch (e) {
        console.warn('Failed to sync changes to Notion:', e);
      }
    }
  };

  const deleteEditingSticky = () => {
    if (editingSticky?.id) {
      if (window.confirm("Are you sure you want to delete this?")) {
        setStickies(prev => prev.filter(s => s.id !== editingSticky.id));
        setIsModalOpen(false);
      }
    }
  };

  // Milestone Handlers
  const openMilestoneModal = (milestone: Milestone) => {
    setSelectedMilestone(milestone);
    setIsMilestoneModalOpen(true);
  };

  const addMilestone = (quarterId: string) => {
    const title = prompt("New Milestone Title:");
    if (!title) return;
    const newMilestone: Milestone = {
      id: Date.now().toString(),
      title,
      quarterId,
      date: 'TBD',
      status: 'yellow',
      description: 'Add description...',
      colorClass: 'bg-slate-600'
    };
    setMilestones([...milestones, newMilestone]);
  };

  const deleteMilestone = (id: string) => {
    if(window.confirm("Delete this milestone?")) {
        setMilestones(prev => prev.filter(m => m.id !== id));
    }
  };

  // Filter Logic
  const filteredStickies = stickies.filter(s => {
    // 1. Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matches = s.title.toLowerCase().includes(q) || s.owner.toLowerCase().includes(q);
      if (!matches) return false;
    }

    // 2. Status Filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'done' && !s.isDone) return false;
      if (statusFilter !== 'done' && s.status !== statusFilter) return false;
      if (statusFilter !== 'done' && s.isDone) return false; 
    }

    // 3. Owner Filter
    if (ownerFilter !== 'all' && s.owner !== ownerFilter) return false;

    // 4. Group Filter
    if (groupFilter !== 'all') {
      const lane = LANES.find(l => l.id === s.laneId);
      if (!lane || lane.group !== groupFilter) return false;
    }

    return true;
  });
  
  // Get stickies that fall within the visible timeline
  const getStickiesForColumn = (column: TimelineColumn, laneId: string) => {
    return filteredStickies.filter(s => {
      if (s.laneId !== laneId) return false;
      return stickyBelongsInColumn(s, column);
    });
  };

  const isSaveDisabled = !editingSticky?.title || editingSticky.title.trim().length === 0;

  // Grouping Logic
  const groupedLanes = LANES.reduce((acc, lane) => {
    if (!acc[lane.group]) acc[lane.group] = [];
    acc[lane.group].push(lane);
    return acc;
  }, {} as Record<string, Lane[]>);

  const STATUS_DOT_COLORS: Record<StickyStatus, string> = {
    green: 'bg-green-500',
    yellow: 'bg-amber-400',
    red: 'bg-red-500',
  };

  // -- Render --

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white text-gray-900">
      
      {/* === HEADER (60px, Minimal) === */}
      <header className="h-[56px] shrink-0 bg-slate-900 px-4 flex items-center justify-between z-50">
         
         {/* Left: Brand + View Toggle */}
         <div className="flex items-center gap-6">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                <FolderOpen size={16} className="text-white" />
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-white">Roadmap</h1>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Outcome Driven</span>
              </div>
            </div>

            {/* CEF/CERE Toggle */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setActiveView('cef')}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeView === 'cef'
                    ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                CEF
              </button>
              <button
                onClick={() => setActiveView('cere')}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeView === 'cere'
                    ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                CERE
              </button>
            </div>
         </div>

         {/* Center: Timeline Controls */}
         <div className="flex items-center gap-3">
            {/* Zoom Level */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5">
              {(['week', 'month', 'quarter', 'year'] as ZoomLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => {
                    setZoomLevel(level);
                    setReferenceDate(new Date());
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize ${
                    zoomLevel === level
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>

            {/* Navigation */}
            {zoomLevel !== 'quarter' && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const newDate = new Date(referenceDate);
                    if (zoomLevel === 'week') newDate.setDate(newDate.getDate() - 7);
                    else if (zoomLevel === 'month') newDate.setMonth(newDate.getMonth() - 1);
                    else if (zoomLevel === 'year') newDate.setFullYear(newDate.getFullYear() - 1);
                    setReferenceDate(newDate);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                >
                  <ChevronRight size={16} className="rotate-180" />
                </button>
                <button
                  onClick={() => setReferenceDate(new Date())}
                  className="px-2.5 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => {
                    const newDate = new Date(referenceDate);
                    if (zoomLevel === 'week') newDate.setDate(newDate.getDate() + 7);
                    else if (zoomLevel === 'month') newDate.setMonth(newDate.getMonth() + 1);
                    else if (zoomLevel === 'year') newDate.setFullYear(newDate.getFullYear() + 1);
                    setReferenceDate(newDate);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
                <span className="text-xs text-slate-400 ml-2 min-w-[100px]">
                  {zoomLevel === 'week' && referenceDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  {zoomLevel === 'month' && referenceDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  {zoomLevel === 'year' && referenceDate.getFullYear()}
                </span>
              </div>
            )}
         </div>

         {/* Right: Filters + KPIs + Actions */}
         <div className="flex items-center gap-4">
            {/* Filters */}
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  className="pl-8 pr-3 py-1.5 bg-slate-800 rounded-lg text-xs w-36 text-white focus:bg-slate-700 focus:ring-1 focus:ring-violet-500 outline-none placeholder:text-slate-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Status */}
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StickyStatus | 'done' | 'all')}
                className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg border-none outline-none cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="green">● On Track</option>
                <option value="yellow">● At Risk</option>
                <option value="red">● Blocked</option>
                <option value="done">○ Done</option>
              </select>

              {/* Owner */}
              <select 
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg border-none outline-none cursor-pointer max-w-[120px]"
              >
                <option value="all">All Owners</option>
                {uniqueOwners.filter(o => o !== 'Unassigned').map(owner => (
                  <option key={owner} value={owner}>{owner}</option>
                ))}
                <option value="Unassigned">Unassigned</option>
              </select>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-slate-700"></div>

            {/* KPIs */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setStatusFilter('green')}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                title="On Track"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="font-medium">{healthStats.green}</span>
              </button>
              <button 
                onClick={() => setStatusFilter('yellow')}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                title="At Risk"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span className="font-medium">{healthStats.yellow}</span>
              </button>
              <button 
                onClick={() => setStatusFilter('red')}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                title="Blocked"
              >
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span className="font-medium">{healthStats.red}</span>
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-0.5">
              <button 
                onClick={handleResetBoard}
                title="Refresh from Notion"
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <RefreshCw size={16} />
              </button>
            </div>
         </div>
      </header>

      {/* === MAIN CONTENT === */}
      <div className="flex-1 overflow-auto relative bg-gray-50">
        
        {/* Loading State */}
        {loading && (
          <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-white">
             <Loader2 size={32} className="text-gray-400 animate-spin mb-4" />
             <p className="text-gray-500 text-sm">Loading roadmap...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
           <div className="p-6 m-6 bg-white rounded-lg flex items-center gap-4">
             <AlertTriangle size={20} className="text-red-500" />
             <div className="flex-1">
               <p className="text-sm text-gray-900 font-medium">Failed to sync</p>
               <p className="text-xs text-gray-500 mt-0.5">{error}</p>
             </div>
             <button onClick={() => window.location.reload()} className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium">Retry</button>
           </div>
        )}

        {/* === ROADMAP GRID === */}
        {!loading && (
          <div className="min-w-max pb-12 relative">
            
            {/* TODAY LINE */}
            {(() => {
              const today = new Date();
              const columnWidth = getColumnWidth(zoomLevel);
              
              // Find which column today falls into
              const todayColumnIndex = timelineColumns.findIndex(col => 
                today >= col.startDate && today <= col.endDate
              );
              
              if (todayColumnIndex === -1) return null;
              
              const column = timelineColumns[todayColumnIndex];
              const columnDuration = column.endDate.getTime() - column.startDate.getTime();
              const todayOffset = today.getTime() - column.startDate.getTime();
              const positionInColumn = (todayOffset / columnDuration) * 100;
              
              const leftOffset = 200 + (todayColumnIndex * columnWidth) + (positionInColumn / 100 * columnWidth);
              
              return (
                <div 
                  className="absolute top-0 bottom-0 z-50 pointer-events-none"
                  style={{ left: leftOffset }}
                >
                  <div className="w-px h-full bg-red-400"></div>
                  <div className="absolute top-3 -translate-x-1/2 left-1/2 bg-red-500 text-white text-[10px] font-medium px-2 py-0.5 rounded whitespace-nowrap">
                    Today
                </div>
                </div>
              );
            })()}
            
            {/* === STICKY HEADER === */}
            <div className="sticky top-0 z-40 bg-white">
              {/* Timeline Column Headers */}
              <div className="flex border-b border-gray-100">
                <div className="w-[200px] shrink-0 py-4 px-4">
                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Timeline</span>
                </div>
                {timelineColumns.map((column) => (
                  <div 
                    key={column.id} 
                    className="shrink-0 py-4 px-4"
                    style={{ width: getColumnWidth(zoomLevel) }}
                  >
                    <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                      {column.label}
                      {column.sublabel && (
                        <span className="ml-1 text-gray-300">{column.sublabel}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {/* Milestones Row (Subtle Pills) - Show in all views */}
              <div className="flex border-b border-gray-100 bg-gray-50/50">
                <div className="w-[200px] shrink-0 py-3 px-4 flex items-center">
                  <span className="text-xs font-medium text-gray-500">Milestones</span>
                </div>
                <div className="flex">
                    {timelineColumns.map((column) => {
                      // Filter milestones based on view type
                      const cellMilestones = milestones.filter(m => {
                        // For quarter/year views, match by quarterId
                        if (zoomLevel === 'quarter' || zoomLevel === 'year') {
                          return m.quarterId === column.id;
                        }
                        // For week/month views, check if milestone date falls within column date range
                        // Parse milestone date from title or date field
                        const dateMatch = m.title.match(/(\d{4}-\d{2}-\d{2})/) || m.date.match(/(\d{4}-\d{2}-\d{2})/);
                        if (dateMatch) {
                          const milestoneDate = new Date(dateMatch[1]);
                          return milestoneDate >= column.startDate && milestoneDate <= column.endDate;
                        }
                        // Try parsing natural date format (e.g., "Mar 15, 2026")
                        const naturalDate = new Date(m.date);
                        if (!isNaN(naturalDate.getTime())) {
                          return naturalDate >= column.startDate && naturalDate <= column.endDate;
                        }
                        return false;
                      });
                      return (
                        <div 
                          key={`milestone-${column.id}`}
                          className="shrink-0 py-2 px-3 flex flex-wrap gap-2 items-center min-h-[44px]"
                          style={{ width: getColumnWidth(zoomLevel) }}
                        >
                          {cellMilestones.map(m => (
                            <button 
                              key={m.id} 
                              onClick={() => openMilestoneModal(m)}
                              className={`bg-blue-50 text-blue-700 font-medium rounded-md hover:bg-blue-100 transition-colors ${
                                zoomLevel === 'year' || zoomLevel === 'week' ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'
                              }`}
                            >
                              {extractOutcome(m.title)}
                             </button>
                          ))}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* === SWIMLANES === */}
            <div className="flex flex-col">
              {Object.entries(groupedLanes).map(([groupName, lanes]) => {
                const isGroupCollapsed = collapsedGroups.has(groupName);

                return (
                  <div key={groupName}>
                    
                    {/* Group Header (Minimal) */}
                    <div 
                      onClick={() => toggleGroup(groupName)}
                      className="sticky left-0 z-30 bg-gray-50 py-2.5 px-4 flex items-center gap-2 cursor-pointer hover:bg-gray-100"
                    >
                      <ChevronRight 
                        size={14} 
                        className={`text-gray-400 transition-transform ${!isGroupCollapsed ? 'rotate-90' : ''}`} 
                      />
                      <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{groupName}</span>
                    </div>

                    {/* Lanes */}
                    {!isGroupCollapsed && (
                      <div className="flex flex-col">
                        {lanes.map((lane) => {
                          // Get wiki URL for this lane
                          const laneWikiUrls: Record<string, string> = {
                            'lane-a8b': 'https://www.notion.so/cere/Gaming-Use-Case-A8b-2a0d800083d68033a8dffa19cbaf0620',
                            'lane-a7': 'https://www.notion.so/cere/A7-Nightingale-Integration-Wiki',
                            'lane-s1': 'https://www.notion.so/cere/S1-CEF-Demos-2ccd800083d680cc883bf8e4fa986e04',
                            'lane-s2': 'https://www.notion.so/cere/S2-CEF-Website-Vertical-Pages-2ccd800083d68020891ed6d9f4061b3e',
                            'lane-s3': 'https://www.notion.so/cere/CEF-ICP-S3-2ccd800083d68003be72ddc9a1ce2f03',
                            'lane-s4': 'https://www.notion.so/cere/CEF-Campaigns-S4-2ccd800083d6808e9b92df0c93146347',
                            'lane-b3': 'https://www.notion.so/cere/CEF-AI-Product-Marketing-B3-293d800083d680fb9b48e6a9b47aaf77',
                            'lane-b4': 'https://www.notion.so/cere/B4-CEF-AI-Enterprise-G2M-Wiki',
                          };
                          const wikiUrl = laneWikiUrls[lane.id];
                          
                          return (
                            <div key={lane.id} className="flex border-b border-gray-100 bg-white group/lane">
                              
                              {/* Lane Header - Click opens wiki */}
                              <div className="w-[200px] shrink-0 sticky left-0 z-20 bg-white">
                                <a 
                                  href={wikiUrl || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="py-3 px-4 cursor-pointer hover:bg-blue-50 flex items-center justify-between group/link"
                                  title={`Open ${lane.title} Wiki`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-900 group-hover/link:text-blue-600">{lane.title}</span>
                                      </div>
                                  <ExternalLink 
                                    size={14} 
                                    className="text-gray-300 group-hover/link:text-blue-500" 
                                  />
                                </a>
                              </div>

                              {/* Timeline Cells */}
                              <div className="flex">
                                {timelineColumns.map((column, colIndex) => {
                                  // Get stickies for this column based on zoom level
                                  let cellStickies: StickyNote[];
                                  if (zoomLevel === 'quarter') {
                                    // For quarter view, use the existing quarterId matching
                                    cellStickies = filteredStickies.filter(s => s.laneId === lane.id && s.quarterId === column.id);
                                  } else {
                                    // For other views, use date-based column matching
                                    cellStickies = getStickiesForColumn(column, lane.id);
                                  }

                                  const sortedCellStickies = sortStickyByDate(cellStickies);
                                  const cardSize = getCardSizeClass(zoomLevel);
                                  const columnWidth = getColumnWidth(zoomLevel);
                                  
                                  // Calculate height based on zoom level and stacked cards
                                  const baseCardHeight = zoomLevel === 'week' ? 48 : zoomLevel === 'month' ? 36 : zoomLevel === 'year' ? 24 : 28;
                                  const collapsedHeight = Math.max(44, 8 + sortedCellStickies.length * baseCardHeight);
                                    
                                    return (
                                      <div 
                                        key={`${lane.id}-${column.id}`}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, lane.id, column.id)}
                                        className="shrink-0 px-2 py-2 relative hover:bg-gray-50/50"
                                        style={{ width: columnWidth, minHeight: `${collapsedHeight}px` }}
                                      >
                                        {/* Subtle dividers based on zoom level */}
                                        <div className="absolute inset-0 pointer-events-none">
                                          {zoomLevel === 'quarter' && (
                                            <>
                                              <div className="h-full w-px bg-gray-100 absolute" style={{ left: '33.33%' }} />
                                              <div className="h-full w-px bg-gray-100 absolute" style={{ left: '66.66%' }} />
                                            </>
                                          )}
                                          {zoomLevel === 'year' && (
                                            <>
                                              <div className="h-full w-px bg-gray-100 absolute" style={{ left: '33.33%' }} />
                                              <div className="h-full w-px bg-gray-100 absolute" style={{ left: '66.66%' }} />
                                            </>
                                          )}
                                        </div>
                                        
                                        {/* Stack cards vertically when they overlap */}
                                        {sortedCellStickies.map((sticky, idx) => {
                                          const position = getPositionInColumn(sticky.deliveryDate, column);
                                          const hasDate = sticky.deliveryDate && sticky.deliveryDate.length > 0;
                                          
                                          // Calculate vertical offset based on how many previous cards are close
                                          let verticalIndex = 0;
                                          for (let i = 0; i < idx; i++) {
                                            const prevPos = getPositionInColumn(sortedCellStickies[i].deliveryDate, column);
                                            const overlapThreshold = zoomLevel === 'week' ? 15 : zoomLevel === 'month' ? 20 : 25;
                                            if (Math.abs(position - prevPos) < overlapThreshold) {
                                              verticalIndex++;
                                            }
                                          }
                                          
                                          // Card styling based on zoom level
                                          const cardClasses = zoomLevel === 'week' 
                                            ? 'px-3 py-2 gap-2 rounded-lg shadow-sm'
                                            : zoomLevel === 'month'
                                            ? 'px-2.5 py-1.5 gap-2 rounded-md'
                                            : zoomLevel === 'year'
                                            ? 'px-1.5 py-0.5 gap-1 rounded text-[10px]'
                                            : 'px-2 py-1 gap-1.5 rounded-md';
                                          
                                          const dotSize = zoomLevel === 'year' ? 'w-1 h-1' : 'w-1.5 h-1.5';
                                          const maxTitleWidth = zoomLevel === 'week' ? 'max-w-[140px]' : zoomLevel === 'month' ? 'max-w-[120px]' : zoomLevel === 'year' ? 'max-w-[80px]' : 'max-w-[100px]';
                                          const fontSize = zoomLevel === 'week' ? 'text-sm' : zoomLevel === 'year' ? 'text-[10px]' : 'text-xs';
                                          
                                          return (
                                            <div 
                                              key={sticky.id}
                                              draggable
                                              onDragStart={(e) => handleDragStart(e, sticky.id)}
                                              onClick={() => openEditModal(sticky)}
                                              className={`absolute flex items-center bg-white border border-gray-200 hover:border-gray-300 hover:-translate-y-px cursor-grab active:cursor-grabbing ${cardClasses}`}
                                              style={{
                                                left: hasDate ? `${Math.max(2, Math.min(75, position - 10))}%` : '5%',
                                                top: `${4 + verticalIndex * baseCardHeight}px`,
                                              }}
                                              title={`${extractOutcome(sticky.title)}${sticky.milestoneTitle ? `\n📌 ${extractOutcome(sticky.milestoneTitle)}` : ''}${sticky.deliveryDate ? `\n📅 ${sticky.deliveryDate}` : ''}${sticky.blocker ? `\n🚫 Blocker: ${sticky.blocker}` : ''}`}
                                            >
                                              <span className={`${dotSize} rounded-full ${STATUS_DOT_COLORS[sticky.status]} shrink-0`}></span>
                                              <span className={`${fontSize} font-medium truncate ${maxTitleWidth} ${sticky.isDone ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                                {extractOutcome(sticky.title)}
                                              </span>
                                              {sticky.milestoneTitle && zoomLevel !== 'year' && (
                                                <span className="text-[9px] text-blue-500 ml-1" title={`Milestone: ${extractOutcome(sticky.milestoneTitle)}`}>📌</span>
                                              )}
                                              {/* Show blocker indicator when blocked */}
                                              {sticky.blocker && sticky.status === 'red' && zoomLevel !== 'year' && (
                                                <span 
                                                  className="text-[9px] text-red-500 ml-1 truncate max-w-[60px]" 
                                                  title={`Blocker: ${sticky.blocker}`}
                                                >
                                                  🚫 {zoomLevel === 'week' ? sticky.blocker : ''}
                                                </span>
                                              )}
                                              {/* Show date on larger zoom levels */}
                                              {zoomLevel === 'week' && sticky.deliveryDate && !sticky.blocker && (
                                                <span className="text-[10px] text-gray-400 ml-auto">
                                                  {new Date(sticky.deliveryDate).toLocaleDateString('en-US', { weekday: 'short' })}
                                                </span>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        )}
      </div>

      {/* === SIDE DRAWER (Delivery Details) === */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingSticky?.title || 'New Deliverable'}
        footer={
          <div className="flex items-center justify-between w-full">
            {editingSticky?.id && (
               <button 
                onClick={deleteEditingSticky}
                className="text-slate-400 hover:text-red-400 text-sm transition-colors"
               >
                 Delete
               </button>
            )}
            <div className="flex items-center gap-3 ml-auto">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="text-slate-400 hover:text-white text-sm transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={saveSticky}
              disabled={isSaveDisabled}
              className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${isSaveDisabled 
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700'}
              `}
            >
                Save
            </button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
           {/* Status Row */}
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-2">
               <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                 editingSticky?.isDone ? 'bg-slate-700 text-slate-300' :
                 editingSticky?.status === 'green' ? 'bg-emerald-500/20 text-emerald-400' : 
                 editingSticky?.status === 'yellow' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
               }`}>
                 {editingSticky?.isDone ? 'Shipped' : 
                  editingSticky?.status === 'green' ? 'On Track' : 
                  editingSticky?.status === 'yellow' ? 'At Risk' : 'Blocked'}
               </span>
               <select 
                  value={editingSticky?.status || 'green'}
                  onChange={e => setEditingSticky(prev => prev ? ({ ...prev, status: e.target.value as StickyStatus }) : null)}
                  className="text-xs text-slate-400 bg-transparent border-none cursor-pointer hover:text-white"
                >
                  <option value="green">On Track</option>
                  <option value="yellow">At Risk</option>
                  <option value="red">Blocked</option>
                </select>
             </div>
             <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-400 hover:text-white transition-colors">
             <input 
                  type="checkbox"
                  checked={editingSticky?.isDone || false}
                  onChange={e => setEditingSticky(prev => prev ? ({ ...prev, isDone: e.target.checked }) : null)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500"
                />
                Shipped
              </label>
           </div>

           {/* Title */}
           <div>
             <label className="block text-xs text-slate-400 mb-1.5">Title</label>
             <textarea 
               autoFocus
               value={editingSticky?.title || ''} 
               onChange={e => setEditingSticky(prev => prev ? ({ ...prev, title: e.target.value }) : null)}
               placeholder="Deliverable title..."
               className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 resize-none h-20 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
             />
           </div>

           {/* Associated Milestone */}
           {editingSticky?.milestoneTitle && (
             <div className="flex items-center gap-2 p-2.5 bg-violet-500/10 rounded-lg border border-violet-500/30">
               <span className="text-violet-400">📌</span>
               <div className="flex-1 min-w-0">
                 <span className="text-[10px] text-violet-400 uppercase tracking-wide block">Milestone</span>
                 <span className="text-sm font-medium text-violet-300 truncate block">{extractOutcome(editingSticky.milestoneTitle)}</span>
              </div>
             </div>
           )}

           {/* Owner + Date */}
           <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Owner</label>
                <select 
                  value={editingSticky?.owner || 'Unassigned'}
                  onChange={e => setEditingSticky(prev => prev ? ({ ...prev, owner: e.target.value }) : null)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
                >
                  <option value="Unassigned">Unassigned</option>
                  {uniqueOwners.filter(o => o !== 'Unassigned').map(owner => (
                    <option key={owner} value={owner}>{owner}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Delivery Date</label>
                <input 
                  type="date"
                  value={editingSticky?.deliveryDate?.split('T')[0] || ''}
                  onChange={e => setEditingSticky(prev => prev ? ({ ...prev, deliveryDate: e.target.value }) : null)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
                />
              </div>
           </div>

           {/* Blocker - Show when status is red OR when there's a blocker value */}
           {(editingSticky?.status === 'red' || editingSticky?.blocker) && (
             <div>
                <label className="block text-xs text-red-400 mb-1.5 flex items-center gap-2">
                  <AlertTriangle size={12} />
                  Blocker
                </label>
                <input 
                  type="text"
                  value={editingSticky?.blocker || ''}
                  onChange={e => setEditingSticky(prev => prev ? ({ ...prev, blocker: e.target.value }) : null)}
                  placeholder="What's blocking this?"
                  className="w-full p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300 placeholder:text-red-400/50 focus:ring-1 focus:ring-red-500 outline-none"
                />
             </div>
           )}
           
           {/* Knowledge Base */}
              <div>
              <label className="block text-xs text-slate-400 mb-1.5 flex items-center gap-2">
                Knowledge Base
                {editingSticky?.wikiUrl && (
                  <a 
                    href={editingSticky.wikiUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-violet-400 hover:text-violet-300"
                  >
                    <ExternalLink size={10} />
                  </a>
                )}
              </label>
                 <input 
                   type="url"
                   value={editingSticky?.wikiUrl || ''}
                   onChange={e => setEditingSticky(prev => prev ? ({ ...prev, wikiUrl: e.target.value }) : null)}
                placeholder="https://notion.so/..."
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
                 />
              </div>

           {/* Notes */}
           {editingSticky?.notes && (
              <div>
               <label className="block text-xs text-slate-400 mb-1.5">Notes</label>
               <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                 <NotesRenderer notes={editingSticky.notes} />
               </div>
              </div>
           )}
        </div>
      </Modal>

      {/* --- Milestone Detail Modal --- */}
      {selectedMilestone && (
        <Modal
          isOpen={isMilestoneModalOpen}
          onClose={() => setIsMilestoneModalOpen(false)}
          title="Key Milestone Details"
          footer={
             <div className="w-full flex justify-between items-center">
               <button 
                  onClick={() => {
                     if(window.confirm("Delete this milestone?")) {
                        deleteMilestone(selectedMilestone.id);
                        setIsMilestoneModalOpen(false);
                     }
                  }}
                  className="text-red-500 hover:bg-red-50 px-3 py-2 rounded text-xs font-bold"
               >
                 Delete Milestone
               </button>
               <button 
                  onClick={() => setIsMilestoneModalOpen(false)}
                  className="bg-slate-900 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-slate-800"
               >
                 Close
               </button>
             </div>
          }
        >
          <div className="space-y-8">
            {/* Header Section */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
               <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 mb-1">{selectedMilestone.title}</h2>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                       <span className="flex items-center gap-1.5"><Calendar size={14} /> {selectedMilestone.date}</span>
                       <span className="flex items-center gap-1.5 font-medium px-2 py-0.5 rounded-full bg-white border border-slate-200 text-xs">
                          {selectedMilestone.quarterId}
                       </span>
                    </div>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-white text-xs font-bold uppercase tracking-wider ${
                     selectedMilestone.status === 'green' ? 'bg-green-500' :
                     selectedMilestone.status === 'yellow' ? 'bg-amber-500' : 'bg-red-500'
                  }`}>
                     {selectedMilestone.status === 'green' ? 'On Track' : selectedMilestone.status === 'yellow' ? 'At Risk' : 'Blocked'}
                  </div>
               </div>
               
               <div className="mt-4 pt-4 border-t border-slate-200/50">
                  <p className="text-slate-700 leading-relaxed text-sm whitespace-pre-wrap">{selectedMilestone.description}</p>
               </div>
            </div>

            {/* Adjacent Deliverables */}
            <div>
               <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                 <CheckCircle size={14} /> Adjacent Deliverables ({selectedMilestone.quarterId})
               </h3>
               
               <div className="space-y-4">
                  {LANES.map(lane => {
                     const laneStickies = filteredStickies.filter(
                       s => s.quarterId === selectedMilestone.quarterId && s.laneId === lane.id
                     );
                     
                     if (laneStickies.length === 0) return null;

                     return (
                        <div key={lane.id} className="border border-slate-200 rounded-lg overflow-hidden">
                           <div className={`px-3 py-2 ${lane.headerColorClass} bg-opacity-10 border-b border-slate-100 flex items-center gap-2`}>
                              <div className={`p-1 rounded-full text-white ${lane.headerColorClass} shadow-sm`}>
                                 {React.cloneElement(lane.icon as React.ReactElement, { size: 12 })}
                              </div>
                              <span className="text-xs font-bold text-slate-800">{lane.title}</span>
                           </div>
                           <div className="bg-slate-50 p-2 space-y-2">
                              {laneStickies.map(sticky => (
                                 <div key={sticky.id} onClick={() => {setIsMilestoneModalOpen(false); openEditModal(sticky)}} className="bg-white p-3 rounded border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition-all flex items-start gap-3">
                                    <div className={`w-1 self-stretch rounded-full ${
                                       sticky.status === 'green' ? 'bg-green-500' : sticky.status === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}></div>
                                    <div className="flex-1 min-w-0">
                                       <span className={`text-xs font-medium truncate block ${sticky.isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>{sticky.title}</span>
                                       {sticky.owner && sticky.owner !== 'Unassigned' && <div className="text-[10px] text-slate-500 mt-0.5">Owner: {sticky.owner}</div>}
                                    </div>
                                    {sticky.blocker && !sticky.isDone && (
                                       <AlertTriangle size={14} className="text-red-500 shrink-0" />
                                    )}
                                    {sticky.isDone && (
                                       <CheckCircle size={14} className="text-green-500 shrink-0" />
                                    )}
                                 </div>
                              ))}
                           </div>
                        </div>
                     )
                  })}

                  {filteredStickies.filter(s => s.quarterId === selectedMilestone.quarterId).length === 0 && (
                     <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        No deliverables linked to this quarter yet.
                     </div>
                  )}
               </div>
            </div>
          </div>
        </Modal>
      )}

      {/* === MOVE CONFIRMATION MODAL === */}
      {pendingMove && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={cancelMove} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-float w-full max-w-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Update Delivery Date
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Set the new delivery date for this outcome.
              </p>
              
              {/* Show outcome name */}
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <p className="text-sm font-medium text-gray-800">
                  {extractOutcome(stickies.find(s => s.id === pendingMove.stickyId)?.title || '')}
                </p>
              </div>
              
              {/* Date input */}
              <div className="mb-6">
                <label className="block text-xs text-gray-400 mb-1.5">Delivery Date</label>
                <input 
                  type="date"
                  autoFocus
                  value={pendingMove.newDeliveryDate}
                  onChange={(e) => setPendingMove({ ...pendingMove, newDeliveryDate: e.target.value })}
                  className="w-full p-3 bg-gray-100 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-gray-200 outline-none"
                />
              </div>
              
              {/* Buttons */}
              <div className="flex items-center justify-end gap-3">
                <button 
                  onClick={cancelMove}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmMove}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
                >
                  Confirm Move
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}