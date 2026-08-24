#!/usr/bin/env node

const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");

const ACCOMMODATIONS = [
  { key: "villa", label: "Villa" },
  { key: "cabanon", label: "Cabanon" },
  { key: "roseraie", label: "Roseraie" },
];

const DEFAULT_OUTPUT = path.join("assets", "data", "availability.json");
const MANUAL_CLOSURES = path.join("assets", "data", "manual-closures.json");

function printUsage() {
  console.log(`Usage: node scripts/generate-availability.js [options]

Options:
  --out <path>              JSON output path (default: ${DEFAULT_OUTPUT})
  --villa-file <path>       Local ICS file for Villa
  --cabanon-file <path>     Local ICS file for Cabanon
  --roseraie-file <path>    Local ICS file for Roseraie
  --villa-url <url>         ICS URL for Villa
  --cabanon-url <url>       ICS URL for Cabanon
  --roseraie-url <url>      ICS URL for Roseraie
  --help                    Show this help

Environment:
  BOOKING_ICAL_VILLA_URL, BOOKING_ICAL_CABANON_URL, BOOKING_ICAL_ROSERAIE_URL
  BOOKING_ICAL_VILLA_FILE, BOOKING_ICAL_CABANON_FILE, BOOKING_ICAL_ROSERAIE_FILE
  AVAILABILITY_OUTPUT
`);
}

