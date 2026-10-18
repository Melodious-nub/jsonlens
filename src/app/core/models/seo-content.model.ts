import { RouteMetadata } from './json-lens.model';

export interface SeoFaqItem {
  readonly question: string;
  readonly answer: string;
}

export interface SeoGuideContent {
  readonly key: string;
  readonly metadata: RouteMetadata;
  readonly badge: string;
  readonly title: string;
  readonly subtitle: string;
  readonly sections: {
    readonly title: string;
    readonly description: string;
    readonly bullets?: string[];
  }[];
  readonly faqs: SeoFaqItem[];
}

export const SEO_ROUTES_DATA: Record<string, SeoGuideContent> = {
  formatter: {
    key: 'formatter',
    badge: 'JSON Beautifier & Formatter',
    title: 'Professional Online JSON Formatter & Beautifier',
    subtitle:
      'Format, indent, validate, and inspect your JSON payloads directly in your browser with zero latency and 100% client-side privacy.',
    metadata: {
      title: 'JsonLens — JSON Formatter & Beautifier | Free Online Developer Tool',
      description:
        'Free online JSON formatter and beautifier. Indent, validate, and inspect JSON with 2-spaces, 4-spaces, or tabs. 100% client-side, zero backend storage.',
      canonicalPath: 'https://jsonlens.dev/',
      keywords: [
        'json formatter',
        'json beautifier',
        'pretty print json',
        'online json format',
        'client side json formatter',
      ],
      softwareType: 'DeveloperApplication',
    },
    sections: [
      {
        title: 'Why Format JSON with JsonLens?',
        description:
          'Raw JSON responses from REST APIs, GraphQL endpoints, and log streams are often compressed into unreadable single-line strings. JsonLens transforms minified payloads into clean, structured, and syntax-highlighted code.',
        bullets: [
          'Instant 2-space, 4-space, or tab indentation options.',
          'Key alphabetical sorting (A→Z and Z→A) for rapid object comparison.',
          'Null property removal to eliminate clutter and reduce memory footprints.',
          'Deep object flattening and unflattening for simplified config handling.',
        ],
      },
      {
        title: 'Privacy-First Architecture: 100% In-Browser Execution',
        description:
          'Unlike traditional online tools that transmit sensitive customer data, authentication tokens, and API payloads to backend servers, JsonLens runs entirely in your browser using Angular Zoneless reactivity and Web Workers. No database, no tracking, and zero server logging.',
      },
    ],
    faqs: [
      {
        question: 'Does JsonLens upload or store my JSON data?',
        answer:
          'No. JsonLens operates 100% on the client side. Your JSON strings never leave your device and are never sent over the network.',
      },
      {
        question: 'Can JsonLens format large JSON files?',
        answer:
          'Yes. JsonLens utilizes background Web Workers for parsing payloads over 2 MB to keep the user interface smooth and responsive.',
      },
      {
        question: 'What quick controls are available?',
        answer:
          'Use the input header buttons to Format, Minify, or Auto-Fix instantly, the center rail to Open, Export, Share, Sample, Clear, or Fullscreen, and the Code view to customize Indent, Sort, or Transform.',
      },
    ],
  },

  validator: {
    key: 'validator',
    badge: 'Syntax Diagnostics & Auto-Repair',
    title: 'Real-Time JSON Validator with Smart Auto-Repair',
    subtitle:
      'Locate exact syntax errors with line and column precision, and fix broken JSON strings with a single click using our smart repair engine.',
    metadata: {
      title: 'JSON Validator & Auto-Repair Tool | JsonLens',
      description:
        'Fast real-time JSON validator with precise line and column error diagnostics. Automatically fix trailing commas, unquoted keys, and single quotes in 1 click.',
      canonicalPath: 'https://jsonlens.dev/json-validator',
      keywords: [
        'json validator',
        'json repair',
        'fix invalid json',
        'json syntax checker',
        'online json validator',
      ],
      softwareType: 'DeveloperApplication',
    },
    sections: [
      {
        title: 'Precise Line & Column Error Highlighting',
        description:
          'Debugging corrupted JSON shouldn’t involve scanning thousands of lines manually. JsonLens parses syntax in real-time and pinpoints the exact line, column, and token where the syntax violation occurred.',
        bullets: [
          'Real-time error markers overlaid directly in Monaco Editor.',
          'Status bar displays line number, column, and descriptive error diagnostics.',
          'Live syntax verification conforms strictly to RFC 8259 specifications.',
        ],
      },
      {
        title: 'One-Click Smart Auto-Repair Engine',
        description:
          'Common syntax mistakes like trailing commas in objects or arrays, unquoted property keys, single quotes instead of double quotes, and unescaped newlines are fixed automatically by our built-in jsonrepair engine without losing nested data.',
      },
    ],
    faqs: [
      {
        question: 'What types of JSON errors can be automatically repaired?',
        answer:
          'JsonLens can automatically fix unquoted keys, single quotes, trailing commas, missing closing brackets, MongoDB ObjectId strings, and commented JSON lines.',
      },
      {
        question: 'How do I know where the error is located?',
        answer:
          'The status bar displays the exact line and column number, and Monaco Editor highlights the offending character with a red squiggly marker.',
      },
    ],
  },

  minifier: {
    key: 'minifier',
    badge: 'JSON Minifier & Compressor',
    title: 'High-Performance JSON Minifier & Whitespace Compressor',
    subtitle:
      'Strip unnecessary whitespace, tabs, and line breaks from JSON payloads to minimize bandwidth consumption and accelerate API response delivery.',
    metadata: {
      title: 'JSON Minifier & Compressor Online | JsonLens',
      description:
        'Minify and compress JSON strings instantly. Reduce payload size for production APIs, microservices, and network transfer. 100% client-side tool.',
      canonicalPath: 'https://jsonlens.dev/json-minifier',
      keywords: [
        'json minifier',
        'compress json',
        'remove json whitespace',
        'json compact tool',
        'minify json online',
      ],
      softwareType: 'DeveloperApplication',
    },
    sections: [
      {
        title: 'Reduce Bandwidth and Serialization Overhead',
        description:
          'Whitespace characters (spaces, tabs, newlines) can account for 20% to 50% of the overall size of formatted JSON documents. Minifying JSON payloads decreases transfer latency over HTTP and reduces memory consumption in caching layers.',
        bullets: [
          'Instant 1-click minification via the input editor header button.',
          'Byte-size before and after tracking displayed in the live status bar.',
          'Copy minified payload or export as compressed .json file directly.',
        ],
      },
      {
        title: 'Safe Serialization Guarantee',
        description:
          'Our minifier utilizes native ECMAScript JSON serialization combined with RFC 8259 conformity checks, ensuring that string contents, escape sequences, and numeric precisions remain untouched.',
      },
    ],
    faqs: [
      {
        question: 'Does minification alter JSON values or keys?',
        answer:
          'No. Minification strictly eliminates whitespace outside string literals. All keys, values, and structural hierarchies remain identical.',
      },
      {
        question: 'Can I re-format a minified JSON string later?',
        answer:
          'Yes. Simply click the "Format" button or select 2-spaces/4-spaces from the indent dropdown to restore beautiful formatting anytime.',
      },
    ],
  },

  typescript: {
    key: 'typescript',
    badge: 'Code Generation Lens',
    title: 'Instant JSON to TypeScript, Zod & Go Struct Converter',
    subtitle:
      'Generate strictly-typed TypeScript interfaces, Zod schema validators, and Go structs with JSON tags directly from any JSON payload.',
    metadata: {
      title: 'JSON to TypeScript & Zod Schema Converter Online | JsonLens',
      description:
        'Convert JSON to TypeScript interfaces, Zod runtime schemas, and Go structs with json tags. Customize root names and download generated code in seconds.',
      canonicalPath: 'https://jsonlens.dev/json-to-typescript',
      keywords: [
        'json to typescript',
        'json to zod',
        'json to go struct',
        'type generator',
        'typescript interface from json',
      ],
      softwareType: 'DeveloperApplication',
    },
    sections: [
      {
        title: 'Accelerate API Integration & Type Safety',
        description:
          'Manually typing TypeScript interfaces or Go structs for complex API responses is tedious and error-prone. JsonLens inspects your payload structure, analyzes nested objects and arrays, and infers precise types.',
        bullets: [
          'TypeScript: Generates nested interfaces with proper optional and union types.',
          'Zod: Generates runtime validation schemas using z.object(), z.string(), and z.array().',
          'Go: Generates Go structs with PascalCase field names and `json:"key"` tags.',
          'Customizable root model name (e.g., UserResponse or ApiResponse).',
        ],
      },
    ],
    faqs: [
      {
        question: 'How are nested objects handled?',
        answer:
          'Nested objects are automatically extracted into separate named interfaces or child structs for clean and modular code organization.',
      },
      {
        question: 'Can I download the generated code directly?',
        answer:
          'Yes. Click the "Download" button in the Types view to save the generated code as a .ts or .go file.',
      },
    ],
  },

  diff: {
    key: 'diff',
    badge: 'JSON Diff & Comparator',
    title: 'Visual Side-by-Side JSON Diff & Comparison Engine',
    subtitle:
      'Compare two JSON objects or arrays with deep recursive diffing. Clearly visualize added, removed, and modified values with color-coded badges.',
    metadata: {
      title: 'JSON Diff & Compare Tool Online | JsonLens',
      description:
        'Compare two JSON payloads side-by-side with deep recursive diffing. Color-coded additions, deletions, and modifications with instant swap actions.',
      canonicalPath: 'https://jsonlens.dev/json-diff',
      keywords: [
        'json diff',
        'compare json',
        'json comparator',
        'diff two json files',
        'side by side json diff',
      ],
      softwareType: 'DeveloperApplication',
    },
    sections: [
      {
        title: 'Deep Recursive Object Comparison',
        description:
          'Detect subtle differences between staging and production API responses, configuration snapshots, or database records. JsonLens recursively traverses both objects and flags every discrepancy.',
        bullets: [
          '🟢 Green badge for newly added properties or array items.',
          '🔴 Red badge for deleted or missing properties.',
          '🟡 Yellow badge for modified values showing previous → new states.',
          'Real-time metrics counter: added, removed, modified, and unchanged.',
          'Quick swap button to reverse comparison direction.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Does the diff tool support arrays of varying lengths?',
        answer:
          'Yes. Arrays are compared element-by-element, correctly identifying inserted items at new indices or removed elements.',
      },
      {
        question: 'Can I swap the left and right JSON payloads?',
        answer:
          'Yes. Click the "Swap" button in the Diff toolbar to invert the comparison instantly.',
      },
    ],
  },
};
