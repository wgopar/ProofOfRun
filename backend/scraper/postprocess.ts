import fs from "fs";

const filePath = "./data/raw/sf_marathon_athlinks_results.json";
const rawData = fs.readFileSync(filePath, "utf-8");
const results = JSON.parse(rawData);

// Filter out DNF
const cleanedResults = results
  .filter((entry: any) => entry.time !== "DNF" && entry.time?.trim() !== "" ) 
  .map((entry: any) => ({
  ...entry,
  bib: entry.bib?.replace(/^#/, "") , // remove leading #
  time: entry.time?.trim() // trim whitespace if exists
  }));

console.log(`Removed ${results.length - cleanedResults.length} Did not Finish (DNF) entries`);
console.log(`Remaining entries: ${cleanedResults.length}`);

// Deduplicate based on bib number
// seems some pages had entries in other pages
const uniqueResults = Array.from(
  new Map(cleanedResults.map((item: any) => [item.bib, item])).values()
);

console.log(`After deduplication, total unique entries: ${uniqueResults.length}`);
console.log(`Removed ${cleanedResults.length - uniqueResults.length} duplicate entries`);

fs.writeFileSync("./data/processed/sf_marathon_athlinks_results.json", JSON.stringify(uniqueResults, null, 2), "utf-8");
console.log("Cleaned file saved");