function parseArgs(argv) {
  const args = { files: {}, urls: {}, out: process.env.AVAILABILITY_OUTPUT || DEFAULT_OUTPUT };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }

    const match = arg.match(/^--(villa|cabanon|roseraie)-(file|url)$/);
    if (match) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}`);
      }
      args[`${match[2]}s`][match[1]] = value;
      index += 1;
      continue;
    }

    if (arg === "--out") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --out");
      }
      args.out = value;
      index += 1;
      continue;
    }

    throw new Error("Unknown argument");
  }

  return args;
}

function envName(key, suffix) {
  return `BOOKING_ICAL_${key.toUpperCase()}_${suffix}`;
}

function resolveSource(accommodation, args) {
  const key = accommodation.key;
  const file = args.files[key] || process.env[envName(key, "FILE")];
  const url = args.urls[key] || process.env[envName(key, "URL")];

  if (file) {
    return { type: "file", value: file };
  }
  if (url) {
    return { type: "url", value: url };
  }
  return null;
}

async function readSource(source) {
  if (source.type === "file") {
    try {
      return await fs.promises.readFile(source.value, "utf8");
    } catch (error) {
      throw new Error("Could not read local ICS file");
    }
  }
  return fetchText(source.value);
}

const MAX_REDIRECTS = 5;

function fetchText(url, redirectsLeft = MAX_REDIRECTS) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (error) {
      reject(new Error("Invalid calendar URL"));
      return;
    }

    const client = parsed.protocol === "http:" ? http : https;
    if (!["http:", "https:"].includes(parsed.protocol)) {
      reject(new Error("Calendar URL must use http or https"));
      return;
    }

    const request = client.get(parsed, { headers: { "User-Agent": "gites-les-celestins-availability/1.0" } }, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
        response.resume();
        if (redirectsLeft <= 0) {
          reject(new Error("Calendar request exceeded redirect limit"));
          return;
        }
        const redirectedUrl = new URL(response.headers.location, parsed).toString();
        fetchText(redirectedUrl, redirectsLeft - 1).then(resolve, reject);
        return;
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        reject(new Error(`Calendar request failed with HTTP ${response.statusCode}`));
        return;
      }

      response.setEncoding("utf8");
      let body = "";
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => resolve(body));
    });

    request.setTimeout(30000, () => {
      request.destroy(new Error("Calendar request timed out"));
    });
    request.on("error", reject);
  });
}

function unfoldIcsLines(content) {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .reduce((lines, line) => {
      if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
        lines[lines.length - 1] += line.slice(1);
      } else {
        lines.push(line);
      }
      return lines;
    }, []);
}

function parseIcs(content) {
  const lines = unfoldIcsLines(content);
  const events = [];
  let current = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current && current.dtstart && current.dtend) {
        events.push({
          start: current.dtstart.value,
          end: current.dtend.value,
          allDay: current.dtstart.isDate && current.dtend.isDate,
        });
      }
      current = null;
      continue;
    }
    if (!current) {
      continue;
    }

    const parsed = parseProperty(line);
    if (!parsed) {
      continue;
    }
    if (parsed.name === "DTSTART") {
      current.dtstart = parseIcsDate(parsed.value, parsed.params);
    }
    if (parsed.name === "DTEND") {
      current.dtend = parseIcsDate(parsed.value, parsed.params);
    }
  }

  return events.sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
}

function parseProperty(line) {
  const separator = line.indexOf(":");
  if (separator === -1) {
    return null;
  }

  const head = line.slice(0, separator);
  const value = line.slice(separator + 1);
  const parts = head.split(";");
  const name = parts[0].toUpperCase();
  const params = {};

  for (const part of parts.slice(1)) {
    const equal = part.indexOf("=");
    if (equal !== -1) {
      params[part.slice(0, equal).toUpperCase()] = part.slice(equal + 1);
    }
  }

  return { name, params, value };
}

function parseIcsDate(value, params) {
  const isDate = params.VALUE === "DATE" || /^\d{8}$/.test(value);
  if (isDate) {
    return { value: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`, isDate: true };
  }

  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!match) {
    throw new Error(`Unsupported ICS date format: ${value}`);
  }

  const [, year, month, day, hour, minute, second, utc] = match;
  const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}${utc ? "Z" : ""}`;
  return { value: iso, isDate: false };
}

function toPublicAvailability(accommodation, source, events, error, timestamp) {
  return {
    label: accommodation.label,
    sourceConfigured: Boolean(source),
    updatedAt: source ? timestamp : null,
    busy: events.map((event) => ({
      start: event.start,
      end: event.end,
      allDay: event.allDay,
    })),
    error: error ? error.message : null,
  };
}

async function readManualClosures(filePath) {
  let raw;
  try {
    raw = await fs.promises.readFile(filePath, "utf8");
  } catch (error) {
    return {};
  }

  const parsed = JSON.parse(raw);
  const closures = parsed && parsed.closures ? parsed.closures : {};
  const byKey = {};

  Object.keys(closures).forEach((key) => {
    const ranges = Array.isArray(closures[key]) ? closures[key] : [];
    byKey[key] = ranges.map((range) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(range.start) || !/^\d{4}-\d{2}-\d{2}$/.test(range.end)) {
        throw new Error(`Invalid manual closure for ${key}: ${JSON.stringify(range)}`);
      }
      if (range.end <= range.start) {
        throw new Error(`Manual closure ends before it starts for ${key}: ${JSON.stringify(range)}`);
      }
      return { start: range.start, end: range.end, allDay: true };
    });
  });

  return byKey;
}

function mergeBusy(events, manual) {
  const seen = new Set(events.map((event) => `${event.start}|${event.end}`));
  const extra = manual.filter((range) => !seen.has(`${range.start}|${range.end}`));
  return events.concat(extra).sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
}

async function readExistingOutput(filePath) {
  try {
    return JSON.parse(await fs.promises.readFile(filePath, "utf8"));
  } catch (error) {
    return null;
  }
}

function comparableAvailability(output) {
  const accommodations = {};
  const source = output && output.accommodations ? output.accommodations : {};

  for (const accommodation of ACCOMMODATIONS) {
    const item = source[accommodation.key] || {};
    accommodations[accommodation.key] = {
      label: item.label || accommodation.label,
      sourceConfigured: Boolean(item.sourceConfigured),
      busy: Array.isArray(item.busy) ? item.busy : [],
      error: item.error || null,
    };
  }

  return { accommodations };
}

function hasAvailabilityChanged(previous, next) {
  if (!previous) {
    return true;
  }

  return JSON.stringify(comparableAvailability(previous)) !== JSON.stringify(comparableAvailability(next));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  const timestamp = new Date().toISOString();
  const previous = await readExistingOutput(args.out);
  const manualClosures = await readManualClosures(MANUAL_CLOSURES);
  const output = {
    generatedAt: timestamp,
    accommodations: {},
  };

  for (const accommodation of ACCOMMODATIONS) {
    const source = resolveSource(accommodation, args);
    if (!source) {
      output.accommodations[accommodation.key] = toPublicAvailability(accommodation, null, [], null, timestamp);
      continue;
    }

    try {
      const content = await readSource(source);
      const events = mergeBusy(parseIcs(content), manualClosures[accommodation.key] || []);
      output.accommodations[accommodation.key] = toPublicAvailability(accommodation, source, events, null, timestamp);
    } catch (error) {
      // Keep the last known busy ranges instead of wiping them, so a
      // transient calendar failure never publishes an empty calendar.
      const kept = previous && previous.accommodations && previous.accommodations[accommodation.key];
      const keptBusy = kept && Array.isArray(kept.busy) ? kept.busy : [];
      // Publish a generic error only: network error messages can contain
      // the private calendar host. Details go to the CI logs instead.
      const item = toPublicAvailability(accommodation, source, [], new Error("Calendar temporarily unavailable"), timestamp);
      item.busy = mergeBusy(keptBusy, manualClosures[accommodation.key] || []);
      item.updatedAt = kept && kept.updatedAt ? kept.updatedAt : null;
      output.accommodations[accommodation.key] = item;
      console.error(`${accommodation.label}: ${error.message}`);
    }
  }

  if (hasAvailabilityChanged(previous, output)) {
    await fs.promises.mkdir(path.dirname(args.out), { recursive: true });
    await fs.promises.writeFile(args.out, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
