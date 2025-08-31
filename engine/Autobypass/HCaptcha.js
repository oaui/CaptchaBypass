import {
  log,
  addHumanLikeBehavior,
  addHumanLikeBehaviorInFrame,
  suspiciousClickableSelector,
  createCookieObject,
} from "../../util/Util.js";
export async function solveHCaptcha(page, browserId, browserData) {
  /**
   * ! hCaptcha does not set cookies, so dont scrape or search for them.
   */
  for (const frame of page.frames()) {
    try {
      const url = frame.url();
      if (/hcaptcha\.com/.test(url) && /checkbox/i.test(url)) {
        log("INFO", `Browser ${browserId}: Found hCaptcha checkbox frame.`);
        await frame.waitForSelector("#checkbox", {
          visible: true,
          timeout: 25000,
        });
        await frame.click("#checkbox", { delay: 2000 });
        log("SUCCESS", `Browser ${browserId}: Clicked checkbox inside iframe.`);
        await new Promise((r) => setTimeout(r, 60000));
        break;
      }
    } catch (err) {
      log(
        "ERROR",
        `Browser ${browserId}: Failed clicking element: ${err.message}`
      );
    }
  }
  /**
   * ? This will always return true, as the hCaptcha is always present, if this was called.
   */
  return { success: true, browserData };
}
