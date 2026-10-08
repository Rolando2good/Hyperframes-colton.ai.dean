// Records a slow, legible walkthrough of merendonarchive.com as an MP4.
//
// Setup:
//   1. Copy .env.example to .env (if you haven't already) and fill in:
//        MERENDON_EMAIL=you@example.com
//        MERENDON_PASSWORD=your-password
//      .env is gitignored — never commit it.
//   2. npx playwright install chromium   (one-time, already done if you ran this via /setup)
//
// Run:
//   node --env-file=.env scripts/record-website-demo.mjs
//
// Output:
//   renders/website-demo/<timestamp>.mp4  (raw Playwright capture is .webm; this script
//   re-encodes it to .mp4 with ffmpeg so it's easy to drop into an editor or share)

import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, renameSync, rmSync, existsSync } from "node:fs";
import path from "node:path";

const BASE_URL = "https://merendonarchive.com";
const OUT_DIR = path.resolve("renders/website-demo");
const RAW_DIR = path.join(OUT_DIR, "_raw");

// How deliberately the walkthrough moves. Bump these up for an even slower,
// easier-to-follow recording; drop them for a snappier one.
const SLOW_MO_MS = 350; // delay Playwright inserts between every action
const STEP_PAUSE_MS = 1200; // pause we insert between logical steps
const TYPE_DELAY_MS = 60; // per-character typing delay (visible typing effect)

const email = process.env.MERENDON_EMAIL;
const password = process.env.MERENDON_PASSWORD;

if (!email || !password) {
  console.error(
    "Missing MERENDON_EMAIL / MERENDON_PASSWORD.\n" +
      "Add them to .env (see .env.example) and run with:\n" +
      "  node --env-file=.env scripts/record-website-demo.mjs"
  );
  process.exit(1);
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function slowType(locator, text) {
  await locator.click();
  await locator.pressSequentially(text, { delay: TYPE_DELAY_MS });
}

async function login(page) {
  console.log("[1/3] Logging in...");
  await page.getByRole("button", { name: "Log In" }).click();
  await page.waitForSelector("#email", { state: "visible" });
  await pause(STEP_PAUSE_MS);

  await slowType(page.locator("#email"), email);
  await pause(STEP_PAUSE_MS / 2);

  await slowType(page.locator("#password"), password);
  await pause(STEP_PAUSE_MS / 2);

  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForLoadState("networkidle");
  await pause(STEP_PAUSE_MS);
}

// TODO — fill this in once the course-creation click path is confirmed.
// Expected shape: open the course dashboard, start a new course, upload a
// chapter file, and walk through whatever confirmation/naming steps follow.
// Replace the selectors below with the real ones (prefer page.getByRole /
// getByLabel / getByText over brittle CSS selectors, matching the style of
// login() above). Sprinkle `await pause(STEP_PAUSE_MS)` between steps so the
// recording stays easy to follow.
async function createCourseFromChapter(page) {
  console.log("[2/3] Creating a course from an uploaded chapter...");
  console.warn(
    "  -> createCourseFromChapter() is a placeholder. Describe the real " +
      "click path (menu labels, button text, upload step) and this function " +
      "gets filled in before the next run."
  );

  // Example of the pattern to follow once real selectors are known:
  // await page.getByRole("link", { name: "My Courses" }).click();
  // await pause(STEP_PAUSE_MS);
  // await page.getByRole("button", { name: "New Course" }).click();
  // await pause(STEP_PAUSE_MS);
  // const fileInput = page.locator('input[type="file"]');
  // await fileInput.setInputFiles("path/to/chapter.pdf");
  // await pause(STEP_PAUSE_MS);
  // await page.getByRole("button", { name: "Create Course" }).click();
  // await pause(STEP_PAUSE_MS);
}

function convertToMp4(webmPath, mp4Path) {
  console.log("[3/3] Encoding to MP4...");
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      webmPath,
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "20",
      "-pix_fmt",
      "yuv420p",
      "-r",
      "30",
      mp4Path,
    ],
    { stdio: "inherit" }
  );
}

async function main() {
  mkdirSync(RAW_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: false, slowMo: SLOW_MO_MS });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: RAW_DIR, size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();

  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await pause(STEP_PAUSE_MS);

    await login(page);
    await createCourseFromChapter(page);
  } finally {
    await context.close(); // video only finishes writing after the context closes
    await browser.close();
  }

  const [rawFile] = readdirSync(RAW_DIR).filter((f) => f.endsWith(".webm"));
  if (!rawFile) {
    console.error("No recording was produced — check the run above for errors.");
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const webmPath = path.join(RAW_DIR, rawFile);
  const mp4Path = path.join(OUT_DIR, `${timestamp}.mp4`);

  convertToMp4(webmPath, mp4Path);
  rmSync(webmPath);
  if (existsSync(mp4Path)) {
    console.log(`Done: ${mp4Path}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
