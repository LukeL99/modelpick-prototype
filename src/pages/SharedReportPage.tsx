import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy, Share2, DollarSign, Target, Zap, ArrowUpDown,
  ChevronDown, AlertTriangle
} from 'lucide-react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell,
  BarChart, Bar
} from 'recharts';
import { MODELS, PROVIDER_COLORS, TIER_COLORS, ERROR_EXAMPLES, generateRunData } from '../data/models';

type SortKey = 'rank' | 'correct' | 'p95' | 'p99' | 'ttft' | 'costPerRun';

function CorrectBadge({ pct }: { pct: number }) {
  const color = pct >= 95 ? 'bg-success/15 text-success' : pct >= 85 ? 'bg-warning/15 text-warning' : pct >= 70 ? 'bg-ember/15 text-ember' : 'bg-danger/15 text-danger';
  return <span className={`${color} rounded-full px-2 py-0.5 text-xs font-semibold`}>{pct}%</span>;
}

export default function SharedReportPage() {
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortAsc, setSortAsc] = useState(true);
  const [dailyExtractions, setDailyExtractions] = useState(1000);
  const [expandedErrors, setExpandedErrors] = useState<string[]>([]);
  const [expandedRuns, setExpandedRuns] = useState<string[]>([]);
  const [showAllRuns, setShowAllRuns] = useState<string[]>([]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'rank' || key === 'p95' || key === 'p99' || key === 'ttft' || key === 'costPerRun');
    }
  };

  const sorted = [...MODELS].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const top5 = MODELS.slice(0, 5);
  const gpt4oCost = MODELS.find(m => m.model === 'GPT-4o')!.costPerRun;
  const cheapestAccurate = MODELS.filter(m => m.correct >= 90).sort((a, b) => a.costPerRun - b.costPerRun)[0];
  const mostExpensiveTop5 = [...top5].sort((a, b) => b.costPerRun - a.costPerRun)[0];
  const monthlyCost = (cost: number) => cost * dailyExtractions * 30;
  const savings = monthlyCost(mostExpensiveTop5.costPerRun) - monthlyCost(cheapestAccurate.costPerRun);

  return (
    <div className="min-h-screen bg-void text-text-primary font-sans">
      {/* Shared banner */}
      <div className="bg-ember border-b border-ember px-4 py-3">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-white/80" />
            <span className="text-sm text-white/90 font-medium">
              This is a shared report — Run your own benchmark at <span className="text-white font-bold">modelpick.ai</span>
            </span>
          </div>
          <Link
            to="/benchmark"
            className="bg-white hover:bg-white/90 text-ember font-semibold text-sm px-5 py-2 rounded-lg transition-colors"
          >
            Run your own benchmark →
          </Link>
        </div>
      </div>

      {/* Nav */}
      <nav className="border-b border-surface-border bg-void px-4 py-4">
        <div className="max-w-[1200px] mx-auto">
          <Link to="/" className="text-xl font-bold tracking-tight">
            <span className="text-ember">Model</span>Pick
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-[1200px] px-4 pt-8 pb-16 md:px-6 space-y-12">
        {/* Header */}
        <div className="bg-surface border border-surface-border rounded-xl p-5 md:p-6">
          <h1 className="text-xl font-semibold text-text-primary">Benchmark Report — Receipt Data Extraction</h1>
          <p className="text-xs text-text-muted mt-1">Feb 10, 2026 · 20 models · 1,000 runs · ID: bench_demo123</p>
        </div>

        {/* Recommendation */}
        <div className="rounded-xl border border-ember bg-surface p-6 md:p-8 shadow-[0_0_30px_rgba(249,115,22,0.08)]">
          <div className="flex items-center gap-2 text-sm font-semibold text-ember uppercase tracking-wider">
            <Trophy size={16} /> Our Recommendation
          </div>
          <h3 className="mt-3 text-2xl font-bold">Gemini 3 Flash Preview</h3>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1.5"><Target size={14} className="text-success" /> 98% exact-match accuracy (49/50 runs)</span>
            <span className="flex items-center gap-1.5"><Zap size={14} className="text-ember-light" /> P95: 1.8s</span>
            <span className="flex items-center gap-1.5"><DollarSign size={14} className="text-success" /> $0.0008/run — 6.5× cheaper than GPT-4o</span>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
            <DollarSign size={16} />
            <span>At 1,000 extractions/day, switching from GPT-4o saves <strong>$144/month</strong></span>
          </div>
        </div>

        {/* Table */}
        <div>
          <h2 className="text-xl font-semibold mb-4">All Models Ranked</h2>
          <div className="bg-surface border border-surface-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="bg-surface-raised">
                    {([
                      { key: 'rank' as SortKey, label: 'Rank', align: 'text-left' },
                      { key: null, label: 'Model', align: 'text-left' },
                      { key: null, label: 'Provider', align: 'text-left' },
                      { key: 'correct' as SortKey, label: '% Correct', align: 'text-center' },
                      { key: 'p95' as SortKey, label: 'P95', align: 'text-center' },
                      { key: 'p99' as SortKey, label: 'P99', align: 'text-center' },
                      { key: 'ttft' as SortKey, label: 'TTFT', align: 'text-center' },
                      { key: 'costPerRun' as SortKey, label: 'Cost/Run', align: 'text-right' },
                    ] as const).map((col, i) => (
                      <th
                        key={i}
                        className={`px-4 py-3 text-[11px] font-medium text-text-muted uppercase tracking-[0.05em] ${col.align} ${col.key ? 'cursor-pointer hover:text-text-secondary' : ''}`}
                        onClick={() => col.key && handleSort(col.key)}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {col.key && sortKey === col.key && <ArrowUpDown className="w-3 h-3 text-ember" />}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((m) => (
                    <tr key={m.model} className={`border-b border-surface-border/50 hover:bg-surface-raised/50 transition-colors ${m.rank === 1 ? 'bg-ember/[0.03] border-l-[3px] border-l-ember' : ''}`}>
                      <td className={`px-4 py-3 font-mono ${m.rank === 1 ? 'text-ember font-semibold' : 'text-text-muted'}`}>
                        {m.rank === 1 ? <Trophy size={16} className="text-ember" /> : m.rank}
                      </td>
                      <td className={`px-4 py-3 font-medium ${m.rank === 1 ? 'text-text-primary' : 'text-text-secondary'}`}>{m.model}</td>
                      <td className="px-4 py-3 text-text-muted text-xs">{m.provider}</td>
                      <td className="px-4 py-3 text-center"><CorrectBadge pct={m.correct} /></td>
                      <td className="px-4 py-3 text-center font-mono text-text-secondary">{m.p95}s</td>
                      <td className="px-4 py-3 text-center font-mono text-text-secondary">{m.p99}s</td>
                      <td className="px-4 py-3 text-center font-mono text-text-secondary">{m.ttft}s</td>
                      <td className="px-4 py-3 text-right font-mono text-text-secondary">${m.costPerRun}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Visual Comparison</h2>
          <div className="bg-surface border border-surface-border rounded-xl p-5 mb-4">
            <h3 className="text-base font-semibold text-text-primary mb-4">Accuracy vs Cost</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                  <XAxis type="number" dataKey="cost" tickFormatter={(v: number) => `$${v}`} tick={{ fill: '#A1A1AA', fontSize: 11 }} axisLine={{ stroke: '#2A2A2D' }} tickLine={false} />
                  <YAxis type="number" dataKey="correct" domain={[50, 100]} tick={{ fill: '#A1A1AA', fontSize: 11 }} axisLine={{ stroke: '#2A2A2D' }} tickLine={false} />
                  <ZAxis type="number" dataKey="size" range={[60, 200]} />
                  <Tooltip content={({ payload }) => {
                    if (!payload?.length) return null;
                    const d = payload[0]?.payload as { name: string; correct: number; cost: number };
                    return d ? <div className="bg-surface-raised border border-surface-border rounded-lg px-3 py-2 text-xs"><p className="font-semibold text-text-primary">{d.name}</p><p className="text-text-secondary">{d.correct}% · ${d.cost}/run</p></div> : null;
                  }} />
                  <Scatter data={MODELS.map(m => ({ name: m.model, cost: m.costPerRun, correct: m.correct, size: Math.round(100 / m.p95 * 50) }))}>
                    {MODELS.map((m, i) => <Cell key={i} fill={PROVIDER_COLORS[m.provider] || '#71717A'} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-surface border border-surface-border rounded-xl p-5">
              <h3 className="text-base font-semibold text-text-primary mb-4">P95 Latency</h3>
              <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[...MODELS].sort((a, b) => a.p95 - b.p95).map(m => ({ name: m.model.length > 20 ? m.model.slice(0, 18) + '…' : m.model, p95: m.p95, tier: m.tier }))} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                    <XAxis type="number" tickFormatter={(v: number) => `${v}s`} tick={{ fill: '#A1A1AA', fontSize: 11 }} axisLine={{ stroke: '#2A2A2D' }} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fill: '#A1A1AA', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#1E1E20', border: '1px solid #2A2A2D', borderRadius: '8px', color: '#F5F5F5', fontSize: '12px' }} formatter={(value) => [`${value ?? 0}s`, 'P95']} />
                    <Bar dataKey="p95" radius={[0, 4, 4, 0]}>
                      {[...MODELS].sort((a, b) => a.p95 - b.p95).map((m, i) => <Cell key={i} fill={TIER_COLORS[m.tier] || '#71717A'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-surface border border-surface-border rounded-xl p-5">
              <h3 className="text-base font-semibold text-text-primary mb-4">Cost per Run</h3>
              <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[...MODELS].sort((a, b) => a.costPerRun - b.costPerRun).map(m => ({ name: m.model.length > 20 ? m.model.slice(0, 18) + '…' : m.model, cost: m.costPerRun, isWinner: m.rank === 1 }))} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                    <XAxis type="number" tickFormatter={(v: number) => `$${v}`} tick={{ fill: '#A1A1AA', fontSize: 11 }} axisLine={{ stroke: '#2A2A2D' }} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fill: '#A1A1AA', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#1E1E20', border: '1px solid #2A2A2D', borderRadius: '8px', color: '#F5F5F5', fontSize: '12px' }} formatter={(value) => [`$${value ?? 0}`, 'Cost/Run']} />
                    <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                      {[...MODELS].sort((a, b) => a.costPerRun - b.costPerRun).map((m, i) => <Cell key={i} fill={m.rank === 1 ? '#F97316' : '#71717A'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Calculator */}
        <div className="bg-surface border border-surface-border rounded-xl p-5 md:p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">💰 Monthly Cost Calculator</h2>
          <div className="mb-6">
            <label className="block text-sm text-text-secondary mb-2">How many extractions per day?</label>
            <div className="flex items-center gap-4">
              <input type="range" min="100" max="10000" step="100" value={dailyExtractions} onChange={(e) => setDailyExtractions(parseInt(e.target.value))} className="flex-1" />
              <span className="text-lg font-mono font-bold text-ember w-20 text-right">{dailyExtractions.toLocaleString()}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_6rem_7rem] gap-2 pb-2 border-b border-surface-border">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Model</span>
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider text-right">Monthly</span>
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider text-right">vs GPT-4o</span>
            </div>
            {top5.map((m) => {
              const cost = monthlyCost(m.costPerRun);
              const diff = cost - monthlyCost(gpt4oCost);
              return (
                <div key={m.model} className={`grid grid-cols-[1fr_6rem_7rem] gap-2 py-2.5 border-b border-surface-border/30 ${m.rank === 1 ? 'bg-ember/5 -mx-5 px-5 rounded' : ''}`}>
                  <span className={`text-sm ${m.rank === 1 ? 'text-ember font-medium' : 'text-text-secondary'}`}>{m.model}</span>
                  <span className="text-sm font-mono text-right text-text-primary">${cost.toFixed(0)}/mo</span>
                  <span className={`text-sm font-mono text-right ${m.model === 'GPT-4o' ? 'text-text-muted' : diff < 0 ? 'text-success' : 'text-danger'}`}>
                    {m.model === 'GPT-4o' ? '—' : `${diff < 0 ? '-' : '+'}$${Math.abs(diff).toFixed(0)}/mo`}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-success/10 rounded-lg">
            <DollarSign className="w-4 h-4 text-success shrink-0" />
            <span className="text-sm text-success font-medium">Switching from {mostExpensiveTop5.model} to {cheapestAccurate.model} saves ${savings.toFixed(0)}/month</span>
          </div>
        </div>

        {/* Error Analysis */}
        <div>
          <h2 className="text-xl font-semibold mb-4">🔍 Where Models Failed</h2>
          <div className="space-y-3">
            {ERROR_EXAMPLES.map((ex) => {
              const isExpanded = expandedErrors.includes(ex.model);
              const modelData = MODELS.find(m => m.model === ex.model);
              return (
                <div key={ex.model} className="bg-surface border border-surface-border rounded-xl overflow-hidden">
                  <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-raised/50 transition-colors" onClick={() => setExpandedErrors(prev => prev.includes(ex.model) ? prev.filter(m => m !== ex.model) : [...prev, ex.model])}>
                    <div className="flex items-center gap-3">
                      <AlertTriangle size={18} className="text-warning shrink-0" />
                      <div className="text-left">
                        <div className="font-semibold text-text-primary text-sm">{ex.model} ({modelData?.correct}% correct)</div>
                        <div className="text-xs text-text-muted mt-0.5">{ex.errors.length} error types</div>
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-surface-border/50">
                      <div className="space-y-3 mt-4 mb-4">
                        {ex.errors.map((err, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-surface-raised border border-surface-border">
                            <span className="text-xs font-mono text-text-muted shrink-0">{err.field}</span>
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="text-red-400 line-through font-mono">{err.actual}</span>
                                <span className="text-text-muted">→</span>
                                <span className="text-green-400 font-mono">{err.expected}</span>
                              </div>
                              <span className="text-xs text-red-400 bg-red-400/10 rounded px-1.5 py-0.5 mt-1 inline-block">{err.errorType}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-semibold text-green-400 mb-2">✅ Expected</p>
                          <pre className="bg-[#0D0D0E] border border-surface-border rounded-lg p-3 text-xs font-mono text-green-400/80 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(ex.fullExpected, null, 2)}</pre>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-red-400 mb-2">❌ Actual</p>
                          <pre className="bg-[#0D0D0E] border border-red-400/20 rounded-lg p-3 text-xs font-mono text-red-400/80 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(ex.fullActual, null, 2)}</pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Raw Run Data */}
        <div>
          <h2 className="text-xl font-semibold mb-4">📊 Raw Run Data</h2>
          <div className="space-y-3">
            {MODELS.map((m) => {
              const isExpanded = expandedRuns.includes(m.model);
              const allRuns = isExpanded ? generateRunData(m) : [];
              const showAll = showAllRuns.includes(m.model);
              const visibleRuns = showAll ? allRuns : allRuns.slice(0, 10);
              return (
                <div key={m.model} className="bg-surface border border-surface-border rounded-xl overflow-hidden">
                  <button className="w-full flex items-center justify-between px-5 py-3 hover:bg-surface-raised/50 transition-colors" onClick={() => setExpandedRuns(prev => prev.includes(m.model) ? prev.filter(x => x !== m.model) : [...prev, m.model])}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-text-primary">{m.model}</span>
                      <CorrectBadge pct={m.correct} />
                    </div>
                    <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-4 border-t border-surface-border/50">
                      <div className="mt-3">
                        <table className="w-full text-xs">
                          <thead><tr className="border-b border-surface-border"><th className="py-2 text-left text-text-muted">Run #</th><th className="py-2 text-center text-text-muted">Correct</th><th className="py-2 text-right text-text-muted">Time</th><th className="py-2 text-right text-text-muted">Tokens</th></tr></thead>
                          <tbody>
                            {visibleRuns.map((run, i) => (
                              <tr key={run.run} className={`border-b border-surface-border/30 ${i % 2 === 0 ? 'bg-surface' : 'bg-surface-raised/30'} ${run.correct ? 'border-l-2 border-l-success/30' : 'border-l-2 border-l-danger/40 bg-red-500/5'}`}>
                                <td className="py-1.5 pl-3 font-mono text-text-muted">{run.run}</td>
                                <td className="py-1.5 text-center">{run.correct ? <span className="text-success">✓</span> : <span className="text-danger">✗</span>}</td>
                                <td className="py-1.5 text-right font-mono text-text-secondary">{run.responseTime}s</td>
                                <td className="py-1.5 text-right font-mono text-text-secondary">{run.tokens}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {!showAll && allRuns.length > 10 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowAllRuns(prev => [...prev, m.model]); }}
                            className="mt-3 w-full text-center text-xs text-ember hover:text-ember-light font-medium py-2 rounded-lg border border-surface-border hover:bg-surface-raised transition-colors"
                          >
                            Show all {allRuns.length} runs
                          </button>
                        )}
                        {showAll && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowAllRuns(prev => prev.filter(x => x !== m.model)); }}
                            className="mt-3 w-full text-center text-xs text-text-muted hover:text-text-secondary font-medium py-2 rounded-lg border border-surface-border hover:bg-surface-raised transition-colors"
                          >
                            Show fewer
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-surface-border bg-void">
        <div className="mx-auto max-w-[1200px] px-4 py-8 md:px-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="text-sm text-text-muted"><span className="font-semibold text-text-secondary"><span className="text-ember">Model</span>Pick</span> © 2026</div>
            <div className="flex items-center gap-6 text-sm text-text-muted">
              <a href="#" className="hover:text-text-secondary transition-colors">Privacy</a>
              <a href="#" className="hover:text-text-secondary transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
