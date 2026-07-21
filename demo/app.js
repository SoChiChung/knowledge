/**
 * Knowledge Base Generator — Demo app.js
 *
 * Architecture:
 *   1. Static Data       — mirrors build output JSON structure exactly
 *   2. DataProvider      — where data comes from (Static | Json)
 *   3. Repository        — unified access layer with caching
 *   4. Renderer          — pure DOM functions, no data access
 *   5. View              — page composition (HomeView, ArticleView)
 *   6. SearchPalette     — Command Palette overlay controller
 *   7. SidebarController — expand/collapse state management
 *   8. Router            — hash-based routing
 *   9. App               — wires everything together
 *
 * Data models:
 *   treeNode:     { type, name?, title?, slug, children? }
 *   pageData:     { title, slug, category, tags, type, cover, html, text, updatedAt, toc }
 *   searchEntry:  { title, slug, tags, text }
 *   siteConfig:   { name, description, github, hero }
 *   recentEntry:  { title, slug, updatedAt }
 *   categoryEntry:{ name, slug, count, children }
 *   tagEntry:     { name, count }
 */


/* ================================================================
   1. Static Data (matches build output JSON exactly)
   ================================================================ */

// Matches data/site.json
var STATIC_SITE = {
  name: "Knowledge Base",
  description: "Personal knowledge base powered by Markdown",
  github: "https://github.com",
  base: "",
  hero: {
    title: "Knowledge Base",
    subtitle: "Personal notes, thoughts, and references.",
    cover: null
  }
};

// Matches data/tree.json — Folder/Page with 3-level nesting
var STATIC_TREE = [
  {
    type: "folder", name: "AI", slug: "ai",
    children: [
      {
        type: "folder", name: "LLM", slug: "ai/llm",
        children: [
          { type: "page", title: "Prompt Engineering", slug: "ai/llm/prompt" },
          { type: "page", title: "Claude Guide", slug: "ai/llm/claude" }
        ]
      },
      { type: "page", title: "GPT Tips", slug: "ai/gpt" }
    ]
  },
  {
    type: "folder", name: "Football", slug: "football",
    children: [
      { type: "page", title: "Arsenal FC", slug: "football/arsenal" },
      { type: "page", title: "FPL Strategy", slug: "football/fpl" }
    ]
  },
  {
    type: "folder", name: "Programming", slug: "programming",
    children: [
      { type: "page", title: "Node.js Notes", slug: "programming/nodejs" },
      { type: "page", title: "Python Notes", slug: "programming/python" }
    ]
  }
];

