#!/usr/bin/env node
/**
 * ════════════════════════════════════════════════════════════
 * WebDone Co. — Static Site Build Script
 * ════════════════════════════════════════════════════════════
 *
 * WHAT THIS DOES:
 *   Takes the page files in  src/pages/  (which contain simple
 *   <!--#include header--> and <!--#include footer--> markers)
 *   and stitches in the real header/footer from src/partials/,
 *   then writes the finished, ready-to-upload files into  dist/.
 *
 * WHY:
 *   So you only ever edit the header or footer ONCE
 *   (in src/partials/header.html or src/partials/footer.html)
 *   and every page picks up the change automatically next build.
 *
 * HOW TO USE:
 *   1. Make sure Node.js is installed (node -v in your terminal —
 *      if that fails, download Node from https://nodejs.org, the
 *      "LTS" version, free, takes 2 minutes to install).
 *   2. Open a terminal in this folder (the one containing this file).
 *   3. Run:   node build.js
 *   4. Your finished site appears in the  dist/  folder.
 *   5. Upload the CONTENTS of  dist/  to Cloudflare Pages
 *      (drag the files/folders inside dist/, not the dist folder itself).
 *
 * EDITING THE HEADER OR FOOTER:
 *   - Open src/partials/header.html  → edit nav links, logo, etc.
 *   - Open src/partials/footer.html  → edit footer columns, socials, etc.
 *   - Save, run `node build.js` again, re-upload dist/. Done.
 *
 * ADDING A NEW PAGE:
 *   - Copy any file in src/pages/ as a starting point.
 *   - Keep the <!--#include header--> and <!--#include footer-->
 *     markers exactly where the old <header>...</header> and
 *     <footer>...</footer> blocks used to be.
 *   - Run `node build.js` — it picks up new files automatically.
 *
 * THE {{SERVICES_ACTIVE}} TOKEN:
 *   The header partial has one tiny piece of per-page logic: the
 *   "Services" nav item gets a highlighted/active style on the
 *   Services-related pages. This script controls that via the
 *   ACTIVE_SERVICES_PAGES list below — add a filename to that
 *   list if a new page should also highlight "Services" in the nav.
 * ════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

const SRC_PAGES_DIR = path.join(__dirname, 'src', 'pages');
const PARTIALS_DIR = path.join(__dirname, 'src', 'partials');
const TEMPLATES_DIR = path.join(__dirname, 'src', 'templates');
const CONTENT_BLOG_DIR = path.join(__dirname, 'content', 'blog');
const DIST_DIR = path.join(__dirname, 'dist');
const DIST_BLOG_DIR = path.join(DIST_DIR, 'blog');
const ASSETS_SRC_DIR = path.join(__dirname, 'assets');
const ASSETS_DIST_DIR = path.join(DIST_DIR, 'assets');
const TOOLS_SRC_DIR = path.join(__dirname, 'tools');
const TOOLS_DIST_DIR = path.join(DIST_DIR, 'tools');

const SITE_URL = 'https://webdoneco.com';

function xmlEscape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getPageSeoMeta(fileName) {
  if (fileName === 'index.html') return { loc: '/', priority: '1.0', changefreq: 'weekly' };
  if (fileName === 'services.html') return { loc: '/services.html', priority: '0.9', changefreq: 'monthly' };
  if ([
    'web-development.html',
    'wordpress-development.html',
    'shopify-development.html',
    'wix-development.html',
    'custom-development.html',
    'saas-development.html',
    'seo-services.html',
    'website-maintenance.html',
    'website-fixes.html',
    'crm-solutions.html',
    'pos-software.html',
    'online-tools.html',
    'portfolio.html',
  ].includes(fileName)) {
    return { loc: `/${fileName}`, priority: '0.8', changefreq: 'monthly' };
  }
  if (['blog.html', 'contact.html', 'about.html'].includes(fileName)) {
    return { loc: `/${fileName}`, priority: '0.7', changefreq: fileName === 'blog.html' ? 'weekly' : 'monthly' };
  }
  if (fileName === 'faq.html') return { loc: '/faq.html', priority: '0.5', changefreq: 'monthly' };
  if (['privacy.html', 'terms.html'].includes(fileName)) {
    return { loc: `/${fileName}`, priority: '0.3', changefreq: 'yearly' };
  }
  return { loc: `/${fileName}`, priority: '0.6', changefreq: 'monthly' };
}

// Pages that get built into dist/ but must NOT appear in sitemap.xml
// (utility pages Google shouldn't be pointed to).
const SITEMAP_EXCLUDE = ['404.html', 'thank-you.html'];

function generateSitemap(pageFiles, blogPosts) {
  const urls = [];
  for (const fileName of pageFiles) {
    if (SITEMAP_EXCLUDE.includes(fileName)) continue;
    const meta = getPageSeoMeta(fileName);
    urls.push({ ...meta });
  }
  for (const post of blogPosts) {
    urls.push({
      loc: `/blog/${post.slug}.html`,
      priority: '0.6',
      changefreq: 'never',
      lastmod: post.date,
    });
  }

  const body = urls
    .map((u) => {
      const lastmod = u.lastmod ? `\n    <lastmod>${xmlEscape(u.lastmod)}</lastmod>` : '';
      return `  <url>\n    <loc>${xmlEscape(SITE_URL + u.loc)}</loc>${lastmod}\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function generateRobotsTxt() {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}

// Pages where the "Services" nav item should show as active/highlighted.
// Add filenames here as you build more service pages.
const ACTIVE_SERVICES_PAGES = [
  'services.html',
  'web-development.html',
  'wordpress-development.html',
  'shopify-development.html',
  'wix-development.html',
  'custom-development.html',
  'saas-development.html',
  'seo-services.html',
  'website-maintenance.html',
  'website-fixes.html',
  'crm-solutions.html',
  'pos-software.html',
  'online-tools.html',
];

function log(msg) {
  console.log(msg);
}

function readPartial(name) {
  const filePath = path.join(PARTIALS_DIR, name);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing partial: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function emptyDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

/* ════════════════════════════════════════════════════════════
   BLOG ENGINE — frontmatter parsing + Markdown → HTML conversion
   ════════════════════════════════════════════════════════════
   This is a small, dependency-free Markdown parser. It supports
   everything a typical blog post needs (headings, paragraphs,
   bold/italic, links, lists, blockquotes, code, images, horizontal
   rules) without requiring `npm install` of anything. It is not a
   full CommonMark implementation — it's intentionally just enough
   for writing blog content.
   ════════════════════════════════════════════════════════════ */

