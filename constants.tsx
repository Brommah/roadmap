import React from 'react';
import { Lane, Quarter, StickyNote, Milestone } from './types';
import { Rocket, Settings, DollarSign, Handshake, Users, Database, Cpu, Activity, Layout, Terminal, Globe } from 'lucide-react';

export const QUARTERS: Quarter[] = [
  { id: '2025-Q4', label: 'Q4', year: 2025 },
  { id: '2026-Q1', label: 'Q1', year: 2026 },
  { id: '2026-Q2', label: 'Q2', year: 2026 },
  { id: '2026-Q3', label: 'Q3', year: 2026 },
  { id: '2026-Q4', label: 'Q4', year: 2026 },
  { id: '2027-Q1', label: 'Q1', year: 2027 },
  { id: '2027-Q2', label: 'Q2', year: 2027 },
  { id: '2027-Q3', label: 'Q3', year: 2027 },
];

// CEF Lanes - Used when CEF view is active
export const CEF_LANES: Lane[] = [
  // --- CORE INFRASTRUCTURE ---
  { id: 'lane-a1', group: 'Core Infrastructure', title: 'Data Onboarding (A1)', subtitle: 'Ingestion Service', colorClass: 'bg-blue-50', headerColorClass: 'bg-blue-600', icon: <Database /> },
  { id: 'lane-a2', group: 'Core Infrastructure', title: 'ROB (A2)', subtitle: 'Orchestration Builder', colorClass: 'bg-blue-50', headerColorClass: 'bg-blue-700', icon: <Layout /> },
  { id: 'lane-a3', group: 'Core Infrastructure', title: 'Orchestrator (A3)', subtitle: 'Compute Node', colorClass: 'bg-blue-50', headerColorClass: 'bg-blue-600', icon: <Cpu /> },
  { id: 'lane-a4', group: 'Core Infrastructure', title: 'Data Vault (A4)', subtitle: 'Storage Layer', colorClass: 'bg-blue-50', headerColorClass: 'bg-blue-700', icon: <Database /> },
  { id: 'lane-a5', group: 'Core Infrastructure', title: 'Agent Registry (A5)', subtitle: 'Core Registry', colorClass: 'bg-blue-50', headerColorClass: 'bg-blue-600', icon: <Settings /> },
  { id: 'lane-a6', group: 'Core Infrastructure', title: 'Testing / Infra (A6)', subtitle: 'Observability', colorClass: 'bg-blue-50', headerColorClass: 'bg-blue-700', icon: <Activity /> },
  { id: 'lane-z1', group: 'Core Infrastructure', title: 'Infra / DevOps (Z1)', subtitle: 'System Readiness', colorClass: 'bg-slate-50', headerColorClass: 'bg-slate-600', icon: <Terminal /> },
  
  // --- RUNTIMES ---
  { id: 'lane-a8-inf', group: 'Runtimes', title: 'Inference Runtime (A8)', subtitle: 'Model Serving', colorClass: 'bg-sky-50', headerColorClass: 'bg-sky-600', icon: <Cpu /> },
  { id: 'lane-a9', group: 'Runtimes', title: 'Agent Runtime (A9)', subtitle: 'Agent Execution', colorClass: 'bg-sky-50', headerColorClass: 'bg-sky-600', icon: <Settings /> },
  { id: 'lane-a10', group: 'Runtimes', title: 'Resource Allocation (A10)', subtitle: 'Compute Alloc', colorClass: 'bg-sky-50', headerColorClass: 'bg-sky-600', icon: <Settings /> },
  { id: 'lane-a11', group: 'Runtimes', title: 'Deployments (A11)', subtitle: 'Deployment Mgr', colorClass: 'bg-sky-50', headerColorClass: 'bg-sky-600', icon: <Rocket /> },
  { id: 'lane-a12', group: 'Runtimes', title: 'Event Runtime (A12)', subtitle: 'Event Loop', colorClass: 'bg-sky-50', headerColorClass: 'bg-sky-600', icon: <Activity /> },
  { id: 'lane-b1', group: 'Runtimes', title: 'DDC Core (B1)', subtitle: 'Decentralized Data', colorClass: 'bg-sky-50', headerColorClass: 'bg-sky-700', icon: <Database /> },

  // --- PRODUCT / DEMOS ---
  { id: 'lane-a7', group: 'Product & Demos', title: 'NG Demo (A7)', subtitle: 'Nightingale', colorClass: 'bg-orange-50', headerColorClass: 'bg-orange-500', icon: <Rocket /> },
  { id: 'lane-a8b', group: 'Product & Demos', title: 'Gaming Demo (A8b)', subtitle: 'Gaming Use Case', colorClass: 'bg-orange-50', headerColorClass: 'bg-orange-500', icon: <Rocket /> },

  // --- COMMERCIAL / CONTENT ---
  { id: 'lane-s1', group: 'Commercial & Content', title: 'CEF Demos (S1)', subtitle: 'Demo Content', colorClass: 'bg-green-50', headerColorClass: 'bg-green-600', icon: <Rocket /> },
  { id: 'lane-s2', group: 'Commercial & Content', title: 'CEF Website (S2)', subtitle: 'Vertical Pages', colorClass: 'bg-green-50', headerColorClass: 'bg-green-600', icon: <Globe /> },
  { id: 'lane-s3', group: 'Commercial & Content', title: 'CEF ICP (S3)', subtitle: 'Ideal Customer', colorClass: 'bg-green-50', headerColorClass: 'bg-green-600', icon: <Users /> },
  { id: 'lane-s4', group: 'Commercial & Content', title: 'CEF Campaigns (S4)', subtitle: 'Marketing Campaigns', colorClass: 'bg-green-50', headerColorClass: 'bg-green-600', icon: <Rocket /> },
  { id: 'lane-b3', group: 'Commercial & Content', title: 'Product Marketing (B3)', subtitle: 'Marketing', colorClass: 'bg-green-50', headerColorClass: 'bg-green-600', icon: <Users /> },
  { id: 'lane-b4', group: 'Commercial & Content', title: 'Enterprise G2M (B4)', subtitle: 'Go-to-Market', colorClass: 'bg-green-50', headerColorClass: 'bg-green-600', icon: <Handshake /> },

  // --- TEAM / READINESS ---
  { id: 'lane-a0', group: 'Team & Readiness', title: 'TDD Setup (A0.0)', subtitle: 'Quality', colorClass: 'bg-slate-100', headerColorClass: 'bg-slate-500', icon: <Settings /> },
  { id: 'lane-sys-ready', group: 'Team & Readiness', title: 'Infra Readiness', subtitle: 'System', colorClass: 'bg-slate-100', headerColorClass: 'bg-slate-500', icon: <Settings /> },
  { id: 'lane-dev-gtm', group: 'Team & Readiness', title: 'Developer GTM', subtitle: 'Strategy', colorClass: 'bg-slate-100', headerColorClass: 'bg-slate-500', icon: <Users /> },
  { id: 'lane-int-content', group: 'Team & Readiness', title: 'Integration Content', subtitle: 'Content', colorClass: 'bg-yellow-50', headerColorClass: 'bg-yellow-500', icon: <Users /> },
];

