import React from 'react';
import { Target, Eye, AlertTriangle, ShieldCheck, Copy, Activity, CheckCircle, AlertCircle, RefreshCw, ExternalLink, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { LANES, CERE_WIKI_LINKS } from '../constants';
import { StickyNote } from '../types';

interface SidebarProps {
  stickies: StickyNote[];
  activeView: 'cef' | 'cere';
  onReset?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ stickies, activeView, onReset }) => {
  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(new Set(CERE_WIKI_LINKS.map(c => c.name)));

  const handleCopyPrompt = () => {
    const prompt = `Create a detailed Multi-Year Roadmap Board for 2026 and 2027.\nStructure:\nColumns: Q1-Q4 2026, Q1-Q4 2027.\nRows: 1. Product Features, 2. Core Platform, 3. Commercial, 4. Partnerships, 5. Team.\nContent: High density, past tense verbs (outcomes only). No "planning" or "research".`;
    navigator.clipboard.writeText(prompt);
    // Simple feedback
    const btn = document.getElementById('copy-btn');
    if (btn) btn.innerText = "Copied!";
    setTimeout(() => { if(btn) btn.innerText = "Copy Miro AI Prompt" }, 2000);
  };

  const toggleCategory = (name: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const healthStats = {
    red: stickies.filter(s => s.status === 'red' && !s.isDone).length,
    yellow: stickies.filter(s => s.status === 'yellow' && !s.isDone).length,
    green: stickies.filter(s => s.status === 'green' && !s.isDone).length,
    done: stickies.filter(s => s.isDone).length,
  };

  return (
    <div className="w-80 bg-white border-r border-slate-200 h-full flex flex-col overflow-y-auto shrink-0 shadow-xl z-20">
      <div className="p-6 bg-slate-900 text-white">
        <h1 className="text-xl font-bold mb-1">Outcome Roadmap</h1>
        <p className="text-slate-400 text-xs uppercase tracking-wider">
          {activeView === 'cef' ? 'CEF Overview' : 'CERE Overview'}
        </p>
      </div>

      <div className="p-6 space-y-8 flex-1">
        
        {/* Roadmap Health */}
        <section className="space-y-3">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Activity className="text-rose-500" size={18} />
            Roadmap Health
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-red-50 border border-red-100 p-2 rounded-lg flex flex-col items-center">
              <span className="text-2xl font-bold text-red-600">{healthStats.red}</span>
              <span className="text-[10px] uppercase font-bold text-red-400">Blocked</span>
            </div>
             <div className="bg-yellow-50 border border-yellow-100 p-2 rounded-lg flex flex-col items-center">
              <span className="text-2xl font-bold text-yellow-600">{healthStats.yellow}</span>
              <span className="text-[10px] uppercase font-bold text-yellow-500">At Risk</span>
            </div>
             <div className="bg-green-50 border border-green-100 p-2 rounded-lg flex flex-col items-center">
              <span className="text-2xl font-bold text-green-600">{healthStats.green}</span>
              <span className="text-[10px] uppercase font-bold text-green-500">On Track</span>
            </div>
             <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg flex flex-col items-center">
              <span className="text-2xl font-bold text-slate-600">{healthStats.done}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400">Shipped</span>
            </div>
          </div>
        </section>

        {/* CERE Wiki Links - Only show when CERE view is active */}
        {activeView === 'cere' && (
          <section className="space-y-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="text-blue-500" size={18} />
              Knowledge Base
            </h3>
            <div className="space-y-2">
              {CERE_WIKI_LINKS.map(category => (
                <div key={category.name} className="border border-slate-100 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleCategory(category.name)}
                    className="w-full flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{category.name}</span>
                    {expandedCategories.has(category.name) ? (
                      <ChevronDown size={14} className="text-slate-400" />
                    ) : (
                      <ChevronRight size={14} className="text-slate-400" />
                    )}
                  </button>
                  {expandedCategories.has(category.name) && (
                    <div className="p-2 space-y-1 bg-white">
                      {category.links.map(link => (
                        <a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 group transition-colors"
                        >
                          <ExternalLink size={12} className="text-slate-300 group-hover:text-blue-500 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs text-slate-700 group-hover:text-blue-600 truncate">{link.title}</div>
                            {link.owner && (
                              <div className="text-[10px] text-slate-400">@{link.owner}</div>
                            )}
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* The Why - Only show for CEF */}
        {activeView === 'cef' && (
          <section className="space-y-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="text-orange-500" size={18} />
              Why this exists
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              To eliminate the <strong className="text-slate-800">"Black Box of Engineering"</strong> and prove we aren't just "busy," but <strong>productive</strong>.
            </p>
          </section>
        )}

        {/* The Rules - Only show for CEF */}
        {activeView === 'cef' && (
          <section className="space-y-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="text-blue-500" size={18} />
              Definition of Done
            </h3>
            <ul className="text-sm space-y-2 text-slate-600">
              <li className="flex gap-2 items-start">
                <CheckCircle size={14} className="text-green-500 mt-0.5" />
                <span>Past tense verbs only (e.g., "Deployed").</span>
              </li>
              <li className="flex gap-2 items-start">
                <CheckCircle size={14} className="text-green-500 mt-0.5" />
                <span>Every card needs an <strong>Owner</strong>.</span>
              </li>
              <li className="flex gap-2 items-start">
                <AlertCircle size={14} className="text-red-500 mt-0.5" />
                <span>No "Researching" or "Planning".</span>
              </li>
            </ul>
          </section>
        )}

        {/* The Legend */}
        <section className="space-y-3">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Eye className="text-slate-500" size={18} />
            {activeView === 'cef' ? 'Streams' : 'Lanes'}
          </h3>
          <div className="space-y-2">
            {LANES.map(lane => (
              <div key={lane.id} className="flex items-center gap-2 p-2 rounded-md border border-slate-100 bg-slate-50">
                <div className={`w-3 h-3 rounded-full ${lane.headerColorClass.replace('bg-', 'bg-opacity-50 ')}`}></div>
                <div>
                  <div className="text-xs font-bold text-slate-800">{lane.title}</div>
                  <div className="text-[10px] text-slate-500 uppercase">{lane.subtitle}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-2">
        <button 
          id="copy-btn"
          onClick={handleCopyPrompt}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          <Copy size={14} />
          Copy Miro AI Prompt
        </button>

        {onReset && (
          <button 
            onClick={() => {
              if (window.confirm("This will wipe all current stickies and restore the default demo data. Are you sure?")) {
                onReset();
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg text-xs font-medium transition-colors"
          >
            <RefreshCw size={12} />
            Reset Board Data
          </button>
        )}
      </div>
    </div>
  );
};
