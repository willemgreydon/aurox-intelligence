# Aurox Intelligence Documentation Master File

## Purpose

This file is the canonical master prompt and source briefing for generating the complete documentation system for the Aurox Intelligence platform.

It is written so that it can be pasted into ChatGPT or another capable documentation-generation model to produce the requested folder tree and all related Markdown files in a coherent, architecture-aware, product-aware, and implementation-aware way.

The generated documentation must reflect the actual current state of the repository where relevant, while also establishing a robust future-ready documentation system for product, engineering, intelligence, operations, QA, and agent workflows.

This is not generic filler documentation.

The resulting documentation must:

- feel production-grade
- be internally consistent
- preserve monorepo boundaries
- describe the actual Aurox Intelligence system accurately
- be suitable for humans and AI agents
- be modular, scalable, and maintainable
- clearly distinguish current implementation vs target direction

---

## Instruction To The Documentation Generator

You are generating a complete documentation system for an existing monorepo-based financial intelligence platform called **Aurox Intelligence**.

You must generate the documentation files and folders listed in the required target structure.

You must not produce shallow filler.

You must write documentation as if this is a serious product that combines:

- financial intelligence
- market data ingestion
- explainable signals
- forecasting
- simulation investing with fictive money
- multilingual UX
- premium product design
- agent-compatible engineering workflows

When writing, assume the audience includes:

- founders
- product leads
- designers
- frontend engineers
- backend engineers
- data engineers
- quant/research contributors
- operations engineers
- AI coding agents

Use direct, professional language.

Prefer practical clarity over corporate fluff.

---

## Current Repository Context

The current system is an existing Turborepo / Next.js / TypeScript monorepo.

### Core Technical Stack

- Turborepo
- Next.js App Router
- TypeScript
- Postgres
- monorepo with `apps/*` and `packages/*`
- server/client separation respected
- i18n present with locale JSON files
- provider-based market data integrations
- simulation trading is server-side

### Important Architectural Rules

The repo follows these architectural constraints and the generated documentation must reflect them:

- Preserve monorepo boundaries.
- Do not move provider logic into UI layers.
- Do not move forecasting logic into route handlers or components.
- Keep DB access inside `packages/db`.
- Keep canonicalization in `packages/ingestion`.
- Keep analytics logic pure in `packages/signals` and `packages/forecasting`.
- Use shared contracts from `packages/api-contracts`.
- Validate boundaries with Zod.
- Prefer smaller, coherent vertical slices over fake enterprise filler.

### Current Monorepo Shape

The documentation should describe the current repo as something close to:

- `apps/web`
  - main user-facing Next.js web app
  - App Router
  - localized UI
  - dashboards, market surfaces, simulation UI, auth, account UI
- `packages/db`
  - Postgres client and repository layer
  - migrations
  - operational read models
  - simulation account persistence
- `packages/api-contracts`
  - shared Zod schemas and inferred types
- `packages/providers`
  - market data provider integration layer
  - symbol normalization
  - snapshot/history retrieval
  - fallback logic between providers
- `packages/signals`
  - pure signal logic
- `packages/forecasting`
  - pure forecasting logic
- `packages/ingestion`
  - canonicalization and ingestion responsibilities
- `packages/ai-market-intelligence`
  - explainable intelligence layer

### Current Product Capabilities

The documentation must reflect these already-existing or recently-added product areas:

- market overview
- stocks views
- FX views
- dashboard / analytics
- explainable signal-driven content
- auth and session system
- multilingual UI with EN / DE / FR
- simulation investing system with fictive cash
- fullscreen market graph route
- mobile and desktop navigation redesign
- market ticker / live market shell elements

### Current Simulation Capabilities

The documentation must describe the simulation system as follows:

- simulation only
- no real money
- no real broker execution
- no regulated order routing
- deterministic server-side calculations
- auditable order flow
- Postgres-backed persistence

Simulation tables currently include:

- `app.simulation_accounts`
- `app.simulation_portfolios`
- `app.simulation_positions`
- `app.simulation_orders`
- `app.simulation_transactions`
- `app.simulation_snapshots`

### Current Market Data / Quote Reliability Direction

The docs should mention that market data currently uses provider integrations with symbol normalization and fallback logic.

This includes:

