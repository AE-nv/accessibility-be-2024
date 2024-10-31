import { launch as launchPuppeteer } from "puppeteer";
import { launch as launchChrome } from "chrome-launcher";
import { createObjectCsvWriter as createCsvWriter } from "csv-writer";
import lighthouse from "lighthouse";
import OpenAI from "openai";

const openAIClient = new OpenAI({
  apiKey: "OPENAI_API_KEY", // TODO replace with OpenAI API key
});

async function categorizeDescription(description) {
  if (!description) return "Uncategorized";

  const prompt = `Categorize the following website description into one of the following categories: E-commerce, Blog, News, Corporate, Government, Health, Education, Technology, Entertainment, or Other.\n\nDescription: "${description}"\n\nCategory:`;
  try {
    const response = await openAIClient.chat.completions.create({
      model: "gpt-4o-mini", // Use GPT-3 or a suitable model
      messages: [{ role: "user", content: prompt }],
    });
    const category = response.data.choices[0].text.trim();
    return category || "Uncategorized";
  } catch (error) {
    console.error("Error categorizing description:", error);
    return "Uncategorized";
  }
}

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

async function appendAccessibilityScores(results) {
  let resultsWithAccessibility = [];

  for (const result of results) {
    try {
      const { accessibilityScore, accessibilityIssues } = await runLighthouse(
        result.url
      );
      const category = await categorizeDescription(result.description);
      console.log(
        `URL: ${result.url}, Accessibility Score: ${accessibilityScore}, Issues: ${accessibilityIssues.length}, Category: ${category}`
      );
      resultsWithAccessibility.push({
        ...result,
        accessibilityScore,
        accessibilityIssues: JSON.stringify(accessibilityIssues),
        category,
      });
    } catch (error) {
      console.error(`Error running Lighthouse on ${result.url}:`, error);
    }
  }

  return resultsWithAccessibility;
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

  let results = [];

  for (let i = 0; i < numPages; i++) {
    const start = i * 10;
    const url = `https://www.google.com/search?q=${searchQuery}&start=${start}`;

    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Extract results
    const pageResults = await page.evaluate(async () => {
      let results = [];
      const items = document.querySelectorAll("div.g");

      for (let i = 0; i < items.length; i++) {
        const title = items[i].querySelector("h3")
          ? items[i].querySelector("h3").innerText
          : "";
        const url = items[i].querySelector("a")
          ? items[i].querySelector("a").href
          : "";
        const description = items[i].querySelector(".VwiC3b")
          ? items[i].querySelector(".VwiC3b").innerText
          : "";

        if (title && url) {
          results.push({ title, url, description });
        }
      }

      return results;
    });

    results = results.concat(pageResults);
  }

  results = await appendAccessibilityScores(results);

  await browser.close();

  // Write to CSV file
  await csvWriter.writeRecords(results);
  console.log("Results saved to accessibility_results.csv");
}

const searchQuery = "site:.be";
const numPages = 1;
scrapeGoogle(searchQuery, numPages);
