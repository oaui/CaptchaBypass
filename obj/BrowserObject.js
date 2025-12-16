export class BrowserObject {
  constructor(
    browserId,
    url,
    userAgent,
    locale,
    proxyHost,
    proxyPort,
    browserConfig
  ) {
    this.browserId = browserId;
    this.url = url;
    this.userAgent = userAgent;
    this.locale = locale;
    this.proxyHost = proxyHost;
    this.proxyPort = proxyPort;
    this.browserConfig = browserConfig;
    /**
     * ! CookieObject is NOT present here, BECAUSE it is always set later on !!!
     */
  }

  getBrowserObject() {
    return new BrowserObject(
      this.browserId,
      this.url,
      this.userAgent,
      this.locale,
      this.proxyHost,
      this.proxyPort,
      this.browserConfig,
      this.page,
      this.cookieObj !== null
        ? this.cookieObj
        : null /** Make sure, that cookieObject is actually there */
    );
  }
  setPage(page) {
    this.page = page;
  }
  setCookieObject(cookieObj) {
    this.cookieObj = cookieObj;
  }
}
