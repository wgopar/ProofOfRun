import { chromium } from "playwright";
import fs from "fs";

const results: any[] = [];
let pageNumber = 1;
let hasResults = true;


(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();


  while (hasResults) {
    
    // Full Marathon results. Raw data contains Did Not Finish (DNF) entries. Clean up in post-processing.
    const url = `https://www.athlinks.com/event/1403/results/Event/1119286/Course/2598266/Division/2549324/Split/585521/Results?page=${pageNumber}`;
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Wait for results to load
    await page.waitForSelector(".row.mx-0.link-to-irp");  


    // extract rows
    const pageResults = await page.$$eval(".row.mx-0.link-to-irp", rows =>
      rows.map(row => {
        
        // not including name for privacy reasons
        const bib = row.querySelectorAll("p.MuiTypography-root")[1]?.textContent?.trim();
        const time = row.querySelector(".col-2")?.textContent?.trim();
        return { bib, time };
      })
    );

    results.push(...pageResults);
    console.log(`Page ${pageNumber} scraped: ${pageResults.length} rows`);

    pageNumber += 1;

    if (pageResults.length < 50) {
      console.log("Last page reached or less than 50 results found.");
      hasResults = false;
    }

    await page.waitForTimeout(3000); // wait for 3 seconds before next request
  }

  const jsonData = JSON.stringify(results, null, 2);
  fs.writeFileSync("./data/raw/sf_marathon_athlinks_results.json", jsonData, "utf-8");
  console.log("Results saved to athlinks_results.json");
  await browser.close();

})();