- primary provider selection through env
- alternate provider fallback
- per-symbol normalization for equities, ETFs, FX, and crypto
- snapshot and history retrieval
- partial provider resilience

### Current UX / UI Direction

The documentation should describe the intended Aurox product feel as:

- calm
- premium
- trustworthy
- bank-like rather than gambling-like
- information-rich but not noisy
- clear hierarchy
- readable typography
- strong spacing discipline
- responsive across mobile and desktop
- premium chart experience

### Current Localization Direction

The docs must state:

- supported locales: English, German, French
- locale files exist as JSON
- no mixed-language UI should be allowed
- UTF-8 correctness matters
- umlauts and accented characters must render correctly

---

## Current Important File/Module Areas To Describe

The documentation generator should explain or reference these kinds of modules and concerns:

### App / UI

- `apps/web/app/*`
- `apps/web/components/*`
- `apps/web/server/*`
- layout shell
- navigation
- chart UI
- loading and error states
- localization

### DB / Data

- `packages/db/src/repositories/*`
- `packages/db/src/queries/*`
- `packages/db/src/migrations/*`
- operational schema
- auth/session schema
- simulation schema

### Providers

- `packages/providers/src/config.ts`
- `packages/providers/src/market/client.ts`
- provider fallback behavior
- provider symbol normalization

### Contracts

- `packages/api-contracts/src/*`
- simulation contracts
- workspace and preference contracts
- shared Zod schemas

### Intelligence

- `packages/signals`
- `packages/forecasting`
- `packages/ai-market-intelligence`

---

## Documentation Output Goal

Generate a **full documentation operating system** for the repo, using this target directory structure:

