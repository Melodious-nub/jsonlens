# {JsonLens} — Privacy-First JSON Engineering Suite & Workspace

<p align="center">
  <img src="https://img.shields.io/badge/Angular-22.2-dd0031.svg?style=for-the-badge&logo=angular&logoColor=white" alt="Angular 22" />
  <img src="https://img.shields.io/badge/Architecture-Signals%20%26%20Zoneless-06b6d4.svg?style=for-the-badge" alt="Signals & Zoneless" />
  <img src="https://img.shields.io/badge/Privacy-100%25%20Client--Side-10b981.svg?style=for-the-badge" alt="100% Client-Side" />
  <img src="https://img.shields.io/badge/Monaco-Virtualized%20Editor-3b82f6.svg?style=for-the-badge" alt="Monaco Editor" />
  <img src="https://img.shields.io/badge/License-MIT-8b5cf6.svg?style=for-the-badge" alt="MIT License" />
</p>

---

## ⚡ Overview

**{JsonLens}** is an ultra-fast, 100% client-side developer workspace and JSON engineering environment. Designed to eliminate the lag and data exposure risks of traditional online JSON formatters, JsonLens processes, parses, formats, repairs, explores, and diffs JSON documents entirely within your browser's local memory.

Zero telemetry. Zero server uploads. Zero data leakage.

---

## 🚀 Key Features

### 1. 🛡️ 100% In-Memory Privacy & Sandboxing
- Every operation (formatting, minification, tree exploration, TypeScript generation, and diffing) runs entirely inside the client browser.
- **Zero remote server requests**: Your confidential tokens, enterprise payloads, and customer data never leave your local machine.

### 2. ✨ One-Click Syntax Auto-Repair
- Intelligently detects and fixes syntax mistakes:
  - Unquoted or trailing keys
  - Single quotes converted to valid RFC 8259 double quotes
  - Trailing commas in objects and arrays removed
  - Python/JavaScript literals (`True`, `False`, `None`, `undefined`) mapped to valid JSON equivalents
  - Unescaped strings and newlines repaired

### 3. 🌳 Interactive AST Tree Lens & JSONPath
- Recursively explore complex, deeply nested JSON structures.
- Visual breadcrumbs and node hierarchy.
- **One-Click JSONPath Generator**: Click any key to copy its exact JSONPath query (e.g., `$.data.users[0].profile.email`).

### 4. 🏷️ Code & Type Generation Lens
- Instant, idiomatic code generation from active JSON:
  - **TypeScript Interfaces & Types** (with recursive nested types)
  - **JSON Schema Draft 7**
  - **Zod Schema Validation Code**
- 1-click clipboard copy and syntax-highlighted display.

### 5. ⚖️ Semantic AST Visual Diff Lens
- Side-by-side structural comparison of two JSON payloads.
- Deep recursive diffing that highlights:
  - 🟩 **Added** keys
  - 🟥 **Removed** keys
  - 🟨 **Modified** values and types
- Real-time difference metrics counter.

### 6. 🔗 Compact URL Sharing & Local Persistence
- **Zero-Server URL Sharing**: Compresses entire JSON documents into URL hash fragments using LZ-String compression (`#payload=...`). The fragment is never sent in HTTP request headers, ensuring end-to-end privacy.
- **Auto-Save & Restore**: Automatically restores your working session and resizable split-layout settings across browser reloads via LocalStorage.

### 7. 📤 Multi-Format Export
- Download formatted `.json` documents.
- Generate high-contrast, structured `.pdf` summary reports with document diagnostics.
- Flatten and export tabular JSON arrays directly to `.csv`.
- Export generated TypeScript definitions as `.ts` files.

---

## 🏗️ Architecture & Engineering Rules

This project strictly adheres to the engineering standards specified in [`AGENTS.md`](./AGENTS.md):

- **Angular Modern Architecture**: Pure standalone components, Signals reactivity (`signal`, `computed`, `effect`), and `@if`/`@for`/`@switch` control flow.
- **Zoneless & OnPush**: `ChangeDetectionStrategy.OnPush` enforced across all components with Zoneless change detection (`provideExperimentalZonelessChangeDetection()`).
- **Memory Hygiene**: Observables tied to `takeUntilDestroyed()`, DOM event listeners cleanly registered for disposal via `DestroyRef.onDestroy()`.
- **SSR & SSG Prerendering**: Pre-rendered semantic routes (`/`, `/json-validator`, `/json-minifier`, `/json-to-typescript`, `/json-diff`) for optimal Google Search crawler indexing.
- **Accessibility & Design System**: High-contrast WCAG 2.1 AA focus rings (`:focus-visible`), comprehensive `aria-label` markup, responsive split-screen pane resizer, and custom CSS design tokens.

---

## 💻 Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/Melodious-nub/jsonlens.git

# Navigate to project directory
cd jsonlens

# Install dependencies
npm install
```

### Local Development Server

```bash
# Start local development server on port 4500
npm start
# or: ng serve --port 4500 --host 0.0.0.0
```

Open [http://localhost:4500](http://localhost:4500) in your browser.

### Running Unit Tests

```bash
# Run unit tests with Vitest
npm test -- --watch=false
```

### Production Build & SSG Prerendering

```bash
# Compile optimized production bundle with SSG prerendering
npm run build
```

Build outputs are saved to `dist/jsonlens/browser`.

---

## ⌨️ Keyboard Shortcuts & Quick Actions

| Shortcut | Action |
| :--- | :--- |
| `Alt + F` | Format JSON (Prettify) |
| `Alt + M` | Minify JSON (Compact Single-Line) |
| `Alt + R` | Auto-Fix Broken JSON Syntax |
| `Double Click Divider` | Center Resizable Splitter (50% / 50%) |
| `Esc` | Close Active Modal / Dialog |

---

## 👤 Creator

**Shawon**  
*Full-Stack & Systems Engineer*  
- **GitHub**: [@Melodious-nub](https://github.com/Melodious-nub)
- **Email**: `shawon.dev@gmail.com`

---

## ❤️ Support & Donations

If **{JsonLens}** has saved you time and frustration, consider supporting its independent development:

| Channel | Account Details | Action |
| :--- | :--- | :--- |
| **bKash** | `01700000000` (Personal) | 1-Click Copy in App Navbar |
| **Nagad** | `01700000000` (Personal) | 1-Click Copy in App Navbar |
| **Rocket** | `01700000000-0` (Personal) | 1-Click Copy in App Navbar |
| **BRAC Bank** | A/C: `150120XXXXXXXXXX`, Branch: `Gulshan` | 1-Click Copy in App Navbar |
| **Binance Pay** | Pay ID: `827364129` (USDT BEP-20) | 1-Click Copy in App Navbar |
| **Payoneer** | `shawon.payoneer@gmail.com` | 1-Click Copy in App Navbar |

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

