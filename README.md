# WebDone Co. — Website Build System

This folder lets you edit the header and footer **once** and have it
update across every page automatically — instead of editing 17 files
by hand every time you change a nav link or a phone number.

## Folder map

```
webdoneco-build/
├── build.js                   ← the script that does the work
├── package.json
├── content/
│   └── blog/                  ← WRITE YOUR BLOG POSTS HERE (.md files)
├── src/
│   ├── partials/
│   │   ├── header.html        ← EDIT THIS to change the header/nav
│   │   └── footer.html        ← EDIT THIS to change the footer
│   ├── templates/
│   │   └── blog-post.html     ← the design template every blog post uses
│   └── pages/
│       ├── index.html         ← page content (header/footer auto-injected)
│       ├── services.html
│       ├── web-development.html
│       ├── wordpress-development.html
│       ├── blog.html          ← the blog LISTING page (auto-fills with posts)
│       └── contact.html
├── assets/
│   └── images/                ← logo, portfolio images, blog images, favicon, etc.
└── dist/                      ← OUTPUT — this is what you upload, generated
                                  fresh every time you run the build
    └── blog/                  ← each blog post gets its own page here automatically
```

## One-time setup

You need **Node.js** installed (free, takes 2 minutes):

1. Go to **https://nodejs.org**
2. Download the **LTS** version for your operating system
3. Install it like any normal program (click Next, Next, Finish)
4. To confirm it worked, open a terminal / command prompt and type:
   ```
   node -v
   ```
   If it prints something like `v20.11.0`, you're good.

## Day-to-day usage

### To change the header or footer (nav links, phone number, social links, etc.)

1. Open `src/partials/header.html` or `src/partials/footer.html` in any text editor
2. Make your change, save the file
3. Open a terminal in this `webdoneco-build` folder
4. Run:
   ```
   node build.js
   ```
5. Open the `dist/` folder — every page now has your updated header/footer
6. Upload the **contents** of `dist/` to Cloudflare Pages (drag the files
   inside `dist/`, not the `dist` folder itself)

That's it. One edit, one command, every page updates.

### To add a brand new page

1. Copy any existing file from `src/pages/` as a starting point
   (e.g. duplicate `services.html` and rename it `seo-services.html`)
2. Edit the content, but **keep these two lines exactly where the old
   `<header>...</header>` and `<footer>...</footer>` blocks used to be**:
   ```html
   <!--#include header-->
   <!--#include footer-->
   ```
3. If the new page is a "Services" sub-page and should highlight
   **Services** in the nav menu, open `build.js` and add the filename
   to the `ACTIVE_SERVICES_PAGES` list near the top.
4. Run `node build.js`
5. Your new page now appears in `dist/`, fully built with header/footer

### To update images, logo, or favicon

Just drop files into `assets/images/` (or the `assets/` root for things
like `favicon.ico`). Run `node build.js` — the whole `assets/` folder
gets copied into `dist/` automatically, no extra steps needed.

## Writing and publishing a blog post

This is the part you'll use most often, so here's the full walkthrough.

### Step 1 — Create a new file

Go to `content/blog/` and create a new file ending in `.md` (Markdown).
The filename itself doesn't matter much — use something readable like
`my-new-post-title.md`. Copy an existing post in that folder as a
starting point if that's easier than starting blank.

### Step 2 — Fill in the top section (the "frontmatter")

Every post file starts with a block like this, between two `---` lines:

```
---
title: Your Post Title Goes Here
slug: your-post-title-goes-here
date: 2026-06-21
author: WebDone Co. Team
category: Web Design
excerpt: A one or two sentence summary shown on the blog listing page and used for SEO/social sharing.
image: assets/images/blog-my-post-image.jpg
readTime: 5 min read
---
```

What each field means:

| Field | What it's for | Required? |
|---|---|---|
| `title` | The headline of your post | Yes |
| `slug` | The web address — keep it short, lowercase, hyphens only, no spaces | Yes |
| `date` | Publish date, format `YYYY-MM-DD` | Yes |
| `author` | Defaults to "WebDone Co. Team" if left out | No |
| `category` | Used for the filter pills on the blog page (e.g. "Web Design", "SEO", "E-Commerce") | No |
| `excerpt` | Short summary — shows on the blog listing card and in Google search results | No (but strongly recommended) |
| `image` | Path to a cover image, must already exist in `assets/images/` | No (falls back to a default) |
| `readTime` | Just a display label like "5 min read" — not auto-calculated | No |

