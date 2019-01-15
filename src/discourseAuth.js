import KeyManager from './keyManager';
import URLSearchParams from '@ungap/url-search-params'; // polyfill
// import MobileDetect from 'mobile-detect';

export default class DiscourseAuth {
  constructor(options) {
    this.appId = this._slugify(options.appName);
    this.km = new KeyManager(this.appId);
    this.options = options;
  }

  async init() {
    await this.km.getKeys();
    this._hasUserApiKey() || this._managePayload();
  }

  _hasUserApiKey() {
    return localStorage.getItem('user_api_key') !== null;
  }

  async _getLoginUrl() {
    const params = {
      /* eslint-disable camelcase */
      application_name: this.options.appName,
      public_key: await this.km.getPublicKey(),
      nonce: this._generateStoredRandom('nonce'),
      client_id: this._getStoredRandom('clientId') || this._generateStoredRandom('clientId'),
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

    localStorage.setItem(this.appId + '_' + name, storedRandom);
    return storedRandom;
  }

  _getStoredRandom(name) {
    const storedRandom = localStorage.getItem(this.appId + '_' + name);

    return storedRandom;
  }

  _removeStoredRandom(name) {
    localStorage.removeItem(this.appId + '_' + name);
  }

  _getUserApiKey() {
    return localStorage.getItem('user_api_key');
  }

  _clearAuthData() {
    localStorage.removeItem('user_api_key');
    localStorage.removeItem('currentUser');
    this._removeStoredRandom('clientId');
  }

  _managePayload() {
    const url = new URLSearchParams(window.location.search || window.location.hash.split('?')[1]);

    if (url.has('payload') && opener) {
      this.km.decryptPayload(url.get('payload')).then(payloadObject => {
        payloadObject.nonce === this._getStoredRandom('nonce') ||
          throw new Error('The returned payload is invalid.');
        payloadObject.api === 3 ||
          throw new Error('Wrong API version: ' + payloadObject.api + '. Discourse-js works with API version 3.');
        localStorage.setItem('user_api_key', payloadObject.key);
        this._removeStoredRandom('nonce');
        opener.postMessage({ result: payloadObject }, location.origin);
      });
    }
    // var md = new MobileDetect(window.navigator.userAgent);
  }

  _slugify(text) {
    return text.toString().toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }
}
