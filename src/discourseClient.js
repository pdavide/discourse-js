import axios from 'axios';
import { cacheAdapterEnhancer, throttleAdapterEnhancer } from 'axios-extensions';

export default class DiscourseClient {
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl;
    this.instance = axios.create({
      baseURL: this.apiBaseUrl,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json'
      },
      adapter: throttleAdapterEnhancer(
        cacheAdapterEnhancer(axios.defaults.adapter),
        { threshold: 500 } // 120 reqs/min
      )
    });

    this._setUserApiKey(localStorage.getItem('user_api_key'));
  }

  async _getCallResult(endpoint, prop, nocache = false) {
    let response;

    try {
      response = (await this.instance.get(endpoint, { forceUpdate: nocache })).data;
    } catch (error) {
      throw new Error(error);
    }

    if (prop) {
      response = prop.split('.').reduce((returnedResponse, currentProp) =>
        returnedResponse[currentProp], response);
    }

    return response;
  }

  async _postCallResult(endpoint, payload) {
    return (await this.instance.post(endpoint, payload)).data;
  }

  async _setUserApiKey(userApiKey) {
    if (!userApiKey) {
      return;
    }
    this.instance.defaults.headers.common['User-Api-Key'] = userApiKey;
    await this._setCsrfToken();
  }

  async _setCsrfToken() {
    this.instance.defaults.headers.common['X-CSRF-Token'] = await this._getCallResult('/session/csrf.json', 'csrf');
  }

  _checkUserApiKey() {
    this.instance.defaults.headers.common['User-Api-Key'] || throw new Error('User API key not set');
  }

  async _doLogout(username) {
    this._checkUserApiKey();
    await this.instance.delete('/session/' + username);
    await this.instance.post('/user-api-key/revoke');
    delete this.instance.defaults.headers.common['User-Api-Key'];
    delete this.instance.defaults.headers.common['X-CSRF-Token'];
  }
}
