/* Moment export: wheel PNG + hash recast. No upload. */

export function birthHash(input) {
  const p = new URLSearchParams();
  if (input.name) p.set("n", input.name);
  p.set("y", String(input.year));
  p.set("m", String(input.month));
  p.set("d", String(input.day));
  if (!input.timeUnknown) {
    p.set("h", String(input.hour));
    p.set("min", String(input.minute));
  } else p.set("u", "1");
  p.set("lat", String(input.lat));
  p.set("lon", String(input.lon));
  if (input.timeZone) p.set("tz", input.timeZone);
  if (input.houseSystem) p.set("hs", input.houseSystem);
  if (input.place) p.set("p", input.place);
  return "#c=" + p.toString();
}

export function parseBirthHash(hash) {
  const raw = String(hash || "").replace(/^#/, "");
  if (!raw.startsWith("c=")) return null;
  const p = new URLSearchParams(raw.slice(2));
  const y = Number(p.get("y"));
  const m = Number(p.get("m"));
  const d = Number(p.get("d"));
  const lat = Number(p.get("lat"));
  const lon = Number(p.get("lon"));
  if (![y, m, d, lat, lon].every(Number.isFinite)) return null;
  return {
    name: p.get("n") || "Untitled",
    year: y,
    month: m,
    day: d,
    hour: Number(p.get("h") || 12),
    minute: Number(p.get("min") || 0),
    timeUnknown: p.get("u") === "1",
    lat,
    lon,
    timeZone: p.get("tz") || "UTC",
    houseSystem: p.get("hs") || "porphyry",
    place: p.get("p") || `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
  };
}

export function chartToHashInput(chart) {
  const b = chart?.meta?.birth || {};
  const [y, m, d] = String(b.date || "").split("-").map(Number);
  const [hh, mm] = String(b.time || "12:00").split(":").map(Number);
  if (![y, m, d].every(Number.isFinite)) return null;
  return {
    name: chart.meta.subject,
    year: y,
    month: m,
    day: d,
    hour: hh || 12,
    minute: mm || 0,
    timeUnknown: Boolean(chart.meta.timeUnknown),
    lat: b.lat,
    lon: b.lon,
    timeZone: b.timezone || "UTC",
    houseSystem: chart.meta.houseSystemId || "porphyry",
    place: b.place || "",
  };
}

function captionFor(chart, when) {
  const b = chart.meta?.birth || {};
  const date = when || b.dateLabel || b.date || "";
  const time = chart.meta?.timeUnknown ? "solar chart" : (b.timeLabel || "");
  return [
    chart.meta?.subject || "Natal",
    [date, time].filter(Boolean).join(" "),
    b.place || "",
    chart.meta?.houseSystem || "",
    "Natal Atlas · computed on this device",
  ].filter(Boolean);
}

export async function downloadPlate({ canvas, chart, when }) {
  const src = canvas;
  const out = document.createElement("canvas");
  const w = 1200;
  const h = 1540;
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d");
  ctx.fillStyle = "oklch(0.16 0.01 70)";
  ctx.fillRect(0, 0, w, h);
  const side = 1080;
  const x = (w - side) / 2;
  const y = 80;
  ctx.drawImage(src, x, y, side, side);
  const lines = captionFor(chart, when);
  ctx.fillStyle = "oklch(0.93 0.02 85)";
  ctx.textAlign = "center";
  ctx.font = '600 28px "Clash Display", sans-serif';
  ctx.fillText(lines[0] || "Natal Atlas", w / 2, y + side + 56);
  ctx.font = '400 18px Satoshi, sans-serif';
  ctx.fillStyle = "oklch(0.93 0.02 85 / 0.72)";
  lines.slice(1).forEach((line, i) => {
    ctx.fillText(line, w / 2, y + side + 88 + i * 26);
  });
  const url = out.toDataURL("image/png");
  const a = document.createElement("a");
  const who = (chart.meta?.subject || "natal").replace(/[^\w\- ]+/g, "").trim() || "natal";
  a.href = url;
  a.download = `natal-atlas-plate-${who.replace(/\s+/g, "-").toLowerCase()}.png`;
  a.click();
}
