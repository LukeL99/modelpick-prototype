import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy, Share2, FileDown, DollarSign, Target, ArrowUpDown,
  ChevronDown, AlertTriangle, ArrowRight, Info
} from 'lucide-react';
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  BarChart, Bar
} from 'recharts';
import { MODELS, PROVIDER_COLORS, TIER_COLORS, ERROR_EXAMPLES, generateRunData } from '../data/models';

type SortKey = 'rank' | 'correct' | 'median' | 'p95' | 'spread' | 'costPerRun';

const METRIC_TOOLTIPS: Record<string, string> = {
  'Accuracy': 'Exact match — the extracted JSON either matches your expected output perfectly or it doesn\'t',
  'Cost/Run': 'What you\'ll pay per extraction at current OpenRouter pricing',
  'Response Time': 'Total wall-clock time from request sent to complete JSON received',
  'P95': '95% of runs finished within this time — your realistic worst case',
  'P99': 'Only 1 in 100 runs takes longer than this',
  'Median': 'Typical response time — half your runs will be faster',
  'Spread': 'How consistent this model is (P75 minus P25). Smaller = more predictable.',
};

function DiffJson({ expected, actual }: { expected: object; actual: object }) {
  const expLines = JSON.stringify(expected, null, 2).split('\n');
  const actLines = JSON.stringify(actual, null, 2).split('\n');
  const maxLines = Math.max(expLines.length, actLines.length);

  const renderLines = (lines: string[], otherLines: string[], isExpected: boolean) => {
    const result: React.ReactNode[] = [];
    for (let i = 0; i < maxLines; i++) {
      const line = lines[i] ?? '';
      const other = otherLines[i] ?? '';
      const isDiff = line !== other;
      if (isDiff && line) {
        result.push(
          <div key={i} className={`${isExpected ? 'bg-success/15 text-green-400' : 'bg-red-500/5 text-red-400'}`}>
            {line}
          </div>
        );
      } else if (line) {
        result.push(
          <div key={i} className="text-text-secondary">
            {line}
          </div>
        );
      } else {
        result.push(<div key={i}>&nbsp;</div>);
      }
    }
    return result;
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <p className="text-xs font-semibold text-green-400 mb-2">✅ Expected</p>
        <pre className="bg-[#0D0D0E] border border-surface-border rounded-lg p-4 text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap">
          {renderLines(expLines, actLines, true)}
        </pre>
      </div>
      <div>
        <p className="text-xs font-semibold text-red-400 mb-2">❌ Actual (model output)</p>
        <pre className="bg-[#0D0D0E] border border-surface-border rounded-lg p-4 text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap">
          {renderLines(actLines, expLines, false)}
        </pre>
      </div>
    </div>
  );
}

function MetricTooltip({ label }: { label: string }) {
  const text = METRIC_TOOLTIPS[label];
  if (!text) return null;
  return (
    <span className="relative group/tip inline-flex ml-1 align-middle">
      <Info size={12} className="text-text-muted cursor-help hover:text-ember transition-colors" />
      <span className="hidden group-hover/tip:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 text-xs text-text-secondary bg-surface border border-ember/40 rounded-lg shadow-xl z-[100] font-normal normal-case tracking-normal pointer-events-none">
        {text}
      </span>
    </span>
  );
}

function CorrectBadge({ pct }: { pct: number }) {
  const color = pct >= 95 ? 'bg-success/15 text-success' : pct >= 85 ? 'bg-warning/15 text-warning' : pct >= 70 ? 'bg-ember/15 text-ember' : 'bg-danger/15 text-danger';
  return <span className={`${color} rounded-full px-2 py-0.5 text-xs font-semibold`}>{pct}%</span>;
}

// Toast component
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-sm text-text-primary shadow-xl animate-fade-in-up">
      {message}
      <button onClick={onClose} className="ml-3 text-text-muted hover:text-text-primary">×</button>
    </div>
  );
}