// Matches data/pages/{slug}.json — each page with TOC
var STATIC_PAGES = {

  "ai/llm/prompt": {
    title: "Prompt Engineering",
    slug: "ai/llm/prompt",
    category: "AI/LLM",
    tags: ["GPT", "Claude", "LLM"],
    type: "page",
    cover: null,
    github: null,
    demo: null,
    html: [
      '<h1 id="prompt-engineering">Prompt Engineering</h1>',
      '<p>Prompt engineering is the practice of designing and optimizing input prompts',
      'for large language models (LLMs) to achieve desired outputs.</p>',
      '<h2 id="core-principles">Core Principles</h2>',
      '<ul>',
      '<li><strong>Clarity</strong> — Be specific and unambiguous</li>',
      '<li><strong>Context</strong> — Provide relevant background</li>',
      '<li><strong>Constraints</strong> — Set clear boundaries</li>',
      '<li><strong>Examples</strong> — Use few-shot prompting</li>',
      '</ul>',
      '<h2 id="chain-of-thought">Chain-of-Thought</h2>',
      '<p>Chain-of-thought (CoT) prompting encourages step-by-step reasoning.</p>',
      '<pre><code>Q: A bakery sold 120 loaves on Monday.',
      'It sold 30% more on Tuesday. Total?',
      '',
      'Let\'s solve step by step:',
      '1. Monday: 120',
      '2. Tuesday increase: 120 × 0.30 = 36',
      '3. Tuesday: 120 + 36 = 156',
      '4. Total: 120 + 156 = 276</code></pre>',
      '<h2 id="best-practices">Best Practices</h2>',
      '<ol>',
      '<li>Start with a clear system message</li>',
      '<li>Use delimiters to separate sections</li>',
      '<li>Specify the desired output format</li>',
      '<li>Iterate and refine based on results</li>',
      '</ol>',
      '<blockquote><p>"The quality of your prompt determines the quality of your output."</p></blockquote>'
    ].join('\n'),
    text: "Prompt Engineering\n\nPrompt engineering is the practice of designing...",
    updatedAt: "2026-07-15",
    toc: [
      { level: 2, text: "Core Principles", anchor: "core-principles" },
      { level: 2, text: "Chain-of-Thought", anchor: "chain-of-thought" },
      { level: 2, text: "Best Practices", anchor: "best-practices" }
    ]
  },

  "ai/llm/claude": {
    title: "Claude Guide",
    slug: "ai/llm/claude",
    category: "AI/LLM",
    tags: ["Claude", "Anthropic", "AI Assistant"],
    type: "page",
    cover: null,
    github: null,
    demo: null,
    html: [
      '<h1 id="claude-guide">Claude Guide</h1>',
      '<p>Claude is Anthropic\'s AI assistant, designed to be helpful, harmless, and honest.</p>',
      '<h2 id="key-features">Key Features</h2>',
      '<ul>',
      '<li><strong>Long Context</strong> — Up to 200K tokens</li>',
      '<li><strong>Tool Use</strong> — External tools and APIs</li>',
      '<li><strong>Multimodal</strong> — Images, documents, code</li>',
      '<li><strong>Constitutional AI</strong> — Safety principles built in</li>',
      '</ul>',
      '<h2 id="effective-prompting">Effective Prompting</h2>',
      '<h3 id="be-specific">Be Specific</h3>',
      '<pre><code>Explain the React useEffect hook:',
      '- When it runs',
      '- Cleanup functions',
      '- Common pitfalls</code></pre>',
      '<h3 id="use-system-prompts">Use System Prompts</h3>',
      '<p>Place important instructions in the system prompt.</p>',
      '<h2 id="code-generation">Code Generation</h2>',
      '<ol>',
      '<li>Specify language and framework</li>',
      '<li>Describe expected behavior</li>',
      '<li>Mention constraints</li>',
      '</ol>'
    ].join('\n'),
    text: "Claude Guide\n\nClaude is Anthropic\'s AI assistant...",
    updatedAt: "2026-07-14",
    toc: [
      { level: 2, text: "Key Features", anchor: "key-features" },
      { level: 2, text: "Effective Prompting", anchor: "effective-prompting" },
      { level: 3, text: "Be Specific", anchor: "be-specific" },
      { level: 3, text: "Use System Prompts", anchor: "use-system-prompts" },
      { level: 2, text: "Code Generation", anchor: "code-generation" }
    ]
  },

  "ai/gpt": {
    title: "GPT Tips",
    slug: "ai/gpt",
    category: "AI",
    tags: ["GPT", "OpenAI", "Tips"],
    type: "page",
    cover: null,
    github: null,
    demo: null,
    html: [
      '<h1 id="gpt-tips">GPT Tips</h1>',
      '<p>Practical tips for getting the most out of GPT models.</p>',
      '<h2 id="temperature-settings">Temperature Settings</h2>',
      '<table><thead><tr><th>Temperature</th><th>Best For</th></tr></thead>',
      '<tbody>',
      '<tr><td>0.0 – 0.3</td><td>Code generation, factual answers</td></tr>',
      '<tr><td>0.3 – 0.7</td><td>General conversation</td></tr>',
      '<tr><td>0.7 – 1.0</td><td>Creative writing, brainstorming</td></tr>',
      '</tbody></table>',
      '<h2 id="token-management">Token Management</h2>',
      '<p>1 token ≈ 0.75 words in English.</p>',
      '<h2 id="system-messages">System Messages</h2>',
      '<pre><code>You are a senior engineer reviewing code.',
      'Focus on: security, performance, clarity.</code></pre>'
    ].join('\n'),
    text: "GPT Tips\n\nPractical tips for GPT models...",
    updatedAt: "2026-07-10",
    toc: [
      { level: 2, text: "Temperature Settings", anchor: "temperature-settings" },
      { level: 2, text: "Token Management", anchor: "token-management" },
      { level: 2, text: "System Messages", anchor: "system-messages" }
    ]
  },

  "football/arsenal": {
    title: "Arsenal FC",
    slug: "football/arsenal",
    category: "Football",
    tags: ["Arsenal", "Premier League", "Football"],
    type: "page",
    cover: null,
    github: null,
    demo: null,
    html: [
      '<h1 id="arsenal-fc">Arsenal FC</h1>',
      '<p>Arsenal Football Club, based in Islington, North London. Competes in the Premier League.</p>',
      '<h2 id="history">History</h2>',
      '<p>Founded in 1886. 13 league titles, record 14 FA Cups.</p>',
      '<h2 id="the-invincibles">The Invincibles</h2>',
      '<p>The 2003-04 season — entire Premier League campaign unbeaten.</p>',
      '<h2 id="key-players">Key Players (2024–25)</h2>',
      '<table><thead><tr><th>Player</th><th>Role</th></tr></thead>',
      '<tbody>',
      '<tr><td><strong>Bukayo Saka</strong></td><td>Elite winger</td></tr>',
      '<tr><td><strong>Martin Ødegaard</strong></td><td>Captain, creative heartbeat</td></tr>',
      '<tr><td><strong>Declan Rice</strong></td><td>Midfield powerhouse</td></tr>',
      '<tr><td><strong>William Saliba</strong></td><td>Defensive rock</td></tr>',
      '</tbody></table>'
    ].join('\n'),
    text: "Arsenal FC\n\nArsenal Football Club is a professional football club...",
    updatedAt: "2026-07-12",
    toc: [
      { level: 2, text: "History", anchor: "history" },
      { level: 2, text: "The Invincibles", anchor: "the-invincibles" },
      { level: 2, text: "Key Players", anchor: "key-players" }
    ]
  },

  "football/fpl": {
    title: "FPL Strategy",
    slug: "football/fpl",
    category: "Football",
    tags: ["FPL", "Fantasy Football", "Strategy"],
    type: "page",
    cover: null,
    github: null,
    demo: null,
    html: [
      '<h1 id="fpl-strategy">FPL Strategy</h1>',
      '<p>Fantasy Premier League — millions of players worldwide.</p>',
      '<h2 id="basic-rules">Basic Rules</h2>',
      '<ul>',
      '<li>Budget: £100 million for 15 players</li>',
      '<li>1 free transfer per gameweek</li>',
      '<li>Captain scores double points</li>',
      '</ul>',
      '<h2 id="chip-strategy">Chip Strategy</h2>',
      '<table><thead><tr><th>Chip</th><th>Effect</th><th>Best Use</th></tr></thead>',
      '<tbody>',
      '<tr><td>Wildcard</td><td>Unlimited transfers</td><td>Overhaul team</td></tr>',
      '<tr><td>Free Hit</td><td>One-week reset</td><td>Blank gameweeks</td></tr>',
      '<tr><td>Bench Boost</td><td>Bench scores</td><td>Double gameweeks</td></tr>',
      '<tr><td>Triple Captain</td><td>Captain ×3</td><td>Double gameweeks</td></tr>',
      '</tbody></table>'
    ].join('\n'),
    text: "Fantasy Premier League\n\nFPL is the official fantasy football game...",
    updatedAt: "2026-07-11",
    toc: [
      { level: 2, text: "Basic Rules", anchor: "basic-rules" },
      { level: 2, text: "Chip Strategy", anchor: "chip-strategy" }
    ]
  },

  "programming/nodejs": {
    title: "Node.js Notes",
    slug: "programming/nodejs",
    category: "Programming",
    tags: ["Node.js", "JavaScript", "Backend"],
    type: "page",
    cover: null,
    github: null,
    demo: null,
    html: [
      '<h1 id="node-js-notes">Node.js Notes</h1>',
      '<p>JavaScript runtime built on Chrome\'s V8 engine.</p>',
      '<h2 id="event-loop">Event Loop</h2>',
      '<p>The heart of Node.js — non-blocking I/O.</p>',
      '<h3 id="phases">Phases</h3>',
      '<ol>',
      '<li><strong>Timers</strong> — setTimeout/setInterval</li>',
      '<li><strong>Pending callbacks</strong> — deferred I/O</li>',
      '<li><strong>Poll</strong> — retrieve new I/O events</li>',
      '<li><strong>Check</strong> — setImmediate</li>',
      '<li><strong>Close callbacks</strong> — close events</li>',
      '</ol>',
      '<h2 id="key-modules">Key Modules</h2>',
      '<table><thead><tr><th>Module</th><th>Purpose</th></tr></thead>',
      '<tbody>',
      '<tr><td><code>fs</code></td><td>File system</td></tr>',
      '<tr><td><code>path</code></td><td>Path utilities</td></tr>',
      '<tr><td><code>http</code></td><td>HTTP server/client</td></tr>',
      '</tbody></table>'
    ].join('\n'),
    text: "Node.js Notes\n\nNode.js is a JavaScript runtime...",
    updatedAt: "2026-07-13",
    toc: [
      { level: 2, text: "Event Loop", anchor: "event-loop" },
      { level: 3, text: "Phases", anchor: "phases" },
      { level: 2, text: "Key Modules", anchor: "key-modules" }
    ]
  },

  "programming/python": {
    title: "Python Notes",
    slug: "programming/python",
    category: "Programming",
    tags: ["Python", "Programming", "Scripting"],
    type: "page",
    cover: null,
    github: null,
    demo: null,
    html: [
      '<h1 id="python-notes">Python Notes</h1>',
      '<p>High-level, interpreted programming language.</p>',
      '<h2 id="data-structures">Data Structures</h2>',
      '<h3 id="lists">Lists</h3>',
      '<pre><code>fruits = ["apple", "banana", "cherry"]',
      'fruits.append("orange")',
      'squares = [x**2 for x in range(10)]</code></pre>',
      '<h3 id="dictionaries">Dictionaries</h3>',
      '<pre><code>user = {"name": "Alice", "age": 30}',
      'squares = {x: x**2 for x in range(5)}</code></pre>',
      '<h2 id="virtual-environments">Virtual Environments</h2>',
      '<pre><code>python -m venv .venv',
      'source .venv/bin/activate</code></pre>',
      '<h2 id="popular-libraries">Popular Libraries</h2>',
      '<ul>',
      '<li><strong>Requests</strong> — HTTP client</li>',
      '<li><strong>Pandas</strong> — Data analysis</li>',
      '<li><strong>Pytest</strong> — Testing framework</li>',
      '<li><strong>FastAPI</strong> — Web framework</li>',
      '</ul>'
    ].join('\n'),
    text: "Python Notes\n\nPython is a high-level programming language...",
    updatedAt: "2026-07-08",
    toc: [
      { level: 2, text: "Data Structures", anchor: "data-structures" },
      { level: 3, text: "Lists", anchor: "lists" },
      { level: 3, text: "Dictionaries", anchor: "dictionaries" },
      { level: 2, text: "Virtual Environments", anchor: "virtual-environments" },
      { level: 2, text: "Popular Libraries", anchor: "popular-libraries" }
    ]
  }
};

