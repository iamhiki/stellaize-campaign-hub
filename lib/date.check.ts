// Self-check for lib/date.ts. Run: node lib/date.check.ts
import assert from "node:assert/strict";
import { dueWords, remindNow, addDays, daysBetween, reportDue, todayKST } from "./date.ts";

assert.equal(reportDue("2026-11-01"), "2026-11-15");
assert.equal(reportDue("2026-12-25"), "2027-01-08"); // month and year rollover
assert.equal(addDays("2026-11-07", -7), "2026-10-31");
assert.equal(daysBetween("2026-11-07", "2026-11-10"), 3);
assert.equal(daysBetween("2026-11-07", "2026-11-05"), -2);
// 08:30 KST on Nov 7 is still Nov 6 in UTC
assert.equal(todayKST(new Date("2026-11-06T23:30:00Z")), "2026-11-07");
assert.equal(remindNow("2026-11-17", "2026-11-19"), false); // two days out: not yet
assert.equal(remindNow("2026-11-18", "2026-11-19"), true); // the day before
assert.equal(remindNow("2026-11-19", "2026-11-19"), true); // deadline set late: still goes out on the day
assert.equal(remindNow("2026-11-21", "2026-11-19"), true); // never reminded and already passed
assert.equal(dueWords(1, "11/19"), "마감이 내일(11/19)입니다");
assert.equal(dueWords(0, "11/19"), "마감이 오늘(11/19)입니다");
assert.equal(dueWords(-2, "11/19"), "마감(11/19)이 지났습니다");
console.log("date checks ok");
