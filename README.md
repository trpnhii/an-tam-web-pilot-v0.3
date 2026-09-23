# An Tam Web Pilot v0.3

Static web pilot for "An Tam", a Vietnamese browser-based safety checklist that helps users pause, review, verify, and ask a trusted person before acting on suspicious requests.

## Run locally

Open `index.html` directly in a browser.

For a local static server:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Deploy

This project is a static site. It can be deployed from the repository root on GitHub Pages, Netlify, Vercel, Cloudflare Pages, or any static host.

For GitHub Pages:

1. Push this repository to GitHub.
2. Open repository `Settings` -> `Pages`.
3. Set source to `Deploy from a branch`.
4. Choose branch `main` and folder `/root`.

