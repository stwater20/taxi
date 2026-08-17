// 零相依。直接從 index.html 抽出 fare-math 區塊執行 ——
// 測的是實際出貨的那份程式碼，不是複製品。
//   node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";


const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const raw = html.split("fare-math:start")[1]?.split("fare-math:end")[0];
assert.ok(raw, "index.html 裡找不到 fare-math 標記區塊");
// 標記本身寫在註解裡，切掉頭尾殘留的註解片段
const block = raw.slice(raw.indexOf("*/") + 2, raw.lastIndexOf("/*"));

const { computeFare } = await import(
  "data:text/javascript," + encodeURIComponent(block + "\nexport { computeFare };")
);

// 與 index.html 的 PRESETS 對應。改費率時兩邊都要動，這裡的測試就是提醒。
const RATES = {
  北北基:   { base:85,  baseDist:1250, stepDist:200, step:5, waitSec:60,  wait:5, night:20, nightPct:0  },
  桃園:     { base:90,  baseDist:1250, stepDist:200, step:5, waitSec:80,  wait:5, night:0,  nightPct:0  },
  新竹:     { base:100, baseDist:1250, stepDist:200, step:5, waitSec:80,  wait:5, night:20, nightPct:0  },
  台中:     { base:85,  baseDist:1250, stepDist:200, step:5, waitSec:60,  wait:5, night:20, nightPct:0  },
  彰化:     { base:85,  baseDist:1250, stepDist:200, step:5, waitSec:60,  wait:5, night:20, nightPct:0  },
  南投:     { base:100, baseDist:1850, stepDist:200, step:5, waitSec:100, wait:5, night:20, nightPct:0  },
  台南高雄: { base:85,  baseDist:1250, stepDist:200, step:5, waitSec:100, wait:5, night:0,  nightPct:20 },
  屏東:     { base:100, baseDist:1000, stepDist:200, step:5, waitSec:100, wait:5, night:0,  nightPct:20 },
  宜蘭日:   { base:120, baseDist:1500, stepDist:250, step:5, waitSec:100, wait:5, night:0,  nightPct:0  },
  宜蘭夜:   { base:120, baseDist:1250, stepDist:200, step:5, waitSec:100, wait:5, night:0,  nightPct:0  }
};
const fare = (m, idle, r, night = false) => computeFare(m, idle, RATES[r], night).total;

test("起程運價：起程距離內一律只收起跳價", () => {
  assert.equal(fare(0, 0, "北北基"), 85);
  assert.equal(fare(800, 0, "北北基"), 85);
  assert.equal(fare(1250, 0, "北北基"), 85);   // 剛好走完起程距離，還沒跳
  assert.equal(fare(0, 0, "桃園"), 90);
});

test("續程運價：超過起程距離後每 200 公尺跳一次，不足一段仍以一段計", () => {
  assert.equal(fare(1251, 0, "北北基"), 90);   // 多走 1 公尺就跳第一次
  assert.equal(fare(1450, 0, "北北基"), 90);   // 剛好第一段結束
  assert.equal(fare(1451, 0, "北北基"), 95);
  assert.equal(fare(3000, 0, "北北基"), 130);
  assert.equal(fare(5000, 0, "北北基"), 180);
  assert.equal(fare(10000, 0, "北北基"), 305);
});

test("延滯計時：未滿一個計時單位不跳表", () => {
  assert.equal(fare(1000, 59, "北北基"), 85);
  assert.equal(fare(1000, 60, "北北基"), 90);
  assert.equal(fare(1000, 125, "北北基"), 95);
  assert.equal(fare(1000, 99, "台南高雄"), 85);   // 台南高雄是每 100 秒
  assert.equal(fare(1000, 100, "台南高雄"), 90);
  assert.equal(fare(1000, 79, "桃園"), 90);       // 桃園是每 80 秒
  assert.equal(fare(1000, 80, "桃園"), 95);
});

test("夜間加成（定額）：北北基、台中每趟固定加 20 元", () => {
  assert.equal(fare(3000, 0, "北北基", true), 150);
  assert.equal(fare(3000, 0, "台中", true), 150);
  assert.equal(fare(3000, 0, "北北基", false), 130);
});

