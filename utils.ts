import { StickyNote, Lane, Quarter } from './types';
import { LANES, QUARTERS } from './constants';

export function getInitials(name: string): string {
  if (!name || name === 'Unassigned') return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

/**
 * Extract the outcome from a title by removing prefixes like:
 * - "CP0.1 : Get ROB to Work" -> "Get ROB to Work"
 * - "Milestone 0: Everything Works" -> "Everything Works"
 * - "DS1.1 - Data Pipeline" -> "Data Pipeline"
 */
export function extractOutcome(title: string): string {
  if (!title) return '';
  
  // Remove patterns like "CP0.1 : ", "DS1.1 : ", "A1.2 : ", etc.
  let cleaned = title.replace(/^[A-Z]{1,3}\d+(\.\d+)?\s*[:–-]\s*/i, '');
  
  // Remove "Milestone X: " pattern
  cleaned = cleaned.replace(/^Milestone\s+\d+\s*[:–-]\s*/i, '');
  
  // Remove patterns like "by 2025-12-22" or "by 2026-03-01" at the end (with optional trailing whitespace)
  cleaned = cleaned.replace(/\s+by\s+\d{4}-\d{2}-\d{2}\s*$/i, '');
  
  return cleaned.trim();
}

export function getAvatarColor(name: string): string {
  if (!name || name === 'Unassigned') return 'bg-slate-300';
  const colors = [
    'bg-red-400', 'bg-orange-400', 'bg-amber-400', 
    'bg-green-400', 'bg-emerald-400', 'bg-teal-400', 
    'bg-cyan-400', 'bg-sky-400', 'bg-blue-400', 
    'bg-indigo-400', 'bg-violet-400', 'bg-purple-400', 
    'bg-fuchsia-400', 'bg-pink-400', 'bg-rose-400'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function getUniqueOwners(stickies: StickyNote[]): string[] {
  const owners = new Set(stickies.map(s => s.owner).filter(Boolean));
  return Array.from(owners).sort();
}

export function getUniqueGroups(lanes: Lane[]): string[] {
  const groups = new Set(lanes.map(l => l.group).filter(Boolean));
  return Array.from(groups).sort();
}

// -- Notion Helpers --

export function formatNotionId(id: string): string {
  if (id.length !== 32) return id;
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}

export function findQuarter(text: string): Quarter | undefined {
  // Try matching "Q1 2026", "2026 Q1", "Q1", etc.
  const yearMatch = text.match(/202[5-7]/);
  const qMatch = text.match(/Q[1-4]/i);
  
  if (yearMatch && qMatch) {
    const year = yearMatch[0];
    const q = qMatch[0].toUpperCase();
    return QUARTERS.find(qu => qu.year === parseInt(year) && qu.label === q);
  }
  
  // Fuzzy match
  return QUARTERS.find(q => text.includes(q.id) || (text.includes(q.label) && text.includes(String(q.year))));
}

/**
 * Determine the quarter ID from a delivery date string.
 * Returns the quarter ID (e.g., "2026-Q1") or undefined if date is invalid.
 */
export function getQuarterFromDate(deliveryDate: string | undefined): string | undefined {
  if (!deliveryDate) return undefined;
  
  let date: Date;
  try {
    date = new Date(deliveryDate);
    if (isNaN(date.getTime())) return undefined;
  } catch {
    return undefined;
  }
  
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  
  // Q1 = Jan-Mar (0-2), Q2 = Apr-Jun (3-5), Q3 = Jul-Sep (6-8), Q4 = Oct-Dec (9-11)
  let qNum: number;
  if (month <= 2) qNum = 1;
  else if (month <= 5) qNum = 2;
  else if (month <= 8) qNum = 3;
  else qNum = 4;
  
  const quarterId = `${year}-Q${qNum}`;
  
  // Check if this quarter exists in our defined quarters
  const exists = QUARTERS.find(q => q.id === quarterId);
  return exists ? quarterId : undefined;
}

export function findLane(text: string, lanes: Lane[]): Lane | undefined {
  // Clean text: remove parens, lower case
  const clean = text.toLowerCase().replace(/\(.*\)/, '').trim();
  const textUpper = text.toUpperCase();
  
  // Keyword mappings for H2 headings that should route to specific lanes
  // Works for both CEF and CERE lanes
  const KEYWORD_LANE_MAP: Record<string, string[]> = {
    // CEF keywords
    'demo sales': ['lane-s1'],
    'cef demo': ['lane-s1'],
    's1': ['lane-s1'],
    'website sales': ['lane-s2'],
    'cef website': ['lane-s2'],
    's2': ['lane-s2'],
    'cef icp': ['lane-s3'],
    's3': ['lane-s3'],
    'cef campaigns': ['lane-s4'],
    's4': ['lane-s4'],
    'product marketing': ['lane-b3'],
    'b3': ['lane-b3'],
    'enterprise g2m': ['lane-b4'],
    'g2m wiki': ['lane-b4'],
    // CERE keywords
    'dac': ['lane-dac'],
    'inspection': ['lane-dac'],
    'blockchain': ['lane-blockchain'],
    'payouts': ['lane-payouts'],
    'payout': ['lane-payouts'],
    'ddc core': ['lane-ddc'],
    'ddc node': ['lane-ddc-nodes'],
    'cross-chain': ['lane-cross-chain'],
    'cross chain': ['lane-cross-chain'],
    'indexer': ['lane-indexer'],
    'marketing': ['lane-marketing', 'lane-b4'],
    'b4': ['lane-marketing', 'lane-b4'],
    'content distribution': ['lane-content'],
    'community': ['lane-community'],
    'growth': ['lane-growth'],
  };
  
  // Check keyword mappings first
  const textLower = text.toLowerCase();
  for (const [keyword, laneIds] of Object.entries(KEYWORD_LANE_MAP)) {
    if (textLower.includes(keyword)) {
      for (const laneId of laneIds) {
        const lane = lanes.find(l => l.id === laneId);
        if (lane) return lane;
      }
    }
  }
  
  // Try exact ID match first
  let found = lanes.find(l => l.id === text);
  if (found) return found;

  // Try Code match (e.g. "A1", "A8b", "A8.1", "S1", "S2", "B4")
  // Extract codes from lanes and sort by length (longest first) to prioritize specific matches
  const lanesWithCodes = lanes.map(l => {
    const code = l.title.match(/\(([A-Z][0-9]+[a-z]?(?:\.\d+)?)\)/i)?.[1]?.toUpperCase();
    return { lane: l, code };
  }).filter(lc => lc.code);
  
  // Sort by code length descending (so "A8B" matches before "A8")
  lanesWithCodes.sort((a, b) => (b.code?.length || 0) - (a.code?.length || 0));
  
  for (const { lane, code } of lanesWithCodes) {
    if (code && textUpper.includes(code)) {
      return lane;
    }
  }

  // Try Name match
  return lanes.find(l => {
    const lClean = l.title.toLowerCase().replace(/\(.*\)/, '').trim();
    return lClean.includes(clean) || clean.includes(lClean);
  });
}

/**
 * Calculate the horizontal position (0-100%) of a deliverable within a quarter
 * based on its delivery date.
 * 
 * Q1 = Jan-Mar, Q2 = Apr-Jun, Q3 = Jul-Sep, Q4 = Oct-Dec
 */
export function getDatePositionInQuarter(deliveryDate: string | undefined, quarterId: string): number {
  if (!deliveryDate) return 50; // Center if no date
  
  // Parse the quarter: "2025-Q4" or "2026-Q1"
  const qMatch = quarterId.match(/(\d{4})-Q(\d)/);
  if (!qMatch) return 50;
  
  const qYear = parseInt(qMatch[1]);
  const qNum = parseInt(qMatch[2]);
  
  // Quarter start/end months (0-indexed: Jan=0)
  const quarterStartMonth = (qNum - 1) * 3; // Q1=0, Q2=3, Q3=6, Q4=9
  const quarterStart = new Date(qYear, quarterStartMonth, 1);
  const quarterEnd = new Date(qYear, quarterStartMonth + 3, 0); // Last day of quarter
  
  // Parse delivery date
  let date: Date;
  try {
    // Handle ISO date (2025-12-26) or text date
    if (deliveryDate.match(/^\d{4}-\d{2}-\d{2}/)) {
      date = new Date(deliveryDate);
    } else {
      // Try parsing text like "December 26, 2025"
      date = new Date(deliveryDate);
    }
    
    if (isNaN(date.getTime())) return 50;
  } catch {
    return 50;
  }
  
  // Calculate position as percentage through the quarter
  const quarterDuration = quarterEnd.getTime() - quarterStart.getTime();
  const dateOffset = date.getTime() - quarterStart.getTime();
  
  // Clamp between 5% and 95% for visual padding
  const position = Math.max(5, Math.min(95, (dateOffset / quarterDuration) * 100));
  
  return position;
}

/**
 * Sort stickies by delivery date within a quarter
 */
export function sortStickyByDate(stickies: StickyNote[]): StickyNote[] {
  return [...stickies].sort((a, b) => {
    if (!a.deliveryDate && !b.deliveryDate) return 0;
    if (!a.deliveryDate) return 1;
    if (!b.deliveryDate) return -1;
    
    const dateA = new Date(a.deliveryDate).getTime();
    const dateB = new Date(b.deliveryDate).getTime();
    
    if (isNaN(dateA) && isNaN(dateB)) return 0;
    if (isNaN(dateA)) return 1;
    if (isNaN(dateB)) return -1;
    
    return dateA - dateB;
  });
}

/**
 * Get today's position info for rendering the "Today" line
 * Returns { quarterId, positionInQuarter } or null if today is outside visible quarters
 */
export function getTodayPosition(quarters: Quarter[]): { quarterId: string; position: number } | null {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  // Determine current quarter
  let qNum: number;
  if (month <= 2) qNum = 1;
  else if (month <= 5) qNum = 2;
  else if (month <= 8) qNum = 3;
  else qNum = 4;
  
  const quarterId = `${year}-Q${qNum}`;
  
  // Check if this quarter exists
  const quarter = quarters.find(q => q.id === quarterId);
  if (!quarter) return null;
  
  // Calculate position within quarter
  const quarterStartMonth = (qNum - 1) * 3;
  const quarterStart = new Date(year, quarterStartMonth, 1);
  const quarterEnd = new Date(year, quarterStartMonth + 3, 0);
  
  const quarterDuration = quarterEnd.getTime() - quarterStart.getTime();
  const todayOffset = today.getTime() - quarterStart.getTime();
  
  const position = Math.max(0, Math.min(100, (todayOffset / quarterDuration) * 100));
  
  return { quarterId, position };
}