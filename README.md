# ModelPick

**Find the best vision model for your structured data extraction — backed by 1,000 real API calls.**

🌐 [Live Demo](https://modelpick-demo.lukelibraro.com) · 🏠 [Landing Page](https://modelpick.lukelibraro.com) · 📄 [Full PRD](./docs/PRD.md)

---

## What It Does

Upload 3 sample images (receipts, invoices, documents) + the correct JSON output → ModelPick benchmarks **20 vision models × 50 runs each** and delivers a ranked report with:

- **Accuracy** — Binary exact-match (JSON matches or it doesn't)
- **Cost per run** — Actual $ from OpenRouter pricing
- **Response times** — Median (P50) and P95
- **Consistency** — Spread (IQR) showing how reliable each model is
- **"Where It Missed"** — Field-level error diffs showing exactly which fields each model gets wrong

## Key Features

- 🎯 **1,000 API calls per report** — 20 models × 50 runs for statistical significance
- 🔍 **Exact-match accuracy** — No fuzzy scores; JSON matches or it doesn't
- 📊 **Interactive bubble chart** — Cost vs accuracy vs speed at a glance
- 💰 **Cost calculator** — See how much switching models saves per month
- ⚡ **Real-time results** — WebSocket streaming as each model completes (~1-2 min total)
- 📄 **PDF export + shareable link**

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + Tailwind CSS v4 |
| Charts | CSS-based scatter/bubble plots |
| Backend | Python + FastAPI + asyncio |
| API | OpenRouter (all 20 vision models) |
| Payments | Stripe ($14.99/report + $7.50/mo subscription) |
| Real-time | WebSocket |

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
├── docs/
│   └── PRD.md              # Full product spec (V2)
├── src/
│   ├── components/          # React components
│   ├── pages/               # Route pages
│   ├── assets/              # Static assets
│   └── App.tsx              # Root component
├── public/                  # Static files
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## License

MIT
