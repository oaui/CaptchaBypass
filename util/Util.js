import { CookieObject } from "../obj/CookieObject.js";
import fsSync from "fs";
export class Cookie {
  constructor(
    name,
    value,
    domain,
    path,
    expires,
    size,
    httpOnly,
    secure,
    session,
    sameSite,
    priority,
    sameParty,
    sourceScheme,
    partitionKey
  ) {
    this.name = name;
    this.value = value;
    this.domain = domain;
    this.path = path;
    this.expires = expires;
    this.size = size;
    this.httpOnly = httpOnly;
    this.secure = secure;
    this.session = session;
    this.sameSite = sameSite;
    this.priority = priority;
    this.sameParty = sameParty;
    this.sourceScheme = sourceScheme;
    this.partitionKey = partitionKey;
  }
}

export async function createCookieObject(cookies, proxy, regex) {
  /*
    Create new CookieObject:
  */
  const cookieObj = new CookieObject();
  const cookieArr = [];
  /**
   * We ONLY care about 'regex', so filter for this.
   */
  if (regex.includes("*")) {
    cookies.forEach((cookie) => {
      cookieArr.push(cookie);
    });
    cookieObj.setCookie(cookieArr);
    return cookieObj;
  }
  cookies.forEach((cookie) => {
    if (cookie.name.includes(regex)) {
      cookieObj.setCookie(cookie);
      cookieObj.setProxy(proxy);
    }
  });
  return cookieObj;
}
// Human-like behavior functions for captcha solving
export async function addHumanLikeBehavior(page, browserId) {
  try {
    log("INFO", `Browser ${browserId}: Adding human-like behavior...`);

    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    }));

    for (let step = 0; step < 8; step++) {
      const randomX = Math.floor(Math.random() * dimensions.width);
      const randomY = Math.floor(Math.random() * dimensions.height);

      await page.mouse.move(randomX, randomY);

      const delay = Math.random() * 400 + 100;
      await new Promise((r) => setTimeout(r, delay));

      if (Math.random() < 0.3) {
        await page.mouse.click(randomX, randomY);
        log("INFO", `Browser ${browserId}: Random click at step ${step + 1}`);
      }
    }

    const captchaSelector =
      'input[type="checkbox"], .cf-turnstile, iframe[src*="turnstile"], id*="checkbox", class*="checkbox", id*="captcha", class*="captcha"';
    try {
      const captchaElement = await page.$(captchaSelector);
      if (captchaElement) {
        const box = await captchaElement.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

          await new Promise((r) => setTimeout(r, Math.random() * 1000 + 500));

          for (let i = 0; i < 3; i++) {
            const offsetX = (Math.random() - 0.5) * 20;
            const offsetY = (Math.random() - 0.5) * 20;
            await page.mouse.move(
              box.x + box.width / 2 + offsetX,
              box.y + box.height / 2 + offsetY
            );
            await new Promise((r) => setTimeout(r, Math.random() * 300 + 200));
          }
        }
      } else {
        log("INFO", `Browser ${browserId}: No captcha element has been found.`);
      }
    } catch (e) {
      // Ignore errors if captcha element not found
    }

    log("SUCCESS", `Browser ${browserId}: Human-like behavior completed`);
  } catch (error) {
    log(
      "WARN",
      `Browser ${browserId}: Human-like behavior failed: ${error.message}`
    );
  }
}

export async function addHumanLikeBehaviorInFrame(frame, browserId) {
  try {
    log(
      "INFO",
      `Browser ${browserId}: Adding human-like behavior in iframe...`
    );

    const dimensions = await frame.evaluate(() => ({
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    }));

    for (let step = 0; step < 5; step++) {
      const randomX = Math.floor(Math.random() * dimensions.width);
      const randomY = Math.floor(Math.random() * dimensions.height);

      await frame.evaluate(
        (x, y) => {
          const event = new MouseEvent("mousemove", {
            clientX: x,
            clientY: y,
            bubbles: true,
          });
          document.elementFromPoint(x, y)?.dispatchEvent(event);
        },
        randomX,
        randomY
      );

      const delay = Math.random() * 300 + 100;
      await new Promise((r) => setTimeout(r, delay));
    }

    try {
      const checkbox = await frame.$('input[type="checkbox"]');
      if (checkbox) {
        const box = await checkbox.boundingBox();
        if (box) {
          // Move to checkbox area
          await frame.evaluate(
            (x, y) => {
              const event = new MouseEvent("mousemove", {
                clientX: x,
                clientY: y,
                bubbles: true,
              });
              document.elementFromPoint(x, y)?.dispatchEvent(event);
            },
            box.x + box.width / 2,
            box.y + box.height / 2
          );

          await new Promise((r) => setTimeout(r, Math.random() * 800 + 400));
        }
      }
    } catch (e) {
      // Ignore errors
    }

    log(
      "SUCCESS",
      `Browser ${browserId}: Iframe human-like behavior completed`
    );
  } catch (error) {
    log(
      "WARN",
      `Browser ${browserId}: Iframe human-like behavior failed: ${error.message}`
    );
  }
}

