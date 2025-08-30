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
  /**
   * ? AutoSolver aka just click everything
   */
  const frames = page.frames();
  for (let i = 0; i < 2; i++) {
    for (const frame of frames) {
      try {
        const elements = await frame.$$("*");
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
    await new Promise((r) => setTimeout(r, randnum(3000, 5000)));
  }
  return { success: true, browserData };
}
