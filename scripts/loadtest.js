// scripts/loadtest.js
// Usage: node scripts/loadtest.js http://localhost:3000/<code> 1000 50
//        URL, totalRequests, concurrency

const [url, totalStr, concStr] = process.argv.slice(2);
if (!url) {
  console.error("Usage: node scripts/loadtest.js <url> [totalRequests=500] [concurrency=25]");
  process.exit(1);
}

const totalRequests = Number(totalStr || 500);
const concurrency = Number(concStr || 25);

function nowMs() {
  const [s, ns] = process.hrtime();
  return s * 1000 + ns / 1e6;
}

async function worker(id, count) {
  const latencies = [];
  for (let i = 0; i < count; i++) {
    const t0 = nowMs();
    const res = await fetch(url, { redirect: "manual" });
    const t1 = nowMs();
    latencies.push(t1 - t0);

    if (res.status !== 302 && res.status !== 301 && res.status !== 200 && res.status !== 404) {
      console.error("Unexpected status:", res.status);
    }
  }
  return latencies;
}

function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

(async () => {
  const perWorker = Math.floor(totalRequests / concurrency);
  const remainder = totalRequests % concurrency;

  const tasks = [];
  for (let i = 0; i < concurrency; i++) {
    const n = perWorker + (i < remainder ? 1 : 0);
    tasks.push(worker(i, n));
  }

  const start = nowMs();
  const results = await Promise.all(tasks);
  const end = nowMs();

  const latencies = results.flat();
  const total = latencies.length;

  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);
  const avg = latencies.reduce((a, b) => a + b, 0) / total;

  const durationSec = (end - start) / 1000;
  const rps = total / durationSec;

  console.log("---- Load Test Results ----");
  console.log("URL:", url);
  console.log("Total requests:", total);
  console.log("Concurrency:", concurrency);
  console.log("Duration (s):", durationSec.toFixed(2));
  console.log("Throughput (RPS):", rps.toFixed(1));
  console.log("Latency avg (ms):", avg.toFixed(2));
  console.log("Latency p50 (ms):", p50.toFixed(2));
  console.log("Latency p95 (ms):", p95.toFixed(2));
  console.log("Latency p99 (ms):", p99.toFixed(2));
})();