// Parses the --- frontmatter --- block at the top of a .md file.
// Returns { data: {...}, body: 'remaining markdown content' }
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { data: {}, body: raw };
  }
  const [, frontmatterBlock, body] = match;
  const data = {};
  for (const line of frontmatterBlock.split(/\r?\n/)) {
    const lineMatch = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (lineMatch) {
      let [, key, value] = lineMatch;
      value = value.trim();
      // strip optional surrounding quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      data[key] = value;
    }
  }
  return { data, body };
}

// Escapes HTML special characters in plain text segments.
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Handles inline markdown: **bold**, *italic*, `code`, [text](url), images.
// Operates on a single line/segment of already-not-HTML-escaped text.
function renderInline(text) {
  // Images: ![alt](src) — must run before links since syntax overlaps
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt, src) => {
    const isExternal = /^https?:\/\//.test(src);
    let finalSrc = src;
    if (!isExternal && !src.startsWith('/')) {
      finalSrc = '/' + src;
    }
    return `<img src="${escapeHtml(finalSrc)}" alt="${escapeHtml(alt)}" loading="lazy"/>`;
  });
  // Links: [text](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, label, url) => {
    const isExternal = /^https?:\/\//.test(url) || url.startsWith('mailto:') || url.startsWith('tel:');
    // Auto-correct internal links like "contact.html" or "services.html" to
    // root-relative "/contact.html" so they work correctly from blog posts,
    // which live one folder deeper (/blog/post-name.html) than the site root.
    // Writers can just write [text](contact.html) naturally in Markdown —
    // no need to remember to add the leading slash.
    let href = url;
    if (!isExternal && !url.startsWith('/') && !url.startsWith('#')) {
      href = '/' + url;
    }
    const attrs = isExternal ? ' target="_blank" rel="noopener"' : '';
    return `<a href="${escapeHtml(href)}"${attrs}>${escapeHtml(label)}</a>`;
  });
  // Inline code: `code`
  text = text.replace(/`([^`]+)`/g, (m, code) => `<code>${escapeHtml(code)}</code>`);
  // Bold: **text** or __text__
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  // Italic: *text* or _text_
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  text = text.replace(/(?<![a-zA-Z0-9])_([^_]+)_(?![a-zA-Z0-9])/g, '<em>$1</em>');
  return text;
}

// Slugifies a heading's text into a usable id="" anchor.
function slugifyHeading(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// Converts a full Markdown document body into HTML, and also returns
// a table-of-contents array of { level, text, id } for h2/h3 headings.
function markdownToHtml(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const htmlParts = [];
  const toc = [];

  let i = 0;
  let inCodeBlock = false;
  let codeBlockLines = [];
  let listBuffer = [];
  let listType = null; // 'ul' | 'ol'

  function flushList() {
    if (listBuffer.length === 0) return;
    const tag = listType === 'ol' ? 'ol' : 'ul';
    htmlParts.push(`<${tag}>`);
    for (const item of listBuffer) {
      htmlParts.push(`<li>${renderInline(escapeHtml(item))}</li>`);
    }
    htmlParts.push(`</${tag}>`);
    listBuffer = [];
    listType = null;
  }

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code blocks: ```
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        flushList();
        inCodeBlock = true;
        codeBlockLines = [];
      } else {
        inCodeBlock = false;
        htmlParts.push(`<pre><code>${escapeHtml(codeBlockLines.join('\n'))}</code></pre>`);
      }
      i++;
      continue;
    }
    if (inCodeBlock) {
      codeBlockLines.push(line);
      i++;
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      flushList();
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
      flushList();
      htmlParts.push('<hr/>');
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      const id = slugifyHeading(text);
      const tag = `h${Math.min(level, 6)}`;
      htmlParts.push(`<${tag} id="${id}">${renderInline(escapeHtml(text))}</${tag}>`);
      if (level === 2 || level === 3) {
        toc.push({ level, text, id });
      }
      i++;
      continue;
    }

    // Blockquote
    if (line.trim().startsWith('>')) {
      flushList();
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      htmlParts.push(`<blockquote><p>${renderInline(escapeHtml(quoteLines.join(' ')))}</p></blockquote>`);
      continue;
    }

    // Unordered list item
    const ulMatch = line.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      if (listType && listType !== 'ul') flushList();
      listType = 'ul';
      listBuffer.push(ulMatch[1]);
      i++;
      continue;
    }

    // Ordered list item
    const olMatch = line.match(/^\d+\.\s+(.*)$/);
    if (olMatch) {
      if (listType && listType !== 'ol') flushList();
      listType = 'ol';
      listBuffer.push(olMatch[1]);
      i++;
      continue;
    }

    // Default: paragraph (collect contiguous non-blank lines)
    flushList();
    const paraLines = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !lines[i].trim().startsWith('>') &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith('```') &&
      !/^---+$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    htmlParts.push(`<p>${renderInline(escapeHtml(paraLines.join(' ')))}</p>`);
  }

  flushList();

  return { html: htmlParts.join('\n'), toc };
}

