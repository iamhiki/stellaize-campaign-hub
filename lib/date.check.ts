// Self-check for lib/date.ts. Run: node lib/date.check.ts
import assert from "node:assert/strict";
import { daysBetween, reportDue, todayKST } from "./date.ts";

assert.equal(reportDue("2026-11-01"), "2026-11-15");
assert.equal(reportDue("2026-12-25"), "2027-01-08"); // month and year rollover
assert.equal(daysBetween("2026-11-07", "2026-11-10"), 3);
assert.equal(daysBetween("2026-11-07", "2026-11-05"), -2);
// 08:30 KST on Nov 7 is still Nov 6 in UTC
assert.equal(todayKST(new Date("2026-11-06T23:30:00Z")), "2026-11-07");
console.log("date checks ok");
