# Terminal Snapshot · User Guide

## 1. What it is

A single web page that looks and feels like a terminal, built for logging a moment in a few seconds. Every entry becomes one Markdown (`.md`) file you can drop into Obsidian, Notion, a Git repo, email, or anything else that reads text.

## 2. Getting it running (GitHub Pages)

1. Push these files to the `main` branch of `ryelikebread/Terminal-Snapshot`.
2. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `(root)` → Save**.
3. After about a minute it's live at `https://ryelikebread.github.io/Terminal-Snapshot/`.
4. Optional, recommended on a phone: open that link and choose **Add to Home Screen** (Safari share menu, or Chrome's ⋮ menu → Install app). It then opens full-screen like an app and works offline.

To try it locally instead: in this folder run `python3 -m http.server 8000` and open `http://localhost:8000`. (Opening `index.html` directly as a file works for typing and saving, but location and offline mode need `http://localhost` or `https://`.)

## 3. Making an entry

When the page opens, the cursor is already in **snapshot of surroundings**.

| Step | What you do |
|---|---|
| 1 | Type what's around you. |
| 2 | Press **Enter** → jumps to *thinking about?* |
| 3 | (Optional) add a photo: **Alt+P**, click **[attach]**, paste an image (**Ctrl/Cmd+V**), or drag one onto the page. On a phone, [attach] offers the camera. |
| 4 | Type what you're thinking about. |
| 5 | Press **Enter** → file saves, screen resets for the next entry. |

Automatic fields:

- **Timestamp** ticks live until your first keystroke (or photo), then locks. So it records when you *started* the note, including your timezone offset.
- **Coordinates** come from your device's location. The first time, your browser asks permission; say Allow. Accuracy (±metres) is shown and saved. If location is blocked or unavailable, the entry still saves with "unavailable". Click **[retry]** or run `geo` to try again.

Nothing is lost if you close the tab mid-entry: the draft is restored next time.

## 3a. Saving on iPhone / iPad

iPhone Safari, and especially the **Add to Home Screen** version, often ignores normal downloads without saying so. So on iPhone/iPad the app uses the **share sheet** instead:

1. Press Enter in the last field (or tap **[ save .md ]**). The share sheet slides up.
2. Tap **Save to Files**, pick a folder (for example *iCloud Drive › Terminal Snapshot*, or *On My iPhone*), then **Save**.
3. The screen shows a green `shared snapshot-….md` line when it's done.
4. If the entry had a photo, a **[ save photo to Photos ]** button appears. Tap it, then **Save Image** to put the picture in your Photos app. (The photo is also inside the `.md`.)

Find the files later in the **Files** app, in the folder you picked. Tip: make one folder and pick it every time; iOS remembers the last folder.

If you cancel the share sheet, or it doesn't open, a **[ tap to save … ]** button appears; tap it to try again. Every entry is also kept in the app's history, so `ls` then `get 3` re-opens the share sheet for entry #3 at any time.

Notes:
- The Home Screen app and the Safari tab keep **separate** history. Entries made in one won't show in `ls` in the other.
- Prefer old-style downloads? Run `save download`. Those go to *Files › Browse › iCloud Drive (or On My iPhone) › Downloads*. `save auto` switches back.
- Type `where` any time to see how saving works on the device you're on.

## 4. Keyboard shortcuts

| Keys | Action |
|---|---|
| Enter | next field / save (in last field) |
| Shift+Enter | new line inside a field |
| Ctrl/Cmd+Enter | save from anywhere |
| Alt+P | attach photo |
| Alt+N | new (blank) entry |
| Ctrl/Cmd+K | jump to the `$` command prompt |
| Esc | leave the command prompt |

## 5. Commands (`$` prompt at the bottom)

| Command | What it does |
|---|---|
| `help` | list commands |
| `new` / `save` | same as the buttons |
| `ls` | list entries saved in this browser, newest first |
| `get 3` | save entry #3 again (share sheet on iPhone, download elsewhere) |
| `rm 3` | remove #3 from the in-browser history (your saved files are untouched) |
| `export` | save every entry combined into one `.md` |
| `save share` / `save download` / `save auto` | how files leave the app: share sheet (Save to Files / Photos), a normal download, or auto (share sheet on iPhone/iPad, download elsewhere — the default) |
| `where` | show the save mode and where files end up on this device |
| `folder` | **Chrome/Edge desktop only:** pick a folder once; every save is then written straight into it with no download prompt. Great with an Obsidian vault. |
| `folder off` | back to normal downloads |
| `photo embed` | (default) photo lives inside the `.md` as base64 — one self-contained file |
| `photo separate` | photo saved as a `.jpg` next to the `.md`, linked by filename. Smaller, cleaner `.md`; keep the two files together. |
| `theme green` / `amber` / `white` | colour scheme |
| `geo` | retry location |
| `clear` | clear the screen messages |
| `wipe` | delete all in-browser history (asks nothing — be sure) |

Settings are remembered per browser.

## 6. The saved file

Name: `snapshot-YYYY-MM-DD_HHMMSS.md`. Contents:

```markdown
---
timestamp: 2026-11-02T19:16:46-05:00
latitude: 40.712800
longitude: -74.006000
accuracy_m: 12
photo: embedded
---

# Snapshot · 2026-11-02 19:16:46 (UTC-05:00)

- **Timestamp:** 2026-11-02 19:16:46 (UTC-05:00)
- **Coordinates:** [40.712800, -74.006000](https://www.openstreetmap.org/...) (±12 m)

## Snapshot of Surroundings
Coffee shop, rain on the windows

## Photo
![Photo of surroundings](data:image/jpeg;base64,...)

## Thinking About?
the new project layout
```

The block between `---` lines is YAML front matter, so tools like Obsidian Dataview can sort and filter by time or place. The coordinates link opens a map.

Photos are resized to at most 1600 px on the long edge and saved as JPEG (typically 100–400 KB) so files stay easy to move around.

## 7. Where your data lives

- **Your saved `.md` files:** wherever your browser downloads go, the folder you picked with `folder`, or on iPhone the Files folder you chose in the share sheet. These are the real record.
- **In-browser history** (for `ls` / `get` / `export`): IndexedDB inside this browser only. Clearing site data erases it. It does not sync between devices.
- **Draft + settings:** localStorage in this browser.
- Nothing is sent to any server. The page makes no network calls except loading itself. Location is read by your own device and only written into your file.

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| coords say "permission denied" | Allow location for the site in browser settings, then `geo`. On iPhone also check Settings → Privacy → Location Services → Safari Websites. |
| coords say "needs https" | Use the GitHub Pages link or `localhost`, not a `file://` path. |
| iPhone: file isn't in Downloads | With the share sheet, files go to the folder you picked under **Save to Files**, not Downloads. Open the Files app and search `snapshot-`. Older entries: `ls`, then `get <n>` to save them again. |
| iPhone: photo isn't in Photos | Tap **[ save photo to Photos ]** after saving, then **Save Image**. |
| iPhone: nothing happens on save | Reload the app once to pick up the update, then save again. Or run `save share`. |
| Phone asks where to save every time | That's the share sheet / browser behaviour; pick the same folder each time. |
| Wanted a new version after an update | Reload once; the page fetches fresh files whenever online. |
| `folder` says not supported | Only Chromium desktop browsers support it; use downloads elsewhere. |

## 9. What's installed and why

There is nothing to install: no packages, no build tools, no frameworks, no external scripts or fonts. Every file in the repo:

| File | Purpose |
|---|---|
| `index.html` | The page: layout of the fields, buttons, and command prompt. |
| `style.css` | Terminal look (dark background, monospace, glow, themes, mobile layout). Uses your system's monospace font. |
| `app.js` | All behaviour: clock, location, photo resize, keyboard flow, Markdown generation, saving (share sheet, folder, or download), commands, history. Plain JavaScript. |
| `sw.js` | Service worker: caches the app so it opens and works offline after the first visit. |
| `manifest.webmanifest` | Lets phones/desktops "install" it as an app with its own icon and full-screen window. |
| `icon.svg` | App / tab icon. |
| `.nojekyll` | Tells GitHub Pages to serve files as-is (skip its Jekyll processing). |
| `README.md` | Short overview shown on the GitHub repo page. |
| `docs/USER_GUIDE.md` | This guide. |
| `LICENSE` | The repo's existing license. |

Browser features it relies on (all built in): Geolocation API (coordinates), Canvas (photo resizing), IndexedDB (history), localStorage (drafts/settings), File System Access API (optional `folder` command, Chrome/Edge), Web Share API (share sheet saving on iPhone/iPad), Service Worker (offline).

**Hosting:** GitHub Pages (free static hosting). To change anything, edit the files and push to `main`; Pages redeploys automatically. If you change files, bump `CACHE` in `sw.js` (currently `v2`; next would be `v3`) so installed copies refresh their offline cache.