export async function saveToConsolidatedFiles(
  cfClearanceValue,
  cookies,
  BROWSER_CONFIG
) {
  try {
    let allCfClearances = [];
    if (fsSync.existsSync(BROWSER_CONFIG.clearanceFile)) {
      const existing = fsSync.readFileSync(
        BROWSER_CONFIG.clearanceFile,
        "utf8"
      );
      allCfClearances = existing.split("\n").filter((line) => line.trim());
    }

    if (!allCfClearances.includes(cfClearanceValue)) {
      allCfClearances.push(cfClearanceValue);
      fsSync.writeFileSync(
        BROWSER_CONFIG.clearanceFile,
        allCfClearances.join("\n")
      );
      log(
        "SUCCESS",
        `Added cf_clearance to consolidated list (total: ${allCfClearances.length})`
      );
    }

    let allCookies = [];
    if (fsSync.existsSync(BROWSER_CONFIG.clearanceFile)) {
      try {
        const existing = JSON.parse(
          fsSync.readFileSync(BROWSER_CONFIG.clearanceFile, "utf8")
        );
        allCookies = existing;
      } catch (e) {
        log(
          "WARN",
          `Failed to parse existing ${BROWSER_CONFIG.clearanceFile}, starting fresh`
        );
      }
    }

    cookies.forEach((newCookie) => {
      const exists = allCookies.find(
        (existing) =>
          existing.name === newCookie.name && existing.value === newCookie.value
      );
      if (!exists) {
        allCookies.push(newCookie);
      }
    });

    fsSync.writeFileSync(
      BROWSER_CONFIG.cookiesFile,
      JSON.stringify(allCookies, null, 2)
    );
    log(
      "SUCCESS",
      `Added cookies to consolidated list (total: ${allCookies.length})`
    );
  } catch (error) {
    log("ERROR", `Failed to save to consolidated files: ${error.message}`);
  }
}
export function suspiciousClickableSelector() {
  const clickable = "a[href], button, input:not([type='hidden']), div";

  return [
    `${clickable}[id*='checkbox' i]`,
    `${clickable}[class*='checkbox' i]`,
    `${clickable}[id*='captcha' i]`,
    `${clickable}[class*='captcha' i]`,
  ].join(", ");
}

/**
 * Scan all same-origin frames for suspicious clickable elements.
 * Returns true if any frame contains a match.
 */
async function hasUnknownCaptcha(page) {
  const { titleLower, bodyLower } = await page.evaluate(() => ({
    titleLower: (document.title || "").toLowerCase(),
    bodyLower: (document.body?.innerText || "").toLowerCase(),
  }));
  const selector = suspiciousClickableSelector();

  if (
    titleLower.includes("captcha") ||
    titleLower.includes("challenge") ||
    titleLower.includes("verification") ||
    bodyLower.includes("checking") ||
    bodyLower.includes("cdn")
  ) {
    return true;
  }
  for (const frame of page.frames()) {
    try {
      const found = await frame.evaluate(
        (sel) => !!document.querySelector(sel),
        selector
      );
      if (found) return true;
    } catch {
      // Cross-origin frame: accessing its DOM will throw — ignore and continue.
    }
  }
  return false;
}
export async function detectChallenges(page) {
  const flagsPromise = page.evaluate(() => {
    const title = document.title.toLowerCase();
    const body = document.body?.innerText?.toLowerCase() || "";
    return {
      hasTurnstile:
        title.includes("just a moment") ||
        title.includes("checking") ||
        body.includes("cloudflare") ||
        body.includes("challenges.cloudflare.com") ||
        !!document.querySelector(".cf-turnstile") ||
        !!document.querySelector("#challenge-form") ||
        !!document.querySelector(".zone-name-title") ||
        !!document.querySelector(".ray-id"),
      hasRecaptcha:
        title.includes("recaptcha") ||
        body.includes("recaptcha") ||
        !!document.querySelector("iframe[src*='recaptcha']"),
    };
  });

  const unknownPromise = hasUnknownCaptcha(page);

  const [{ hasTurnstile, hasRecaptcha }, unknownCaptcha] = await Promise.all([
    flagsPromise,
    unknownPromise,
  ]);

  return { hasTurnstile, hasRecaptcha, unknownCaptcha };
}
export function log(level, message) {
  const now = new Date().toISOString().replace("T", " ").split(".")[0];
  const prefix = "[Netty/Autobypass] >";

  const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    white: "\x1b[37m",
  };

  const levels = {
    INFO: { label: "[INFO]", color: colors.white },
    WARN: { label: "[WARN]", color: colors.yellow },
    ERROR: { label: "[ERROR]", color: colors.red },
    SUCCESS: { label: "[SUCCESS]", color: colors.green },
    PROXY: { label: "[PROXY]", color: colors.red },
    FLOODER: { label: "[FLOODER]", color: colors.yellow },
    FARM: { label: "[FARM]", color: colors.white },
  };

  const levelInfo = levels[level] || { label: "[LOG]", color: colors.white };

  console.log(
    `${colors.white}[${now}] ${prefix} ${levelInfo.color}${levelInfo.label}${colors.reset} ${message}`
  );
}
