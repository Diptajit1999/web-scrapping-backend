
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
require("dotenv").config();

puppeteer.use(StealthPlugin());

const app = express();
const port = process.env.port || 3001;

app.use(bodyParser.json());
app.use(cors());

let articles = [];

const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1",
];

function delay(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

const minDelay = 1000; // 1 second
const maxDelay = 2000; // 2 seconds

app.post("/scrape", async (req, res) => {
  const { topic } = req.body;
  console.log("topic->", topic);

  if (!topic) {
    return res.status(400).json({ error: "Topic is required" });
  }

  try {
    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    console.log(randomUserAgent);

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent(randomUserAgent);

    await page.goto(`https://medium.com/search?q=${encodeURIComponent(topic)}`, { waitUntil: "networkidle2" });

    const articleElements = await page.$$("article");
    console.log("articleElements->", articleElements);

    const articles = await Promise.all(
      articleElements.slice(0, 5).map(async (article) => {
        try {
          const title = await article.$eval("h2", (el) => el.innerText);
          console.log("title->",title)
          const author = await article.$eval("p", (el) => el.innerText);
          console.log("author->",author)
          const date = await article.$eval("span", (el) => (el.innerText).toString());
          console.log("date->",date)
          const url = await article.$eval("a", (el) => el.href);
          console.log("url->",url)

          return { title, author, date, url };
        } catch (err) {
          console.error("Error extracting article details:", err);
          return null;
        }
      })
      
    );

    const filteredArticles = articles.filter(article => article !== null);
    console.log("articles->", filteredArticles);

    await browser.close();
    res.json(filteredArticles);
  } catch (error) {
    console.error("Error scraping Medium articles:", error);
    res.status(500).json({ error: "Error scraping Medium articles" });
  }

  await delay(Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay);
});

app.get("/articles", (req, res) => {
  res.json(articles);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
