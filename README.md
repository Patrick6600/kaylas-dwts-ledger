# Kayla’s DWTS Ledger

A season tracker for *Dancing with the Stars* — Season 35. Replaces the weekly
spreadsheet with something that adds up the judges' scores for you, keeps every
note, and draws the season as it happens.

Everything lives in the browser. No account, no login, no server.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173/kaylas-dwts-ledger/
```

## Deploying to GitHub Pages

The Vite `base` defaults to `/kaylas-dwts-ledger/`, which is what a GitHub **project**
site needs (`https://<user>.github.io/<repo>/`).

```bash
git init && git add -A && git commit -m "Kayla's DWTS Ledger"
git remote add origin https://github.com/<user>/kaylas-dwts-ledger.git
git push -u origin main

npm run deploy   # builds, then pushes dist/ to the gh-pages branch
```

Then in the repo: **Settings → Pages → Source: `gh-pages` branch**.

If the repo has a different name, build with a matching base path:

```bash
VITE_BASE=/my-repo-name/ npm run build
```

For a user site (`<user>.github.io`), use `VITE_BASE=/`.

## The screens

| | |
|---|---|
| **Entry** | The week's theme at the top, then one card per couple. Judge Total adds itself up live as scores go in; My Score is typed in. The week's standings sit alongside and re-sort as you type. Couples are marked eliminated from here. |
| **Board** | Cumulative Judge Total and My Score for the season, sortable by either column. Eliminated couples stay in the list, greyed out. Tap a row to read that couple's notes across every week, each tagged with its week theme. |
| **Trends** | One couple's two scores over the season, or several couples overlaid. |
| **Dances** | Search the whole season by dance style, song, artist or week theme. |
| **Backup** | Export the season to a JSON file and restore from one. |

### About the Trends axis

Judge Total runs to 30, or 40 with a guest judge, and My Score to 10. Plotted
raw on one axis, My Score flattens into the floor and the comparison is
worthless — and a second y-axis is worse.

So **Indexed** (the default) shows each score as a share of the week's highest:
100% means nobody scored higher that week. Both land on one honest axis, and the
gap between the lines *is* the disagreement between the judges and Kayla.
**Raw** shows the recorded numbers in two stacked panels, each with its own
scale.

Chart colours were validated for colour-blind separation and contrast against the
app's dark surface rather than picked by eye.

## Where the data lives

IndexedDB, in that one browser on that one device. Clearing site data deletes the
season — hence the export button. Take a backup after each episode.

Every read and write goes through `useSeasonData()`, which is the only thing that
touches `src/data/storage.js`. Moving the season to Firestore later means writing
a second module with the same six methods (`loadAll`, `putCouples`, `putEntries`,
`deleteEntries`, `putSettings`, `replaceAll`) and changing one import — no UI
component knows where the data comes from.

```
src/
  data/
    roster.js      Season 35 cast, judges, dance-style suggestions
    schema.js      Entry shape, sanitising, derived judge totals
    selectors.js   Every computed season number (cumulatives, standings, trends)
    storage.js     IndexedDB backend — the swappable layer
  hooks/
    useSeasonData.js   The single data-access layer
  components/    One file per screen, plus shared UI
  styles/app.css Design tokens and every rule
```

## Notes

- **Judge Total** is always recomputed from the individual scores — including on
  import, so a hand-edited backup file cannot put a wrong total in.
- An entry you blank out completely is removed rather than stored empty, so the
  backup file stays clean.
- Adding a guest judge opens a 4th score slot and the total becomes out of 40.
- Anything that destroys data (clearing a week, importing over the season,
  resetting) asks first.
- The season is 12 weeks by default; **+ Add** on the week strip extends it.
