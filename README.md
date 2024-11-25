# Accessibility of Belgian websites 2024

https://aewiki.atlassian.net/wiki/spaces/KEN/pages/4703191064/Accessibility+Report+for+Belgian+.be+websites+-+2024

### Running the Project
**Prerequisites**

* Install Node.js. This 2024 version is created with Node 22. 

* Obtain an OpenAI API key. Instructions here.

* Ensure Google Chrome is installed (required for Lighthouse).

**Installation**

Clone the repository:


```
git clone https://github.com/AE-nv/accessibility-be-2024 
cd accessibility-be-2024
```

**Install the required dependencies:**

```
npm install
```
**Configuration**

* Replace "OPENAI_API_KEY" in the code with your OpenAI API key.

* You can adjust numPages to control how many pages of search results to analyze.

**Running the Script**

Start the script by running:
```
node googleScraper.mjs
```
This will:

* Search Google for .be websites.
* Use OpenAI to categorize websites based on their descriptions.
* Run Lighthouse audits on each URL, capturing accessibility scores and issues.
* Save the results, including URLs, titles, descriptions, accessibility scores, issues, and categories, to accessibility_results.csv.

**Output**

The results file accessibility_results.csv will be saved in the project folder, containing detailed accessibility insights for each site.