// CERE Lanes - Used when CERE view is active
export const CERE_LANES: Lane[] = [
  // --- BLOCKCHAIN / PROTOCOL ---
  { id: 'lane-dac', group: 'Blockchain / Protocol', title: 'DAC & Inspection', subtitle: 'Data Availability', colorClass: 'bg-purple-50', headerColorClass: 'bg-purple-600', icon: <Database /> },
  { id: 'lane-blockchain', group: 'Blockchain / Protocol', title: 'Blockchain', subtitle: 'Core Chain', colorClass: 'bg-purple-50', headerColorClass: 'bg-purple-700', icon: <Activity /> },
  { id: 'lane-payouts', group: 'Blockchain / Protocol', title: 'Payouts', subtitle: 'Rewards System', colorClass: 'bg-purple-50', headerColorClass: 'bg-purple-600', icon: <DollarSign /> },

  // --- DDC ---
  { id: 'lane-ddc', group: 'DDC', title: 'DDC Core', subtitle: 'Decentralized Data', colorClass: 'bg-sky-50', headerColorClass: 'bg-sky-600', icon: <Database /> },
  { id: 'lane-ddc-nodes', group: 'DDC', title: 'DDC Nodes', subtitle: 'Node Operations', colorClass: 'bg-sky-50', headerColorClass: 'bg-sky-700', icon: <Cpu /> },

  // --- TOOLS ---
  { id: 'lane-cross-chain', group: 'Tools', title: 'Cross-Chain', subtitle: 'Interoperability', colorClass: 'bg-orange-50', headerColorClass: 'bg-orange-500', icon: <Activity /> },
  { id: 'lane-indexer', group: 'Tools', title: 'Blockchain Indexer', subtitle: 'Data Indexing', colorClass: 'bg-orange-50', headerColorClass: 'bg-orange-600', icon: <Database /> },

  // --- BUSINESS ---
  { id: 'lane-marketing', group: 'Business', title: 'Marketing (B4)', subtitle: 'Brand & Comms', colorClass: 'bg-green-50', headerColorClass: 'bg-green-600', icon: <Users /> },
  { id: 'lane-content', group: 'Business', title: 'Content Distribution', subtitle: 'Media Delivery', colorClass: 'bg-green-50', headerColorClass: 'bg-green-600', icon: <Globe /> },
  { id: 'lane-community', group: 'Business', title: 'Community', subtitle: 'Engagement', colorClass: 'bg-green-50', headerColorClass: 'bg-green-600', icon: <Users /> },
  { id: 'lane-growth', group: 'Business', title: 'Growth', subtitle: 'Expansion', colorClass: 'bg-green-50', headerColorClass: 'bg-green-700', icon: <Rocket /> },
];

