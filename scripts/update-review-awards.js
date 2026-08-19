#!/usr/bin/env node

// Updates the Booking review cards on the six home pages: the Traveller
// Review Award year and the two scores. Booking blocks automated fetches, so
// the scores have to be read from the extranet (or the public listing) by hand
// and passed in here.

const fs = require("fs");
const path = require("path");

// The English page writes ratings with a decimal point, the others a comma.
const LANGS = [
  { code: "fr", decimal: "," },
  { code: "en", decimal: "." },
  { code: "de", decimal: "," },
  { code: "nl", decimal: "," },
  { code: "it", decimal: "," },
  { code: "es", decimal: "," },
];

const CARDS = [
  { key: "villa", url: "https://www.booking.com/hotel/fr/villa-en-provence-6-pers.html" },
  { key: "studios", url: "https://www.booking.com/hotel/fr/les-celestins-chambres-d-hotes.fr.html" },
];

function printUsage() {
  console.log(`Usage: node scripts/update-review-awards.js [options]

Options:
  --year <year>       Traveller Review Award year (default: current year)
  --villa <score>     Booking score of the villa, e.g. 9.3
  --studios <score>   Booking score of the two studios, e.g. 9.6
  --dry-run           Report what would change without writing
  --help              Show this message

Scores to read on Booking (automated fetches are blocked):
${CARDS.map((card) => `  ${card.key}: ${card.url}`).join("\n")}
`);
}

function parseArgs(argv) {
  const options = { year: String(new Date().getFullYear()), dryRun: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--year" || arg === "--villa" || arg === "--studios") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}`);
      }
      options[arg.slice(2)] = value;
      index += 1;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!/^\d{4}$/.test(options.year)) {
    throw new Error(`Invalid year: ${options.year}`);
  }
  ["villa", "studios"].forEach((key) => {
    if (options[key] !== undefined && !/^\d{1,2}([.,]\d)?$/.test(options[key])) {
      throw new Error(`Invalid score for --${key}: ${options[key]}`);
    }
  });

  return options;
}

// The two Booking cards are told apart by their listing URL, so the labels can
// keep being translated freely.
function scoreBlock(html, url) {
  const anchor = html.indexOf(`href="${url}"`);
  if (anchor === -1) {
    return null;
  }
  const scoreStart = html.indexOf('<span class="score">', anchor);
  const scoreEnd = html.indexOf("<span>", scoreStart);
  if (scoreStart === -1 || scoreEnd === -1) {
    return null;
  }
  return { start: scoreStart + '<span class="score">'.length, end: scoreEnd };
}

function updatePage(lang, options) {
  const file = path.join(lang.code, "index.html");
  const before = fs.readFileSync(file, "utf8");
  let html = before;
  const changes = [];

  const awardBefore = (html.match(/Traveller Review Award \d{4}/g) || []).length;
  html = html.replace(/Traveller Review Award \d{4}/g, (match) => {
    if (match !== `Traveller Review Award ${options.year}`) {
      changes.push(`${match} -> Traveller Review Award ${options.year}`);
    }
    return `Traveller Review Award ${options.year}`;
  });
  if (awardBefore !== CARDS.length) {
    throw new Error(`${file}: expected ${CARDS.length} award labels, found ${awardBefore}`);
  }

  CARDS.forEach((card) => {
    const score = options[card.key];
    if (score === undefined) {
      return;
    }
    const block = scoreBlock(html, card.url);
    if (!block) {
      throw new Error(`${file}: score not found for ${card.key}`);
    }
    const current = html.slice(block.start, block.end);
    const wanted = score.replace(/[.,]/, lang.decimal);
    if (current !== wanted) {
      changes.push(`${card.key} ${current} -> ${wanted}`);
      html = html.slice(0, block.start) + wanted + html.slice(block.end);
    }
  });

  if (html !== before && !options.dryRun) {
    fs.writeFileSync(file, html);
  }
  return changes;
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    printUsage();
    process.exit(1);
  }

  if (options.help) {
    printUsage();
    return;
  }

  let total = 0;
  LANGS.forEach((lang) => {
    const changes = updatePage(lang, options);
    total += changes.length;
    console.log(`${lang.code}: ${changes.length ? changes.join(", ") : "already up to date"}`);
  });

  console.log(`\n${total} change${total === 1 ? "" : "s"}${options.dryRun ? " (dry run)" : ""}.`);
}

main();
