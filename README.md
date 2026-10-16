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
npm run validate:release
npm run build
npm run lint
```

## Install locally

Copy `main.js`, `manifest.json`, and `styles.css` into `<Vault>/.obsidian/plugins/obsidian-eisenhower-matrix/`, then reload Obsidian and enable the plugin under **Settings → Community plugins**.

## Task data

By default, task data is saved to `TODO/obsidian-eisenhower-matrix.json` relative to the vault root. Change the location in the plugin settings. Invalid task data is reported as an error instead of being replaced with an empty list.

## Release

The GitHub Actions workflows validate every push and pull request with Node.js 22. They install dependencies with `npm ci`, validate release metadata, build the plugin, and lint the source.

To publish a GitHub release, use a clean `main` branch and follow these steps:

1. Set the next Semantic Version in `package.json`.
2. Run `npm version <version> --no-git-tag-version`. This updates `package.json`, `package-lock.json`, `manifest.json`, and `versions.json` through the project's version script.
3. Run `npm run validate:release && npm run build && npm run lint`.
4. Commit the version files and merge or push the release commit to `main`. From a clean local `main` that exactly matches `origin/main`, create and push the exact matching tag (for example, `0.1.0`; do not prefix it with `v`):

   ```bash
   npm run release:tag -- 0.1.0
   ```

   Without a tag, the command prints the release tags already on `origin` and refuses to make changes:

   ```bash
   npm run release:tag
   ```

Pushing that tag runs the release workflow. It verifies the tag matches both package and manifest versions, builds the plugin, and creates a GitHub Release containing `main.js`, `manifest.json`, and `styles.css`.

### Submit to the Obsidian community plugin directory

After the first GitHub Release is public, open a pull request against [`obsidianmd/obsidian-releases`](https://github.com/obsidianmd/obsidian-releases) that adds this repository to `community-plugins.json`. The entry must use the stable plugin ID `obsidian-eisenhower-matrix`, the repository `musuyin/obsidian-eisenhower-matrix`, and accurate author, name, and description metadata. Review Obsidian's [developer policies](https://docs.obsidian.md/Developer+policies) and [plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines) before submitting.