// Matches data/categories.json
var STATIC_CATEGORIES = [
  { name: "AI", slug: "ai", count: 3, children: [
    { name: "LLM", slug: "ai/llm", count: 2, children: [] }
  ]},
  { name: "Football", slug: "football", count: 2, children: [] },
  { name: "Programming", slug: "programming", count: 2, children: [] }
];

// Matches data/recent.json
var STATIC_RECENT = [
  { title: "Prompt Engineering", slug: "ai/llm/prompt", updatedAt: "2026-07-15" },
  { title: "Claude Guide", slug: "ai/llm/claude", updatedAt: "2026-07-14" },
  { title: "Node.js Notes", slug: "programming/nodejs", updatedAt: "2026-07-13" },
  { title: "Arsenal FC", slug: "football/arsenal", updatedAt: "2026-07-12" },
  { title: "FPL Strategy", slug: "football/fpl", updatedAt: "2026-07-11" }
];

// Matches data/tags.json
var STATIC_TAGS = [
  { name: "Claude", count: 2 },
  { name: "GPT", count: 2 },
  { name: "Programming", count: 2 },
  { name: "AI Assistant", count: 1 },
  { name: "Anthropic", count: 1 },
  { name: "Arsenal", count: 1 },
  { name: "Backend", count: 1 },
  { name: "FPL", count: 1 },
  { name: "Fantasy Football", count: 1 },
  { name: "Football", count: 1 },
  { name: "JavaScript", count: 1 },
  { name: "LLM", count: 1 },
  { name: "Node.js", count: 1 },
  { name: "OpenAI", count: 1 },
  { name: "Premier League", count: 1 },
  { name: "Python", count: 1 },
  { name: "Scripting", count: 1 },
  { name: "Strategy", count: 1 },
  { name: "Tips", count: 1 }
];

