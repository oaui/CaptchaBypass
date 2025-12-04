import {
  log,
  addHumanLikeBehavior,
  addHumanLikeBehaviorInFrame,
  saveToConsolidatedFiles,
  createCookieObject,
} from "../util/Util.js";
import "dotenv/config";

export async function solveCloudflare(page, browserId, browserData, proxy) {
  log("WARN", `Browser ${browserId}: Turnstile/Challenge detected`);

  try {
    await page.waitForSelector('input[type="checkbox"]', {
      visible: true,
      timeout: 30000,
    });

    await addHumanLikeBehavior(page, browserId);

    await page.click('input[type="checkbox"]');
    log("SUCCESS", `Browser ${browserId}: Checkbox clicked.`);
  } catch {
    log(
      "WARN",
      `Browser ${browserId}: No checkbox found or automatic solve in progress`
    );
    const frames = page.frames();
    for (const frame of frames) {
      if (frame.url().includes("challenges.cloudflare.com")) {
        try {
          await addHumanLikeBehaviorInFrame(frame, browserId);
          await new Promise((r) => setTimeout(r, 2000));
          await frame.click('input[type="checkbox"]');
          log(
            "SUCCESS",
            `Browser ${browserId}: Clicked checkbox inside iframe.`
          );
          break;
        } catch {}
      }
    }
  }

  log("INFO", `Browser ${browserId}: Waiting for JS Challenge to be Solved`);
  let solved = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const stillChallenge = await page.evaluate(() => {
      const title = document.title.toLowerCase();
      return title.includes("just a moment") || title.includes("checking");
    });
    if (!stillChallenge) {
      log("SUCCESS", `Browser ${browserId}: Challenge solved.`);
      solved = true;
      break;
    }
    if (i % 5 === 0 && i > 0) {
      log(
        "INFO",
        `Browser ${browserId}: Still waiting... (${30 - i} seconds left)`
      );
    }
  }
  if (!solved)
    log("WARN", `Browser ${browserId}: Auto-Bypass timeout. Click CheckBox`);
  log("INFO", `Browser ${browserId}: Waiting for cookies to be set...`);
  await new Promise((r) => setTimeout(r, 5000));
  log("INFO", `Browser ${browserId}: Retrieving cookies...`);
  let cookies = await page.cookies();
  let cfClearance = cookies.find((c) => c.name === "cf_clearance");

  if (!cfClearance) {
    log(
      "WARN",
      `Browser ${browserId}: Unable to find cf_clearance cookies trying again`
    );
    for (let attempt = 0; attempt < 5; attempt++) {
      await new Promise((r) => setTimeout(r, 3000));
      cookies = await page.cookies();
      cfClearance = cookies.find((c) => c.name === "cf_clearance");
      if (cfClearance) {
        log("SUCCESS", `Browser ${browserId}: cf_clearance cookie retrieved.`);
        break;
      }
      log(
        "INFO",
        `Browser ${browserId}: Attempt ${attempt + 1}/5 - Still waiting...`
      );
    }
  }

  if (cfClearance) {
    log("SUCCESS", `Browser ${browserId}: found cf_clearance cookie`);
    await saveToConsolidatedFiles(
      cfClearance.value,
      cookies,
      browserData.browserConfig
    );

    /**
     * !!!! Important:
     * ? Add Cookie AND the related proxy which was used to solve the challange,
     * ? to the CookieObject to then add this to the browserData.
     */

    const cookieObject = await createCookieObject(cookies, proxy.host, "*");

    /**
     * * Write cookie and proxy to earlier created browserDataObject
     */
    browserData.setCookieObject(cookieObject);

    log("SUCCESS", `Browser ${browserId}: Cookie written to Browser object.`);
    /*console.dir(browserData, { depth: null });*/
    return { success: true, browserData };
  } else {
    log("ERROR", `Browser ${browserId}: cf_clearance cookie not found.`);
    return { success: false, browserData };
  }
}