```text
Aurox Intelligence/
│
├─ 00 Workspace Control/
│  ├─ README.md
│  ├─ SYSTEM_OVERVIEW.md
│  ├─ ROADMAP.md
│  ├─ ARCHITECTURE_MAP.md
│  ├─ CHANGELOG.md
│  ├─ DECISIONS_LOG.md
│  ├─ TODO_MASTER.md
│  └─ AGENT_INSTRUCTIONS.md
│
├─ 01 Documentation/
│  ├─ 01 Product/
│  │  ├─ Vision/
│  │  ├─ Positioning/
│  │  ├─ User Flows/
│  │  ├─ UX Concepts/
│  │  └─ Simulation Account/
│  │
│  ├─ 02 System Architecture/
│  │  ├─ Monorepo/
│  │  ├─ Database/
│  │  ├─ APIs/
│  │  ├─ Auth/
│  │  ├─ Jobs & Pipelines/
│  │  ├─ Charts & Visualization/
│  │  └─ Deployment/
│  │
│  ├─ 03 Data Models/
│  │  ├─ Asset Taxonomy/
│  │  ├─ Market Data/
│  │  ├─ Signals/
│  │  ├─ Factors/
│  │  ├─ Risk/
│  │  ├─ Reports/
│  │  ├─ Simulation/
│  │  └─ Broker Connectivity/
│  │
│  ├─ 04 Research Methods/
│  │  ├─ Scoring Models/
│  │  ├─ Backtesting/
│  │  ├─ Forecasting/
│  │  ├─ Confidence Framework/
│  │  └─ Penalty Systems/
│  │
│  ├─ 05 UI & UX/
│  │  ├─ Navigation/
│  │  ├─ Mobile UX/
│  │  ├─ Desktop UX/
│  │  ├─ Design System/
│  │  ├─ Localization/
│  │  └─ Chart Experience/
│  │
│  └─ 06 Operations/
│     ├─ Vercel/
│     ├─ Neon/
│     ├─ Environment Variables/
│     ├─ Monitoring/
│     ├─ Security/
│     └─ Release Process/
│
├─ 02 Development/
│  ├─ 01 Monorepo/
│  │  ├─ apps/
│  │  ├─ packages/
│  │  ├─ scripts/
│  │  ├─ tooling/
│  │  └─ tests/
│  │
│  ├─ 02 Database/
│  │  ├─ schema/
│  │  ├─ migrations/
│  │  ├─ seeds/
│  │  ├─ queries/
│  │  └─ verification/
│  │
│  ├─ 03 Auth & Session/
│  │  ├─ docs/
│  │  ├─ sql/
│  │  ├─ routes/
│  │  ├─ helpers/
│  │  └─ tests/
│  │
│  ├─ 04 Simulation Engine/
│  │  ├─ docs/
│  │  ├─ math/
│  │  ├─ orders/
│  │  ├─ portfolios/
│  │  ├─ valuation/
│  │  └─ tests/
│  │
│  ├─ 05 Frontend/
│  │  ├─ dashboards/
│  │  ├─ navigation/
│  │  ├─ charts/
│  │  ├─ i18n/
│  │  ├─ pages/
│  │  └─ components/
│  │
│  └─ 06 Integration/
│     ├─ market providers/
│     ├─ broker sandbox/
│     ├─ news providers/
│     ├─ macro providers/
│     └─ banking connectors/
│
├─ 03 Intelligence/
│  ├─ 01 Core Frameworks/
│  │  ├─ Confidence Score Framework/
│  │  ├─ Composite Scoring Framework/
│  │  ├─ Penalty Layer/
│  │  ├─ Hard-Fail Rules/
│  │  └─ Ranking Logic/
│  │
│  ├─ 02 Asset Intelligence/
│  │  ├─ Crypto/
│  │  ├─ Stocks/
│  │  ├─ ETFs/
│  │  ├─ FX/
│  │  ├─ Macro/
│  │  └─ Cross-Asset/
│  │
│  ├─ 03 Signal & Factor Models/
│  │  ├─ Trend/
│  │  ├─ Momentum/
│  │  ├─ Volatility/
│  │  ├─ Mean Reversion/
│  │  ├─ Tokenomics/
│  │  ├─ On-Chain/
│  │  ├─ Liquidity/
│  │  ├─ Fundamentals/
│  │  └─ Regimes/
│  │
│  ├─ 04 Scoring Outputs/
│  │  ├─ Templates/
│  │  ├─ Scorecards/
│  │  ├─ Rating Bands/
│  │  ├─ Conviction Layers/
│  │  └─ Analyst Notes/
│  │
│  └─ 05 TypeScript Engines/
│     ├─ crypto/
│     ├─ stocks/
│     ├─ etfs/
│     ├─ macro/
│     ├─ shared/
│     └─ orchestration/
│
├─ 04 Knowledge Engine/
│  ├─ 01 Foundations/
│  │  ├─ Finance System Documentation/
│  │  ├─ AI in Finance/
│  │  ├─ Market Structure/
│  │  ├─ Risk Management/
│  │  ├─ Portfolio Construction/
│  │  └─ Execution Layer/
│  │
│  ├─ 02 Asset Class Knowledge/
│  │  ├─ Crypto/
│  │  ├─ Stocks/
│  │  ├─ ETFs/
│  │  ├─ Macro/
│  │  └─ Funds/
│  │
│  ├─ 03 Methods & Models/
│  │  ├─ Factor Models/
│  │  ├─ Anomaly Detection/
│  │  ├─ Signal Framework/
│  │  ├─ Reporting Framework/
│  │  └─ Forecasting/
│  │
│  ├─ 04 Dictionaries & Taxonomies/
│  │  ├─ Asset Taxonomy/
│  │  ├─ KPI Dictionary/
│  │  ├─ Metrics Dictionary/
│  │  ├─ Rating Bands/
│  │  └─ Terminology/
│  │
│  └─ 05 Agent-Ready Knowledge/
│     ├─ master-index.md
│     ├─ retrieval-map.md
│     ├─ prompt-context.md
│     ├─ glossary.md
│     └─ md-files-structure.md
│
├─ 05 Data Intelligence Engines/
│  ├─ 01 Live Market Information Engine/
│  │  ├─ ingestion/
│  │  ├─ normalization/
│  │  ├─ caching/
│  │  ├─ snapshots/
│  │  └─ validation/
│  │
│  ├─ 02 Company News Stream Engine/
│  │  ├─ ingestion/
│  │  ├─ entity-linking/
│  │  ├─ sentiment/
│  │  ├─ clustering/
│  │  └─ summarization/
│  │
│  ├─ 03 Macro & Economic Engine/
│  │  ├─ sources/
│  │  ├─ normalization/
│  │  ├─ series-models/
│  │  └─ alerts/
│  │
│  ├─ 04 On-Chain Engine/
│  │  ├─ wallet metrics/
│  │  ├─ flows/
│  │  ├─ concentration/
│  │  ├─ protocol usage/
│  │  └─ health signals/
│  │
│  └─ 05 Alert & Event Engine/
│     ├─ triggers/
│     ├─ anomalies/
│     ├─ thresholds/
│     ├─ score-events/
│     └─ notifications/
│
├─ 06 Applications/
│  ├─ 01 Web App/
│  ├─ 02 Admin App/
│  ├─ 03 Analyst Workspace/
│  ├─ 04 Simulation Account/
│  ├─ 05 Mobile Concepts/
│  └─ 06 Internal Tools/
│
├─ 07 Data/
│  ├─ 01 Raw/
│  ├─ 02 Cleaned/
│  ├─ 03 Reference/
│  ├─ 04 Snapshots/
│  ├─ 05 Exports/
│  └─ 06 Test Data/
│
├─ 08 Research & Strategy/
│  ├─ Market Studies/
│  ├─ Scoring Research/
│  ├─ Product Strategy/
│  ├─ UX Research/
│  ├─ Competitive Analysis/
│  └─ Banking / Broker Experience Research/
│
├─ 09 Prompting & Agents/
│  ├─ Codex/
│  │  ├─ Master Prompts/
│  │  ├─ Refactor Prompts/
│  │  ├─ QA Prompts/
│  │  └─ Verification Prompts/
│  │
│  ├─ Claude Code/
│  │  ├─ Master Prompts/
│  │  ├─ Refactor Prompts/
│  │  ├─ Architecture Prompts/
│  │  └─ Repo Instructions/
│  │
│  ├─ Shared Agent Context/
│  │  ├─ repo-map.md
│  │  ├─ architecture-summary.md
│  │  ├─ conventions.md
│  │  ├─ env-summary.md
│  │  └─ system-glossary.md
│  │
│  └─ MCP/
│     ├─ Neon/
│     ├─ GitHub/
│     └─ Tooling/
│
├─ 10 QA & Verification/
│  ├─ DB Verification/
│  ├─ Scoring Validation/
│  ├─ Translation QA/
│  ├─ Chart QA/
│  ├─ Navigation QA/
│  ├─ Simulation QA/
│  └─ Release Checklists/
│
└─ 11 Archive/
   ├─ Legacy Structure/
   ├─ Old Prompts/
   ├─ Deprecated Schemas/
   └─ Old Research/
```

