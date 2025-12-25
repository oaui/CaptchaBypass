import { randnum } from "../../util/Helpers.js";
import {
  log,
  addHumanLikeBehavior,
  addHumanLikeBehaviorInFrame,
  suspiciousClickableSelector,
} from "../../util/Util.js";

export async function autoSolver(page, browserData, browserId) {
  log("INFO", `Browser ${browserId} requested AUTO SOLVER.`);

  const frames = page.frames();

  const captchaElements = [
    "vercel",
    "bunnynet",
    "cloudflare",
    "ddos-guard",
    "captcha",
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

          const matches = captchaElements.some(function (keyword) {
            if (idLower.includes(keyword) || classLower.includes(keyword)) {
              return {
                success: true,
                keyword: keyword,
                class: classLower,
                id: idLower,
              };
            } else {
              return { success: false };
            }
          });

          await handleElement(page, element, matches);

          if (!matches.success) continue;

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
async function handleElement(page, element, matches) {
  const textToCheck = [
    "login",
    "sign in",
    "signup",
    "sign up",
    "register",
    "my account",
    "account",
  ];

  if (matches.success) {
    log(
      "INFO",
      `AUTO SOLVER found invisible challenge: ${matches.keyword.toUpperCase()}`
    );
  }

  try {
    const innerText = await element.evaluate(
      (el) => el.innerText?.toLowerCase() || ""
    );

    if (!textToCheck.some((t) => innerText.includes(t.toLowerCase()))) {
      return { success: false, message: "Keyword not matched" };
    }

    await element.click().catch(() => {});
    await page.waitForTimeout(300);

    for (const frame of page.frames()) {
      const inputs = await frame.$$("input");
      for (const el of inputs) {
        try {
          await el.fill("asads@asdfasdf");
        } catch {}
      }

      const buttons = await frame.$$("button");
      for (const el of buttons) {
        const btnText = await el.evaluate(
          (x) => x.innerText?.toLowerCase() || ""
        );

        if (btnText.includes("submit") || btnText.includes("next")) {
          try {
            await el.click();
          } catch {}
        }
      }
    }

    return { success: true, message: "" };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}