// Formats a YYYY-MM-DD date string into a human-readable display date.
function formatDisplayDate(isoDate) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  return `${months[m - 1]} ${d}, ${y}`;
}

// Builds initials from an author name, e.g. "WebDone Co. Team" -> "WT"
function getInitials(name) {
  const words = name.replace(/\./g, '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'WD';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// Reads every .md file in content/blog/, parses frontmatter + markdown,
// and returns an array of post objects sorted newest-first.
function readAllBlogPosts() {
  if (!fs.existsSync(CONTENT_BLOG_DIR)) return [];

  const files = fs
    .readdirSync(CONTENT_BLOG_DIR)
    .filter((f) => f.toLowerCase().endsWith('.md'));

  const posts = [];

  for (const fileName of files) {
    const raw = fs.readFileSync(path.join(CONTENT_BLOG_DIR, fileName), 'utf8');
    const { data, body } = parseFrontmatter(raw);

    const required = ['title', 'slug', 'date'];
    const missing = required.filter((k) => !data[k]);
    if (missing.length > 0) {
      log(`  ⚠ ${fileName}: missing required frontmatter field(s): ${missing.join(', ')} — skipped`);
      continue;
    }

    const { html: contentHtml, toc } = markdownToHtml(body);

    posts.push({
      sourceFile: fileName,
      title: data.title,
      slug: data.slug,
      date: data.date, // YYYY-MM-DD
      author: data.author || 'WebDone Co. Team',
      category: data.category || 'General',
      excerpt: data.excerpt || '',
      image: (data.image || 'assets/images/blog-default.jpg').replace(/^\/+/, ''),
      readTime: data.readTime || '5 min read',
      contentHtml,
      toc,
    });
  }

  // Newest first
  posts.sort((a, b) => (a.date < b.date ? 1 : -1));
  return posts;
}

function build() {
  log('\n🔨 WebDone Co. — building site...\n');

  if (!fs.existsSync(SRC_PAGES_DIR)) {
    throw new Error(`Could not find ${SRC_PAGES_DIR}. Run this script from the project root.`);
  }

  // 1. Load partials
  const headerTemplate = readPartial('header.html');
  const footerTemplate = readPartial('footer.html');
  const faviconTemplate = readPartial('favicon.html');
  log(`✔ Loaded header.html (${headerTemplate.length} chars)`);
  log(`✔ Loaded footer.html (${footerTemplate.length} chars)`);
  log(`✔ Loaded favicon.html (${faviconTemplate.length} chars)`);

  // 2. Reset dist/
  emptyDir(DIST_DIR);
  log(`✔ Cleared dist/`);

  // 3. Read all blog posts up front (needed to populate blog.html's grid)
  const blogPosts = readAllBlogPosts();
  if (blogPosts.length > 0) {
    log(`✔ Found ${blogPosts.length} blog post(s) in content/blog/`);
  }

  // Build the HTML for blog post cards used on the blog.html listing page.
  function buildBlogCardsHtml(posts) {
    if (posts.length === 0) {
      return '      <div class="blog-empty">No blog posts yet — check back soon.</div>';
    }
    return posts
      .map((post, index) => {
        const isFeatured = index === 0;
        const categorySlug = post.category.toLowerCase().replace(/\s+/g, '-');
        const featuredTagHtml = isFeatured
          ? `<div class="blog-featured-tag"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Latest Post</div>`
          : '';
        return `      <a href="/blog/${post.slug}.html" class="blog-card${isFeatured ? ' featured' : ''}" data-category="${escapeHtml(categorySlug)}">
        <div class="blog-thumb">
          <img src="/${post.image}" alt="${escapeHtml(post.title)}" loading="lazy"/>
          <span class="blog-cat-tag">${escapeHtml(post.category)}</span>
        </div>
        <div class="blog-info">
          ${featuredTagHtml}
          <div class="blog-meta-row">
            <span>${formatDisplayDate(post.date)}</span>
            <span class="blog-meta-dot"></span>
            <span>${escapeHtml(post.readTime)}</span>
          </div>
          <h3>${escapeHtml(post.title)}</h3>
          <p>${escapeHtml(post.excerpt)}</p>
          <span class="blog-read-more">Read Article <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span>
        </div>
      </a>`;
      })
      .join('\n');
  }

  // Build the category filter pill buttons from the unique categories in use.
  function buildBlogCategoriesHtml(posts) {
    const categories = [...new Set(posts.map((p) => p.category))];
    return categories
      .map((cat) => {
        const slug = cat.toLowerCase().replace(/\s+/g, '-');
        return `      <button class="blog-filter-pill" data-filter="${escapeHtml(slug)}">${escapeHtml(cat)}</button>`;
      })
      .join('\n');
  }

  // 4. Process every .html page in src/pages/
  const pageFiles = fs
    .readdirSync(SRC_PAGES_DIR)
    .filter((f) => f.toLowerCase().endsWith('.html'));

  if (pageFiles.length === 0) {
    log('⚠ No .html files found in src/pages/ — nothing to build.');
  }

  let builtCount = 0;
  for (const fileName of pageFiles) {
    const srcPath = path.join(SRC_PAGES_DIR, fileName);
    let html = fs.readFileSync(srcPath, 'utf8');

    const servicesActive = ACTIVE_SERVICES_PAGES.includes(fileName) ? ' active' : '';
    const header = headerTemplate.replace(/{{SERVICES_ACTIVE}}/g, servicesActive);
    // Footer partial has a trailing blank line in the source file; trim it
    // back to a single newline so the build output matches hand-written spacing.
    const footer = footerTemplate.replace(/\s+$/, '\n');

    const beforeHeader = html.includes('<!--#include header-->');
    const beforeFooter = html.includes('<!--#include footer-->');
    const beforeFavicon = html.includes('<!--#include favicon-->');

    html = html.replace('<!--#include header-->', header);
    html = html.replace('<!--#include footer-->', footer);
    html = html.replace('<!--#include favicon-->', faviconTemplate.replace(/\s+$/, ''));

    // blog.html gets its post grid and category filters auto-injected here.
    if (fileName === 'blog.html') {
      html = html.replace('<!--#include blog-posts-->', buildBlogCardsHtml(blogPosts));
      html = html.replace('<!--#include blog-categories-->', buildBlogCategoriesHtml(blogPosts));
    }

    if (!beforeHeader) log(`  ⚠ ${fileName}: no <!--#include header--> marker found`);
    if (!beforeFooter) log(`  ⚠ ${fileName}: no <!--#include footer--> marker found`);
    if (!beforeFavicon) log(`  ⚠ ${fileName}: no <!--#include favicon--> marker found`);

    const outPath = path.join(DIST_DIR, fileName);
    fs.writeFileSync(outPath, html, 'utf8');
    log(`✔ Built ${fileName}`);
    builtCount++;
  }

  // 5. Build individual blog post pages from content/blog/*.md
  let blogBuiltCount = 0;

  if (blogPosts.length > 0) {
    const blogPostTemplatePath = path.join(TEMPLATES_DIR, 'blog-post.html');
    if (!fs.existsSync(blogPostTemplatePath)) {
      log(`⚠ Found ${blogPosts.length} blog post(s) but src/templates/blog-post.html is missing — skipping blog build.`);
    } else {
      const postTemplate = fs.readFileSync(blogPostTemplatePath, 'utf8');
      fs.mkdirSync(DIST_BLOG_DIR, { recursive: true });

      const footerCss = ''; // footer styling lives in the shared <style> already; placeholder kept for future use

      for (const post of blogPosts) {
        const servicesActive = ''; // blog is not a "Services" page
        const header = headerTemplate.replace(/{{SERVICES_ACTIVE}}/g, servicesActive);
        const footer = footerTemplate.replace(/\s+$/, '\n');

        // Related posts: up to 3 other posts, preferring same category
        const others = blogPosts.filter((p) => p.slug !== post.slug);
        const sameCategory = others.filter((p) => p.category === post.category);
        const relatedPool = sameCategory.length >= 3 ? sameCategory : others;
        const related = relatedPool.slice(0, 3);

        const relatedHtml = related
          .map(
            (r) => `      <a href="/blog/${r.slug}.html" class="related-card">
        <div class="related-thumb"><img src="/${r.image}" alt="${escapeHtml(r.title)}" loading="lazy"/></div>
        <div class="related-info">
          <div class="related-cat">${escapeHtml(r.category)}</div>
          <h4>${escapeHtml(r.title)}</h4>
        </div>
      </a>`
          )
          .join('\n');

        const tocHtml = post.toc.length
          ? post.toc.map((t) => `            <a href="#${t.id}">${escapeHtml(t.text)}</a>`).join('\n')
          : '            <a href="#postH">Introduction</a>';

        let html = postTemplate;
        html = html.replace(/{{TITLE}}/g, escapeHtml(post.title));
        html = html.replace(/{{SLUG}}/g, post.slug);
        html = html.replace(/{{EXCERPT}}/g, escapeHtml(post.excerpt));
        html = html.replace(/{{AUTHOR}}/g, escapeHtml(post.author));
        html = html.replace(/{{AUTHOR_INITIALS}}/g, getInitials(post.author));
        html = html.replace(/{{CATEGORY}}/g, escapeHtml(post.category));
        html = html.replace(/{{IMAGE}}/g, post.image);
        html = html.replace(/{{IMAGE_PATH}}/g, '/' + post.image);
        html = html.replace(/{{DATE_ISO}}/g, post.date);
        html = html.replace(/{{DATE_DISPLAY}}/g, formatDisplayDate(post.date));
        html = html.replace(/{{READ_TIME}}/g, escapeHtml(post.readTime));
        html = html.replace(/{{SHARE_TITLE_ENCODED}}/g, encodeURIComponent(post.title));
        html = html.replace('{{CONTENT_HTML}}', post.contentHtml);
        html = html.replace('{{TOC_HTML}}', tocHtml);
        html = html.replace('{{RELATED_POSTS_HTML}}', relatedHtml);
        html = html.replace('{{FOOTER_CSS}}', footerCss);

        html = html.replace('<!--#include header-->', header);
        html = html.replace('<!--#include footer-->', footer);
        html = html.replace('<!--#include favicon-->', faviconTemplate.replace(/\s+$/, ''));

        const outPath = path.join(DIST_BLOG_DIR, `${post.slug}.html`);
        fs.writeFileSync(outPath, html, 'utf8');
        log(`✔ Built blog/${post.slug}.html`);
        blogBuiltCount++;
      }
    }
  } else {
    log('  (no blog posts found in content/blog/ — skipping blog post generation)');
  }

  // 6. Copy assets/ as-is
  copyDirRecursive(ASSETS_SRC_DIR, ASSETS_DIST_DIR);
  log(`✔ Copied assets/`);

  // 6b. Copy root tools/ → dist/tools/ (standalone HTML tools for Cloudflare Pages)
  if (fs.existsSync(TOOLS_SRC_DIR)) {
    fs.mkdirSync(TOOLS_DIST_DIR, { recursive: true });
    const toolFiles = fs.readdirSync(TOOLS_SRC_DIR).filter(f => f.toLowerCase().endsWith('.html'));
    for (const fileName of toolFiles) {
      fs.copyFileSync(path.join(TOOLS_SRC_DIR, fileName), path.join(TOOLS_DIST_DIR, fileName));
      log(`✔ Copied tools/${fileName}`);
    }
  }

  // 7. Copy root favicon if present, then generate fresh robots.txt + sitemap.xml.
  const faviconPath = path.join(__dirname, 'favicon.ico');
  if (fs.existsSync(faviconPath)) {
    fs.copyFileSync(faviconPath, path.join(DIST_DIR, 'favicon.ico'));
    log('✔ Copied favicon.ico');
  }

  fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), generateRobotsTxt(), 'utf8');
  log('✔ Generated robots.txt');

  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), generateSitemap(pageFiles, blogPosts), 'utf8');
  log('✔ Generated sitemap.xml');

  // llms.txt — fixes PageSpeed Agentic Browsing warning (requires H1 + links)
  const llmsTxt = [
    '# WebDone Co. — Premium Web Development Agency',
    '',
    '> Premium web development, SEO & SaaS agency. 80+ clients. 20+ countries. Founded 2017.',
    '',
    '## Services',
    '',
    '- [WordPress Development](/wordpress-development.html)',
    '- [Shopify Development](/shopify-development.html)',
    '- [Custom Development](/custom-development.html)',
    '- [SaaS Development](/saas-development.html)',
    '- [SEO Services](/seo-services.html)',
    '- [Website Maintenance](/website-maintenance.html)',
    '- [Website Fixes](/website-fixes.html)',
    '- [Portfolio](/portfolio.html)',
    '- [Contact](/contact.html)',
    '',
    '## Company',
    '',
    '- Email: hello@webdoneco.com',
    '- WhatsApp: +92 311 4005856',
    '- Rating: 4.9 stars from 80 clients across 20 countries',
    '- Fixed-price quotes. 60-day free support. Full code ownership.',
  ].join('\n');
  fs.writeFileSync(path.join(DIST_DIR, 'llms.txt'), llmsTxt, 'utf8');
  log('\u2714 Generated llms.txt');

  // _headers — Cloudflare Pages cache control for HTML + assets
  const headersContent = [
    '/*',
    '  X-Content-Type-Options: nosniff',
    '  X-Frame-Options: DENY',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '',
    '/assets/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    '/*.html',
    '  Cache-Control: public, max-age=3600, stale-while-revalidate=86400',
  ].join('\n');
  fs.writeFileSync(path.join(DIST_DIR, '_headers'), headersContent, 'utf8');
  log('\u2714 Generated _headers (Cloudflare cache)');

  log(`\n✅ Build complete — ${builtCount} page(s) + ${blogBuiltCount} blog post(s) written to dist/\n`);
  log('Next step: upload the CONTENTS of the dist/ folder to Cloudflare Pages.\n');
}

build();
