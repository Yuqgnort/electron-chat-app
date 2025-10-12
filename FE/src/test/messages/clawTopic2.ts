import axios from "axios";
import * as cheerio from "cheerio";
import robotsParser from "robots-parser";
import fs from "fs";
import pLimit from "p-limit";

// ---- cấu hình ----
const START_URL = "https://vnexpress.net/";
const BASE_DOMAIN = "vnexpress.net";
const USER_AGENT = "MyCrawler/1.0 (FastMode)";
const RATE_LIMIT = 0.1; // giây giữa các request (100ms)
const TARGET_PAIRS = 50000;
const MIN_LEN = 80;
const MAX_LEN = 120;
const CONCURRENCY = 25; // số request song song
const PROGRESS_INTERVAL = 200;

// ---- setup session ----
const axiosInstance = axios.create({
  headers: { "User-Agent": USER_AGENT },
  timeout: 5000,
  maxRedirects: 2,
});

// ---- kiểm tra robots.txt ----
async function loadRobots() {
  try {
    const res = await axiosInstance.get("https://vnexpress.net/robots.txt");
    return robotsParser("https://vnexpress.net/robots.txt", res.data);
  } catch {
    console.warn("⚠️ Bỏ qua kiểm tra robots.txt");
    return robotsParser("https://vnexpress.net/robots.txt", "");
  }
}

function sleep(ms = 100) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractParagraphs(html = ""): string[] {
  const $ = cheerio.load(html);
  $("script, style, noscript, iframe").remove();
  const texts: string[] = [];
  $("p").each((_, el) => {
    let t = $(el).text().trim();
    if (t.length >= MIN_LEN) {
      if (t.length > MAX_LEN) {
        const start = Math.floor(Math.random() * (t.length - MIN_LEN));
        t = t.substring(start, start + MAX_LEN);
      }
      texts.push(t.replace(/\s+/g, " "));
    }
  });
  return texts;
}

async function crawl() {
  const robots = await loadRobots();
  const visited = new Set();
  const frontier = [START_URL];
  const texts: string[] = [];
  const limit = pLimit(CONCURRENCY);

  const startTime = Date.now();

  while (frontier.length && texts.length < TARGET_PAIRS) {
    const batch = frontier.splice(0, CONCURRENCY);
    await Promise.all(
      batch.map((url) =>
        limit(async () => {
          if (visited.has(url)) return;
          visited.add(url);
          // nếu muốn bỏ kiểm tra robots.txt, hãy comment dòng dưới
          if (!robots.isAllowed(url, USER_AGENT)) return;

          try {
            const res = await axiosInstance.get(url);
            const html = res.data;
            const snippets = extractParagraphs(html);
            for (const t of snippets) {
              texts.push(t);

              if (
                texts.length % PROGRESS_INTERVAL === 0 ||
                texts.length === TARGET_PAIRS
              ) {
                const percent = ((texts.length / TARGET_PAIRS) * 100).toFixed(
                  1
                );
                const elapsed = (Date.now() - startTime) / 1000;
                const rate = texts.length / elapsed;
                const remaining = (TARGET_PAIRS - texts.length) / rate;
                process.stdout.write(
                  `\r🚀 ${percent}% (${texts.length}/${TARGET_PAIRS}) — ${rate.toFixed(
                    1
                  )} đoạn/s — ETA: ${(remaining / 60).toFixed(1)} phút`
                );
              }

              if (texts.length >= TARGET_PAIRS) break;
            }

            const $ = cheerio.load(html);
            $("a[href]").each((_, a) => {
              const href = $(a).attr("href");
              if (!href) return;
              const full = new URL(href, url).toString().split("#")[0];
              if (full.includes(BASE_DOMAIN) && !visited.has(full))
                frontier.push(full);
            });

            await sleep(RATE_LIMIT * 1000);
          } catch {
            return;
          }
        })
      )
    );
  }

  console.log(`\n✅ Collected ${texts.length} text snippets.`);
  fs.writeFileSync(
    "vnexpress_texts_fast2.json",
    JSON.stringify(texts, null, 2),
    "utf8"
  );
  console.log("💾 Saved to vnexpress_texts_fast2.json");
}

crawl();
