import React from 'react';

export type StickyStatus = 'green' | 'yellow' | 'red';

export interface StickyNote {
  id: string;
  title: string;
  owner: string;
  laneId: string;
  quarterId: string;
  isDone: boolean;
  status: StickyStatus;
  wikiUrl?: string;        // Link to Knowledge Base / Wiki
  blocker?: string;
  deliveryDate?: string;   // Target delivery date (ISO format or text)
  notes?: string;          // Additional notes from Notion
  milestoneId?: string;    // Associated milestone ID
  milestoneTitle?: string; // Associated milestone title (for display)
}

export interface Milestone {
  id: string;
  title: string;
  quarterId: string;
  date: string;         // Specific date (e.g. "Nov 14, 2025")
  status: StickyStatus; // Overall status of the milestone
  description: string;  // Detailed context from the wiki
  colorClass: string;
}

export interface Lane {
  id: string;
  title: string;
  subtitle: string;
  colorClass: string;
  headerColorClass: string;
  icon: React.ReactNode;
  group: string; // New grouping property
}

export interface Quarter {
  id: string;
  label: string;
  year: number;
}