// Backwards compatibility - default to CEF lanes
export const LANES = CEF_LANES;

// START EMPTY - Populated via API
export const INITIAL_MILESTONES: Milestone[] = [];
export const INITIAL_STICKIES: StickyNote[] = [];

export const INITIAL_MILESTONES_DEMO = INITIAL_MILESTONES;

// CERE Wiki Links - Categorized resources for the CERE roadmap view
export interface WikiLink {
  title: string;
  url: string;
  owner?: string;
}

export interface WikiCategory {
  name: string;
  links: WikiLink[];
}

export const CERE_WIKI_LINKS: WikiCategory[] = [
  {
    name: 'Blockchain / Protocol',
    links: [
      { title: 'DAC & Inspection Wiki', url: 'https://www.notion.so/cere/DAC-Inspection-Wiki-128d800083d680b2b6cbfb8fa99a8b0d', owner: 'Yahor Tsaryk' },
      { title: 'Blockchain Wiki', url: 'https://www.notion.so/cere/Blockchain-Wiki-efc6a4c557d548e9a8d12765506a9078' },
    ],
  },
  {
    name: 'DDC',
    links: [
      { title: 'DDC', url: 'https://www.notion.so/cere/DDC-3830f70c2c014a18980b38bb3f47e908', owner: 'Sergey Poluyan' },
    ],
  },
  {
    name: 'Tools',
    links: [
      { title: 'Cere Blockchain (Polkadot)', url: 'https://www.notion.so/cere/Cere-Blockchain-A-Polkadot-based-blockchain-154d800083d6805ca9e0e77ccf8d19c7' },
      { title: 'Cross-Chain', url: 'https://www.notion.so/cere/Cross-Chain-5626dd1f571c4ef5909f5872687f73b5', owner: 'Ayush Mishra' },
      { title: 'Blockchain Indexer', url: 'https://www.notion.so/cere/Blockchain-indexer-1cd8541f6b454f5d87b40a43828f0895' },
    ],
  },
  {
    name: 'Business',
    links: [
      { title: 'Cere Marketing Knowledge Base (B4)', url: 'https://www.notion.so/cere/Cere-Marketing-Knowledge-Base-B4-e06610e6ccd449cc8721e162855d92da' },
      { title: 'Content Distribution Knowledge Base', url: 'https://www.notion.so/cere/Content-Distribution-Knowledge-Base-153d800083d680579c50d723d7cc26f8' },
      { title: 'Cere Core Content', url: 'https://www.notion.so/cere/Cere-Core-Content-Reset-Stage-2bfd800083d680e3b968ccf75cfd0c7f' },
      { title: 'Cere Network DAO Wiki', url: 'https://www.notion.so/cere/Cere-Network-DAO-Wiki-2a4d800083d680d89eeded4d4240b346', owner: 'Martijn' },
      { title: 'Developer Growth Wiki', url: 'https://www.notion.so/cere/Developer-Growth-Wiki-5c25946239e641dcb71df8d0931391a6' },
      { title: 'Partner Growth Wiki', url: 'https://www.notion.so/cere/Partner-Growth-Wiki-256d800083d6801e9989dffa76ca7389' },
      { title: 'Community Knowledge Base', url: 'https://www.notion.so/cere/Community-knowledge-base-e18492fa0656496994f7359e9f8b79c1' },
    ],
  },
];