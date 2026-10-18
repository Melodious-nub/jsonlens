# JsonLens - Privacy-First JSON Engineering Suite & Visual Developer Workspace

[![Latest Release](https://img.shields.io/github/v/release/Melodious-nub/jsonlens?color=blue&label=Latest%20Version)](https://github.com/Melodious-nub/jsonlens/releases/latest)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Web%20App-brightgreen?logo=googlechrome)]()
[![Angular Version](https://img.shields.io/badge/Angular-22.2-dd0031.svg?logo=angular)](https://angular.dev)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Client%20Side-brightgreen.svg)](#-privacy--security)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**JsonLens** is a modern, ultra-fast, privacy-focused, 100% client-side developer workspace and JSON engineering suite. Break away from slow, data-leaking online formatters—format, inspect, validate, auto-repair broken syntax, explore deeply nested structures with interactive JSONPath, compare AST diffs, and generate clean types across 12 programming languages (TypeScript, Zod, Go, Python, Kotlin, Java, Rust, and more), all running securely in local browser memory with zero server uploads.

---

## 🌐 Launch JsonLens Web App

Access the full, high-performance in-browser developer suite:

[![Launch Web App Button](https://img.shields.io/badge/Launch%20App-JsonLens%20Web%20App-success?style=for-the-badge&logo=googlechrome)]()

> 💡 **Client-Side Guarantee:** Zero telemetry. Zero server uploads. Every operation executes 100% locally in your browser sandbox.

---

## 🌟 Overview

**JsonLens** is a premium developer workspace and JSON engineering utility designed for engineers, architects, and QA professionals who demand both high performance and uncompromising privacy. Built with a **"User-First"** philosophy, JsonLens eliminates the security risks and frustrating lag of traditional web tools by processing, validating, and diffing your data entirely inside client memory.

It is a **100% Modern Angular 22** web application built using the latest modern tech stack (Signals-First Reactive Architecture, Zoneless Change Detection, Monaco Editor, and off-thread Web Workers), delivering a fluid, high-performance desktop-grade experience directly in the browser.

---

## 📖 The Story Behind JsonLens

The inspiration for JsonLens came from a major security and productivity problem faced by developers every single day. Most web-based JSON tools transmit your confidential payloads—such as authorization tokens, enterprise database exports, production API responses, and customer records—to remote servers for formatting or validation. In addition, when dealing with multi-megabyte files, traditional formatters freeze, crash, or clutter the screen with invasive banner ads.

As a software engineer handling enterprise software, I wanted a developer workbench that:
1. **Guarantees 100% Privacy:** Never transmit a single byte of my data to any backend server.
2. **Runs at Zero-Latency:** Harness virtualized rendering and background web workers so multi-megabyte payloads format without stutter.
3. **Solves Daily Workflows in One Place:** Combine intelligent syntax auto-repair, visual AST diffing, JSONPath breadcrumb extraction, and multi-language code generation under a unified, beautiful interface.

So, I built JsonLens to be the ultimate developer companion I needed myself: **Open Source, Ultra-Fast, and 100% Private.**

---

## ✨ Key Features

### ⚡ Monaco-Powered Code Lens
Experience full desktop-grade editing capabilities inside your browser:
- **Virtualized High-Performance Editor:** Powered by the same engine behind VS Code, handling massive JSON files effortlessly.
- **Syntax Highlighting & Line Diagnostics:** Instant error badges indicating the exact line, column, and reason for syntax errors.
- **Non-Destructive Output Formatting:** Toggle between 2 spaces, 4 spaces, tabs, or minified output.
- **Smart Sorting & Transformation:** Sort keys alphabetically (`A-Z` or `Z-A`) or transform structures (`Flatten` to dot-notation or `Unflatten`) without corrupting your original input.

### 🔧 One-Click Syntax Auto-Repair
Stop wasting time manually hunting down syntax mistakes. JsonLens automatically diagnoses and repairs common formatting errors:
- Unquoted or trailing object keys.
- Single quotes converted to RFC 8259 double quotes.
- Trailing commas in objects and arrays removed.
- Python/JavaScript literals (`True`, `False`, `None`, `undefined`) mapped to valid JSON equivalents.
- Unescaped strings, newlines, and unbalanced closing brackets resolved.

### 🌳 Interactive AST Tree Lens & JSONPath
Deeply explore complex JSON hierarchies with an intuitive visual tree:
- **Search Auto-Expansion:** Searching keys or values automatically expands matching branches while displaying a live match counter badge.
- **Interactive JSONPath Breadcrumbs:** Click any node to inspect its exact JSONPath (`$.users[0].address.city`) in the bottom breadcrumb bar.
- **1-Click Copy Actions:** Instant one-click copy buttons for both the JSONPath query and the resolved value (primitives or formatted objects).

### ⚖️ Side-by-Side Visual Diff Lens
Compare versions of API payloads and database snapshots with zero hassle:
- **Semantic AST Comparison:** Highlights additions (`+ ADD`), deletions (`- DEL`), and modifications (`~ MOD`) with high-contrast color coding.
- **Smart Baseline Auto-Sync:** When diff is cleared, the next newly added JSON automatically initializes the comparison baseline so diffing begins immediately upon your next edit.
- **Flexible Controls:** Swap Left and Right JSON with 1 click, or load external `.json` comparison files directly.

### 🏷️ Multi-Language Type Generator Lens
Instantly convert JSON objects into clean, production-ready types and models across 12 widely used programming languages:
- **TypeScript:** Clean interfaces with clean domain naming (no redundant `Root...` prefixes).
- **Zod:** Schema validation models with recursive object and array definitions.
- **Python:** Strongly typed `TypedDict` models.
- **Java / Kotlin / Dart:** Idiomatic classes with serialized annotations (`@JsonProperty`, `@SerializedName`).
- **C# / Go / Rust / PHP / Swift:** Native structs, serialization tags, and enums ready to paste into your codebase.
- **Stacked Export:** Download types with customizable file names directly from a stacked dropdown modal.

### 🌓 Circular Ripple Theme Engine
A state-of-the-art visual experience:
- **GPU-Accelerated Circular Ripple:** Switching between Dark Mode and Light Mode triggers a circular wave expansion originating directly from the toggle button across the entire viewport.
- **Elastic Icon Morph:** Micro-animated Sun and Moon icons with a spring bounce and hover rotation.
- **Zero Layout Thrashing:** Leverages the native browser View Transition API on the compositor thread.

### 🔗 1-Click Instant Developer Sharing (Zero-Server Workspaces)
Collaborate effortlessly with teammates and pick up work from any device:
- **Instant Workspace Link:** Click the **Share** button in the navbar to instantly generate a portable, self-contained workspace URL. Send the link to any developer on Slack, Teams, Discord, or Email—they can open it in one click and immediately continue formatting, diffing, tree exploring, or generating types right where you left off.
- **100% Client-Side Privacy (Zero Server Storage):** Powered by client-side **LZ-String URL hash compression** (`#payload=...`). Because RFC specifications mandate that browser hash fragments are *never* transmitted in HTTP request headers, your sensitive JSON data travels directly from developer to developer without ever touching an intermediate database or cloud server.
- **Local Persistence & Session Restore:** Never lose your work. Your active JSON payload, selected indentation, and custom split-panel widths automatically persist across browser reloads via LocalStorage.

---

## 🛠️ Technical Details & Compatibility

- **Framework:** Angular 22.2+ (Zoneless Reactive Architecture)
- **Reactivity:** Angular Signals (`signal`, `computed`, `effect`)
- **Change Detection:** `ChangeDetectionStrategy.OnPush` enforced across all components
- **Editor Engine:** Monaco Editor 0.57+ (GPU-accelerated, virtualized scrolling)
- **Off-Thread Processing:** Dedicated Web Worker for background parsing of payloads over 2MB
- **Testing:** Vitest & Angular Unit Testing (100% passing test suites across 24 modules)
- **Styling:** Vanilla CSS Custom Properties & SCSS design tokens (Zero runtime overhead)
- **Transitions:** Native View Transitions API with circular `clip-path` wave animation

---

## 🚀 How to Use

1. **Load Data:** Paste your JSON into the left panel, click **Open File**, or click **Load Sample**.
2. **Format & Repair:** Press `Alt + F` to format, or click **Auto Fix** if there are syntax errors.
3. **Inspect the Tree:** Switch to the **Tree** tab to search, auto-expand matching branches, and copy exact JSONPath queries.
4. **Generate Types:** Open the **Types** tab, pick your target language (TypeScript, Go, Python, Rust, etc.), and click **Copy** or **Download**.
5. **Compare Changes:** Open the **Diff** tab to view side-by-side AST differences in real time.
6. **Share & Collaborate:** Click **Share** in the navbar to copy a zero-server workspace link. Send it to any teammate to let them continue working on the exact same payload instantly.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Alt + F` | Format JSON (Prettify) |
| `Alt + M` | Minify JSON (Compact Single-Line) |
| `Alt + R` | Auto-Fix Broken JSON Syntax |
| `Double Click Splitter` | Reset Resizable Panels to Center (50% / 50%) |
| `Esc` | Close Active Dialog / Dropdown |

---

## 🛡️ Privacy & Security

JsonLens is designed from the ground up to be a completely secure vault for your data:
- **Zero Data Collection:** We do not track, log, or transmit your payloads, keystrokes, or IP address.
- **Zero Server Requests:** Every single operation (formatting, repairing, type generation, AST diffing) executes locally in your browser memory.
- **Zero-Server URL Sharing:** URL shares use client-side hash fragments (`#...`), which are cryptographically isolated from web servers by RFC specifications.
- **No Third-Party Cookies or Trackers:** Pure, distraction-free, private engineering utility.

---

## 📄 License

This open-source project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👨💻 Developer & Connect

<p align="left">
  <strong>Shawon Talukder</strong><br>
  <em>Software Engineer at Green Delta Insurance PLC</em>
</p>

Crafted with care, focus on performance, and privacy-first architecture. Feel free to connect for collaborations, freelance projects, or feedback!

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/shawon-taluckder)
[![Fiverr](https://img.shields.io/badge/Fiverr-1DBF73?style=for-the-badge&logo=fiverr&logoColor=white)](https://www.fiverr.com/talukder_shawon/)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Melodious-nub)
[![Gmail](https://img.shields.io/badge/Gmail-EA4335?style=for-the-badge&logo=gmail&logoColor=white)](mailto:shawon.taluckder2@gmail.com)

---

<p align="center">
  <sub>Developed with ❤️ for the Developer & Open-Source Community.</sub>
</p>
