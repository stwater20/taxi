# 跳表 · Taxi Meter

用手機 GPS 估算計程車車資的網頁跳表。**沒有伺服器、不連線、不記錄任何位置資料。**

如果這個工具幫上了忙，**幫我們按顆 ⭐ 星星**，這是我們持續追蹤各縣市費率調整的動力。

整個專案就是一個 `index.html`。打開就能用，存到手機也能用，載入後拔掉網路照樣運作。

---

## 為什麼要做這個

上車前想知道這趟大概多少錢，或是下車時覺得表跳得怪怪的，總得有個東西可以對一下。市面上的估價 App 幾乎都要你交出行程起訖點，而那是最能描繪一個人生活樣貌的資料之一 —— 家在哪、公司在哪、幾點下班、週末去哪。

這個專案的立場很簡單：**估算車資這件事，完全不需要任何人知道你去了哪裡。** 所有運算都能在你的手機裡做完，那就在你的手機裡做完。

## 隱私設計

這不是隱私權政策上的承諾，是程式結構上做不到：

| 項目 | 狀態 |
| --- | --- |
| 後端伺服器 | 沒有。專案只有靜態檔案 |
| 位置資料上傳 | 沒有。程式碼裡沒有 `fetch`、`XMLHttpRequest`、`sendBeacon`、`WebSocket` |
| cookie / localStorage / IndexedDB | 沒有。連你選的費率都不存，重整就回預設 |
| 分析工具、廣告、第三方 SDK | 沒有 |
| 外部字型、CDN、地圖圖磚 | 沒有。只用系統內建字型，零外部請求 |
| favicon | 內嵌成 data URI。連瀏覽器自動去要 `/favicon.ico` 的那一筆請求都省掉了 |
| 座標保留時間 | 只在記憶體。結束計費時立刻丟棄，關閉分頁即消失 |

再加一道鎖：頁面用 CSP 把對外連線整個關掉。

```
connect-src 'none'
```

意思是**就算程式碼哪天被改壞、或有人塞了惡意的東西進來，瀏覽器也會直接拒絕任何送出資料的嘗試**。這條規則由瀏覽器執行，不需要你相信我。

### 自己驗證

三種方法，由淺到深：

1. **飛航模式** —— 開啟網頁後切飛航模式，跳表照常運作。因為它本來就不需要網路。
2. **開發者工具** —— 打開 Network 分頁，從開始計費到結束，一筆請求都不會出現。
3. **讀原始碼** —— 全部 600 行不到，在同一個檔案裡：

```bash
grep -nE "fetch\(|XMLHttpRequest|sendBeacon|WebSocket|localStorage|sessionStorage|indexedDB|document\.cookie" index.html
# 只會命中說明文字，命不中任何一行程式
```

定位權限本身是瀏覽器給的，你隨時可以在瀏覽器設定裡收回；收回之後這個頁面就只是一個算式。

---

## 功能

- **七段顯示器跳表** —— 車資、里程、乘車時間、延滯計時即時更新
- **延滯計時** —— 時速低於 5 公里（塞車、等紅燈）自動累計，符合公告費率邏輯
- **夜間加成** —— 依「上車時間」自動判定 23:00–06:00
- **費率預設** —— 北北基、桃園，或自訂任何縣市的費率
- **GPS 雜訊過濾** —— 丟棄精度差於 45 公尺的定位、擋掉靜止時的漂移與跳點，避免停著不動車資自己往上跳
- **跳表音效** —— 每次跳表發出機械式的「喀」聲，續程與延滯計時是兩種不同音高，不看螢幕也知道是塞車在跳還是里程在跳。全部用 Web Audio 即時合成，**不載入任何音檔**（那會是網路請求），可在設定裡關掉
- **收據明細** —— 結束後列出起程／續程／延滯／加成各是多少，可複製文字
- **螢幕保持開啟** —— 計費期間用 Wake Lock 防止息屏（可關閉）
- **資料流水帳** —— 畫面下方即時顯示「定位取樣 N · 上傳伺服器 0 · 寫入裝置 0」

## 費率

> **資料最後更新：2026-08-18**　費率隨時可能調整，請以各地方政府交通局／公共運輸處的最新公告為準。

