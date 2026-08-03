# TrackFree.me

TrackFree.me is a privacy-information tool that summarizes publicly available app privacy policies, links to primary sources, and offers data-rights guidance. It is educational information—not legal advice.

## What changed

- One Express application now serves the site and API; the old duplicate Flask backend and dataset were removed.
- The app catalogue has a data-quality check that rejects duplicate names, invalid scores, missing fields, and non-HTTPS sources.
- Search supports partial names and common aliases. Results include official sources.
- Chat is same-origin, rate limited, size limited, and rendered as text to prevent XSS. The optional AI fallback has a constrained privacy-only prompt and timeout.
- The site has a privacy policy, terms, scoring methodology, security headers, accessibility improvements, automated tests, and CI.

## Run locally

```bash
cp .env.example .env
npm install
npm run build
npm start
```

Open `http://localhost:3001`. The catalogue works without any API key. Add `MISTRAL_API_KEY` only to enable AI answers for apps absent from the reviewed catalogue.

## Development and checks

```bash
npm run dev
npm run validate:data
npm test
```

`npm run build` validates `apps.json` and compiles the local Tailwind CSS. Never commit `.env` files or expose AI keys to the browser.

## Updating the catalogue

Every app record requires `name`, `data_collected`, `shared_or_sold`, `risk_score`, `score_count`, `opt_out_or_delete`, and official HTTPS `sources`. Use only primary sources, record the review date when verified, and explain score changes in the pull request. See [methodology.html](methodology.html) for the scoring guide.

## Deployment

The project is configured for Render via `render.yaml`. Set `MISTRAL_API_KEY` only in the host’s encrypted environment settings. The health endpoint is `/api/health`.

## Privacy Journal and editor workflow

The blog uses PostgreSQL. Configure `DATABASE_URL`, then run `npm run db:migrate`.

Set a strong `ADMIN_API_TOKEN` in the environment, open `/admin.html`, and enter it to access the editorial desk. Posts move through `draft`, `in_review`, and `published`; only published posts appear in `/blog.html`. Articles in review or published posts require at least one HTTPS source.

## Licence

MIT. See [LICENSE](LICENSE).
