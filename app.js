/* Terminal Snapshot — quick notes that save as Markdown.
   No build step, no dependencies. Everything runs in the browser. */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const el = {
    log: $("log"), form: $("entry"), ts: $("ts"), tslock: $("tslock"),
    geo: $("geo"), geoRetry: $("geoRetry"), surr: $("surr"), think: $("think"),
    photoBtn: $("photoBtn"), photoInput: $("photoInput"), photoInfo: $("photoInfo"),
    photoClear: $("photoClear"), photoPreview: $("photoPreview"),
    newBtn: $("newBtn"), cmd: $("cmd"),
  };

  /* ---------- settings (per browser) ---------- */
  const DEFAULTS = { photo: "embed", theme: "green", maxPx: 1600 };
  const settings = Object.assign({}, DEFAULTS, readJSON("ts.settings", {}));
  function saveSettings() { writeJSON("ts.settings", settings); }
  function readJSON(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } }
  function writeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } }
  applyTheme();

  /* ---------- entry state ---------- */
  let entry;          // { startedAt: Date|null, coords: {...}|null, photo: {dataUrl, bytes, w, h}|null }
  let clockTimer = null;

  function newEntry({ keepDraft = false } = {}) {
    entry = { startedAt: null, coords: entry?.coords ?? null, photo: null };
    if (!keepDraft) { el.surr.value = ""; el.think.value = ""; clearDraft(); }
    setPhoto(null);
    el.tslock.textContent = "(live — locks on first keystroke)";
    startClock();
    autosize(el.surr); autosize(el.think);
    locate();
    el.surr.focus();
  }

  function startClock() {
    clearInterval(clockTimer);
    const tick = () => { el.ts.textContent = fmtHuman(new Date()); };
    tick();
    clockTimer = setInterval(tick, 1000);
  }
  function lockTime() {
    if (entry.startedAt) return;
    entry.startedAt = new Date();
    clearInterval(clockTimer);
    el.ts.textContent = fmtHuman(entry.startedAt);
    el.tslock.textContent = "(locked)";
  }

  /* ---------- geolocation ---------- */
  let geoWatch = null;
  function locate() {
    if (!("geolocation" in navigator)) { el.geo.textContent = "unavailable (browser has no location support)"; return; }
    if (!window.isSecureContext) { el.geo.textContent = "unavailable (needs https)"; return; }
    if (!entry.coords) el.geo.textContent = "acquiring…";
    navigator.geolocation.getCurrentPosition(onPos, onGeoErr, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
    // Keep refining while the entry is open (GPS often improves after a few seconds).
    if (geoWatch === null) {
      geoWatch = navigator.geolocation.watchPosition(onPos, () => {}, { enableHighAccuracy: true, maximumAge: 30000 });
    }
  }
  function onPos(p) {
    const c = p.coords;
    // Keep the more accurate fix.
    if (entry.coords && entry.coords.acc < c.accuracy && Date.now() - entry.coords.at < 120000) return;
    entry.coords = { lat: c.latitude, lon: c.longitude, acc: Math.round(c.accuracy), alt: c.altitude, at: p.timestamp || Date.now() };
    el.geo.textContent = fmtCoords(entry.coords);
  }
  function onGeoErr(e) {
    if (entry.coords) return;
    const why = { 1: "permission denied", 2: "position unavailable", 3: "timed out" }[e.code] || e.message;
    el.geo.textContent = `unavailable (${why})`;
  }
  el.geoRetry.addEventListener("click", () => { entry.coords = null; locate(); });

  /* ---------- photo ---------- */
  el.photoBtn.addEventListener("click", () => el.photoInput.click());
  el.photoInput.addEventListener("change", () => { const f = el.photoInput.files[0]; if (f) loadPhoto(f); el.photoInput.value = ""; });
  el.photoClear.addEventListener("click", () => setPhoto(null));
  document.addEventListener("paste", (e) => {
    const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith("image/"));
    if (f) { e.preventDefault(); loadPhoto(f); }
  });
  ["dragenter", "dragover"].forEach((t) => document.addEventListener(t, (e) => { e.preventDefault(); document.body.classList.add("drag"); }));
  ["dragleave", "drop"].forEach((t) => document.addEventListener(t, (e) => { e.preventDefault(); document.body.classList.remove("drag"); }));
  document.addEventListener("drop", (e) => {
    const f = [...(e.dataTransfer?.files || [])].find((x) => x.type.startsWith("image/"));
    if (f) loadPhoto(f);
  });

  async function loadPhoto(file) {
    lockTime();
    el.photoInfo.textContent = "processing…";
    try {
      const img = await fileToImage(file);
      const scale = Math.min(1, settings.maxPx / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
      const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
      cv.getContext("2d").drawImage(img, 0, 0, w, h);
      const dataUrl = cv.toDataURL("image/jpeg", 0.82);
      URL.revokeObjectURL(img.src);
      setPhoto({ dataUrl, w, h, bytes: Math.round((dataUrl.length - 23) * 0.75) });
    } catch (err) {
      setPhoto(null);
      print(`photo: could not read image (${err.message || err})`, "err");
    }
  }
  function fileToImage(file) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error("unsupported format"));
      img.src = URL.createObjectURL(file);
    });
  }
  function setPhoto(p) {
    entry.photo = p;
    el.photoPreview.hidden = !p;
    el.photoClear.hidden = !p;
    if (p) { el.photoPreview.src = p.dataUrl; el.photoInfo.textContent = `${p.w}×${p.h} jpg · ${kb(p.bytes)}`; }
    else { el.photoPreview.removeAttribute("src"); el.photoInfo.textContent = "none · paste or drop works too"; }
  }

  /* ---------- keyboard flow ---------- */
  [el.surr, el.think].forEach((ta) => {
    ta.addEventListener("input", () => { lockTime(); autosize(ta); saveDraft(); });
  });
  el.surr.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.isComposing) { e.preventDefault(); el.think.focus(); }
  });
  el.think.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); save(); }
  });
  el.form.addEventListener("submit", (e) => { e.preventDefault(); save(); });
  el.newBtn.addEventListener("click", () => newEntry());

  document.addEventListener("keydown", (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key === "Enter") { e.preventDefault(); save(); }
    else if (mod && (e.key === "k" || e.key === "K")) { e.preventDefault(); el.cmd.focus(); }
    else if (e.altKey && (e.code === "KeyP")) { e.preventDefault(); el.photoInput.click(); }
    else if (e.altKey && (e.code === "KeyN")) { e.preventDefault(); newEntry(); }
    else if (e.key === "Escape" && document.activeElement === el.cmd) { el.cmd.value = ""; el.surr.focus(); }
  });

  function autosize(ta) { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + "px"; }

  /* ---------- drafts (survive tab close / refresh) ---------- */
  function saveDraft() { writeJSON("ts.draft", { surr: el.surr.value, think: el.think.value, startedAt: entry.startedAt }); }
  function clearDraft() { try { localStorage.removeItem("ts.draft"); } catch {} }
  function restoreDraft() {
    const d = readJSON("ts.draft", null);
    if (!d || (!d.surr && !d.think)) return false;
    el.surr.value = d.surr || ""; el.think.value = d.think || "";
    return d;
  }

  /* ---------- markdown ---------- */
  function buildMarkdown(base) {
    const t = entry.startedAt || new Date();
    const c = entry.coords;
    const surr = el.surr.value.trim();
    const think = el.think.value.trim();
    const fm = [
      "---",
      `timestamp: ${fmtISO(t)}`,
      `latitude: ${c ? c.lat.toFixed(6) : "null"}`,
      `longitude: ${c ? c.lon.toFixed(6) : "null"}`,
      `accuracy_m: ${c ? c.acc : "null"}`,
      `photo: ${entry.photo ? (settings.photo === "separate" ? base + ".jpg" : "embedded") : "none"}`,
      "---",
    ];
    const coordLine = c
      ? `[${c.lat.toFixed(6)}, ${c.lon.toFixed(6)}](https://www.openstreetmap.org/?mlat=${c.lat.toFixed(6)}&mlon=${c.lon.toFixed(6)}#map=17/${c.lat.toFixed(6)}/${c.lon.toFixed(6)}) (±${c.acc} m)`
      : "_unavailable_";
    const body = [
      "",
      `# Snapshot · ${fmtHuman(t)}`,
      "",
      `- **Timestamp:** ${fmtHuman(t)}`,
      `- **Coordinates:** ${coordLine}`,
      "",
      "## Snapshot of Surroundings",
      "",
      surr || "_—_",
      "",
    ];
    if (entry.photo) {
      const src = settings.photo === "separate" ? `${base}.jpg` : entry.photo.dataUrl;
      body.push("## Photo", "", `![Photo of surroundings](${src})`, "");
    }
    body.push("## Thinking About?", "", think || "_—_", "");
    return fm.concat(body).join("\n");
  }

  /* ---------- save ---------- */
  let saving = false;
  async function save() {
    if (saving) return;
    if (!el.surr.value.trim() && !el.think.value.trim() && !entry.photo) {
      print("nothing to save — type something first", "dim"); el.surr.focus(); return;
    }
    saving = true;
    lockTime();
    const base = "snapshot-" + fmtFile(entry.startedAt);
    const md = buildMarkdown(base);
    const files = [{ name: base + ".md", blob: new Blob([md], { type: "text/markdown;charset=utf-8" }) }];
    if (entry.photo && settings.photo === "separate") files.push({ name: base + ".jpg", blob: dataUrlToBlob(entry.photo.dataUrl) });

    try {
      const where = await writeFiles(files);
      await db.put({ id: base, created: entry.startedAt.getTime(), files: files.map((f) => ({ name: f.name, blob: f.blob })) });
      print(`saved ${files.map((f) => f.name).join(" + ")} · ${kb(files.reduce((s, f) => s + f.blob.size, 0))} → ${where}`, "ok");
      clearDraft();
      newEntry();
    } catch (err) {
      print(`save failed: ${err.message || err}`, "err");
    } finally { saving = false; }
  }

  // Write to the chosen folder if one is set (Chrome/Edge desktop), otherwise download.
  async function writeFiles(files) {
    const dir = await getDir();
    if (dir) {
      try {
        if ((await dir.queryPermission({ mode: "readwrite" })) !== "granted" &&
            (await dir.requestPermission({ mode: "readwrite" })) !== "granted") throw new Error("folder permission denied");
        for (const f of files) {
          const fh = await dir.getFileHandle(f.name, { create: true });
          const w = await fh.createWritable(); await w.write(f.blob); await w.close();
        }
        return `folder "${dir.name}"`;
      } catch (err) {
        print(`folder write failed (${err.message}); downloading instead`, "err");
      }
    }
    files.forEach((f, i) => setTimeout(() => download(f.name, f.blob), i * 250));
    return "downloads";
  }
  function download(name, blob) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  /* ---------- tiny IndexedDB wrapper: history + folder handle ---------- */
  const db = (() => {
    let p;
    const open = () => p || (p = new Promise((res, rej) => {
      const r = indexedDB.open("terminal-snapshot", 1);
      r.onupgradeneeded = () => { r.result.createObjectStore("entries", { keyPath: "id" }); r.result.createObjectStore("kv"); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    }));
    const tx = async (store, mode, fn) => {
      const d = await open();
      return new Promise((res, rej) => {
        const t = d.transaction(store, mode); const req = fn(t.objectStore(store));
        t.oncomplete = () => res(req?.result); t.onerror = () => rej(t.error);
      });
    };
    return {
      put: (v) => tx("entries", "readwrite", (s) => s.put(v)).catch(() => {}),
      all: () => tx("entries", "readonly", (s) => s.getAll()).catch(() => []),
      del: (id) => tx("entries", "readwrite", (s) => s.delete(id)),
      clear: () => tx("entries", "readwrite", (s) => s.clear()),
      kvGet: (k) => tx("kv", "readonly", (s) => s.get(k)).catch(() => null),
      kvSet: (k, v) => tx("kv", "readwrite", (s) => s.put(v, k)),
      kvDel: (k) => tx("kv", "readwrite", (s) => s.delete(k)),
    };
  })();
  const getDir = () => ("showDirectoryPicker" in window ? db.kvGet("dir") : Promise.resolve(null));

  /* ---------- commands ---------- */
  const HELP = `commands:
  new                 start a fresh entry (Alt+N)
  save                save current entry (Enter in last field, or Ctrl+Enter)
  ls                  list saved entries (this browser)
  get <n>             download entry #n again
  rm <n>              delete entry #n from history (files you saved stay)
  export              download every entry as one combined .md
  folder              pick a folder to save into, no download prompts (Chrome/Edge desktop)
  folder off          go back to normal downloads
  photo embed|separate  embed photo inside the .md, or save it as a .jpg next to it
  theme green|amber|white
  geo                 retry location
  clear               clear the screen
  wipe                delete ALL history in this browser
keys: Enter = next field / save · Shift+Enter = new line · Alt+P = photo · Ctrl+K = this prompt · Esc = back`;

  el.cmd.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const line = el.cmd.value.trim(); el.cmd.value = "";
    if (!line) { el.surr.focus(); return; }
    print(`$ ${line}`, "dim");
    const [c, ...args] = line.split(/\s+/);
    try { await run(c.toLowerCase(), args); } catch (err) { print(`${c}: ${err.message || err}`, "err"); }
  });

  async function run(c, args) {
    const list = async () => (await db.all()).sort((a, b) => b.created - a.created);
    switch (c) {
      case "help": case "?": print(HELP); break;
      case "new": newEntry(); break;
      case "save": await save(); break;
      case "ls": {
        const all = await list();
        if (!all.length) { print("no entries yet"); break; }
        print(all.map((x, i) => `${String(i + 1).padStart(3)}  ${x.files.map((f) => f.name).join(" + ")}`).join("\n"));
        break;
      }
      case "get": case "rm": {
        const n = parseInt(args[0], 10); const all = await list(); const x = all[n - 1];
        if (!x) throw new Error(`no entry #${args[0] ?? ""} (try ls)`);
        if (c === "get") x.files.forEach((f, i) => setTimeout(() => download(f.name, f.blob), i * 250));
        else { await db.del(x.id); print(`removed #${n} from history`, "ok"); }
        break;
      }
      case "export": {
        const all = (await list()).reverse();
        if (!all.length) { print("no entries yet"); break; }
        const parts = await Promise.all(all.map((x) => x.files[0].blob.text()));
        const out = parts.join("\n\n---\n\n");
        download(`snapshots-export-${fmtFile(new Date())}.md`, new Blob([out], { type: "text/markdown" }));
        print(`exported ${all.length} entries`, "ok");
        break;
      }
      case "folder": {
        if (!("showDirectoryPicker" in window)) throw new Error("this browser can't save to a folder; files go to Downloads");
        if (args[0] === "off") { await db.kvDel("dir"); print("folder off — using downloads", "ok"); break; }
        const dir = await window.showDirectoryPicker({ id: "terminal-snapshot", mode: "readwrite" });
        await db.kvSet("dir", dir);
        print(`saving into folder "${dir.name}"`, "ok");
        break;
      }
      case "photo":
        if (!["embed", "separate"].includes(args[0])) throw new Error("use: photo embed | photo separate");
        settings.photo = args[0]; saveSettings(); print(`photo mode: ${settings.photo}`, "ok"); break;
      case "theme":
        if (!["green", "amber", "white"].includes(args[0])) throw new Error("use: theme green | amber | white");
        settings.theme = args[0]; saveSettings(); applyTheme(); print(`theme: ${settings.theme}`, "ok"); break;
      case "geo": entry.coords = null; locate(); break;
      case "clear": case "cls": el.log.textContent = ""; break;
      case "wipe": await db.clear(); print("history wiped", "ok"); break;
      default: throw new Error("command not found (type help)");
    }
  }

  /* ---------- helpers ---------- */
  function print(text, cls = "out") {
    const d = document.createElement("div"); d.className = cls; d.textContent = text;
    el.log.appendChild(d);
    while (el.log.childElementCount > 60) el.log.firstChild.remove();
  }
  function applyTheme() {
    document.documentElement.dataset.theme = settings.theme;
    const bg = { green: "#0b0f0b", amber: "#120c02", white: "#101214" }[settings.theme];
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", bg);
  }
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  function tzOffset(d) { const m = -d.getTimezoneOffset(); const s = m >= 0 ? "+" : "-"; return `${s}${pad(Math.floor(Math.abs(m) / 60))}:${pad(Math.abs(m) % 60)}`; }
  function fmtISO(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${tzOffset(d)}`; }
  function fmtHuman(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} (UTC${tzOffset(d)})`; }
  function fmtFile(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`; }
  function fmtCoords(c) {
    const ns = c.lat >= 0 ? "N" : "S", ew = c.lon >= 0 ? "E" : "W";
    return `${Math.abs(c.lat).toFixed(5)}°${ns}, ${Math.abs(c.lon).toFixed(5)}°${ew} (±${c.acc} m)`;
  }
  const kb = (b) => (b < 1024 ? `${b} B` : `${(b / 1024).toFixed(1)} KB`);
  function dataUrlToBlob(u) {
    const [head, b64] = u.split(","); const bin = atob(b64); const a = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return new Blob([a], { type: head.match(/:(.*?);/)[1] });
  }

  /* ---------- boot ---------- */
  const draft = restoreDraft();
  newEntry({ keepDraft: !!draft });
  if (draft) {
    if (draft.startedAt) { entry.startedAt = new Date(draft.startedAt); clearInterval(clockTimer); el.ts.textContent = fmtHuman(entry.startedAt); el.tslock.textContent = "(locked · restored draft)"; }
    autosize(el.surr); autosize(el.think);
    print("restored unsaved draft", "dim");
  }
  print("ready. type, press Enter to move on, Enter again to save. 'help' in the $ prompt for more.", "dim");
  getDir().then((d) => d && print(`saving into folder "${d.name}"`, "dim"));

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