| 縣市 | 起程 | 續程 | 延滯計時 | 夜間加成 |
| --- | --- | --- | --- | --- |
| 台北・新北・基隆 | 1,250 m / 85 元 | 每 200 m 加 5 元 | 每 60 秒加 5 元 | 每趟 +20 元 |
| 桃園 | 1,250 m / 90 元 | 每 200 m 加 5 元 | 每 80 秒加 5 元 | 無 |
| 新竹縣市・苗栗（限竹南、頭份） | 1,250 m / 100 元 | 每 200 m 加 5 元 | 每 80 秒加 5 元 | 每趟 +20 元 |
| 台中 | 1,250 m / 85 元 | 每 200 m 加 5 元 | 每 60 秒加 5 元 | 每趟 +20 元 |
| 彰化 | 1,250 m / 85 元 | 每 200 m 加 5 元 | 每 60 秒加 5 元 | 每趟 +20 元 |
| 南投 | **1,850 m** / 100 元 | 每 200 m 加 5 元 | 每 100 秒加 5 元 | 每趟 +20 元 |
| 台南 | 1,250 m / 85 元 | 每 200 m 加 5 元 | 每 100 秒加 5 元 | **日間運價加兩成** |
| 高雄 | 1,250 m / 85 元 | 每 200 m 加 5 元 | 每 100 秒加 5 元 | **日間運價加兩成** |
| 屏東 | **1,000 m** / 100 元 | 每 200 m 加 5 元 | 每 100 秒加 5 元 | **日間運價加兩成** |
| 宜蘭（白天 06:00–23:00） | 1,500 m / 120 元 | **每 250 m** 加 5 元 | 每 100 秒加 5 元 | — |
| 宜蘭（深夜 23:00–06:00） | 1,250 m / 120 元 | 每 200 m 加 5 元 | 每 100 秒加 5 元 | — |

幾個容易算錯的地方：

- **延滯計時**於**時速 5 公里以下**啟動（塞車、等紅燈、等乘客），各縣市的計時單位從 60 到 100 秒都有。
- **夜間時段為 23:00–06:00，以「上車時間」為準**，跨時段不分段計算。
- **台南、高雄、屏東的夜間加成是百分比**，按日間運價（起程＋續程＋延滯）加兩成，不是固定金額。這點常被其他估價工具算錯。
- **宜蘭沒有夜間加成，而是整套換一組費率**：起跳價同樣 120 元，但深夜的起程距離與續程單位都變短，所以同一段路夜間仍然比較貴。程式裡拆成兩個選項，請依上車時間自行選擇。
- **南投起程 1,850 公尺、屏東起程 1,000 公尺**，跟其他縣市的 1,250 公尺不同。
- **春節加成**每年公告的期間與金額不同（各縣市約 30–50 元）；台南、高雄、屏東另有颱風豪雨假加收 50 元。這些請填在「春節／颱風假等加成」欄位。
- 尚未收錄：嘉義、雲林、花蓮、台東、澎湖、金門、連江。請用「自己填」，或**開個 issue 告訴我們數字，我們補上**。
- 特例：新北市淡水地區小黃起跳價為 100 元；瑞芳、烏來部分景點採固定運價；桃園機場排班另加 15% 停留服務費。這些程式沒有處理。

