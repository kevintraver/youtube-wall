# youtube-wall

A customizable wall of YouTube live streams. Paste links into a grid (3×3 to start), switch between layouts with a main tile, and keep an eye on many streams at once.

It's a static web app (no backend). The wall autosaves in your browser and can be shared as a link.

## Features

- **Layouts**: Grid, Main + strip, Main + sidebar, and Main 2×2, from 1×1 up to 4×4 (16 tiles). Every layout fills the screen with no gaps.
- **Any YouTube link**: `watch?v=`, `youtu.be/`, `/live/`, `/shorts/`, `/embed/`, bare video IDs, `/channel/UC…` links, and `@handles` (handles need an API key).
- **Sound**: everything starts muted, and only one tile has sound at a time.
  - In Grid, each tile has a big center button to solo its sound.
  - In Main layouts the main tile has the sound; click any small tile to make it the main one.
  - **↩ Back to N** (or <kbd>`</kbd>) undoes the last promote.
- **Live search** (optional API key):
  - Search YouTube for live streams and see viewer counts.
  - Click a result, then the tile it should go in, or **Add** it to the next empty tile.
  - **Fill** puts the most-watched streams in every empty tile.
  - The panel pushes the wall aside instead of covering it.
- **Undo**:
  - A removed stream leaves an **Undo** button in its tile.
  - <kbd>⌘Z</kbd> / <kbd>Ctrl+Z</kbd> steps back through adds, removals, fills, and Clear all.
- **Sharing**: **Share** copies a link that encodes the layout and streams (never your API key).
- **Keyboard** ([TanStack Hotkeys](https://tanstack.com/hotkeys)):
  - Every shortcut can be rebound in the editor (<kbd>?</kbd>), which warns about conflicts.
  - Shortcuts show as ⌘ on macOS and Ctrl elsewhere.

## Keyboard shortcuts

| Keys | Action |
|---|---|
| <kbd>1</kbd>–<kbd>9</kbd> | Make tile N the main tile (from Grid, switches to Main + strip). While picking a tile from search, puts the stream there |
| <kbd>`</kbd> | Swap back the last promote; press again to flip |
| <kbd>G</kbd> then <kbd>1</kbd>–<kbd>9</kbd> | Grid: solo tile N's sound |
| <kbd>L</kbd> then <kbd>1</kbd>–<kbd>4</kbd> | Grid / Main + strip / Main + sidebar / Main 2×2 |
| <kbd>/</kbd> | Search live streams |
| <kbd>M</kbd> | Mute all |
| <kbd>F</kbd> | Fullscreen |
| <kbd>Delete</kbd> | Remove the tile under the mouse |
| <kbd>⌘Z</kbd> | Undo |
| <kbd>C</kbd> <kbd>C</kbd> | Clear all |
| <kbd>Esc</kbd> | Back out one step (placing → editing → search) |
| <kbd>?</kbd> | Shortcut cheat sheet and editor |
| Hold <kbd>Shift</kbd> | Show big tile numbers |

You can also paste a YouTube link while hovering a tile to put it there.

## YouTube API key (optional)

Video links and `/channel/UC…` links work without a key. A free [YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com) key adds:

- live search, viewer counts, and LIVE/UPCOMING badges
- `@handle` links
- channel tiles that follow the channel's live stream, picking up its next stream when one ends

Add it in **Settings**. It's stored only in your browser. The free quota is 10,000 units a day: a search costs about 100 units, and status checks cost 1.

## Development

```sh
npm install
npm run dev      # start the dev server
npm test         # unit tests (Vitest)
npm run lint     # oxlint
npm run build    # type-check and build to dist/
```

Built with Vite, React 19, TypeScript, zustand, dnd-kit, and the YouTube IFrame Player API.

### Project layout

```
src/
  components/   Wall, Tile, Player, Toolbar, SearchPanel, SettingsDialog
  commands/     Command registry, keymap, scopes, and the shortcut editor (TanStack Hotkeys)
  lib/          Link parsing, layouts, share links, YouTube Data API, wall actions
  state/        zustand stores: wall, UI, settings, resolved stream info, undo history
  hooks/        useResolver: keeps live status and viewer counts fresh
```