// Matches data/search.json
var STATIC_SEARCH = Object.values(STATIC_PAGES).map(function (p) {
  return { title: p.title, slug: p.slug, tags: p.tags, text: p.text };
});


/* ================================================================
   Runtime URL helpers
   ================================================================ */

function normalizeBase(base) {
  if (!base || base === '/') return '';
  return '/' + String(base).replace(/^\/+|\/+$/g, '');
}

var AppConfig = {
  base: normalizeBase(window.__KB_BASE__ || STATIC_SITE.base || '')
};

function withBase(assetPath) {
  if (!assetPath) return assetPath;
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(assetPath)) return assetPath;
  var cleanPath = String(assetPath).replace(/^\/+/, '');
  return AppConfig.base ? AppConfig.base + '/' + cleanPath : cleanPath;
}

function resolveStaticUrls(root) {
  if (!root) return;

  var urlAttrs = [
    ['img', 'src'],
    ['source', 'src'],
    ['video', 'src'],
    ['video', 'poster'],
    ['audio', 'src']
  ];

  for (var i = 0; i < urlAttrs.length; i++) {
    var selector = urlAttrs[i][0];
    var attr = urlAttrs[i][1];
    var nodes = root.querySelectorAll(selector + '[' + attr + ']');
    for (var n = 0; n < nodes.length; n++) {
      nodes[n].setAttribute(attr, withBase(nodes[n].getAttribute(attr)));
    }
  }

  var srcsetNodes = root.querySelectorAll('[srcset]');
  for (var s = 0; s < srcsetNodes.length; s++) {
    var srcset = srcsetNodes[s].getAttribute('srcset');
    srcsetNodes[s].setAttribute('srcset', srcset.split(',').map(function (part) {
      var trimmed = part.trim();
      if (!trimmed) return trimmed;
      var pieces = trimmed.split(/\s+/);
      pieces[0] = withBase(pieces[0]);
      return pieces.join(' ');
    }).join(', '));
  }
}


/* ================================================================
   2. DataProvider — abstract data source layer
   ================================================================ */

var StaticDataProvider = {
  getSite:         function () { return Promise.resolve(STATIC_SITE); },
  getTree:         function () { return Promise.resolve(STATIC_TREE); },
  getPage:         function (s) { return Promise.resolve(STATIC_PAGES[s] || null); },
  getSearchIndex:  function () { return Promise.resolve(STATIC_SEARCH); },
  getRecent:       function () { return Promise.resolve(STATIC_RECENT); },
  getCategories:   function () { return Promise.resolve(STATIC_CATEGORIES); },
  getTags:         function () { return Promise.resolve(STATIC_TAGS); }
};

// Future production version:
function parse(response) {
  if (!response.ok) {
    throw new Error('Failed to load ' + response.url + ' (' + response.status + ')');
  }
  return response.json();
}

var JsonDataProvider = {
  getSite:         function () { return fetch(withBase('data/site.json')).then(parse); },
  getTree:         function () { return fetch(withBase('data/tree.json')).then(parse); },
  getPage:         function (s) {
    var normalizedSlug = s.split('/').map(function (part) {
      try { return decodeURIComponent(part); } catch (e) { return part; }
    });
    return fetch(withBase('data/pages/' + normalizedSlug.map(encodeURIComponent).join('/') + '.json')).then(parse);
  },
  getSearchIndex:  function () { return fetch(withBase('data/search.json')).then(parse); },
  getRecent:       function () { return fetch(withBase('data/recent.json')).then(parse); },
  getCategories:   function () { return fetch(withBase('data/categories.json')).then(parse); },
  getTags:         function () { return fetch(withBase('data/tags.json')).then(parse); }
};
var provider = StaticDataProvider;


