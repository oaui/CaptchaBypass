import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import execSync from "child_process";
import os from "os";

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
    console.log(`Can not find or read file: ${filepath}`);
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
        Key: process.env.ABUSEIPDB_API_KEY,
        Accept: "application/json",
      },
    }
  );
  const data = await result.json();
  let suspectedAbuse = false;
  let highScore = false;
  let possibleAbuse = false;
  let abuseScore = 0;
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
  return { suspectedAbuse, highScore, possibleAbuse, abuseScore };
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
    console.error("Could not find Chrome:", error);
    return null;
  }
}
