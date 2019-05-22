import authManager from './authManager';
let forge = require('./vendor/forge-pki');

export default (() => {
  const generate = (appId) => {
    return new Promise((resolve, reject) => {
      forge.rsa.generateKeyPair({
        workerScript: '/prime-worker.min.js'
      },
      (error, generatedKeypair) => {
        generatedKeypair ? (() => {
          const keypair = {
            public: forge.pki.publicKeyToPem(generatedKeypair.publicKey, 72).replace(/\r/g, ''),
            private: forge.pki.privateKeyToPem(generatedKeypair.privateKey, 72).replace(/\r/g, '')
          };

          authManager.setAppProp(appId, 'publicKey', keypair.public);
          authManager.setAppProp(appId, 'privateKey', keypair.private);
          resolve(keypair);
        })() : reject(error);
      });
    });
  };

  return { generate };
})();