/* ================================================================
   3. Repository — unified data access with caching
   ================================================================ */

var Repository = {
  _cache: {},

  getSite: function () {
    if (this._cache.site) return Promise.resolve(this._cache.site);
    return provider.getSite().then(function (d) {
      if (d && typeof d.base !== 'undefined') {
        AppConfig.base = normalizeBase(d.base);
      }
      this._cache.site = d;
      return d;
    }.bind(this));
  },

  getTree: function () {
    if (this._cache.tree) return Promise.resolve(this._cache.tree);
    return provider.getTree().then(function (d) {
      this._cache.tree = d;
      return d;
    }.bind(this));
  },

  getPage: function (slug) {
    return provider.getPage(slug).then(function (p) {
      return p || null;
    });
  },

  getSearchIndex: function () {
    if (this._cache.search) return Promise.resolve(this._cache.search);
    return provider.getSearchIndex().then(function (d) {
      this._cache.search = d;
      return d;
    }.bind(this));
  },

  getRecent: function () {
    if (this._cache.recent) return Promise.resolve(this._cache.recent);
    return provider.getRecent().then(function (d) {
      this._cache.recent = d;
      return d;
    }.bind(this));
  },

  getCategories: function () {
    if (this._cache.categories) return Promise.resolve(this._cache.categories);
    return provider.getCategories().then(function (d) {
      this._cache.categories = d;
      return d;
    }.bind(this));
  },

  getTags: function () {
    if (this._cache.tags) return Promise.resolve(this._cache.tags);
    return provider.getTags().then(function (d) {
      this._cache.tags = d;
      return d;
    }.bind(this));
  }
};


/* ================================================================
   4. Renderer — pure DOM functions (no data access, no global state)
   ================================================================ */

/**
 * Render sidebar toggle button state
 */
function renderSidebarToggle(state) {
  var btn = document.getElementById('sidebarToggle');
  var sidebar = document.getElementById('sidebar');
  if (!btn || !sidebar) return;

  if (state === 'expanded') {
    sidebar.classList.remove('sidebar--collapsed');
    sidebar.classList.add('sidebar--expanded');
    btn.querySelector('.header__sidebar-toggle-icon').textContent = '☰'; // ☰
  } else {
    sidebar.classList.add('sidebar--collapsed');
    sidebar.classList.remove('sidebar--expanded');
    btn.querySelector('.header__sidebar-toggle-icon').textContent = '☰'; // ☰
  }
}

/**
 * Recursively render tree nodes into a <ul>
 */
function renderTreeNodes(container, nodes, currentSlug, forceOpen) {
  if (!nodes || !nodes.length) return;

  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];

    if (node.type === 'folder') {
      var folderLi = document.createElement('li');
      folderLi.className = 'sidebar__folder';

      var shouldOpen = forceOpen ||
        (currentSlug && currentSlug.indexOf(node.slug + '/') === 0);
      if (shouldOpen) {
        folderLi.classList.add('sidebar__folder--open');
      }

      var header = document.createElement('div');
      header.className = 'sidebar__folder-header';

      var toggle = document.createElement('span');
      toggle.className = 'sidebar__folder-toggle';
      toggle.innerHTML = '&#9660;';

      var nameSpan = document.createElement('span');
      nameSpan.className = 'sidebar__folder-name';
      nameSpan.textContent = node.name;

      header.appendChild(toggle);
      header.appendChild(nameSpan);

      header.addEventListener('click', function () {
        this.parentElement.classList.toggle('sidebar__folder--open');
      });

      folderLi.appendChild(header);

      var childrenUl = document.createElement('ul');
      childrenUl.className = 'sidebar__folder-children';
      renderTreeNodes(childrenUl, node.children || [], currentSlug, shouldOpen);
      folderLi.appendChild(childrenUl);
      container.appendChild(folderLi);

    } else if (node.type === 'page') {
      var pageLi = document.createElement('li');
      pageLi.className = 'sidebar__page';

      var link = document.createElement('a');
      link.className = 'sidebar__link';
      link.href = '#/' + node.slug;
      link.textContent = node.title;

      if (node.slug === currentSlug) {
        link.classList.add('sidebar__link--active');
      }

      pageLi.appendChild(link);
      container.appendChild(pageLi);
    }
  }
}

/**
 * Render entire sidebar tree
 */
function renderTree(containerId, tree, currentSlug) {
  var container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  // Home link at top of sidebar
  var homeLi = document.createElement('li');
  homeLi.className = 'sidebar__home';
  var homeLink = document.createElement('a');
  homeLink.className = 'sidebar__home-link';
  homeLink.href = '#/';
  homeLink.textContent = 'Home';
  if (!currentSlug) {
    homeLink.classList.add('sidebar__home-link--active');
  }
  homeLi.appendChild(homeLink);
  container.appendChild(homeLi);

  renderTreeNodes(container, tree, currentSlug, false);
}

/**
 * Render article content with TOC
 */
