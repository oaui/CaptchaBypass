export class CookieObject {
  /**
   *
   * setCookie is used in createCookieObject, to set the cookie to browserData object
   */
  setCookie(cookie) {
    /**
     * This can either be a string:string or an array of string:string
     */
    this.cookie = cookie;
  }
  setProxy(proxy) {
    this.proxy = proxy;
    /**
     * * Proxy Port is added within the browser object already
     */
  }
}