**Important about `slug`:** this becomes the actual web address of your
post, e.g. `slug: my-post` becomes `webdoneco.com/blog/my-post.html`.
Once a post is live and shared/indexed by Google, avoid changing the
slug later — it would break that URL.

### Step 3 — Write the post body

Below the second `---`, just write normally using Markdown — it's
close to plain text:

```
## This becomes a heading

Regular paragraphs just look like regular text.

**This text is bold.** *This text is italic.*

- This is a bullet point
- So is this

1. This is a numbered list
2. So is this

[This is a link](https://example.com)
[This links to another page on your site](contact.html)

![Image description](assets/images/some-image.jpg)
```

A few notes:
- Use `##` for section headings (not `#` — that's reserved for the
  page title, which comes from the `title` field above)
- Internal links like `[text](contact.html)` work fine written
  naturally — the build script automatically fixes the path so it
  works correctly from inside `/blog/`
- Every `##` heading automatically appears in the "On This Page" table
  of contents sidebar

### Step 4 — Build and check it

Run `node build.js` in the terminal. You'll see something like:

```
✔ Found 3 blog post(s) in content/blog/
✔ Built blog.html
...
✔ Built blog/my-post-title.html
```

Your new post is now in `dist/blog/your-slug.html`, and it has
automatically been added to the blog listing page (`dist/blog.html`)
— newest post first, with a "Latest Post" badge on whichever one is
newest.

### Step 5 — Upload

Same as any other update — upload the contents of `dist/` to Cloudflare
Pages. Your new post is live.

### Common mistakes to avoid

- **Forgetting `title`, `slug`, or `date`** — the build script will skip
  the post and print a warning telling you exactly which field is
  missing, rather than silently breaking the build.
- **Using the same `slug` twice** — each post needs a unique slug, or
  one will overwrite the other's output file.
- **Referencing an image that doesn't exist** — the build won't error,
  but the image will show as broken on the live site. Double-check the
  filename matches exactly what's in `assets/images/` (case-sensitive).

## Deploying to Cloudflare Pages

1. Run `node build.js` to get a fresh `dist/` folder
2. Go to your Cloudflare Pages project
3. Either:
   - **Drag-and-drop**: open the `dist/` folder, select everything
     inside it, drag into Cloudflare's upload box, OR
   - **Re-deploy**: if you connected a GitHub repo instead, just commit
     and push — Cloudflare rebuilds automatically (see note below)

## Optional: fully automatic deploys (no manual upload, ever)

If you put this whole `webdoneco-build` folder into a GitHub repository
and connect that repo to Cloudflare Pages, you can set the **Build
command** to `node build.js` and the **Build output directory** to
`dist`. Then every time you push a change to GitHub, Cloudflare runs
the build and deploys automatically — no drag-and-drop needed at all.
This is the recommended long-term setup once you're comfortable with
the basics above.

## Troubleshooting

**"node: command not found"**
→ Node.js isn't installed yet. See "One-time setup" above.

**A page didn't get a header/footer after building**
→ Open that page's file in `src/pages/` and check it still has the
  `<!--#include header-->` and `<!--#include footer-->` lines somewhere
  in it. The build script will print a warning in the terminal if a
  page is missing either marker.

**I want the old way back (one giant file per page, no build step)**
→ Just use the files in `dist/` directly going forward — they're
  complete, standalone HTML files, identical to what you had before.
  You only need to run `node build.js` when you've changed something
  in `src/partials/` or `src/pages/`.

**My blog post didn't show up after building**
→ Check the terminal output from `node build.js` for a warning line —
  it will tell you if a required frontmatter field (`title`, `slug`,
  or `date`) is missing from your `.md` file.

**My blog post's image is broken / not showing**
→ Make sure the `image:` path in the frontmatter exactly matches a
  real file in `assets/images/` (check spelling and capitalization),
  and that you ran `node build.js` again after adding the image file.

**I edited a blog post but the live site still shows the old version**
→ You need to run `node build.js` again after every edit to a `.md`
  file, then re-upload `dist/` to Cloudflare — editing the `.md` file
  alone doesn't update the live site by itself.
