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

  const captchaElements = [
    "vercel",
    "bunnynet",
    "cloudflare",
    "ddos-guard",
    "captcha",
    "challange",
    "verification",
    "checkbox",
  ];

  for (const frame of frames) {
    try {
      const elements = await frame.$$("div, input");

      for (const element of elements) {
        try {
          const attrs = await frame.evaluate((el) => {
            return {
              id: el.id || "",
              className: el.className || "",
            };
          }, element);

          const idLower = attrs.id.toLowerCase();
          const classLower = attrs.className.toLowerCase();

          const matches = captchaElements.some(
            (keyword) =>
              idLower.includes(keyword) || classLower.includes(keyword)
          );

          if (!matches) continue;

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
