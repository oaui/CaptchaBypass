import { randnum } from "../../util/Helpers.js";
import {
  log,
  addHumanLikeBehavior,
  addHumanLikeBehaviorInFrame,
  suspiciousClickableSelector,
  createCookieObject,
} from "../../util/Util.js";

export async function autoSolver(page, browserData, browserId) {
  log("INFO", `Browser ${browserId} requested auto solver.`);

  const frames = page.frames();

  /**
   * TODO: Implement something, that detects captcha types, such as BunnyNet, Vercel etc.
   */

  for (const frame of frames) {
    try {
      // Only select <div> elements
      const elements = await frame.$$("div");

      for (const element of elements) {
        try {
          await element.hover({ force: true, trial: Math.random() < 0.3 });
          await new Promise((resolve) =>
            setTimeout(resolve, randnum(100, 300))
          );
          await element.click({ delay: randnum(100, 500) });
        } catch {}
      }
    } catch {}
  }

  return { success: true, browserData };
}
