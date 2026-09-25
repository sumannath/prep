# DSA Prep

Static study site: curated problem lists (NeetCode 150 and more), problem statements from [LeetCodeDataset](https://huggingface.co/datasets/newfacade/LeetCodeDataset), lessons generated locally with OpenRouter (`z-ai/glm-5.3-flash`).

## Local

```bash
cp .env.example .env   # add OPENROUTER_API_KEY
npm install
npm run build:data
npm run generate:lessons          # skip existing; 6 parallel by default
# npm run generate:lessons -- --only two-sum --force
# any LeetCode id works, not just catalog problems:
# npm run generate:lessons -- --only 424
npm run dev                       # http://localhost:5173/#/
```

- Home (option cards): `http://localhost:5173/#/`
- See solution by LeetCode id: `http://localhost:5173/#/solve/424`
- Lists: `http://localhost:5173/#/lists`
- List (NeetCode 150): `http://localhost:5173/#/list/neetcode-150` (`?t=arrays-hashing` scrolls to a topic)
- Problem in a list: `http://localhost:5173/#/list/neetcode-150/two-sum`

Problems are stored keyed by LeetCode id (`public/data/problems.json` covers every list, `problems-index.json` maps every dataset id to its slug). If two lists share a problem, the app reads the same entry and reuses the cached lesson instead of fetching again.

Generate lessons before you expect them on the problem page. Resume anytime; existing `content/lessons/*.md` files are skipped.

## GitHub Pages (after local preview)

1. Confirm the app at localhost.
2. Commit `public/data/problems.json` and `content/lessons/` (or keep lessons private and upload `dist` yourself).
3. Push `main`. In the repo: **Settings → Pages → Source: GitHub Actions**.
4. Site: `https://<user>.github.io/prep/#/` (workflow sets Vite `base` to `/prep/`).

CI only runs `npm run build`. It does not call OpenRouter.

To hide lessons from a public repo, gitignore `content/lessons/` and `public/lessons/`, then deploy `dist` from your machine after `GITHUB_PAGES=true npm run build`.
