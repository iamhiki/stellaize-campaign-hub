// Self-check for lib/date.ts. Run: node lib/date.check.ts
import assert from "node:assert/strict";
import { daysBetween, ddayTarget, todayKST } from "./date.ts";

const d = { listDeadline: "2026-11-10", desiredUpload: "2026-12-01", uploadedAt: null };
assert.deepEqual(ddayTarget("리스트업", d), { label: "리스트 마감", date: "2026-11-10" });
assert.deepEqual(ddayTarget("제작", d), { label: "업로드", date: "2026-12-01" });
assert.deepEqual(ddayTarget("업로드", d), { label: "업로드", date: "2026-12-01" });
assert.deepEqual(ddayTarget("업로드", { ...d, uploadedAt: "2026-12-25" }), { label: "리포트", date: "2027-01-08" });
assert.equal(ddayTarget("완료", d), null);
assert.equal(daysBetween("2026-11-07", "2026-11-10"), 3);
assert.equal(daysBetween("2026-11-07", "2026-11-05"), -2);
// 08:30 KST on Nov 7 is still Nov 6 in UTC
assert.equal(todayKST(new Date("2026-11-06T23:30:00Z")), "2026-11-07");
console.log("date checks ok");
