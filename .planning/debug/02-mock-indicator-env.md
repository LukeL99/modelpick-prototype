---
status: investigating
trigger: "Mock indicator badge reads from NEXT_PUBLIC_DEBUG_MOCKS instead of deriving state from existing DEBUG_MOCK_STRIPE, DEBUG_MOCK_OPENROUTER, DEBUG_MOCK_EMAIL env vars"
created: 2026-02-12T00:00:00Z
updated: 2026-02-12T00:00:00Z
---

## Current Focus

hypothesis: NEXT_PUBLIC_DEBUG_MOCKS is a redundant env var that must be manually kept in sync with DEBUG_MOCK_* vars; the fix is to derive client-side mock state from the server-side vars by passing props from the Server Component layout
test: Trace the data flow from env vars through mock-config to mock-indicator
expecting: Confirm that layout.tsx (Server Component) can pass getActiveMocks() result as props to MockIndicator (Client Component)
next_action: ROOT CAUSE CONFIRMED - document fix approach

## Symptoms

expected: Mock indicator badge should automatically derive its state from the existing DEBUG_MOCK_STRIPE, DEBUG_MOCK_OPENROUTER, DEBUG_MOCK_EMAIL env vars
actual: Badge reads from a separate NEXT_PUBLIC_DEBUG_MOCKS env var that must be manually kept in sync with the DEBUG_MOCK_* vars
errors: No runtime errors; the problem is architectural duplication and manual sync burden
reproduction: Set DEBUG_MOCK_STRIPE=true, DEBUG_MOCK_OPENROUTER=true, DEBUG_MOCK_EMAIL=true but leave NEXT_PUBLIC_DEBUG_MOCKS=stripe -- badge only shows "stripe" instead of all three
started: Original implementation (phase 02-01)

## Eliminated

(none yet -- root cause was identified on first investigation)

## Evidence

- timestamp: 2026-02-12T00:01:00Z
  checked: src/components/debug/mock-indicator.tsx
  found: Client component ("use client") calls getClientActiveMocks() which reads process.env.NEXT_PUBLIC_DEBUG_MOCKS
  implication: Badge relies on a client-side env var, completely disconnected from the server-side DEBUG_MOCK_* vars

- timestamp: 2026-02-12T00:02:00Z
  checked: src/lib/debug/mock-config.ts
  found: Two separate systems -- server-side functions (isMockStripe, isMockOpenRouter, isMockEmail, getActiveMocks) read DEBUG_MOCK_* vars; client-side function (getClientActiveMocks) reads NEXT_PUBLIC_DEBUG_MOCKS as comma-separated string
  implication: The two systems have no connection. getActiveMocks() is the source of truth but is server-only. getClientActiveMocks() is a completely independent reader of a separate env var.

- timestamp: 2026-02-12T00:03:00Z
  checked: .env.local vs .env.local.example
  found: In .env.local, DEBUG_MOCK_STRIPE=true, DEBUG_MOCK_OPENROUTER=true, DEBUG_MOCK_EMAIL=true but NEXT_PUBLIC_DEBUG_MOCKS=stripe (only stripe, missing openrouter and email). This proves the manual sync problem -- they are already out of sync in the actual dev environment.
  implication: The duplication is not theoretical; it is already causing incorrect badge display.

- timestamp: 2026-02-12T00:04:00Z
  checked: src/app/layout.tsx
  found: layout.tsx is a Server Component (no "use client" directive). It imports and renders <MockIndicator /> directly. Since it is a Server Component, it CAN access server-side env vars via getActiveMocks().
  implication: The fix path is clear -- layout.tsx can call getActiveMocks() server-side and pass the result as a prop to MockIndicator.

- timestamp: 2026-02-12T00:05:00Z
  checked: src/components/wizard/confirmation-screen.tsx
  found: This client component also calls getClientActiveMocks().includes("stripe") to determine mock payment mode. This is a SECOND consumer of NEXT_PUBLIC_DEBUG_MOCKS that will also need updating.
  implication: The fix must address both consumers of getClientActiveMocks(). The confirmation-screen receives its mock state from the same redundant env var.

- timestamp: 2026-02-12T00:06:00Z
  checked: How confirmation-screen.tsx is rendered
  found: confirmation-screen.tsx is rendered inside the wizard flow (client component tree). Its parent would need to pass mock state as a prop, OR the server can inject mock state via a different mechanism (e.g., a server-side API endpoint or a context provider set from a Server Component).
  implication: Two fix strategies exist -- props drilling or a shared context/provider pattern.

## Resolution

root_cause: |
  The mock indicator badge and confirmation screen both read NEXT_PUBLIC_DEBUG_MOCKS, a client-side env var that is completely disconnected from the server-side DEBUG_MOCK_STRIPE, DEBUG_MOCK_OPENROUTER, DEBUG_MOCK_EMAIL env vars. Users must manually keep NEXT_PUBLIC_DEBUG_MOCKS in sync with the three individual vars, which is error-prone (already out of sync in .env.local: three vars are true but NEXT_PUBLIC_DEBUG_MOCKS only contains "stripe").

  The fundamental constraint: DEBUG_MOCK_* are server-only env vars (no NEXT_PUBLIC_ prefix), so client components cannot read them directly. The original implementation solved this by creating a redundant NEXT_PUBLIC_DEBUG_MOCKS var, but this violates DRY and creates a sync burden.

fix_approach: |
  **Recommended: Server Component props pattern (minimal change, no new dependencies)**

  1. **MockIndicator (simple -- props from Server Component):**
     - layout.tsx is already a Server Component that renders MockIndicator
     - Call getActiveMocks() in layout.tsx (server-side) and pass result as `mocks` prop
     - Update MockIndicator to accept `mocks: string[]` prop instead of calling getClientActiveMocks()
     - Changes: layout.tsx (1 line), mock-indicator.tsx (3 lines)

  2. **ConfirmationScreen (needs mock state passed through):**
     - Option A: Add `isMockStripe` boolean prop, passed from parent server component
     - Option B: Create a lightweight MockContext provider in layout.tsx that receives server-side mocks and provides them to all client descendants
     - Option B is cleaner if more client components need mock state in the future

  **Recommended combined approach:**
  - Add a `<MockProvider mocks={getActiveMocks()}>` in layout.tsx wrapping children
  - MockProvider is a thin client component that sets React context
  - MockIndicator and ConfirmationScreen both consume context via useMocks() hook
  - Remove getClientActiveMocks() and NEXT_PUBLIC_DEBUG_MOCKS entirely

  **Files to change:**
  - src/lib/debug/mock-config.ts -- add MockProvider context + useMocks hook, remove getClientActiveMocks
  - src/components/debug/mock-indicator.tsx -- use context instead of getClientActiveMocks
  - src/components/wizard/confirmation-screen.tsx -- use context instead of getClientActiveMocks
  - src/app/layout.tsx -- wrap children with MockProvider, pass getActiveMocks()
  - .env.local.example -- remove NEXT_PUBLIC_DEBUG_MOCKS line
  - .env.local -- remove NEXT_PUBLIC_DEBUG_MOCKS line

  **Alternative simpler approach (props only, no context):**
  If only MockIndicator needs the full list, and ConfirmationScreen only needs isMockStripe:
  - Pass `mocks` prop to MockIndicator from layout.tsx
  - For ConfirmationScreen, the parent page component (server) can pass `isMockStripe` as a prop
  - This avoids introducing context but requires prop-threading

verification: (pending fix)
files_changed: []