test("夜間加成（比例）：台南高雄依日間運價加兩成", () => {
  assert.equal(fare(3000, 0, "台南高雄", false), 130);
  assert.equal(fare(3000, 0, "台南高雄", true), 156);   // 130 × 1.2
  assert.equal(fare(1250, 0, "台南高雄", true), 102);   // 85 × 1.2 = 102
});

test("夜間加成計入延滯計時後的金額", () => {
  const r = RATES["台南高雄"];
  const day = computeFare(3000, 200, r, false);
  const night = computeFare(3000, 200, r, true);
  assert.equal(day.total, 140);                          // 85 + 45 + 10
  assert.equal(night.nightFee, Math.round(140 * 0.2));
  assert.equal(night.total, 168);
});

test("桃園沒有夜間加成", () => {
  assert.equal(fare(3000, 0, "桃園", true), fare(3000, 0, "桃園", false));
});

test("春節／其他加成直接疊加在最後", () => {
  const r = { ...RATES["北北基"], extra: 30 };
  assert.equal(computeFare(3000, 0, r, false).total, 160);
  // 額外加成不列入夜間加成的計算基礎
  assert.equal(computeFare(3000, 0, { ...RATES["台南高雄"], extra: 50 }, true).total, 206);
});

test("負里程、缺欄位等異常輸入不會算出怪數字", () => {
  assert.equal(fare(-500, 0, "北北基"), 85);
  const bare = { base:85, baseDist:1250, stepDist:200, step:5, waitSec:60, wait:5 };
  const out = computeFare(3000, 0, bare, true);
  assert.equal(out.nightFee, 0);      // 沒設定夜間加成就不加
  assert.equal(out.total, 130);
});

test("起程距離不是每個縣市都一樣", () => {
  // 南投 1850 公尺才跳第一次，屏東 1000 公尺就跳
  assert.equal(fare(1850, 0, "南投"), 100);
  assert.equal(fare(1851, 0, "南投"), 105);
  assert.equal(fare(1000, 0, "屏東"), 100);
  assert.equal(fare(1001, 0, "屏東"), 105);
  assert.equal(fare(1500, 0, "宜蘭日"), 120);
  assert.equal(fare(1501, 0, "宜蘭日"), 125);
});

test("宜蘭深夜是換一整套費率，不是在日間費率上加成", () => {
  // 起跳價一樣是 120，但起程距離與續程單位都變短，所以同一段路夜間比較貴
  assert.equal(RATES.宜蘭日.base, RATES.宜蘭夜.base);
  assert.ok(fare(5000, 0, "宜蘭夜") > fare(5000, 0, "宜蘭日"));
  assert.equal(fare(5000, 0, "宜蘭日"), 190);
  assert.equal(fare(5000, 0, "宜蘭夜"), 215);
  // 兩者都不該再疊夜間加成
  assert.equal(fare(5000, 0, "宜蘭夜", true), fare(5000, 0, "宜蘭夜", false));
});

test("續程單位不是每個縣市都 200 公尺", () => {
  // 宜蘭白天是每 250 公尺才跳一次
  assert.equal(RATES.宜蘭日.stepDist, 250);
  assert.equal(fare(1750, 0, "宜蘭日"), 125);
  assert.equal(fare(1751, 0, "宜蘭日"), 130);
});

test("同一趟路，各縣市算出來的車資都在合理範圍", () => {
  for (const [name, r] of Object.entries(RATES)) {
    const total = computeFare(5000, 0, r, false).total;
    assert.ok(total >= r.base, `${name} 車資不該低於起跳價`);
    assert.ok(total > 100 && total < 400, `${name} 走 5 公里算出 ${total} 元，超出合理範圍`);
  }
});

test("明細各項相加等於總計", () => {
  for (const name of Object.keys(RATES)) {
    for (const night of [false, true]) {
      const r = { ...RATES[name], extra: 20 };
      const b = computeFare(7321, 247, r, night);
      assert.equal(
        b.total, r.base + b.stepFee + b.waitFee + b.nightFee + b.extra,
        `${name} 夜間=${night} 明細與總計不符`
      );
    }
  }
});
