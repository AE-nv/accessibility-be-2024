import { launch as launchPuppeteer } from "puppeteer";
import { launch as launchChrome } from "chrome-launcher";
import { createObjectCsvWriter as createCsvWriter } from "csv-writer";
import fs from 'fs';
import csv from 'csv-parser';
import lighthouse from "lighthouse";

async function runLighthouse(url) {
  const chrome = await launchChrome({ chromeFlags: ["--headless"] });
  const options = {
    onlyCategories: ["accessibility"],
    output: "json",
    port: chrome.port,
    timeout: 180000, // 3-minute timeout per audit
  };

  let accessibilityScore;
  let accessibilityIssues = [];

  try {
    const runnerResult = await lighthouse(url, options);
    accessibilityScore = runnerResult.lhr.categories.accessibility.score * 100; // Score out of 100

    // Extract accessibility issues (failed audits)
    const audits = runnerResult.lhr.audits;
    for (const auditId in audits) {
      const audit = audits[auditId];
      if (audit.score !== 1 && audit.details) {
        const issue = {
          id: auditId,
          title: audit.title,
          description: audit.description,
          details: audit.details.items || [],
        };
        accessibilityIssues.push(issue);
      }
    }
  } catch (error) {
    console.error(`Error running Lighthouse on ${url}:`, error);
  } finally {
    await chrome.kill(); // Ensure Chrome is closed
  }

  return { accessibilityScore, accessibilityIssues };
}

async function scrapeGoogle(searchQuery, numPages) {
  const browser = await launchPuppeteer({ headless: true });
  const page = await browser.newPage();

  // Configure CSV writer
  const csvWriter = createCsvWriter({
    path: "accessibility_results.csv",
    header: [
      { id: "title", title: "Title" },
      { id: "url", title: "URL" },
      { id: "description", title: "Description" },
      { id: "accessibilityScore", title: "Accessibility Score" },
      { id: "accessibilityIssues", title: "Accessibility Issues" },
      { id: "category", title: "Category" },
    ],
  });

  let urls = [];
  let results = [];

  fs.createReadStream('top10-belgian.csv')
    .pipe(csv())
    .on('data', (row) => {
      urls.push(row['Domain'])
    })
    .on('end', async () => {
      console.log(urls);

      for (const url of urls){
        console.log(url);
        try {
          const { accessibilityScore, accessibilityIssues } = await runLighthouse("https://" + url);
            results.push({
              url: url,
              accessibilityScore: accessibilityScore,
              accessibilityIssues: JSON.stringify(accessibilityIssues)
            })
          } catch (error){
            console.error(`Error running Lighthouse for ${url}: `, error)
          }
      }
      
      await browser.close();
      // Write to CSV file
      await csvWriter.writeRecords(results);
      console.log("Results saved to accessibility_results.csv");
    })
}

const searchQuery = "site:.be";
const numPages = 1;
scrapeGoogle(searchQuery, numPages);
