# DSA Prep (NeetCode 150)

Static study site: topic clusters, problem statements from [LeetCodeDataset](https://huggingface.co/datasets/newfacade/LeetCodeDataset), lessons generated locally with OpenRouter (`z-ai/glm-5.3-flash`).

## Local

```bash
cp .env.example .env   # add OPENROUTER_API_KEY
npm install
npm run build:data
npm run generate:lessons          # skip existing; 6 parallel by default
# npm run generate:lessons -- --only two-sum --force
npm run dev                       # http://localhost:5173/#/
```

- Home: `http://localhost:5173/#/`
- Topic: `http://localhost:5173/#/topic/arrays-hashing`
- Problem: `http://localhost:5173/#/problem/two-sum`

Generate lessons before you expect them on the problem page. Resume anytime; existing `content/lessons/*.md` files are skipped.

## GitHub Pages (after local preview)

1. Confirm the app at localhost.
2. Commit `public/data/problems.json` and `content/lessons/` (or keep lessons private and upload `dist` yourself).
3. Push `main`. In the repo: **Settings → Pages → Source: GitHub Actions**.
4. Site: `https://<user>.github.io/prep/#/` (workflow sets Vite `base` to `/prep/`).

CI only runs `npm run build`. It does not call OpenRouter.

To hide lessons from a public repo, gitignore `content/lessons/` and `public/lessons/`, then deploy `dist` from your machine after `GITHUB_PAGES=true npm run build`.
