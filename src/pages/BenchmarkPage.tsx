import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Upload, X, CreditCard, Lock, ArrowRight } from 'lucide-react';
import { MODELS, EXPECTED_JSON } from '../data/models';

const SAMPLE_RECEIPTS = [
  { id: 1, label: 'Receipt #1', color: '#F97316', merchant: "Trader Joe's", date: 'Jan 15, 2026', total: '$8.38' },
  { id: 2, label: 'Receipt #2', color: '#3B82F6', merchant: 'Whole Foods', date: 'Jan 18, 2026', total: '$42.17' },
  { id: 3, label: 'Receipt #3', color: '#22C55E', merchant: 'Target', date: 'Jan 20, 2026', total: '$23.94' },
];

const TIERS = ['Premium', 'Mid', 'Budget'] as const;

export default function BenchmarkPage() {
  const navigate = useNavigate();
  const [uploadedImages, setUploadedImages] = useState(SAMPLE_RECEIPTS.map(r => r.id));
  const [jsonText, setJsonText] = useState(JSON.stringify(EXPECTED_JSON, null, 2));
  const [selectedModels, setSelectedModels] = useState<string[]>(MODELS.map(m => m.model));
  const [runsPerModel, setRunsPerModel] = useState(50);
  const [showPayment, setShowPayment] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  const toggleModel = (name: string) => {
    setSelectedModels(prev =>
      prev.includes(name) ? prev.filter(m => m !== name) : [...prev, name]
    );
  };

  const handlePay = () => {
    navigate('/benchmark/demo-123/progress');
  };

  return (
    <div className="min-h-screen bg-void text-text-primary font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-surface-border/50 bg-void/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-4 md:px-6">
          <Link to="/" className="text-xl font-bold tracking-tight">
            <span className="text-ember">Model</span>Pick
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-[800px] px-4 pt-8 pb-32 md:px-6">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-ember text-white text-xs font-bold flex items-center justify-center">1</span>
            <span className="text-sm font-medium text-text-primary">Setup</span>
          </div>
          <div className="flex-1 h-px bg-surface-border" />
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-surface-raised text-text-muted text-xs font-bold flex items-center justify-center border border-surface-border">2</span>
            <span className="text-sm text-text-muted">Pay</span>
          </div>
          <div className="flex-1 h-px bg-surface-border" />
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-surface-raised text-text-muted text-xs font-bold flex items-center justify-center border border-surface-border">3</span>
            <span className="text-sm text-text-muted">Results</span>
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-2">Set Up Your Benchmark</h1>
        <p className="text-text-secondary mb-8">Upload images, define expected output, and choose your models.</p>

        {/* Section A: Upload Images */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-1">Upload Sample Images</h2>
          <p className="text-sm text-text-muted mb-4">Upload 3-5 sample images of your documents</p>
          
          {/* Drop zone */}
          <div className="border-2 border-dashed border-surface-border rounded-xl p-8 text-center hover:border-ember/50 transition-colors cursor-pointer mb-4">
            <Upload className="mx-auto mb-3 text-text-muted" size={32} />
            <p className="text-sm text-text-secondary">Drag & drop images here, or click to browse</p>
            <p className="text-xs text-text-muted mt-1">JPEG, PNG, WebP, PDF · Up to 5 images</p>
          </div>

          {/* Pre-loaded receipts */}
          <div className="grid grid-cols-3 gap-3">
            {SAMPLE_RECEIPTS.map((receipt) => {
              const isUploaded = uploadedImages.includes(receipt.id);
              return (
                <div
                  key={receipt.id}
                  onClick={() => {
                    if (isUploaded) {
                      setUploadedImages(prev => prev.filter(id => id !== receipt.id));
                    } else {
                      setUploadedImages(prev => [...prev, receipt.id]);
                    }
                  }}
                  className={`relative rounded-xl border p-4 cursor-pointer transition-all ${
                    isUploaded
                      ? 'border-ember/50 bg-ember/5'
                      : 'border-surface-border bg-surface hover:bg-surface-raised'
                  }`}
                >
                  {isUploaded && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-ember flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                  <div
                    className="w-full h-24 rounded-lg mb-3 flex items-center justify-center text-2xl"
                    style={{ backgroundColor: receipt.color + '15', border: `1px solid ${receipt.color}30` }}
                  >
                    🧾
                  </div>
                  <p className="text-xs font-medium text-text-primary">{receipt.merchant}</p>
                  <p className="text-xs text-text-muted">{receipt.date} · {receipt.total}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section B: Define Expected Output */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-1">Define Expected Output</h2>
          <p className="text-sm text-text-muted mb-4">The JSON you expect models to extract from your images</p>
          
          <div className="rounded-xl border border-surface-border bg-[#0D0D0E] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-surface-border bg-surface-raised">
              <span className="text-xs font-mono text-text-muted">expected_output.json</span>
              <span className="text-xs text-text-muted">JSON</span>
            </div>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={18}
              className="w-full bg-transparent px-4 py-4 text-sm font-mono text-green-400 focus:outline-none resize-y leading-relaxed"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Section C: Configure Run */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-1">Configure Run</h2>
          <p className="text-sm text-text-muted mb-4">Select models and runs per model</p>

          {/* Runs per model */}
          <div className="mb-6">
            <label className="text-sm font-medium text-text-primary mb-2 block">Runs per model</label>
            <div className="flex gap-3">
              {[10, 25, 50].map((n) => (
                <button
                  key={n}
                  onClick={() => setRunsPerModel(n)}
                  className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    runsPerModel === n
                      ? 'bg-ember text-white'
                      : 'bg-surface border border-surface-border text-text-secondary hover:bg-surface-raised'
                  }`}
                >
                  {n} runs
                </button>
              ))}
            </div>
          </div>

          {/* Model selection */}
          <div className="mb-4 flex items-center justify-between">
            <label className="text-sm font-medium text-text-primary">Models to test ({selectedModels.length}/20)</label>
            <div className="flex gap-3 text-xs">
              <button onClick={() => setSelectedModels(MODELS.map(m => m.model))} className="text-ember hover:text-ember-light">Select All</button>
              <button onClick={() => setSelectedModels([])} className="text-text-muted hover:text-text-secondary">Deselect All</button>
            </div>
          </div>

          <div className="space-y-5 bg-surface border border-surface-border rounded-xl p-5">
            {TIERS.map((tier) => (
              <div key={tier}>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">{tier} Tier</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MODELS.filter(m => m.tier === tier).map((m) => (
                    <label
                      key={m.model}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                        selectedModels.includes(m.model)
                          ? 'border-ember/30 bg-ember/5'
                          : 'border-surface-border hover:bg-surface-raised'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedModels.includes(m.model)}
                        onChange={() => toggleModel(m.model)}
                        className="accent-ember w-3.5 h-3.5"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-text-primary">{m.model}</span>
                        <span className="text-xs text-text-muted ml-2">{m.provider}</span>
                      </div>
                      <span className="text-xs font-mono text-text-muted">${m.costPerRun}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Pricing display */}
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-ember bg-surface p-4 flex items-center justify-between shadow-[0_0_20px_rgba(249,115,22,0.05)]">
              <div>
                <p className="text-sm font-medium text-text-primary">One-Time Report</p>
                <p className="text-xs text-text-muted">{selectedModels.length} models × {runsPerModel} runs · Full report with accuracy, latency, cost, error analysis</p>
              </div>
              <p className="text-2xl font-bold text-ember">$14.99</p>
            </div>
            <div className="rounded-xl border border-surface-border bg-surface p-4 flex items-center justify-between opacity-70">
              <div>
                <p className="text-sm font-medium text-text-primary">+ Monthly Updates <span className="text-xs text-text-muted ml-1">(optional)</span></p>
                <p className="text-xs text-text-muted">New models tested automatically · Email updates · Cancel anytime</p>
              </div>
              <p className="text-lg font-bold text-text-secondary">+$7.50/mo</p>
            </div>
          </div>
        </div>

        {/* Section D: Payment button */}
        <button
          onClick={() => setShowPayment(true)}
          disabled={selectedModels.length < 1 || uploadedImages.length < 1}
          className="w-full bg-ember hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-lg px-6 py-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-ember/20"
        >
          Pay $14.99 — Run Benchmark <ArrowRight size={20} />
        </button>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-surface border border-surface-border rounded-2xl p-6 md:p-8 animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-text-muted" />
                <span className="text-sm text-text-muted">Secure checkout</span>
              </div>
              <button onClick={() => setShowPayment(false)} className="text-text-muted hover:text-text-primary">
                <X size={20} />
              </button>
            </div>

            <div className="text-center mb-6">
              <p className="text-sm text-text-muted">ModelPick Benchmark</p>
              <p className="text-3xl font-bold text-text-primary mt-1">$14.99</p>
              <p className="text-xs text-text-muted mt-1">{selectedModels.length} models · {runsPerModel} runs each</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">Card number</label>
                <div className="relative">
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4242 4242 4242 4242"
                    className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-sm font-mono text-text-primary placeholder-text-muted focus:border-ember focus:outline-none"
                  />
                  <CreditCard size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">Expiry</label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="MM / YY"
                    className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-sm font-mono text-text-primary placeholder-text-muted focus:border-ember focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">CVC</label>
                  <input
                    type="text"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    placeholder="123"
                    className="w-full bg-surface-raised border border-surface-border rounded-lg px-4 py-3 text-sm font-mono text-text-primary placeholder-text-muted focus:border-ember focus:outline-none"
                  />
                </div>
              </div>
              <button
                onClick={handlePay}
                className="w-full bg-ember hover:bg-orange-600 text-white font-semibold text-base px-6 py-3.5 rounded-lg transition-colors mt-2"
              >
                Pay $14.99
              </button>
              <p className="text-xs text-text-muted text-center flex items-center justify-center gap-1">
                <Lock size={12} /> Powered by Stripe · Encrypted & secure
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
