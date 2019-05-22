import DiscourseAuth from './discourseAuth';
import DiscourseClient from './discourseClient';
import authManager from './authManager';
import PromiseWindow from 'promise-window';

export default class Discourse {
  constructor(options) {
    this._requireOptions(options);
    this.options = this._formatOptions(options);
    this.auth = new DiscourseAuth(this.options);
    this.client = new DiscourseClient(this.options);
  }

  async init() {
    await Promise.all([this.auth.init(), this.client.init()]);
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
    formattedOptions.appId = this._slugify(options.appName);
    formattedOptions.apiBaseUrl = options.apiBaseUrl.replace(/\/$/, '');
    formattedOptions.scopes = options.scopes.join(',');
    return formattedOptions;
  }

  _slugify(text) {
    return text.toString().toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  getApiBaseUrl() {
    return this.options.apiBaseUrl;
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
      await this.client._setUserApiKey(data.result.key);
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
    await this.client._doLogout(this.getCurrentUserName());
    authManager.clearAuthData(this.options.appId);
    dispatchEvent(new Event('discourseLoggedOut'));
  }

  async getCurrentSessionUser() {
    return await this.client._getCallResult('/session/current.json', 'current_user', true);
  }

  async isLoggedIn() {
    if (!authManager.hasUserApiKey()) {
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
    return authManager.getCurrentUser();
  }

  getCurrentUserName() {
    return this.getCurrentUser() && this.getCurrentUser()['username'];
  }

  getCurrentUserId() {
    return this.getCurrentUser() && this.getCurrentUser()['id'];
  }

  getCurrentUserDisplayName() {
    return this.getCurrentUser() && this.getCurrentUser()['name'];
  }

  isCurrentUserSilenced() {
    return this.getCurrentUser() && !this.getCurrentUser()['can_create_topic'];
  }

  getCurrentUserAvatarUrl(size) {
    return this.getCurrentUser() && [
      this.options.apiBaseUrl,
      this.getCurrentUser()['avatar_template'].replace('{size}', (size || 110))
    ].join('/');
  }

  getCurrentUserNotificationsUrl() {
    return this.getCurrentUser() && [
      this.options.apiBaseUrl,
      'u',
      this.getCurrentUserName(),
      'notifications'
    ].join('/');
  }

  async _refreshCurrentUser() {
    try {
      authManager.setCurrentUser(await this.getCurrentSessionUser());
    } catch (error) {
      await this.logout();
      throw new Error('Not logged in.');
    }
  }

  async getLatestPosts(descending) {
    let posts;

    try {
      posts = await this.client._getCallResult('/posts.json', 'latest_posts');
    } catch (error) {
      throw new Error(error);
    }

    if (descending) {
      posts = posts.reverse();
    }

    return posts.filter(post => post.post_type === 1);
  }

  async getPostsInTopic(topicId, descending, nocache = false) {
    let posts = await this.client._getCallResult('/t/' + topicId + '/posts.json?include_raw=true',
      'post_stream.posts', nocache);

    if (descending) {
      posts = posts.reverse();
    }

    return posts.filter(post => post.post_type === 1);
  }

  async getTopic(topicId, descending, nocache = false) {
    let topic = await this.client._getCallResult('/t/' + topicId + '.json?include_raw=true', false, nocache);

    topic.post_stream.posts = topic.post_stream.posts.filter(post => post.post_type === 1);

    if (descending) {
      topic.post_stream.posts = topic.post_stream.posts.reverse();
    }

    return topic;
  }

  async getPublicUserFields(username) {
    return await this.client._getCallResult('/u/' + username + '.json?stats=false', 'user.user_fields');
  }

  async getPublicUserField(username, field) {
    const userFields = await this.getPublicUserFields(username);

    return userFields && userFields[field];
  }

  async postMessage(topicId, message) {
    this.client._checkUserApiKey();
    return await this.client._postCallResult('/posts.json', {
      /* eslint-disable camelcase */
      topic_id: topicId,
      raw: message
      /* eslint-enable camelcase */
    }).then(response => {
      response.hidden && Promise.reject(response.hidden_reason_id);
      return response;
    }).catch(error => Promise.reject(error.response.data.errors));
  }

  async likePost(postId) {
    this.client._checkUserApiKey();
    return await this.client._postCallResult('/post_actions', {
      /* eslint-disable camelcase */
      id: postId,
      post_action_type_id: 2
      /* eslint-enable camelcase */
    }).then(response => response).catch(error => Promise.reject(error.response.data.errors));
  }

  async undoLikePost(postId) {
    this.client._checkUserApiKey();
    return (await this.client.instance.delete('/post_actions/' + postId, {
      data: {
        /* eslint-disable camelcase */
        post_action_type_id: '2'
        /* eslint-enable camelcase */
      }
    })).data;
  }
}

window.Discourse = Discourse;