function renderArticle(containerId, page) {
  var container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  if (!page) {
    renderEmpty(containerId);
    return;
  }

  var wrapper = document.createElement('div');
  wrapper.className = 'article-wrapper';

  // Main article
  var article = document.createElement('article');
  article.className = 'article';

  if (page.cover) {
    var coverDiv = document.createElement('div');
    coverDiv.className = 'article__cover';
    var coverImg = document.createElement('img');
    coverImg.src = withBase(page.cover);
    coverImg.alt = page.title;
    coverDiv.appendChild(coverImg);
    article.appendChild(coverDiv);
  }

  // Title
  var title = document.createElement('h1');
  title.className = 'article__title';
  title.textContent = page.title;
  article.appendChild(title);

  // Meta
  var meta = document.createElement('div');
  meta.className = 'article__meta';

  if (page.updatedAt) {
    var dateEl = document.createElement('time');
    dateEl.className = 'article__date';
    dateEl.textContent = page.updatedAt;
    meta.appendChild(dateEl);
  }

  if (page.tags && page.tags.length) {
    var tagsDiv = document.createElement('div');
    tagsDiv.className = 'article__tags';
    for (var t = 0; t < page.tags.length; t++) {
      var tag = document.createElement('span');
      tag.className = 'article__tag';
      tag.textContent = page.tags[t];
      tagsDiv.appendChild(tag);
    }
    meta.appendChild(tagsDiv);
  }

  article.appendChild(meta);

  // Body
  var body = document.createElement('div');
  body.className = 'article__body';
  body.innerHTML = page.html;
  resolveStaticUrls(body);
  article.appendChild(body);

  wrapper.appendChild(article);

  // TOC sidebar (if page has TOC entries)
  if (page.toc && page.toc.length > 0) {
    var toc = document.createElement('aside');
    toc.className = 'article__toc';

    var tocTitle = document.createElement('div');
    tocTitle.className = 'article__toc-title';
    tocTitle.textContent = 'On this page';
    toc.appendChild(tocTitle);

    var tocList = document.createElement('ul');
    tocList.className = 'article__toc-list';

    for (var i = 0; i < page.toc.length; i++) {
      var entry = page.toc[i];
      var tocItem = document.createElement('li');
      tocItem.className = 'article__toc-item';
      tocItem.setAttribute('data-level', String(entry.level));

      var tocLink = document.createElement('a');
      tocLink.className = 'article__toc-link';
      tocLink.href = '#' + entry.anchor;
      tocLink.textContent = entry.text;

      tocItem.appendChild(tocLink);
      tocList.appendChild(tocItem);
    }

    toc.appendChild(tocList);
    wrapper.appendChild(toc);
  }

  container.appendChild(wrapper);
}

/**
 * Render home page
 */
function renderHome(containerId, recent, categories, tags, hero) {
  var container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  // Hero
  var heroSection = document.createElement('section');
  heroSection.className = 'hero';

  var heroInner = document.createElement('div');
  heroInner.className = 'hero__inner';

  var heroTitle = document.createElement('h1');
  heroTitle.className = 'hero__title';
  heroTitle.textContent = (hero && hero.title) || 'Knowledge Base';
  heroInner.appendChild(heroTitle);

  if (hero && hero.subtitle) {
    var heroSub = document.createElement('p');
    heroSub.className = 'hero__subtitle';
    heroSub.textContent = hero.subtitle;
    heroInner.appendChild(heroSub);
  }

  var heroSearch = document.createElement('div');
  heroSearch.className = 'hero__search';
  var heroInput = document.createElement('input');
  heroInput.className = 'hero__search-input';
  heroInput.type = 'text';
  heroInput.placeholder = 'Search articles...';
  heroInput.id = 'heroSearchInput';
  heroInput.readOnly = true;
  heroSearch.appendChild(heroInput);
  heroInner.appendChild(heroSearch);

  heroSection.appendChild(heroInner);
  container.appendChild(heroSection);

  // Sections
  var sections = document.createElement('div');
  sections.className = 'home__sections';

  // Recent
  var recentSection = document.createElement('div');
  recentSection.className = 'home__section';
  var recentTitle = document.createElement('h2');
  recentTitle.className = 'home__section-title';
  recentTitle.textContent = 'Recent Updates 最近更新';
  recentSection.appendChild(recentTitle);

  var recentList = document.createElement('ul');
  recentList.className = 'home__list';
  for (var r = 0; r < recent.length; r++) {
    var item = document.createElement('li');
    item.className = 'home__list-item';
    var link = document.createElement('a');
    link.className = 'home__list-link';
    link.href = '#/' + recent[r].slug;
    link.textContent = recent[r].title;
    var dateSpan = document.createElement('span');
    dateSpan.className = 'home__list-date';
    dateSpan.textContent = recent[r].updatedAt;
    link.appendChild(dateSpan);
    item.appendChild(link);
    recentList.appendChild(item);
  }
  recentSection.appendChild(recentList);
  sections.appendChild(recentSection);

  // Categories
  var catSection = document.createElement('div');
  catSection.className = 'home__section';
  var catTitle = document.createElement('h2');
  catTitle.className = 'home__section-title';
  catTitle.textContent = 'Categories 目录';
  catSection.appendChild(catTitle);

  for (var c = 0; c < categories.length; c++) {
    var card = document.createElement('a');
    card.className = 'home__card';
    card.href = '#/' + categories[c].slug;
    var cardTitle = document.createElement('div');
    cardTitle.className = 'home__card-title';
    cardTitle.textContent = categories[c].name;
    card.appendChild(cardTitle);
    var cardCount = document.createElement('span');
    cardCount.className = 'home__card-count';
    cardCount.textContent = categories[c].count + ' articles';
    card.appendChild(cardCount);
    catSection.appendChild(card);
  }
  sections.appendChild(catSection);

  // Tags
  var tagSection = document.createElement('div');
  tagSection.className = 'home__section';
  var tagTitle = document.createElement('h2');
  tagTitle.className = 'home__section-title';
  tagTitle.textContent = 'Tags';
  tagSection.appendChild(tagTitle);

  var tagWrap = document.createElement('div');
  tagWrap.className = 'home__tags';
  for (var tg = 0; tg < Math.min(tags.length, 15); tg++) {
    var tagLink = document.createElement('span');
    tagLink.className = 'home__tag';
    tagLink.textContent = tags[tg].name;
    var tagCount = document.createElement('span');
    tagCount.className = 'home__tag-count';
    tagCount.textContent = tags[tg].count;
    tagLink.appendChild(tagCount);
    tagWrap.appendChild(tagLink);
  }
  tagSection.appendChild(tagWrap);
  sections.appendChild(tagSection);

  container.appendChild(sections);
}

