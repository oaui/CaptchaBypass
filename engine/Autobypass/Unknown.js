import {
  log,
  addHumanLikeBehavior,
  addHumanLikeBehaviorInFrame,
  suspiciousClickableSelector,
  createCookieObject,
} from "../../util/Util.js";
import { randnum } from "../../util/Helpers.js";
import { solveHCaptcha } from "./HCaptcha.js";
import { autoSolver } from "./Auto.js";

export async function autoBypass(page, browserId, proxy, browserData) {
  log("INFO", `Browser ${browserId}: Starting auto bypass...`);
  let clicked = false;
  const hCaptchaCheckboxFrame = await page
    .waitForFrame(
      (f) => /hcaptcha\.com/.test(f.url()) && /checkbox/i.test(f.url()),
      { timeout: 15000 }
    )
    .catch(() => null);
  /**
   * ? Check for more captcha types here later, for now it will only be hCaptcha and any unknown types
   */
  if (hCaptchaCheckboxFrame) {
    log(
      "INFO",
      `Browser ${browserId}: AUTOBYPASS >> Detected hCaptcha, starting solving process.`
    );
    const hCaptcha = await solveHCaptcha(page, browserId, browserData);
    if (hCaptcha.success) {
      clicked = true;
    }
  } else {
    log(
      "INFO",
      `Browser ${browserId}: AUTOBYPASS >> Detected captcha, default bypass process engaged.`
    );
    const unknownCaptcha = await autoSolver(page, browserData, browserId);
    if (unknownCaptcha.success) {
      clicked = true;
    }
  }

  if (clicked) {
    let cookies = await page.cookies();
    let cookieObj;
    if (browserData.browserConfig.customCookie) {
      /**
       * ? Check if the custom cookie was set in the config
       */
      const [customCookieName, customCookieValue] =
        browserData.browserConfig.customCookie.split(":");
      /**
       * ? If the specified cookie was found, write to the cookieObj, else create the specified cookie
       */
      let customCookie = cookies.find((c) => c.name === customCookieName);

      if (!customCookie) {
        log(
          "WARN",
          `Browser ${browserId}: AUTOBYPASS >> Custom cookie not found, creating new one.`
        );
        /**
         * ? Create custom cookie for the Flooder
         */

        await page.setCookie({
          name: customCookieName,
          value: customCookieValue,
          domain: new URL(browserData.url).hostname,
          /** 
        * ? Side note to the .hostname: 
        * const u = new URL("https://dopamine.clinic:8080/some/path?x=1");

          console.log(u.hostname); // "dopamine.clinic"
          console.log(u.host);     // "dopamine.clinic:8080"
          console.log(u.port);     // "8080"
          console.log(u.pathname); // "/some/path" 
        */
          path: "/",
          httpOnly: false,
          secure: true,
        });
        /**
         * Update cookies after applying custom cookie
         */
        cookies = await page.cookies();
        customCookie = cookies.find((c) => c.name === customCookieName);
      }
      cookieObj = await createCookieObject(
        cookies,
        proxy.host,
        customCookieName
      );
    } else {
      cookieObj = await createCookieObject(cookies, proxy.host, "*");
    }

    /**
     * Set either the custom cookie specified in the browserConfig OR
     * the cookie which was found on the website,
     * to the browserObject
     */
    browserData.setCookieObject(cookieObj);

    return { success: true, browserData };
  } else {
    log("WARN", `Browser ${browserId}: No captcha element to click.`);
    return { success: false, browserData };
  }
}