資料來源：各縣市政府交通局／公共運輸處公告，經 [yoxi 全台費率整理](https://www.yoxi.app/promotion/925)（2026-08 版）交叉比對。

## 使用

打開 <https://your-username.github.io/taxi-meter/>，或：

```bash
git clone https://github.com/your-username/taxi-meter.git
cd taxi-meter
python3 -m http.server 8000
```

然後開 `http://localhost:8000`。

> **注意：** 瀏覽器的定位 API 只在 HTTPS 或 `localhost` 下可用。用 `file://` 直接開檔案，多數瀏覽器會拒絕給定位權限。

### 部署到 GitHub Pages

`.github/workflows/pages.yml` 已經寫好了。到 repo 的 Settings → Pages，把 Source 設成 **GitHub Actions**，推上 main 就會自動發佈。

要照 SecTools 其他工具的慣例掛自己的子網域（例如 `taxi.sectools.tw`），在 repo 根目錄加一個 `CNAME` 檔案寫入網域，再到 DNS 設一筆 CNAME 指向 `<username>.github.io` 即可。

## 準確度

GPS 里程和計程表的機械里程**必然有誤差**，通常在 3–8% 之間。誤差來源：

- 隧道、地下道、高架橋下、高樓密集區的訊號遮蔽
- GPS 取樣是折線，會把彎道抄近路，實際里程通常被低估
- 車上計程表以輪速脈衝計算，那才是法定計費依據

**本工具僅供參考，實際應付車資一律以車內合格計程表為準。** 這個估算不作為交易依據，也不適合拿去申訴 —— 真的有爭議，請記下車牌與時間，撥打 1999 或各縣市交通局申訴專線。

## 技術

零依賴、零建置。原生 HTML / CSS / JavaScript，一個檔案。

- 距離：Haversine 公式，地球半徑取 IUGG 平均值 6,371,008.8 公尺
- 定位：`watchPosition` + `enableHighAccuracy`
- 雜訊門檻：`max(4 公尺, 精度 × 0.6)`，低於此值視為靜止不計里程；精度差於 45 公尺的定位整筆丟棄
- 七段顯示器：執行時用 SVG polygon 生成，未點亮的段落保留微光 —— 真的表就是這樣

### 測試

```bash
node --test        # 不需要 npm install，沒有任何相依套件
```

測試不複製一份計算邏輯來測，而是**直接從 `index.html` 抽出 `fare-math` 區塊執行** —— 測到的就是實際出貨的那份程式碼，不會出現「測試過了但網頁是另一份」的狀況。

CI 另外設了三道守門，任何一道失敗就不給合併：

1. 程式碼中不得出現 `fetch` / `XMLHttpRequest` / `sendBeacon` / `WebSocket` / `localStorage` / `indexedDB` / `document.cookie` 等連線或儲存 API
2. CSP 的 `connect-src 'none'` 必須存在
3. 不得引用任何外部資源（CDN、字型、圖片）

## Roadmap

- [ ] Service Worker，離線重整也能用（取捨：這會用到 Cache Storage，等於在裝置上寫入檔案。雖然快取的只有網頁本身、不含任何位置資料，但會讓「零寫入」的說法變複雜。若要做，必須做成使用者主動開啟的選項，並在介面上明說）
- [ ] 更多縣市費率預設（新竹、嘉義、宜蘭、花東）
- [ ] 春節加成期間自動判定（需要每年更新公告日期）
- [ ] 深色／淺色主題

## 歡迎貢獻

**最有價值的貢獻是費率更新。** 各縣市調整費率時我們不一定會第一時間發現，如果你搭車時發現算出來的跟車上的表差很多，或想補上還沒收錄的縣市（嘉義、雲林、花蓮、台東、澎湖、金門、連江），有兩種方式：

- **開一個 [issue](https://github.com/stwater20/taxi/issues)**，附上縣市與數字就好，寫一句話也可以，我們來改。
- **直接發 PR**：費率全部集中在 `index.html` 的 `PRESETS` 物件裡，改一行就行。記得同步更新 `RATES_UPDATED` 的日期、README 的費率表，以及 `tests/fare.test.mjs` 裡對應的數字 —— CI 會幫你確認算出來的結果合理。

其他 PR 也一律歡迎。唯一的硬性規則：**任何會送出網路請求、或把資料寫進裝置的變更，一律不收。** 這是這個專案存在的理由，CI 也會自動擋下來。

新增費率時請附上來源（縣市政府交通局或公共運輸處的公告連結），這樣下一個人才知道數字從哪裡來、什麼時候該重新確認。

## 關於

這個跳表是 **[SecTools.tw](https://sectools.tw/tools)** 工具集的一員 —— 一堆免費、開放原始碼、免安裝的線上小工具，由 [@stwater20](https://github.com/stwater20) 維護。

同一個系列裡，幾個氣味相投的：

| 工具 | 做什麼 |
| --- | --- |
| [密碼外洩查詢與強度檢測](https://password.sectools.tw/) | 查密碼是否曾外洩、測強度與破解時間。**密碼全程在瀏覽器端處理、絕不外送** —— 跟這個跳表同一套哲學 |
| [新北垃圾車倒數](https://ntpc-trash-countdown.sectools.tw/) · [台北垃圾車倒數](https://tpe-trash-countdown.sectools.tw/) | 選家附近的清運點，即時倒數垃圾車抵達時間，一鍵加進手機日曆 |
| [颱風假機率計算器](https://typhoon.sectools.tw/) | 依停班停課法規門檻與近十年各縣市歷史數據，估算隔天到底放不放 |
| [台灣連假倒數](https://taiwan-holiday-countdown.sectools.tw/) | 下一個連假還有幾天，附「請最少假、休最長假」的攻略 |
| [台灣油價預測](https://oil-price.sectools.tw/) | 依中油浮動油價機制試算下週漲跌，並公開追蹤每次預測的準確度 |
| [台灣資安活動倒數](https://taiwan-security-deadlines.sectools.tw/) | AIS3、臺灣好厲駭、HITCON、CYBERSEC 等報名截止倒數，可訂閱行事曆 |

完整清單在 **[sectools.tw/tools](https://sectools.tw/tools)**。

## 授權

MIT。詳見 [LICENSE](LICENSE)。

---

<details>
<summary>English</summary>

A GPS-based taxi meter for Taiwan, running entirely in the browser.

**No server, no network requests, no storage.** Coordinates live in memory and are discarded the moment the trip ends. The page ships a `connect-src 'none'` Content Security Policy, so the browser itself blocks any attempt to transmit data — you don't have to take my word for it. There is no analytics, no CDN, no external font, and no map tile request.

Verify it yourself: load the page, switch to airplane mode, and the meter keeps working. Or open DevTools → Network and watch nothing happen.

Presets cover Taipei/New Taipei/Keelung and Taoyuan fares; any other rate can be entered manually. Estimates only — the certified meter in the vehicle is the legal basis for the fare.

MIT licensed.

</details>
