/* Opt-in local vault. Never auto-opens a chart. */

const KEY = "natal-atlas-vault-v1";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

function uid() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function listCharts() {
  return read()
    .map((row) => ({
      id: row.id,
      name: row.name,
      savedAt: row.savedAt,
      place: row.place || "",
      dateLabel: row.dateLabel || "",
    }))
    .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
}

export function getChart(id) {
  const row = read().find((r) => r.id === id);
  return row ? row.chart : null;
}

export function saveChart(chart) {
  if (!chart || chart.meta?.waiting) throw new Error("Nothing to save.");
  const list = read();
  const id = uid();
  list.push({
    id,
    name: chart.meta.subject,
    place: chart.meta.birth?.place || "",
    dateLabel: chart.meta.birth?.dateLabel || "",
    savedAt: new Date().toISOString(),
    chart,
  });
  write(list);
  return id;
}

export function removeChart(id) {
  write(read().filter((r) => r.id !== id));
}

export function exportVault() {
  return JSON.stringify({ v: 1, exportedAt: new Date().toISOString(), charts: read() }, null, 2);
}

/** Merge imported rows onto an existing list. Skips waiting/empty charts. */
export function mergeVaultRows(existing, incoming, makeId = uid) {
  if (!Array.isArray(incoming)) throw new Error("That file is not a vault.");
  const list = existing.slice();
  const have = new Set(list.map((r) => r.id).filter(Boolean));
  let added = 0;
  for (const row of incoming) {
    if (!row || !row.chart || row.chart.meta?.waiting) continue;
    const id = have.has(row.id) ? makeId() : row.id || makeId();
    list.push({ ...row, id });
    have.add(id);
    added += 1;
  }
  if (!added) throw new Error("That file has no charts to keep.");
  return list;
}

export function importVault(text) {
  const data = JSON.parse(text);
  const incoming = Array.isArray(data) ? data : data.charts;
  const list = mergeVaultRows(read(), incoming);
  write(list);
  return list.length;
}
