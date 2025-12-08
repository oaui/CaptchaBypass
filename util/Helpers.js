import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import execSync from "child_process";
import os from "os";

import { log } from "./Util.js";
import { ProxyAgent } from "proxy-agent";

/**
 * ? Integer
 */
export function randnum(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}
export class ProxyHelper {
  setProxyIndex(index) {
    this.index = index;
  }
  getProxyIndex() {
    return this.index;
  }
}
/**
 * ? Array
 */
export function readFile(filepath) {
  const filePath = path.resolve(filepath);
  const data = fs.readFileSync(filePath, "utf8");

  try {
    const content = data
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
    return content;
  } catch (error) {
    log("ERROR", `Error reading file at ${filepath}: ${error}`);
    return [];
  }
}
/**
 * ? Functions needed, to obtain the correct local and timezone for the proxy
 */
export function formatLocales(localesArr) {
  return localesArr.map((locale) => {
    const [lang, timezone] = locale.split(":");
    return { lang, timezone };
  });
}
export async function getTimeZoneByIp(ip) {
  const result = await fetch(`https://ipwhois.app/json/${ip}`);
  const data = await result.json();
  if (!data.timezone.id) {
    return data.timezone;
  }
  return data.timezone.id;
}
export async function getAbuseStatus(ip) {
  const result = await fetch(
    `https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}`,
    {
      headers: {
        Key: process.env.ABUSEDB_API_KEY_2,
        Accept: "application/json",
      },
    }
  );
  const data = await result.json();

  let suspectedAbuse = false;
  let highScore = false;
  let possibleAbuse = false;
  let abuseScore = 0;
  try {
    if (!data.detail) {
      if (data.data.isPublic) {
        if (data.data.totalReports > 150) {
          suspectedAbuse = true;
          abuseScore = data.data.abuseConfidenceScore;
        }
        if (data.data.abuseConfidenceScore > 75) {
          highScore = true;
          abuseScore = data.data.abuseConfidenceScore;
        }
        if (data.data.abuseConfidenceScore == 100) {
          suspectedAbuse = true;
          highScore = true;
          abuseScore = data.data.abuseConfidenceScore;
        }
        if (
          data.data.abuseConfidenceScore > 10 &&
          data.data.abuseConfidenceScore < 50
        ) {
          possibleAbuse = true;
          abuseScore = data.data.abuseConfidenceScore;
        }
      }
    } else {
      return { success: false, message: JSON.stringify(data.errors) };
    }
  } catch (error) {
    return { success: false, message: JSON.stringify(data.errors) };
  }
  return {
    success: true,
    suspectedAbuse,
    highScore,
    possibleAbuse,
    abuseScore,
  };
}
export function getChromePath() {
  const platform = os.platform();

  try {
    if (platform === "win32") {
      // Try default paths
      const paths = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
      ];

      for (const path of paths) {
        if (fs.existsSync(path)) return path;
      }

      // Use where command
      return execSync("where chrome").toString().trim().split("\n")[0];
    } else if (platform === "darwin") {
      return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    } else if (platform === "linux") {
      // Try which command
      try {
        return execSync("which google-chrome").toString().trim();
      } catch {
        return execSync("which chromium-browser").toString().trim();
      }
    }
  } catch (error) {
    log("ERROR", `Error finding Chrome path: ${error}`);
    return null;
  }
}
export async function proxyTest(proxyArr, proxyTimeout) {
  const proxyTests = proxyArr.map(async (proxy, index) => {
    const agent = new ProxyAgent({
      protocol: "http",
      host: proxy.host,
      port: proxy.port,
      auth: proxy.username ? `${proxy.username}:${proxy.password}` : undefined,
    });

    try {
      const test = timeoutPromise(
        proxyTimeout * 2,
        fetch("https://www.google.com", {
          agent,
          timeout: proxyTimeout,
        })
      );

      const res = await test;

      if (!res.ok) {
        log(
          "PROXY_FAILED",
          `Proxy (${index}/${proxyArr.length}) ${proxy.host}:${proxy.port} failed test.`
        );
        return null;
      }

      log(
        "PROXY_SUCCESS",
        `Proxy (${index}/${proxyArr.length}) ${proxy.host}:${proxy.port} is working.`
      );

      return { ...proxy };
    } catch (error) {
      log(
        "PROXY_FAILED",
        `Proxy ${proxy.host}:${proxy.port} failed test: ${error}`
      );
      return null;
    }
  });

  const settled = await Promise.all(proxyTests);

  const workingProxies = settled.filter((p) => p !== null);

  return workingProxies;
}
function timeoutPromise(ms, promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("TimeoutExceeded")), ms)
    ),
  ]);
}
