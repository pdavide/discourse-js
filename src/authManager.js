export default {
  getCurrentUser: () => JSON.parse(localStorage.getItem('currentUser')),
  setCurrentUser: (user) => localStorage.setItem('currentUser', JSON.stringify(user)),
  getUserApiKey: () => localStorage.getItem('userApiKey'),
  setUserApiKey: (apiKey) => localStorage.setItem('userApiKey', apiKey),
  hasUserApiKey: () => localStorage.getItem('userApiKey') !== null,
  getAppProp: (appId, name) => localStorage.getItem(appId + '_' + name),
  setAppProp: (appId, name, storedProp) => localStorage.setItem(appId + '_' + name, storedProp),
  removeAppProp: (appId, name) => localStorage.removeItem(appId + '_' + name),
  clearAuthData: (appId) => {
    localStorage.removeItem('userApiKey');
    localStorage.removeItem('currentUser');
    localStorage.removeItem(appId + '_clientId');
  }
};
