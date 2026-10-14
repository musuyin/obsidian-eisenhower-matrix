# Obsidian Eisenhower Matrix

A local-first Obsidian task view for deciding what to do next with the Eisenhower matrix. Tasks are stored as JSON in your vault; the plugin makes no network requests.

## What it does

- Creates, edits, completes, reorders, and moves tasks across all four quadrants.
- Supports due dates, linked notes, subtasks, drag-and-drop, and inline task creation.
- Keeps completion visibility as a saved preference and displays per-quadrant and per-task progress.
- Offers English and Chinese interfaces.

## Development

Use Node.js 18 or later.

```bash
npm install
npm run dev
```

For a production build and static checks:

```bash
npm run build
npm run lint
```

## Install locally

Copy `main.js`, `manifest.json`, and `styles.css` into `<Vault>/.obsidian/plugins/obsidian-eisenhower-matrix/`, then reload Obsidian and enable the plugin under **Settings → Community plugins**.

## Task data

By default, task data is saved to `TODO/obsidian-eisenhower-matrix.json` relative to the vault root. Change the location in the plugin settings. Invalid task data is reported as an error instead of being replaced with an empty list.