/**
 * Render empty / 404 state
 */
function renderEmpty(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = [
    '<div class="content__empty">',
    '<div class="content__empty-icon">📄</div>',
    '<div class="content__empty-title">Page Not Found</div>',
    '<div class="content__empty-text">This article doesn\'t exist or has been moved.</div>',
    '<a class="content__empty-link" href="#/">Back to Home</a>',
    '</div>'
  ].join('');
}


/* ================================================================
   5. Search Palette — Command Palette overlay controller
   ================================================================ */

var SearchPalette = {
  _open: false,
  _searchData: null,
  _selectedIndex: -1,
  _results: [],

  /**
   * Initialize the palette (called once after DOM ready)
   */
  init: function () {
    var self = this;

    // Open palette when header search input is focused/clicked
    var headerInput = document.getElementById('searchInput');
    if (headerInput) {
      headerInput.addEventListener('click', function () { self.open(); });
      headerInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') self.open();
      });
    }

    // Open palette when hero search is clicked (re-bind after each render)
    document.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'heroSearchInput') {
        self.open();
      }
    });

    // Close on overlay click
    var overlay = document.querySelector('.search-palette__overlay');
    if (overlay) {
      overlay.addEventListener('click', function () { self.close(); });
    }

    // Input handler for real-time filtering
    var input = document.getElementById('searchPaletteInput');
    if (input) {
      input.addEventListener('input', function () { self.filter(this.value); });
      input.addEventListener('keydown', function (e) { self.onKeydown(e); });
    }

    // Global keyboard shortcut: Ctrl+K / Cmd+K
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        self.open();
      }
      if (e.key === 'Escape' && self._open) {
        self.close();
      }
    });

    // Preload search data
    Repository.getSearchIndex().then(function (data) {
      self._searchData = data;
    });
  },

  open: function () {
    this._open = true;
    this._selectedIndex = -1;
    this._results = [];
    document.getElementById('searchPalette').classList.add('search-palette--open');
    document.getElementById('searchPaletteInput').value = '';
    document.getElementById('searchPaletteInput').focus();

    // Show recent articles initially
    this.showRecent();
  },

  close: function () {
    this._open = false;
    document.getElementById('searchPalette').classList.remove('search-palette--open');
    this._selectedIndex = -1;
    this._results = [];
  },

  showRecent: function () {
    var container = document.getElementById('searchPaletteResults');
    container.innerHTML = '';

    Repository.getRecent().then(function (recent) {
      if (document.getElementById('searchPaletteInput').value !== '') return;
      for (var i = 0; i < Math.min(recent.length, 10); i++) {
        var item = createResultItem(recent[i].slug, recent[i].title, [], null);
        container.appendChild(item);
      }
    });
  },

  filter: function (query) {
    var container = document.getElementById('searchPaletteResults');
    container.innerHTML = '';
    this._selectedIndex = -1;
    this._results = [];

    if (!query || !this._searchData) {
      this.showRecent();
      return;
    }

    var q = query.toLowerCase();
    var matched = [];

    for (var i = 0; i < this._searchData.length; i++) {
      var entry = this._searchData[i];
      var score = 0;

      // Title match (highest weight)
      if (entry.title.toLowerCase().indexOf(q) !== -1) {
        score = 3;
      }

      // Tag match
      if (entry.tags) {
        for (var t = 0; t < entry.tags.length; t++) {
          if (entry.tags[t].toLowerCase().indexOf(q) !== -1) {
            score = Math.max(score, 2);
          }
        }
      }

      // Text match (lowest weight)
      if (entry.text && entry.text.toLowerCase().indexOf(q) !== -1) {
        score = Math.max(score, 1);
      }

      if (score > 0) {
        matched.push({ entry: entry, score: score });
      }
    }

    // Sort by score descending
    matched.sort(function (a, b) { return b.score - a.score; });

    this._results = matched.map(function (m) { return m.entry; });

    if (this._results.length === 0) {
      container.innerHTML = '<div class="search-palette__empty">No results found</div>';
      return;
    }

    for (var j = 0; j < this._results.length; j++) {
      var item = createResultItem(
        this._results[j].slug,
        this._results[j].title,
        this._results[j].tags,
        this._results[j].slug
      );
      container.appendChild(item);
    }
  },

  onKeydown: function (e) {
    if (!this._open) return;

    var items = document.querySelectorAll('.search-palette__item');

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (this._selectedIndex < items.length - 1) {
        this._selectedIndex++;
      }
      this.updateSelection(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (this._selectedIndex > 0) {
        this._selectedIndex--;
      }
      this.updateSelection(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this._selectedIndex >= 0 && this._selectedIndex < items.length) {
        items[this._selectedIndex].click();
      } else if (items.length > 0) {
        items[0].click();
      }
    } else if (e.key === 'Escape') {
      this.close();
    }
  },

  updateSelection: function (items) {
    for (var i = 0; i < items.length; i++) {
      if (i === this._selectedIndex) {
        items[i].classList.add('search-palette__item--active');
        items[i].scrollIntoView({ block: 'nearest' });
      } else {
        items[i].classList.remove('search-palette__item--active');
      }
    }
  }
};

