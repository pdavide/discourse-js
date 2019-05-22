import KeyManager from './keyManager';
import authManager from './authManager';
import URLSearchParams from '@ungap/url-search-params'; // polyfill
// import MobileDetect from 'mobile-detect';

export default class DiscourseAuth {
  constructor(options) {
    this.km = new KeyManager(options.appId);
    this.options = options;
  }

  async init() {
    await this.km.getKeys();
    authManager.hasUserApiKey() || this._managePayload();
  }

  async _getLoginUrl() {
    const params = {
      /* eslint-disable camelcase */
      application_name: this.options.appName,
      public_key: await this.km.getPublicKey(),
      nonce: this._generateStoredRandom('nonce'),
      client_id: authManager.getAppProp(this.options.appId, 'clientId') || this._generateStoredRandom('clientId'),
      auth_redirect: location.href,
      scopes: this.options.scopes
      /* eslint-enable camelcase */
    };

    return this.options.apiBaseUrl + '/user-api-key/new?' + this._serializeParams(params);
  }

  _serializeParams(params) {
    return Object.keys(params)
      .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
      .join('&');
  };

  _generateStoredRandom(name) {
    const storedRandom = Math.random().toString(16).substr(2);

    authManager.setAppProp(this.options.appId, name, storedRandom);
    return storedRandom;
  }

  _managePayload() {
    const url = new URLSearchParams(window.location.search || window.location.hash.split('?')[1]);

    if (url.has('payload') && opener) {
      this.km.decryptPayload(url.get('payload')).then(payloadObject => {
        payloadObject.nonce === authManager.getAppProp(this.options.appId, 'nonce') ||
          throw new Error('The returned payload is invalid.');
        payloadObject.api === 4 ||
          throw new Error('Wrong API version: ' + payloadObject.api + '. Discourse-js works with API version 3.');
        authManager.setUserApiKey(payloadObject.key);
        authManager.removeAppProp(this.options.appId, 'nonce');
        opener.postMessage({ result: payloadObject }, location.origin);
      });
    }
    // var md = new MobileDetect(window.navigator.userAgent);
  }
}
