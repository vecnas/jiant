const { chromium } = require("playwright");

const baseUrl = process.env.BASE_URL || "http://localhost:8080";
const url = `${baseUrl}/tests/jquery_compat.html`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  let ignoreMissing404Until = 0;

  page.on("console", msg => {
    const type = msg.type();
    if (type === "error" || type === "warning") {
      const text = msg.text();
      if (type === "error" && /Failed to load resource/i.test(text) && Date.now() < ignoreMissing404Until) {
        return;
      }
      console.error(`[browser:${type}]`, text);
    }
  });
  page.on("pageerror", err => {
    console.error("[browser:pageerror]", err.message);
  });
  page.on("response", res => {
    if (res.status() === 404 && res.url().includes("/tests/fixtures/missing.json")) {
      ignoreMissing404Until = Date.now() + 1000;
    }
  });

  await page.goto(url, { waitUntil: "load" });

  await page.waitForFunction(() => {
    const el = document.querySelector("#qunit-testresult");
    const text = el ? (el.textContent || "") : "";
    return /completed/.test(text) && !/Running/.test(text);
  }, { timeout: 20000 });

  const resultText = await page.$eval("#qunit-testresult", el => el.textContent || "");
  console.log(resultText.trim());

  const failed = await page.$$eval(".fail", nodes => nodes.length);
  if (failed > 0) {
    const qunitHtml = await page.$eval("#qunit-tests", el => el.innerHTML || "");
    console.error("QUnit tests HTML (truncated):");
    console.error(qunitHtml.slice(0, 40000));
  }

  await browser.close();

  if (failed > 0) {
    process.exit(1);
  }
})();