export default function ReportPage() {
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortAsc, setSortAsc] = useState(true);
  const [dailyExtractions, setDailyExtractions] = useState(1000);
  const [expandedErrors, setExpandedErrors] = useState<string[]>([]);
  const [expandedRuns, setExpandedRuns] = useState<string[]>([]);
  const [showAllRuns, setShowAllRuns] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [compareModel, setCompareModel] = useState('GPT-4o');
  const [expandedRunDiffs, setExpandedRunDiffs] = useState<string[]>([]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'rank' || key === 'median' || key === 'p95' || key === 'spread' || key === 'costPerRun');
    }
  };

  const sorted = [...MODELS].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const top5 = MODELS.slice(0, 5);
  const compareModelCost = MODELS.find(m => m.model === compareModel)?.costPerRun ?? MODELS[0].costPerRun;
  const cheapestAccurate = MODELS.filter(m => m.correct >= 90).sort((a, b) => a.costPerRun - b.costPerRun)[0];
  const mostExpensiveTop5 = [...top5].sort((a, b) => b.costPerRun - a.costPerRun)[0];

  const monthlyCost = (cost: number) => cost * dailyExtractions * 30;
  const savings = monthlyCost(mostExpensiveTop5.costPerRun) - monthlyCost(cheapestAccurate.costPerRun);

  // Bubble chart helpers
  const maxP95 = Math.max(...MODELS.map(m => m.p95));
  const maxSpread = Math.max(...MODELS.map(m => m.spread));

  return (
    <div className="min-h-screen bg-void text-text-primary font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-surface-border/50 bg-void/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-xl font-bold tracking-tight">
            <span className="text-ember">Model</span>Pick
          </Link>
          <Link to="/benchmark" className="inline-flex items-center gap-2 rounded-lg bg-ember px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors">
            Run Another <ArrowRight size={16} />
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 pt-10 pb-20 sm:px-6 lg:px-8 space-y-12">
        {/* (a) Header */}
        <div className="bg-surface border border-surface-border rounded-2xl p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Benchmark Report — Receipt Data Extraction</h1>
            <p className="text-sm text-text-muted mt-2">
              Feb 10, 2026 · 20 models · 1,000 runs · ID: bench_demo123
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText('https://modelpick.ai/shared/demo-123');
                showToast('Share link copied to clipboard!');
              }}
              className="flex items-center gap-2 px-4 py-2 border border-surface-border rounded-lg text-text-secondary text-sm hover:bg-surface-raised transition-colors"
            >
              <Share2 className="w-4 h-4" /> Share Report
            </button>
            <button
              onClick={() => showToast('PDF export coming soon')}
              className="flex items-center gap-2 px-4 py-2 border border-surface-border rounded-lg text-text-secondary text-sm hover:bg-surface-raised transition-colors"
            >
              <FileDown className="w-4 h-4" /> Export PDF
            </button>
          </div>
        </div>

        {/* (b) Recommendation Card */}
        <div className="rounded-2xl border-2 border-ember bg-surface p-6 md:p-8 shadow-[0_0_40px_rgba(249,115,22,0.12)]">
          <div className="flex items-center gap-2 text-sm font-semibold text-ember uppercase tracking-wider">
            <Trophy size={16} /> Our Recommendation
          </div>
          <h3 className="mt-3 text-2xl font-bold">Gemini 3 Flash Preview</h3>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1.5"><Target size={14} className="text-success" /> 98% accurate, 1.8s P95, ±0.4s spread — the most consistent AND cheapest option</span>
          </div>
          <p className="mt-4 text-text-secondary leading-relaxed">
            Gemini 3 Flash Preview achieves the highest accuracy at the lowest cost among high-performing models. It outperforms GPT-4o (94%) while costing 6× less, with the tightest response time spread of any top-tier model.
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-success/10 px-4 py-3 text-sm text-success">
            <DollarSign size={16} />
            <span>At 1,000 extractions/day, switching from GPT-4o saves you <strong>$144/month</strong></span>
          </div>
        </div>

        {/* (c) Ranked Results Table */}
        <div className="bg-surface border border-surface-border rounded-2xl overflow-visible">
          <h2 className="text-lg font-semibold px-6 pt-6 pb-4">All Models Ranked</h2>
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="bg-surface-raised">
                    {([
                      { key: 'rank' as SortKey, label: 'Rank', metric: null, align: 'text-left' },
                      { key: null, label: 'Model', metric: null, align: 'text-left' },
                      { key: null, label: 'Provider', metric: null, align: 'text-left' },
                      { key: 'correct' as SortKey, label: 'Accuracy', metric: 'Accuracy', align: 'text-center' },
                      { key: 'costPerRun' as SortKey, label: 'Cost/Run', metric: 'Cost/Run', align: 'text-right' },
                      { key: 'median' as SortKey, label: 'Median', metric: 'Median', align: 'text-center' },
                      { key: 'p95' as SortKey, label: 'P95', metric: 'P95', align: 'text-center' },
                      { key: 'spread' as SortKey, label: 'Spread', metric: 'Spread', align: 'text-center' },
                    ] as const).map((col, i) => (
                      <th
                        key={i}
                        className={`px-4 py-3 text-[11px] font-medium text-text-muted uppercase tracking-[0.05em] ${col.align} ${col.key ? 'cursor-pointer hover:text-text-secondary' : ''}`}
                        onClick={() => col.key && handleSort(col.key)}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {col.metric && <MetricTooltip label={col.metric} />}
                          {col.key && sortKey === col.key && <ArrowUpDown className="w-3 h-3 text-ember" />}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((m) => (
                    <tr
                      key={m.model}
                      className={`border-b border-surface-border/50 hover:bg-surface-raised/50 transition-colors ${
                        m.rank === 1 ? 'bg-ember/[0.03] border-l-[3px] border-l-ember' : ''
                      }`}
                    >
                      <td className={`px-4 py-4 font-mono ${m.rank === 1 ? 'text-ember font-semibold' : 'text-text-muted'}`}>
                        {m.rank === 1 ? <Trophy size={16} className="text-ember" /> : m.rank}
                      </td>
                      <td className={`px-4 py-4 font-medium ${m.rank === 1 ? 'text-text-primary' : 'text-text-secondary'}`}>{m.model}</td>
                      <td className="px-4 py-4 text-text-muted text-xs">{m.provider}</td>
                      <td className="px-4 py-4 text-center"><CorrectBadge pct={m.correct} /></td>
                      <td className="px-4 py-4 text-right font-mono text-text-secondary">${m.costPerRun}</td>
                      <td className="px-4 py-4 text-center font-mono text-text-secondary">{m.median}s</td>
                      <td className="px-4 py-4 text-center font-mono text-text-secondary">{m.p95}s</td>
                      <td className="px-4 py-4 text-center font-mono text-text-secondary">±{m.spread}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </div>

        {/* (d) Charts */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold mb-2">Visual Comparison</h2>
          
          {/* Bubble Chart — Accuracy vs Cost with size=speed, opacity=consistency */}
          <div className="bg-surface border border-surface-border rounded-2xl p-6 md:p-8">
            <h3 className="text-lg font-semibold text-text-primary mb-1">
              Accuracy vs Cost
              <MetricTooltip label="Accuracy" />
            </h3>
            <p className="text-sm text-text-muted mb-6">
              Higher + left = better · Bubble size = response time <MetricTooltip label="Response Time" /> (smaller = faster) · Opacity = consistency <MetricTooltip label="Spread" /> (solid = predictable)
            </p>
            <div className="relative h-[500px] border-l border-b border-surface-border/50 ml-12 mr-6">
              {/* Y-axis labels */}
              <div className="absolute -left-12 top-0 bottom-0 flex flex-col justify-between text-xs text-text-muted font-mono">
                <span>100%</span><span>90%</span><span>80%</span><span>70%</span><span>60%</span><span>50%</span>
              </div>
              {/* X-axis labels */}
              <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-xs text-text-muted font-mono">
                <span>$0</span><span>$0.005</span><span>$0.010</span><span>$0.015</span><span>$0.020</span>
              </div>
              {/* Grid lines */}
              {[0, 20, 40, 60, 80, 100].map(pct => (
                <div key={pct} className="absolute left-0 right-0 border-t border-surface-border/20" style={{ bottom: `${pct}%` }} />
              ))}
              {/* Bubbles */}
              {MODELS.map((m) => {
                const x = (Math.sqrt(m.costPerRun) / Math.sqrt(0.02)) * 100;
                const y = ((m.correct - 50) / 50) * 100;
                // Size: p95-based, inverted so smaller p95 = smaller bubble (faster = better = smaller)
                const minSize = 20;
                const maxSize = 64;
                const sizeRatio = m.p95 / maxP95;
                const size = minSize + sizeRatio * (maxSize - minSize);
                // Opacity: spread-based, lower spread = more opaque (more consistent = better)
                const spreadRatio = m.spread / maxSpread;
                const opacity = 1.0 - spreadRatio * 0.65; // range 0.35 to 1.0
                const baseColor = PROVIDER_COLORS[m.provider] || '#71717A';
                return (
                  <div
                    key={m.model}
                    className="absolute rounded-full border-2 border-void -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-125 transition-transform group"
                    style={{
                      left: `${Math.min(x, 97)}%`,
                      bottom: `${Math.min(y, 97)}%`,
                      width: `${size}px`,
                      height: `${size}px`,
                      backgroundColor: baseColor,
                      opacity,
                    }}
                  >
                    <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-surface border border-ember/40 rounded-lg px-3 py-2 text-xs whitespace-nowrap z-10 shadow-xl" style={{ opacity: 1 }}>
                      <p className="font-semibold text-text-primary">{m.model}</p>
                      <p className="text-text-secondary">{m.correct}% · ${m.costPerRun}/run · {m.p95}s P95 · ±{m.spread}s</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
              {/* Provider colors */}
              <div className="flex flex-wrap gap-3">
                {Object.entries(PROVIDER_COLORS).map(([provider, color]) => (
                  <div key={provider} className="flex items-center gap-1.5 text-xs text-text-muted">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    {provider}
                  </div>
                ))}
              </div>
              <div className="w-px h-4 bg-surface-border" />
              {/* Size legend */}
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <div className="w-3 h-3 rounded-full bg-text-muted/50" />
                <span>Fast</span>
                <div className="w-6 h-6 rounded-full bg-text-muted/50" />
                <span>Slow</span>
              </div>
              <div className="w-px h-4 bg-surface-border" />
              {/* Opacity legend */}
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <div className="w-3 h-3 rounded-full bg-text-muted" style={{ opacity: 1 }} />
                <span>Consistent</span>
                <div className="w-3 h-3 rounded-full bg-text-muted" style={{ opacity: 0.35 }} />
                <span>Erratic</span>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Latency Chart */}
            <div className="bg-surface border border-surface-border rounded-2xl p-6 md:p-8">
              <h3 className="text-lg font-semibold text-text-primary mb-6">
                P95 Latency Comparison
                <MetricTooltip label="P95" />
              </h3>
              <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[...MODELS].sort((a, b) => a.p95 - b.p95).map(m => ({
                      name: m.model.length > 20 ? m.model.slice(0, 18) + '…' : m.model,
                      p95: m.p95,
                      tier: m.tier,
                    }))}
                    layout="vertical"
                    margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
                  >
                    <XAxis
                      type="number"
                      tickFormatter={(v: number) => `${v}s`}
                      tick={{ fill: '#A1A1AA', fontSize: 11 }}
                      axisLine={{ stroke: '#363640' }}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={140}
                      tick={{ fill: '#A1A1AA', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ background: '#242428', border: '1px solid #363640', borderRadius: '8px', color: '#F5F5F5', fontSize: '12px' }}
                      formatter={(value) => [`${value ?? 0}s`, 'P95 Latency']}
                    />
                    <Bar dataKey="p95" radius={[0, 4, 4, 0]}>
                      {[...MODELS].sort((a, b) => a.p95 - b.p95).map((m, i) => (
                        <Cell key={i} fill={TIER_COLORS[m.tier] || '#71717A'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 mt-3 justify-center">
                {Object.entries(TIER_COLORS).map(([tier, color]) => (
                  <div key={tier} className="flex items-center gap-1.5 text-xs text-text-muted">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    {tier}
                  </div>
                ))}
              </div>
            </div>

            {/* Cost Chart */}
            <div className="bg-surface border border-surface-border rounded-2xl p-6 md:p-8">
              <h3 className="text-lg font-semibold text-text-primary mb-6">
                Cost per Run
                <MetricTooltip label="Cost/Run" />
              </h3>
              <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[...MODELS].sort((a, b) => a.costPerRun - b.costPerRun).map(m => ({
                      name: m.model.length > 20 ? m.model.slice(0, 18) + '…' : m.model,
                      fullName: m.model,
                      cost: m.costPerRun,
                      isWinner: m.rank === 1,
                    }))}
                    layout="vertical"
                    margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
                  >
                    <XAxis
                      type="number"
                      tickFormatter={(v: number) => `$${v}`}
                      tick={{ fill: '#A1A1AA', fontSize: 11 }}
                      axisLine={{ stroke: '#363640' }}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={140}
                      tick={{ fill: '#A1A1AA', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ background: '#242428', border: '1px solid #363640', borderRadius: '8px', color: '#F5F5F5', fontSize: '12px' }}
                      formatter={(value) => [`$${value ?? 0}`, 'Cost/Run']}
                    />
                    <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                      {[...MODELS].sort((a, b) => a.costPerRun - b.costPerRun).map((m, i) => (
                        <Cell key={i} fill={m.rank === 1 ? '#F97316' : '#71717A'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* (d2) OpenRouter Baseline Comparison */}
        <div className="bg-surface border border-surface-border rounded-2xl p-6 md:p-8">
          <h2 className="text-xl font-semibold text-text-primary mb-2">📊 How Your Results Compare</h2>
          <p className="text-sm text-text-muted mb-6">Your measured median vs OpenRouter's global median response time</p>
          <div className="space-y-5">
            {top5.map((m) => {
              const ratio = m.median / m.openRouterMedian;
              const maxVal = Math.max(m.median, m.openRouterMedian);
              const yourPct = (m.median / maxVal) * 100;
              const globalPct = (m.openRouterMedian / maxVal) * 100;
              const warning = ratio > 2;
              const faster = ratio < 0.5;
              return (
                <div key={m.model} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary">{m.model}</span>
                    <div className="flex items-center gap-3 text-xs">
                      {warning && <span className="text-warning">⚠️ Provider may have been under load</span>}
                      {faster && <span className="text-info">💡 Your prompt is simpler than average</span>}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-text-muted w-28 shrink-0">Your benchmark</span>
                      <div className="flex-1 h-5 bg-surface-raised rounded overflow-hidden">
                        <div className="h-full bg-ember rounded" style={{ width: `${yourPct}%` }} />
                      </div>
                      <span className="text-xs font-mono text-text-secondary w-14 text-right">{m.median}s</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-text-muted w-28 shrink-0">OpenRouter global</span>
                      <div className="flex-1 h-5 bg-surface-raised rounded overflow-hidden">
                        <div className="h-full bg-text-muted/40 rounded" style={{ width: `${globalPct}%` }} />
                      </div>
                      <span className="text-xs font-mono text-text-secondary w-14 text-right">{m.openRouterMedian}s</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* (e) Cost Calculator */}
        <div className="bg-surface border border-surface-border rounded-2xl p-6 md:p-8">
          <h2 className="text-xl font-semibold text-text-primary mb-6">💰 Monthly Cost Calculator</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm text-text-secondary mb-2">How many extractions per day?</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="100"
                  max="10000"
                  step="100"
                  value={dailyExtractions}
                  onChange={(e) => setDailyExtractions(parseInt(e.target.value))}
                  className="flex-1 accent-ember"
                  style={{ background: `linear-gradient(to right, #F97316 ${((dailyExtractions - 100) / 9900) * 100}%, #2A2A2D ${((dailyExtractions - 100) / 9900) * 100}%)`, height: '6px', borderRadius: '3px' }}
                />
                <span className="text-lg font-mono font-bold text-ember w-20 text-right">{dailyExtractions.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-text-muted mt-1">
                <span>100</span>
                <span>10,000</span>
              </div>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-2">Compare against (your current model)</label>
              <select
                value={compareModel}
                onChange={(e) => setCompareModel(e.target.value)}
                className="w-full bg-surface-raised border border-surface-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:border-ember focus:outline-none"
              >
                {MODELS.map((m) => (
                  <option key={m.model} value={m.model}>{m.model} — ${m.costPerRun.toFixed(4)}/run</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border">
                    <th className="py-3 text-left text-[11px] font-medium text-text-muted uppercase tracking-wider">Model</th>
                    <th className="py-3 text-right text-[11px] font-medium text-text-muted uppercase tracking-wider whitespace-nowrap">Monthly Cost</th>
                    <th className="py-3 text-right text-[11px] font-medium text-text-muted uppercase tracking-wider whitespace-nowrap">vs {compareModel}</th>
                  </tr>
                </thead>
                <tbody>
                  {top5.map((m) => {
                    const cost = monthlyCost(m.costPerRun);
                    const compareMonthly = monthlyCost(compareModelCost);
                    const diff = cost - compareMonthly;
                    const isWinner = m.rank === 1;
                    const isCompareModel = m.model === compareModel;

                    return (
                      <tr
                        key={m.model}
                        className={`border-b border-surface-border/30 ${isWinner ? 'bg-ember/5' : ''}`}
                      >
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-2">
                            <span className={`${isWinner ? 'text-ember font-medium' : 'text-text-secondary'}`}>{m.model}</span>
                            {isWinner && <span className="text-[10px] bg-ember/20 text-ember px-1.5 py-0.5 rounded-full font-semibold shrink-0">Winner</span>}
                          </div>
                        </td>
                        <td className="py-3.5 text-right font-mono text-text-primary whitespace-nowrap">${cost.toFixed(0)}/mo</td>
                        <td className={`py-3.5 text-right font-mono whitespace-nowrap ${
                          isCompareModel ? 'text-text-muted' : diff < 0 ? 'text-success' : 'text-danger'
                        }`}>
                          {isCompareModel ? '—' : `${diff < 0 ? '-' : '+'}$${Math.abs(diff).toFixed(0)}/mo`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-success/10 rounded-lg">
            <DollarSign className="w-4 h-4 text-success shrink-0" />
            <span className="text-sm text-success font-medium">
              Switching from {mostExpensiveTop5.model} to {cheapestAccurate.model} saves ${savings.toFixed(0)}/month
            </span>
          </div>
        </div>

        {/* (f) Error Analysis */}
        <div>
          <h2 className="text-xl font-semibold mb-6">🔍 Where Models Failed</h2>
          <div className="space-y-4">
            {ERROR_EXAMPLES.map((ex) => {
              const isExpanded = expandedErrors.includes(ex.model);
              const modelData = MODELS.find(m => m.model === ex.model);
              return (
                <div key={ex.model} className="bg-surface border border-surface-border rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-raised/50 transition-colors"
                    onClick={() => setExpandedErrors(prev =>
                      prev.includes(ex.model) ? prev.filter(m => m !== ex.model) : [...prev, ex.model]
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle size={18} className="text-warning shrink-0" />
                      <div className="text-left">
                        <div className="font-semibold text-text-primary text-sm">{ex.model} ({modelData?.correct}% correct)</div>
                        <div className="text-xs text-text-muted mt-0.5">{ex.errors.length} error types identified</div>
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  {isExpanded && (
                    <div className="px-6 pb-6 border-t border-surface-border/50">
                      <p className="text-sm text-text-secondary mt-5 mb-5">
                        {Math.round((100 - (modelData?.correct || 0)) / 100 * 50)} of 50 runs had errors. Common failure patterns:
                      </p>
                      
                      {/* Error details */}
                      <div className="space-y-4 mb-6">
                        {ex.errors.map((err, i) => (
                          <div key={i} className="flex items-start gap-4 p-4 rounded-lg bg-surface-raised border border-surface-border">
                            <span className="text-xs font-mono text-text-muted shrink-0 mt-0.5">{err.field}</span>
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

                      {/* Side-by-side JSON diff with highlights */}
                      <DiffJson expected={ex.fullExpected} actual={ex.fullActual} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* (g) Raw Run Data */}
        <div>
          <h2 className="text-xl font-semibold mb-6">📊 Raw Run Data</h2>
          <div className="space-y-4">
            {MODELS.map((m) => {
              const isExpanded = expandedRuns.includes(m.model);
              const allRuns = isExpanded ? generateRunData(m) : [];
              const showAll = showAllRuns.includes(m.model);
              const visibleRuns = showAll ? allRuns : allRuns.slice(0, 10);
              return (
                <div key={m.model} className="bg-surface border border-surface-border rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-surface-raised/50 transition-colors"
                    onClick={() => setExpandedRuns(prev =>
                      prev.includes(m.model) ? prev.filter(x => x !== m.model) : [...prev, m.model]
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-text-primary">{m.model}</span>
                      <CorrectBadge pct={m.correct} />
                    </div>
                    <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  {isExpanded && (
                    <div className="px-6 pb-6 border-t border-surface-border/50">
                      <div className="mt-4">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-surface-border">
                              <th className="py-2 text-left text-text-muted font-medium">Run #</th>
                              <th className="py-2 text-center text-text-muted font-medium">Correct</th>
                              <th className="py-2 text-right text-text-muted font-medium">Response Time</th>
                              <th className="py-2 text-right text-text-muted font-medium">Tokens</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleRuns.map((run, i) => {
                              const runKey = `${m.model}-${run.run}`;
                              const isRunExpanded = expandedRunDiffs.includes(runKey);
                              // Find matching error example for this model (if failed)
                              const errorEx = !run.correct ? ERROR_EXAMPLES.find(ex => ex.model === m.model) : null;
                              return (
                                <React.Fragment key={run.run}>
                                  <tr
                                    className={`border-b border-surface-border/30 ${
                                      i % 2 === 0 ? 'bg-surface' : 'bg-surface-raised/30'
                                    } ${run.correct ? 'border-l-2 border-l-success/30' : 'border-l-2 border-l-danger/40 bg-red-500/5 cursor-pointer hover:bg-red-500/10 transition-colors'}`}
                                    onClick={!run.correct && errorEx ? () => setExpandedRunDiffs(prev =>
                                      prev.includes(runKey) ? prev.filter(x => x !== runKey) : [...prev, runKey]
                                    ) : undefined}
                                  >
                                    <td className="py-2.5 pl-3 pr-2 font-mono text-text-muted">{run.run}</td>
                                    <td className="py-2.5 text-center">
                                      {run.correct
                                        ? <span className="text-success">✓</span>
                                        : <span className="text-danger flex items-center justify-center gap-1">✗ {errorEx && <ChevronDown className={`w-3 h-3 transition-transform ${isRunExpanded ? 'rotate-180' : ''}`} />}</span>
                                      }
                                    </td>
                                    <td className="py-2.5 text-right font-mono text-text-secondary">{run.responseTime}s</td>
                                    <td className="py-2.5 text-right pr-2 font-mono text-text-secondary">{run.tokens}</td>
                                  </tr>
                                  {isRunExpanded && errorEx && (
                                    <tr>
                                      <td colSpan={4} className="p-4 bg-[#0D0D0E]">
                                        <DiffJson expected={errorEx.fullExpected} actual={errorEx.fullActual} />
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
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
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="text-sm text-text-muted">
              <span className="font-semibold text-text-secondary"><span className="text-ember">Model</span>Pick</span> © 2026
            </div>
            <div className="flex items-center gap-6 text-sm text-text-muted">
              <a href="#" className="hover:text-text-secondary transition-colors">Privacy</a>
              <a href="#" className="hover:text-text-secondary transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
