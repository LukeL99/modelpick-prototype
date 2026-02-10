import { Link } from 'react-router-dom';
import { ArrowRight, Upload, Play, Trophy, Target, Zap, DollarSign, CheckCircle, Eye } from 'lucide-react';

const MODELS_PREVIEW = [
  { rank: 1, model: 'Gemini 3 Flash Preview', provider: 'Google', correct: 98, cost: '$0.0008', winner: true },
  { rank: 2, model: 'Claude Sonnet 4.5', provider: 'Anthropic', correct: 96, cost: '$0.0052', winner: false },
  { rank: 3, model: 'GPT-5.2', provider: 'OpenAI', correct: 96, cost: '$0.0058', winner: false },
  { rank: 4, model: 'GPT-4o', provider: 'OpenAI', correct: 94, cost: '$0.0048', winner: false },
  { rank: 5, model: 'Gemini 3 Pro', provider: 'Google', correct: 94, cost: '$0.0041', winner: false },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-void text-text-primary font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-surface-border/50 bg-void/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-xl font-bold tracking-tight">
            <span className="text-ember">Model</span>Pick
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            <a href="#how" className="text-sm text-text-secondary hover:text-text-primary transition-colors">How it Works</a>
            <a href="#pricing" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Pricing</a>
            <Link to="/benchmark" className="inline-flex items-center gap-2 rounded-lg bg-ember px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors">
              Run a Benchmark <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(249,115,22,0.08)_0%,_transparent_60%)]" />
        <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-16 sm:px-6 lg:px-8 md:pt-28 md:pb-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight md:text-[56px] lg:text-[64px]">
              Find the best vision model for your data extraction.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-text-secondary md:text-xl">
              Upload your images. Define your schema. We test 20 vision models, 50 times each. Get exact-match accuracy, latency, and cost — for receipts, invoices, documents, and forms.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link to="/benchmark" className="inline-flex items-center gap-2 rounded-lg bg-ember px-6 py-3.5 text-base font-semibold text-white hover:bg-orange-600 transition-colors shadow-lg shadow-ember/20">
                Run a Benchmark — $14.99 <ArrowRight size={18} />
              </Link>
              <a href="#how" className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-6 py-3.5 text-base font-semibold text-text-secondary hover:bg-surface-raised hover:text-text-primary transition-colors">
                See how it works
              </a>
            </div>
            <p className="mt-6 text-sm text-text-muted">No API keys needed · Results in ~10 minutes · No account required</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="border-t border-surface-border bg-surface/50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 md:py-24">
          <h2 className="text-center text-3xl font-semibold tracking-tight md:text-4xl">How it works</h2>
          <p className="mt-4 text-center text-text-secondary">Three steps. Ten minutes. Done.</p>
          <div className="mt-12 grid gap-8 md:grid-cols-3 md:gap-12">
            {[
              { icon: <Upload size={28} />, step: '1', title: 'Upload Your Images', desc: 'Upload 3-5 sample images (receipts, invoices, documents) and the correct JSON extraction for each.' },
              { icon: <Play size={28} />, step: '2', title: 'We Test 20 Vision Models', desc: 'Each model processes your images 50 times. We measure exact-match accuracy, latency, and cost.' },
              { icon: <Trophy size={28} />, step: '3', title: 'Get Your Report', desc: 'See which models get it right, where they fail, and what they cost. Plus our recommendation.' },
            ].map(({ icon, step, title, desc }) => (
              <div key={step} className="relative text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-ember/10 text-ember">{icon}</div>
                <div className="mt-1 text-xs font-semibold text-ember">STEP {step}</div>
                <h3 className="mt-3 text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-text-secondary leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Example Report Preview */}
      <section className="border-t border-surface-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 md:py-24">
          <h2 className="text-center text-3xl font-semibold tracking-tight md:text-4xl">See a real report</h2>
          <p className="mt-4 text-center text-text-secondary">Receipt Data Extraction — 20 vision models, 50 runs each</p>

          {/* Recommendation Card */}
          <div className="mt-10 mx-auto max-w-2xl rounded-xl border border-ember bg-surface p-6 md:p-8 shadow-[0_0_30px_rgba(249,115,22,0.08)]">
            <div className="flex items-center gap-2 text-sm font-semibold text-ember uppercase tracking-wider">
              <Trophy size={16} /> Our Recommendation
            </div>
            <h3 className="mt-3 text-2xl font-semibold">Gemini 3 Flash Preview</h3>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1.5"><Target size={14} className="text-success" /> 98% correct</span>
              <span className="flex items-center gap-1.5"><Zap size={14} className="text-ember-light" /> P95: 1.8s</span>
              <span className="flex items-center gap-1.5"><DollarSign size={14} className="text-success" /> $0.0008/run</span>
            </div>
            <p className="mt-4 text-text-secondary leading-relaxed">
              6.5x cheaper than GPT-4o with higher accuracy. At 1,000 extractions/day, switching saves you $144/month.
            </p>
          </div>

          {/* Mini Table */}
          <div className="mt-8 mx-auto max-w-3xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-xs font-semibold uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-3 text-left">Rank</th>
                  <th className="px-4 py-3 text-left">Model</th>
                  <th className="px-4 py-3 text-center">% Correct</th>
                  <th className="px-4 py-3 text-right">Cost/Run</th>
                </tr>
              </thead>
              <tbody>
                {MODELS_PREVIEW.map((m) => (
                  <tr key={m.rank} className={`border-b border-surface-border transition-colors hover:bg-surface-raised ${m.winner ? 'bg-ember/5 border-l-2 border-l-ember' : ''}`}>
                    <td className="px-4 py-3.5 text-text-muted">{m.winner ? <Trophy size={16} className="text-ember" /> : m.rank}</td>
                    <td className="px-4 py-3.5">
                      <span className="font-medium">{m.model}</span>
                      <span className="ml-2 text-text-muted text-xs">{m.provider}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${m.correct >= 95 ? 'bg-success/15 text-success' : m.correct >= 85 ? 'bg-warning/15 text-warning' : m.correct >= 70 ? 'bg-ember/15 text-ember' : 'bg-danger/15 text-danger'}`}>{m.correct}%</span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-text-secondary">{m.cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-center text-sm text-text-muted">Showing top 5 of 20 models tested · 50 runs each</p>
          </div>

          <div className="mt-8 text-center">
            <Link to="/report/demo-123" className="text-ember hover:text-ember-light text-sm font-medium transition-colors">
              See Full Example Report →
            </Link>
          </div>
        </div>
      </section>

      {/* What we test */}
      <section className="border-t border-surface-border bg-surface/50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 md:py-24">
          <h2 className="text-center text-3xl font-semibold tracking-tight md:text-4xl">What we test</h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: <Target size={24} />, title: 'Exact-Match Accuracy', desc: 'Does the model get it 100% right? Field-by-field comparison across 50 runs.' },
              { icon: <Zap size={24} />, title: 'Latency', desc: 'P95 and P99 response times. Time to first token. Because averages lie.' },
              { icon: <DollarSign size={24} />, title: 'Cost Per Run', desc: 'Actual dollar cost. Monthly projection at your volume.' },
              { icon: <Eye size={24} />, title: 'Error Analysis', desc: 'When a model fails, we show you exactly which fields it got wrong.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-surface-border bg-surface p-6 transition-all hover:translate-y-[-2px] hover:shadow-lg hover:shadow-black/20">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ember/10 text-ember">{icon}</div>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-text-secondary leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-surface-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 md:py-24">
          <h2 className="text-center text-3xl font-semibold tracking-tight md:text-4xl">Simple pricing</h2>
          <p className="mt-4 text-center text-text-secondary">Spend $15, save $144/mo. No subscriptions required.</p>
          <div className="mt-12 mx-auto max-w-3xl grid md:grid-cols-2 gap-6">
            {/* One-Time Report */}
            <div className="rounded-xl border border-ember bg-surface p-8 text-center shadow-[0_0_40px_rgba(249,115,22,0.08)]">
              <p className="text-sm font-semibold uppercase tracking-wider text-ember">One-Time Report</p>
              <div className="mt-3 text-5xl font-bold">$14.99</div>
              <p className="mt-2 text-sm text-text-muted">one-time payment</p>
              <ul className="mt-6 space-y-3 text-left text-sm">
                {[
                  '20 vision models, 50 runs each',
                  'Full report with accuracy, latency, cost',
                  'Error analysis',
                  'Shareable link & PDF export',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle size={16} className="mt-0.5 shrink-0 text-success" />
                    <span className="text-text-secondary">{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/benchmark" className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ember px-6 py-3.5 text-base font-semibold text-white hover:bg-orange-600 transition-colors">
                Run a Benchmark <ArrowRight size={18} />
              </Link>
            </div>
            {/* Monthly Updates */}
            <div className="rounded-xl border border-surface-border bg-surface p-8 text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-text-muted">Monthly Updates</p>
              <div className="mt-3 text-5xl font-bold">+$7.50<span className="text-lg font-medium text-text-muted">/mo</span></div>
              <p className="mt-2 text-sm text-text-muted">add-on after one-time report</p>
              <ul className="mt-6 space-y-3 text-left text-sm">
                {[
                  'New models tested automatically as they release',
                  'Email update with new model comparisons',
                  'Report grows over time',
                  'Cancel anytime',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle size={16} className="mt-0.5 shrink-0 text-success" />
                    <span className="text-text-secondary">{item}</span>
                  </li>
                ))}
              </ul>
              <button disabled className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-surface-border px-6 py-3.5 text-base font-semibold text-text-muted cursor-not-allowed">
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-surface-border bg-surface/50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 md:py-24 text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            You're probably overpaying for GPT-4o to parse receipts.
          </h2>
          <p className="mt-4 text-lg text-text-secondary">Let's find out.</p>
          <Link to="/benchmark" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-ember px-8 py-4 text-lg font-semibold text-white hover:bg-orange-600 transition-colors shadow-lg shadow-ember/20">
            Run a Benchmark — $14.99 <ArrowRight size={20} />
          </Link>
        </div>
      </section>

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
    </div>
  );
}
