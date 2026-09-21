# nova-site

The marketing page behind **nova.altaystudio.com**. Static HTML, CSS and a
pre-rendered AI-in-trading news digest. No API, no secrets, no backend.

Split out of [`aaltaay/Nova`](https://github.com/aaltaay/Nova) on 2026-09-20.
It has nothing to do with the trading desk, and living in that repo cost it: a
Vercel preview fired on every backend pull request, and the digest job opened a
pull request **every ten minutes**, burying real work in bot commits.

## Layout

```
site/                 what Vercel serves (Root Directory = site)
  index.html          the page
  news/               generated digest: index.html + feed.json
  assets/ shots/      images and screenshots
  vercel.json         clean URLs + security headers
tools/ai_news_*.py    the digest generator (stdlib only) and its tests
.github/workflows/    the 10-minute refresh job
```

## Deploying

Vercel builds from this repo's `site/` directory and serves
`nova.altaystudio.com`. There is no build step -- the files are shipped as they
are. A push to `main` redeploys.

## The news digest

`tools/ai_news_digest.py` fetches public RSS/Atom feeds, ranks the items
(`ai_news_rank.py`) and rewrites the homepage teaser plus `/news`. It runs on a
ten-minute cron and commits to `main` directly; the tests gate it, so a broken
ranking cannot publish. A thin fetch exits rather than overwriting a good page.

Run it locally with:

```bash
python -m pytest tools/test_ai_news*.py -q
python tools/ai_news_digest.py --limit 6 --feed-limit 60
```

## What did NOT come across

`ai_news_digest_pr.py` and its test stayed behind. They existed only to open a
pull request because Nova's branch protection refused a direct digest commit.
This repo commits straight to `main`, so that workaround is gone.
