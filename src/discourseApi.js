import axios from 'axios';
import { cacheAdapterEnhancer, throttleAdapterEnhancer } from 'axios-extensions';

export default class DiscourseApi {
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl;
    this.api = axios.create({
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
      response = (await this.api.get(endpoint, { forceUpdate: nocache })).data;
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
    return (await this.api.post(endpoint, payload)).data;
  }

  async _setUserApiKey(userApiKey) {
    if (!userApiKey) {
      return;
    }
    this.api.defaults.headers.common['User-Api-Key'] = userApiKey;
    await this._setCsrfToken();
  }

  async _setCsrfToken() {
    this.api.defaults.headers.common['X-CSRF-Token'] = await this._getCallResult('/session/csrf.json', 'csrf');
  }

  _enforceUserApiKey() {
    this.api.defaults.headers.common['User-Api-Key'] || throw new Error('User API key not set');
  }

  async getCurrentSessionUser() {
    return await this._getCallResult('/session/current.json', 'current_user', true);
  }

  async getLatestPosts(descending) {
    let posts;

    try {
      posts = await this._getCallResult('/posts.json', 'latest_posts');
    } catch (error) {
      throw new Error(error);
    }

    if (descending) {
      posts = posts.reverse();
    }

    return posts.filter(post => post.post_type === 1);
  }

  async getPostsInTopic(topicId, descending, nocache) {
    let posts = await this._getCallResult('/t/' + topicId + '/posts.json?include_raw=true',
      'post_stream.posts', nocache);

    if (descending) {
      posts = posts.reverse();
    }

    return posts.filter(post => post.post_type === 1);
  }

  async getTopic(topicId, descending) {
    let topic = await this._getCallResult('/t/' + topicId + '.json?include_raw=true');

    topic.post_stream.posts = topic.post_stream.posts.filter(post => post.post_type === 1);

    if (descending) {
      topic.post_stream.posts = topic.post_stream.posts.reverse();
    }

    return topic;
  }

  async getPublicUserFields(username) {
    return await this._getCallResult('/u/' + username + '.json?stats=false', 'user.user_fields');
  }

  async getPublicUserField(username, field) {
    const userFields = await this.getPublicUserFields(username);

    return userFields && userFields[field];
  }

  async postMessage(topicId, message) {
    this._enforceUserApiKey();
    return await this._postCallResult('/posts.json', {
      /* eslint-disable camelcase */
      topic_id: topicId,
      raw: message
      /* eslint-enable camelcase */
    }).then(response => {
      response.hidden && Promise.reject(response.hidden_reason_id);
      return response;
    }).catch(error => Promise.reject(error.response.data.errors));
  }

  async logout(username) {
    this._enforceUserApiKey();
    // await this.api.delete('/session/' + username); // Not yet supported
    await this.api.post('/user-api-key/revoke');
    delete this.api.defaults.headers.common['User-Api-Key'];
    delete this.api.defaults.headers.common['X-CSRF-Token'];
  }
}
