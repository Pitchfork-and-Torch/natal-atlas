import {
  declutter,
  spreadLinear,
  fitWheelSize,
  clusterSpan,
  clusterLegendMarks,
  sep,
  norm,
} from "../public/js/wheel.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function circMinGap(lons) {
  const s = lons.map(norm).sort((a, b) => a - b);
  let best = 360;
  for (let i = 0; i < s.length; i++) {
    let g = s[(i + 1) % s.length] - s[i];
    if (g <= 0) g += 360;
    best = Math.min(best, g);
  }
  return best;
}

const clustered = declutter([10, 11, 12, 13], 8);
for (let i = 0; i < clustered.length - 1; i++) {
  let gap = clustered[i + 1] - clustered[i];
  if (gap < 0) gap += 360;
  assert(gap >= 7.999, `declutter gap ${gap} at ${i}`);
}

const wrapCluster = declutter([359, 0.4, 1.2], 8);
assert(circMinGap(wrapCluster) >= 7.999, `declutter wrap gap ${circMinGap(wrapCluster)}`);
assert(wrapCluster.length === 3, "declutter wrap keeps count");

const line = spreadLinear([40, 41, 42], 8);
for (let i = 0; i < line.length - 1; i++) {
  assert(line[i + 1] - line[i] >= 7.999, `spread gap ${line[i + 1] - line[i]}`);
}
assert(Math.min(...line) >= 0 && Math.max(...line) <= 100, "spread stays in range");

const packed = spreadLinear([10, 12, 14, 16, 18], 30);
assert(packed[0] === 0 && packed[packed.length - 1] === 100, `spread pack ${packed}`);
for (let i = 0; i < packed.length - 1; i++) {
  assert(Math.abs((packed[i + 1] - packed[i]) - 25) < 1e-9, `even pack ${packed}`);
}

const shuffled = spreadLinear([42, 40, 41], 8);
assert(shuffled[1] < shuffled[2] && shuffled[2] < shuffled[0], `spread keeps order ${shuffled}`);
assert(shuffled[0] - shuffled[1] >= 7.999, "spread shuffled span");

const se = fitWheelSize({ wrapW: 360, innerH: 667, stackedCopyH: 180 });
assert(se <= 352, `phone cap ${se}`);
assert(se <= Math.floor((667 - 72 - 180) * 0.94) + 1, `phone leftover ${se}`);
assert(se >= 180, `phone min ${se}`);

const iphoneSe = fitWheelSize({ wrapW: 320, innerH: 568, stackedCopyH: 200 });
assert(iphoneSe <= 320, `short phone width ${iphoneSe}`);
assert(iphoneSe < 280, `short phone must shrink below old 280 floor, got ${iphoneSe}`);

const desk = fitWheelSize({ wrapW: 820, innerH: 900, stackedCopyH: 0 });
assert(desk > 500, `desktop ${desk}`);
assert(desk === Math.max(280, Math.floor(Math.min(820, 900 - 150) * 0.94)), `desktop formula ${desk}`);

const [spanStart, spanEnd] = clusterSpan([350, 10, 20]);
assert(spanStart === 350 && spanEnd === 20, `clusterSpan wrap ${spanStart} ${spanEnd}`);
const [tightStart, tightEnd] = clusterSpan([10, 12, 18]);
assert(tightStart === 10 && tightEnd === 18, `clusterSpan tight ${tightStart} ${tightEnd}`);
const [oneStart, oneEnd] = clusterSpan([44]);
assert(oneStart === 44 && oneEnd === 44, "clusterSpan single");

const legend = clusterLegendMarks([10.2, 10.4, 10.7], 0, 8);
assert(legend.raw.every((x) => x > 33 && x < 37), `legend raw ${legend.raw}`);
assert(legend.to - legend.from < 20, `glow stays on cluster ${legend.from} ${legend.to}`);
for (let i = 0; i < legend.xs.length - 1; i++) {
  assert(legend.xs[i + 1] - legend.xs[i] >= 7.999, `legend mark gap ${legend.xs}`);
}
const pisces = clusterLegendMarks([350, 351, 352], 330, 8);
assert(pisces.raw[0] > 66 && pisces.raw[0] < 68, `pisces raw ${pisces.raw}`);
assert(sep(350, 330) === 20, "sep sanity");

console.log("ok", { clustered, line, se, iphoneSe, desk, wrapCluster, legend: legend.xs });
