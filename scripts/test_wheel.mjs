import { declutter, spreadLinear, fitWheelSize } from "../public/js/wheel.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const clustered = declutter([10, 11, 12, 13], 8);
for (let i = 0; i < clustered.length - 1; i++) {
  let gap = clustered[i + 1] - clustered[i];
  if (gap < 0) gap += 360;
  assert(gap >= 7.999, `declutter gap ${gap} at ${i}`);
}

const line = spreadLinear([40, 41, 42], 8);
for (let i = 0; i < line.length - 1; i++) {
  assert(line[i + 1] - line[i] >= 7.999, `spread gap ${line[i + 1] - line[i]}`);
}
assert(Math.min(...line) >= 0 && Math.max(...line) <= 100, "spread stays in range");

const se = fitWheelSize({ wrapW: 360, innerH: 667, stackedCopyH: 180 });
assert(se <= 352, `phone cap ${se}`);
assert(se <= Math.floor((667 - 72 - 180) * 0.94) + 1, `phone leftover ${se}`);
assert(se >= 180, `phone min ${se}`);

const iphoneSe = fitWheelSize({ wrapW: 320, innerH: 568, stackedCopyH: 200 });
assert(iphoneSe <= 320, `short phone width ${iphoneSe}`);
assert(iphoneSe < 280, `short phone must shrink below old 280 floor, got ${iphoneSe}`);

const desk = fitWheelSize({ wrapW: 820, innerH: 900, stackedCopyH: 0 });
assert(desk > 500, `desktop ${desk}`);

console.log("ok", { clustered, line, se, iphoneSe, desk });
