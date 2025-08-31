import {
  log,
  addHumanLikeBehavior,
  addHumanLikeBehaviorInFrame,
  saveToConsolidatedFiles,
  createCookieObject,
} from "../util/Util.js";
import { randnum } from "../util/Helpers.js";
import { retrieveAiResponse } from "../util/Ai.js";

export async function solveRecaptcha(page, browserId, browserData, proxy) {
  log("WARN", `Browser ${browserId}: reCaptcha detected`);

  try {
    await page.waitForSelector("body", {
      visible: true,
      timeout: randnum(10000, 30000),
    });
    /**
     * Wait for the box to appear
     */
    await new Promise((r) => setTimeout(r, randnum(2000, 4000)));

    await page.click(".rc-anchor-content");
  } catch {
    log(
      "INFO",
      `Unable to click checkbox of main frame, proceeding to alternative solver.`
    );
    log("WARN", `Browser ${browserId}: Handling iframe reCaptcha`);
    for (const frame of page.frames()) {
      if (
        (await frame.title().catch(() => ""))
          .toLowerCase()
          .includes("recaptcha")
      ) {
        try {
          await addHumanLikeBehaviorInFrame(frame, browserId);
          await new Promise((r) => setTimeout(r, randnum(2000, 4000)));
          await frame.click(".rc-anchor-content");
          log(
            "SUCCESS",
            `Browser ${browserId}: Clicked reCaptcha inside iframe`
          );
          /**
           * Wait until taking the screenshot
           */
          await new Promise((r) => setTimeout(r, 5000));
          /**
           * Take screenshot of captcha
           */
          let imagePath = `../files/captchas/recaptcha-checkbox-${browserId} - ${Date.now()}.png`;
          await page.screenshot({
            path: imagePath,
          });
          const captchaSolved = await aiSolver(page, imagePath, browserId);
          if (captchaSolved) {
            log(
              "SUCCESS",
              `Browser ${browserId} reCaptcha passed, fetching cookies.`
            );
            /**
             * If the captcha succeeded, grab all cookies from the page
             */
            const cookies = await page.cookies();
            /**
             * if cookies are found, save them to the browserData object
             */
            if (cookies && cookies.length > 0) {
              const recaptchaCookies = await createCookieObject(
                cookies,
                proxy.host /**
                browserData.proxyHost would work also */,
                "_GRECAPTCHA"
              );
              browserData.setCookieObject(recaptchaCookies);
            }
          } else {
            return { success: false, browserData };
          }
          break;
        } catch (error) {
          log("INFO", `Browser ${browserId} ${error}`);
        }
      }
    }
  }
  /**
   * Regardless of what happens, return a object to fullfill the promise
   */
  return { success: true, browserData };
}

