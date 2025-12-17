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

export const LANES: Lane[] = [
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

// START EMPTY - Populated via API
export const INITIAL_MILESTONES: Milestone[] = [];
export const INITIAL_STICKIES: StickyNote[] = [];

export const INITIAL_MILESTONES_DEMO = INITIAL_MILESTONES;