import authManager from './authManager';

export default class KeyManager {
  constructor(appId) {
    this.appId = appId;
  }

  async generateNewKeypair() {
    return import(
      /*
        webpackChunkName: "keyGenerator",
        webpackPreload: true
      */
      './keyGenerator').then(({ default: keyGenerator }) => {
      return keyGenerator.generate(this.appId).then((keypair) => {
        return keypair;
      });
    });
  }

  async getKeys() {
    return this.readKeysFromStorage() || await this.generateNewKeypair();
  }

  readKeysFromStorage() {
    const publicKey = authManager.getAppProp(this.appId, 'publicKey');
    const privateKey = authManager.getAppProp(this.appId, 'privateKey');

    return (publicKey && privateKey) ?
      {
        public: publicKey,
        private: privateKey
      } : null;
  }

  async getPublicKey() {
    return (await this.getKeys())['public'];
  }

  async getPrivateKey() {
    return (await this.getKeys())['private'];
  }

  async decryptPayload(payload) {
    return this.getPrivateKey().then(privateKey => {
      return import(
        /*
          webpackChunkName: "jsencrypt",
          webpackPreload: true
        */
        'jsencrypt').then(({ default: Jsencrypt }) => {
        const jsencrypt = new Jsencrypt();

        jsencrypt.setPrivateKey(privateKey);
        return JSON.parse(jsencrypt.decrypt(payload));
      });
    });
  }
};