async function aiSolver(page, imagePath, browserId) {
  log("INFO", `Starting AI solver.`);
  /**
   * *INFO: There are 2 kinds of reCAPTCHA:
   *  * - with 16 picture elements, 4x <tr> tags and 4x <td> tags:
   *  ? <tr>
   *      <td></td>
   *      <td></td>
   *      <td></td>
   *      <td></td>
   *  ? </tr>
   *  ? <tr>
   *      <td></td>
   *      <td></td>
   *      <td></td>
   *      <td></td>
   *  ? </tr>
   *  ? <tr>
   *      <td></td>
   *      <td></td>
   *      <td></td>
   *      <td></td>
   *  ? </tr>
   *  ? <tr>
   *      <td></td>
   *      <td></td>
   *      <td></td>
   *      <td></td>
   *  ? </tr>
   * ! The name of the class for the table-tag would be 'rc-imageselect-table-44 which stands for 4x4'
   *  * - with 9 picture elements, 3x <tr> tags and 3x <td> tags:
   *  ? <tr>
   *      <td></td>
   *      <td></td>
   *      <td></td>
   *  ? </tr>
   *  ? <tr>
   *      <td></td>
   *      <td></td>
   *      <td></td>
   *  ? </tr>
   *  ? <tr>
   *      <td></td>
   *      <td></td>
   *      <td></td>
   *  ? </tr>
   * ! The name of the class for the table-tag would be 'rc-imageselect-table-33 which stands for 3x3'
   */

  let has4x4 = false;
  let has3x3 = false;

  let recaptchaFrame;

  for (const frame of page.frames()) {
    const found4x4 = await frame.$(".rc-imageselect-table-44");
    const found3x3 = await frame.$(".rc-imageselect-table-33");

    if (found4x4) {
      recaptchaFrame = frame;
      has4x4 = true;
    }
    if (found3x3) {
      recaptchaFrame = frame;
      has3x3 = true;
    }

    if (has4x4 || has3x3) break;
  }
  /**
   * Wait for grid to load
   */
  await new Promise((r) => setTimeout(r, randnum(3000, 5000)));

  const selector = has3x3
    ? ".rc-imageselect-table-33"
    : has4x4
    ? ".rc-imageselect-table-44"
    : null;
  if (!selector) {
    log("INFO", `Unable to find reCaptcha grid`);
    return;
  }
  const cells = await recaptchaFrame.$$(`${selector} td`);

  let promise = false;
  if (has3x3) {
    promise = await handle3x3Grid(
      page,
      imagePath,
      cells,
      recaptchaFrame,
      browserId
    );
  } else if (has4x4) {
    promise = await handle4x4Grid(
      page,
      imagePath,
      cells,
      recaptchaFrame,
      browserId
    );
  }
  /**
   * ? Pass cells array and AI generated indexes to the click function
   */

  if (promise) {
    return true;
  } else {
    return false;
  }
}
async function handle3x3Grid(
  page,
  imagePath,
  cells,
  recaptchaFrame,
  browserId
) {
  log("INFO", `Detected 3x3 reCaptcha`);
  const response = await retrieveAiResponse(imagePath, prompt("3x3"));

  const indexedResponse = await handleResponse(response, cells.length);
  const clickIndexes = await clickElements(
    recaptchaFrame,
    indexedResponse,
    cells,
    browserId
  );
  let tablePresent = (await recaptchaFrame.$$("table")).length > 0;
  if (tablePresent) {
    /**
     * Wait for the new image
     */
    let tableStillPresent = true;
    let solved = false;
    while (!solved) {
      await new Promise((r) => setTimeout(r, randnum(5000, 10000)));
      const x3Selector = ".rc-imageselect-table-33 td";
      let x3selectorPresent = await recaptchaFrame.$$(x3Selector);

      /**
       * * If the selector for the table is not present anymore, start the solving logic for the corresponding captcha type
       */
      if (x3selectorPresent.length === 0) {
        log("INFO", `Unable to find 3x3 grid, captcha change detected.`);
        const altImagePath = `../files/captchas/4x4/recaptcha-checkbox-${browserId} - ${Date.now()}.png`;
        await page.screenshot({ path: altImagePath });
        const newCells = await recaptchaFrame.$$(`.rc-imageselect-table-44 td`);
        const newCaptcha = await handle4x4Grid(
          page,
          altImagePath,
          newCells,
          recaptchaFrame,
          browserId
        );
        if (newCaptcha) {
          return true;
        }
      }

      /**
       * Take new image
       */
      let frameImagePath = `../files/captchas/3x3/recaptcha-checkbox-${browserId} - ${Date.now()}.png`;
      await page.screenshot({ path: frameImagePath });

      const solution = await retrieveAiResponse(frameImagePath, prompt("3x3"));
      const selector = ".rc-imageselect-table-33 td";
      const newCells = await recaptchaFrame.$$(selector);
      const indexedSolution = await handleResponse(solution, newCells.length);
      const indexes = await clickElements(
        recaptchaFrame,
        indexedSolution,
        newCells,
        browserId
      );
      tableStillPresent = (await recaptchaFrame.$$("table")).length > 0;
      if (!tableStillPresent) {
        solved = true;
      }
      /**
       * ? Check if the captcha table is still here and if the current captcha was solved already
       */
      if (indexes && solved) {
        return true;
      }
    }
  } else {
    if (clickIndexes) {
      return true;
    }
  }
  return false;
}
async function handle4x4Grid(
  page,
  imagePath,
  cells,
  recaptchaFrame,
  browserId
) {
  log("INFO", `Detected 4x4 reCaptcha`);
  let solveTries = 0;
  const response = await retrieveAiResponse(imagePath, prompt("4x4"));
  const indexedResponse = await handleResponse(response, cells.length);
  const clickIndexes = await clickElements(
    recaptchaFrame,
    indexedResponse,
    cells,
    browserId
  );
  let tablePresent = (await recaptchaFrame.$$("table")).length > 0;
  if (tablePresent) {
    let tableStillPresent = true;
    let solved = false;
    while (!solved) {
      solveTries++;
      await new Promise((r) => setTimeout(r, randnum(3000, 5000)));
      const x4Selector = ".rc-imageselect-table-44 td";
      let x4selectorPresent = await recaptchaFrame.$$(x4Selector);
      if (solveTries >= 2) {
        /**
         * ? Special handling to solve alternative captcha, incase of failure for 4x4
         */
        if (x4selectorPresent.length === 0) {
          log("INFO", `Captcha changed, switching to alternative solving`);
          const altImagePath = `../files/captchas/3x3/recaptcha-checkbox-${browserId} - ${Date.now()}.png`;
          await page.screenshot({ path: altImagePath });
          const newCells = await recaptchaFrame.$$(
            `.rc-imageselect-table-33 td`
          );
          const newCaptcha = await handle3x3Grid(
            page,
            altImagePath,
            newCells,
            recaptchaFrame,
            browserId
          );
          if (newCaptcha) {
            return true;
          }
        }
      }
      /**
       * Capture the new captcha image
       */
      let frameImagePath = `../files/captchas/4x4/recaptcha-checkbox-${browserId} - ${Date.now()}.png`;
      await page.screenshot({ path: frameImagePath });
      /**
       * Ask for a new solution
       */
      const solution = await retrieveAiResponse(frameImagePath, prompt("4x4"));
      const selector = ".rc-imageselect-table-44 td";
      const newCells = await recaptchaFrame.$$(selector);
      const indexedSolution = await handleResponse(solution, newCells.length);
      const indexes = await clickElements(
        recaptchaFrame,
        indexedSolution,
        newCells,
        browserId
      );
      tableStillPresent = (await recaptchaFrame.$$("table")).length > 0;
      if (!tableStillPresent) {
        solved = true;
      }
      /**
       * ? Check if the captcha table is still here and if the current captcha was solved already
       */
      if (indexes && solved) {
        return true;
      }
    }
  } else {
    if (clickIndexes) {
      return true;
    }
  }
  return false;
}
async function clickElements(frame, indexes, cells, browserId) {
  try {
    if (!Array.isArray(indexes) || indexes.length === 0) {
      log("WARN", "No indices parsed; skipping clicks");
      return false;
    }
    for (const i of indexes) {
      if (!cells[i]) {
        log("WARN", `Index ${i} out of range (cells=${cells.length})`);
        continue;
      }
      await cells[i].evaluate((el) =>
        el.scrollIntoView({ block: "center", inline: "center" })
      );
      await cells[i].click();
      await new Promise((r) => setTimeout(r, randnum(500, 1000)));
    }
    await addHumanLikeBehaviorInFrame(frame, browserId);
    const verifyButton = await frame.$("#recaptcha-verify-button");
    await new Promise((r) => setTimeout(r, randnum(1000, 3000)));
    if (verifyButton) await verifyButton.click();
    return true;
  } catch (e) {
    log("ERROR", `clickElements failed: ${e?.message || e}`);
    return false;
  }
}

async function handleResponse(response, cellsCount) {
  const text = (response || "").replace(/\u00A0/g, " ").trim();
  const matches = text.match(/cell\[(\d+)\]/gi) || [];
  let indices = matches
    .map((m) => Number((m.match(/\d+/) || [])[0]))
    .filter((n) => Number.isFinite(n));
  indices = [...new Set(indices)].filter((i) => i >= 0 && i < cellsCount);
  log(
    "INFO",
    `parsed indices: ${JSON.stringify(indices)} (cells=${cellsCount})`
  );
  return indices;
}

function prompt(gridType) {
  return `Look at the picture of this ${gridType} grid. Analyze the captcha, translate the task. Think of it like an array (cell[0] cell[1]...), starting from the upper left corner, which is cell[0]. Tell me, which pictures I have to click, to pass the captcha. Only answer with the correct (array)-elements format: cell[3], cell[6]`;
}