---

## Required Output Strategy

Generate the documentation in a way that is:

- hierarchical
- modular
- non-repetitive
- linked by intent
- clear about which documents are strategic, operational, technical, or agent-facing

### For each generated file

Every file should contain:

1. a precise title
2. a short purpose statement
3. the main content
4. where relevant:
   - scope
   - assumptions
   - current state
   - target state
   - dependencies
   - risks
   - verification rules

### Avoid

- fake metrics
- fictional customer interviews presented as facts
- vague “world-class” marketing language
- repeated paragraphs
- generic definitions without relation to Aurox
- inventing broker integrations that do not exist yet as if they are already live

---

## Ground Truth About The Product

Use the following product description as the core narrative:

### Product Identity

Aurox Intelligence is a premium digital investment intelligence platform.

It is not positioned as a meme-trading terminal.

It combines:

- live market context
- explainable signals
- forecasting support
- cross-asset analysis
- simulation investing
- future broker/banking readiness

It should feel more like a high-trust digital investment cockpit than a speculative trading toy.

### Product Promise

Aurox helps users:

- understand market conditions
- compare opportunities across asset classes
- evaluate signal quality
- review explainable recommendations
- practice investment workflows safely using simulation accounts
- prepare for eventual broker-connected execution without misleading users today

### Product Integrity

The documentation must strongly emphasize:

- simulation is not live investing
- fictive cash is not real money
- simulated orders are not sent to a real broker
- no real banking or brokerage execution occurs unless explicitly implemented in the future

---

## Required Product Themes To Capture

### 1. Simulation Investing

Document the simulation account as a first-class product area.

It must include:

- fictive cash balance
- buy/sell order handling
- portfolio state
- PnL
- transaction ledger
- auditability
- reset behavior
- server-side valuation
- deterministic calculation model

### 2. Market Visualization

Document the fullscreen chart/market graph experience.

Describe capabilities such as:

- asset switching
- line and candlestick modes
- timeframe changes
- overlays
- signal markers
- compare mode
- zoom
- pan
- responsive behavior

### 3. Localization