/**
 * Helper: create a single search result <a> element
 */
function createResultItem(slug, title, tags, extraPath) {
  var a = document.createElement('a');
  a.className = 'search-palette__item';
  a.href = '#/' + slug;
  a.addEventListener('click', function () {
    SearchPalette.close();
  });

  var titleSpan = document.createElement('span');
  titleSpan.className = 'search-palette__item-title';
  titleSpan.textContent = title;
  a.appendChild(titleSpan);

  if (extraPath) {
    var pathSpan = document.createElement('span');
    pathSpan.className = 'search-palette__item-path';
    pathSpan.textContent = extraPath;
    a.appendChild(pathSpan);
  }

  if (tags && tags.length) {
    var tagsWrap = document.createElement('span');
    tagsWrap.className = 'search-palette__item-tags';
    for (var i = 0; i < Math.min(tags.length, 3); i++) {
      var tagSpan = document.createElement('span');
      tagSpan.className = 'search-palette__item-tag';
      tagSpan.textContent = tags[i];
      tagsWrap.appendChild(tagSpan);
    }
    a.appendChild(tagsWrap);
  }

  return a;
}


/* ================================================================
   6. SidebarController — expand/collapse state
   ================================================================ */

var SidebarController = {
  _state: 'expanded', // 'expanded' | 'collapsed'

  init: function () {
    var self = this;

    // Default state based on screen size
    if (window.innerWidth <= 768) {
      this._state = 'collapsed';
    }

    var btn = document.getElementById('sidebarToggle');
    if (btn) {
      btn.addEventListener('click', function () {
        self.toggle();
      });
    }

    this.applyState();
  },

  toggle: function () {
    this._state = this._state === 'expanded' ? 'collapsed' : 'expanded';
    this.applyState();
  },

  applyState: function () {
    renderSidebarToggle(this._state);
    var content = document.getElementById('content');
    if (content) {
      content.style.marginLeft = this._state === 'expanded' ? '' : '0';
    }
  },

  getState: function () {
    return this._state;
  }
};


/* ================================================================
   7. Router — hash-based routing
   ================================================================ */

function getCurrentSlug() {
  var hash = location.hash;
  if (!hash || hash === '#' || hash === '#/') return null;
  var slug = hash.slice(2);
  try { return decodeURIComponent(slug); } catch (e) { return slug; }
}


/* ================================================================
   8. View — page-level composition
   ================================================================ */

function showHome() {
  Promise.all([
    Repository.getRecent(),
    Repository.getCategories(),
    Repository.getTags(),
    Repository.getSite()
  ]).then(function (results) {
    var recent = results[0];
    var categories = results[1];
    var tags = results[2];
    var site = results[3];
    renderHome('content', recent, categories, tags, site.hero);
  });
}

function showArticle(slug) {
  // Render tree immediately
  Repository.getTree().then(function (tree) {
    renderTree('sidebarTree', tree, slug);
  });

  Repository.getPage(slug).then(function (page) {
    if (page) {
      renderArticle('content', page);
    } else {
      renderEmpty('content');
    }
  }).catch(function (error) {
    console.error('Failed to load article:', error);
    renderEmpty('content');
  });
}

function handleRoute() {
  var slug = getCurrentSlug();
  if (slug) {
    Repository.getSite().then(function () {}); // preload
    showArticle(slug);
  } else {
    // Render tree for home too (no active link)
    Repository.getTree().then(function (tree) {
      renderTree('sidebarTree', tree, null);
    });
    showHome();
  }
}


/* ================================================================
   9. App — initialization
   ================================================================ */

function init() {
  // Initialize controllers
  SidebarController.init();
  SearchPalette.init();

  // Route handling
  window.addEventListener('hashchange', handleRoute);

  // Handle clicks on article__toc-link: scroll to anchor with smooth behavior
  document.addEventListener('click', function (e) {
    var target = e.target;
    if (target && target.classList.contains('article__toc-link')) {
      var href = target.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        var el = document.getElementById(href.slice(1));
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          // Update hash without triggering hashchange
          history.replaceState(null, '', href);
        }
      }
    }
  });

  // Initial load
  handleRoute();
}

document.addEventListener('DOMContentLoaded', init);
