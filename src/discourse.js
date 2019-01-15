import DiscourseAuth from './discourseAuth';
import DiscourseApi from './discourseApi';
import PromiseWindow from 'promise-window';

export default class DiscourseClient {
  constructor(options) {
    this._requireOptions(options);
    this.options = this._formatOptions(options);
    this.auth = new DiscourseAuth(this.options);
    this.api = new DiscourseApi(this.options.apiBaseUrl);
  }

  async init() {
    await this.auth.init();
  }

  _requireOptions(options) {
    (options && typeof options === 'object') ||
      throw new Error('Options must be an object');
    (typeof options.appName === 'string' && options.appName.length > 0) ||
      throw new Error('options.appName must be a non-empty string');
    (typeof options.apiBaseUrl === 'string' && options.apiBaseUrl.length > 0) ||
      throw new Error('Options.apiBaseUrl must be a non-empty string');
    (options.scopes instanceof Array && options.scopes.length > 0) ||
      throw new Error('Options.scopes must be a non-empty array');
  }

  _formatOptions(options) {
    const formattedOptions = { ...options };

    // remove trailing slash
    formattedOptions.apiBaseUrl = options.apiBaseUrl.replace(/\/$/, '');
    formattedOptions.scopes = options.scopes.join(',');
    return formattedOptions;
  }

  getApiBaseUrl() {
    return this.options.apiBaseUrl;
  }

  async isLoggedIn() {
    if (!this.auth._hasUserApiKey()) {
      return false;
    }

    try {
      await this._refreshCurrentUser();
      return true;
    } catch (error) {
      return false;
    }
  }

  getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser'));
  }

  getCurrentUserName() {
    return this.getCurrentUser()['username'];
  }

  getCurrentUserDisplayName() {
    return this.getCurrentUser()['name'];
  }

  isCurrentUserSilenced() {
    return !this.getCurrentUser()['can_create_topic'];
  }

  getCurrentUserAvatarUrl(size) {
    return [
      this.options.apiBaseUrl,
      this.getCurrentUser()['avatar_template'].replace('{size}', (size || 110))
    ].join('/');
  }

  getCurrentUserNotificationsUrl() {
    return [
      this.options.apiBaseUrl,
      'u',
      this.getCurrentUserName(),
      'notifications'
    ].join('/');
  }

  async _refreshCurrentUser() {
    try {
      localStorage.setItem('currentUser', JSON.stringify(await this.api.getCurrentSessionUser()));
    } catch (error) {
      await this.logout();
      throw new Error('Not logged in.');
    }
  }

  async login() {
    if (await this.isLoggedIn()) {
      return;
    }

    await PromiseWindow.open(await this.auth._getLoginUrl(), {
      width: 700,
      height: 650,
      originRegexp: new RegExp('^' + location.origin)
    }).then(async data => {
      await this.api._setUserApiKey(data.result.key);
      await this._refreshCurrentUser();
    },

    // Error
    (error) => {
      switch (error) {
        case 'closed':
          dispatchEvent(new Event('discourseLoginCanceled'));
          throw new Error('Authentication popup window closed by the user');
        case 'blocked':
          dispatchEvent(new Event('discourseLoginBlocked'));
          throw new Error('Authentication popup window blocked by the browser');
        default:
          throw new Error('Authentication popup window returned an error: ', error);
      }
    }).then(() => dispatchEvent(new Event('discourseLoggedIn')));
  }

  async logout() {
    await this.api.logout(this.getCurrentUserName());
    this.auth._clearAuthData();
    dispatchEvent(new Event('discourseLoggedOut'));
  }
}