Document multilingual support for:

- EN
- DE
- FR

Include:

- locale file structure
- translation key strategy
- no inline strings rule
- semantic consistency expectations
- UTF-8 correctness
- umlaut/accent handling

### 4. Navigation System

Document both:

- desktop grouped navigation
- mobile quick nav + drawer navigation

Describe:

- hierarchy
- reduced cognitive load
- responsive behavior
- premium UX goals

### 5. Data Reliability

Document that market data is provider-based and may require:

- symbol normalization
- fallback providers
- resilience to partial provider failure
- clear disclosure of freshness and availability

---

## Current Engineering Reality To Represent Honestly

The generated docs should clearly separate these categories:

### Already Implemented

- monorepo structure
- Next.js web app
- DB migrations
- auth/session persistence
- localized UI files
- simulation Postgres schema
- simulation execution flow
- graph route and graph component
- provider fallback improvements
- broader symbol universe

### In Progress / Evolving

- full documentation system
- deeper intelligence/scoring frameworks
- richer knowledge engine
- agent-ready retrieval structure
- expanded data intelligence engines
- release governance

### Future / Planned

- live broker execution
- real banking connectors beyond readiness architecture
- more advanced scoring research pipelines
- on-chain engine depth
- richer macro data engine
- advanced analyst workspace

Do not blur these categories.

---

## Required Documentation Tone

Use the following style:

- serious
- calm
- structured
- specific
- implementation-aware
- future-ready
- premium but not hype-heavy

The documentation should read like a real internal operating manual for a high-trust fintech/intelligence platform.

---

## Documentation Content Requirements By Area

Below is the minimum expected conceptual content for each top-level area.

### 00 Workspace Control

This section should function as the coordination layer.

It should include:

- repo-wide overview
- architecture summary
- change tracking
- major decisions
- roadmap framing
- TODO governance
- AI/agent instructions

#### AGENT_INSTRUCTIONS.md should include

- repo boundaries
- where data logic belongs
- where UI logic belongs
- documentation update rules
- how agents should reason about simulation, charts, translations, providers, and DB boundaries

### 01 Documentation

This is the primary long-form knowledge set for product and system understanding.

#### Product docs should cover

- vision
- positioning
- target users
- workflows
- UX principles
- simulation account experience

#### System Architecture should cover

- monorepo layout
- app/package responsibilities
- DB schemas
- APIs and server boundaries
- auth/session model
- jobs/pipelines vision
- visualization system
- deployment shape

#### Data Models should cover

- asset taxonomy
- market data structures
- signal and factor models
- risk structures
- reporting objects
- simulation data
- broker connectivity abstractions

#### Research Methods should cover

- scoring model concepts
- backtesting philosophy
- forecasting methodology
- confidence systems
- penalty and hard-fail systems

#### UI & UX should cover

- navigation model
- mobile principles
- desktop principles
- design system rules
- localization standards
- chart UX principles

#### Operations should cover

- Vercel deployment assumptions
- Neon/Postgres assumptions
- env management
- monitoring
- security
- release process

### 02 Development

This is the implementation-facing engineering layer.

It should document:

- source tree responsibilities
- schema and migration strategy
- auth/session implementation
- simulation engine implementation shape
- frontend organization
- integrations

It must help an engineer quickly understand:

- where to add code
- where not to add code
- what invariants matter

### 03 Intelligence

This section defines the scoring/signal/research operating model.

Even if not fully implemented in code yet, it should be documented as the target intelligence framework for Aurox.

Include:

- confidence model
- scoring layers
- penalties
- hard-fail rules
- ranking logic
- asset-specific intelligence frameworks
- signal and factor families
- output templates
- TypeScript engine structure

### 04 Knowledge Engine

This is the conceptual knowledge layer for agent retrieval, education, glossary, and domain grounding.

It should be written so that:

- AI agents can consume it
- analysts can browse it
- future retrieval systems can map onto it

### 05 Data Intelligence Engines

This should describe future-capable engine modules for:

- live market info
- news stream intelligence
- macro/economic engine
- on-chain engine
- alerts/events

Make it clear when these are target engines rather than fully implemented systems.

### 06 Applications

Describe the product surface area:

- web app
- admin app
- analyst workspace
- simulation account
- mobile concepts
- internal tools

### 07 Data

Describe the intended data estate:

- raw
- cleaned
- reference
- snapshots
- exports
- test data

### 08 Research & Strategy

This should hold:

- market studies
- scoring research
- product strategy
- UX research
- competitor analysis
- banking/broker experience research

### 09 Prompting & Agents

This should be explicitly agent-ready.

It must include:

- prompt categories
- shared repo context
- glossary
- conventions
- environment summary
- architecture summary
- MCP documentation areas

### 10 QA & Verification

This must include structured verification areas for:

- DB
- scoring
- translation QA
- chart QA
- navigation QA
- simulation QA
- releases

### 11 Archive

This is for:

- deprecated docs
- old prompts
- old schemas
- retired structures

---

## Required Cross-Document Conventions

The generated docs must follow these conventions:

### Naming

- Use explicit, unambiguous names.
- Prefer full terms over clever terms.
- Keep directory names exactly as requested.

### Markdown Style

- use standard Markdown headings
- use short overview sections at top
- use bullet lists where helpful
- use tables only when they improve clarity
- avoid giant unstructured walls of text

### Consistency Rules

- “simulation” must be used consistently
- “fictive cash” or “fictive money” may be used, but choose one primary wording and stay consistent
- “market graph” and “chart experience” should be clearly distinguished where needed
- “broker connectivity” must not imply live execution unless explicitly marked planned

### Distinguish Clearly

For technical and product docs, when appropriate label content as:

- Current State
- Target State
- Constraints
- Risks
- Verification

---

## Required File Generation Behavior

When generating the documentation set:

1. Create the full folder tree.
2. Add a meaningful `.md` file in each folder that needs one, even when only a directory name was specified.
3. For folders like `Vision/` or `Positioning/`, create sensible core files such as:
   - `README.md`
   - `overview.md`
   - `principles.md`
   - `structure.md`
   depending on what best fits the folder.
4. Keep structure logical and human-usable.
5. Do not generate empty folders without explaining intended contents.

---

## Required README Strategy

Each major directory should have a `README.md` that explains:

- purpose of the folder
- what belongs there
- what does not belong there
- key subfolders
- links to foundational docs

This is especially important for:

- `00 Workspace Control`
- `01 Documentation`
- `02 Development`
- `03 Intelligence`
- `04 Knowledge Engine`
- `05 Data Intelligence Engines`
- `09 Prompting & Agents`
- `10 QA & Verification`

---

## Required Agent-Ready Content

The generated documentation must be useful for AI agents.

This means it should include:

- repo boundary guidance
- where features should be implemented
- where calculations should live
- which directories are authoritative for what concerns
- which docs are strategic vs implementation vs reference
- glossary and terminology normalization
- retrieval-friendly structure

Especially in agent-facing docs, include:

- concise summaries
- authoritative source references inside the doc structure
- stable terminology
- explicit invariants

---

## Required Accuracy Rules

When unsure, prefer phrasing like:

- “currently implemented as”
- “currently structured around”
- “planned evolution”
- “target operating model”

Do not state speculative future capabilities as already shipped.

Do not claim:

- real-money trading exists
- broker execution exists
- banking integration is live
- scoring engines are fully implemented if they are mostly conceptual

---

## Required Final Deliverable Style

The full documentation output should feel like:

- internal operating system
- strategic playbook
- engineering reference
- AI retrieval corpus

It should be strong enough that future contributors can:

- onboard quickly
- understand the product
- understand the architecture
- continue implementation without architectural drift
- use the docs to coordinate both humans and coding agents

---

## Suggested Generation Order

If you are generating the docs step-by-step, use this order:

1. Workspace Control
2. System Overview + Architecture Map
3. Product Documentation
4. Development Documentation
5. Intelligence Documentation
6. Knowledge Engine
7. Data Intelligence Engines
8. Prompting & Agents
9. QA & Verification
10. Archive structure

---

## Final Instruction To The Documentation Generator

Generate the full documentation system for Aurox Intelligence based on this master file.

Important:

- preserve repo truth
- preserve system boundaries
- document current implementation and future target state separately
- keep the tone premium, technical, and serious
- make the resulting docs genuinely useful
- avoid filler
- make the docs agent-compatible

If needed, infer sensible sub-file names within folders, but remain consistent and structured.

The output should be suitable for immediate use as the official documentation foundation of Aurox Intelligence.
