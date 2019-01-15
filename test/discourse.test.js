import DiscourseClient from '../src/discourse.js';
import mockForge from 'node-forge';

let client;

jest.mock('../src/vendor/forge-pki', () => {
  return mockForge;
});

jest.mock('promise-window', () => {
  return { open: jest.fn().mockResolvedValue({ result: { key: 'user-api-key' }}) };
});

jest.mock('axios', () => {
  return {
    create: () => {
      return {
        get: jest.fn().mockResolvedValue({ data: { current_user: 'current_user' }}),
        defaults: {
          headers: {
            common: []
          }
        }
      }
    },
    defaults: {
      adapter: undefined,
      headers: {
        common: []
      }
    }
  }
});

describe('Given an instance of Discourse client', () => {
  beforeAll(() => {
    client = new DiscourseClient({
      appName: 'App name',
      apiBaseUrl: 'https://example.com',
      scopes: ['write']
    });
  });

  describe('after creation', () => {
    test('I should get a keypair to use in the login process', async () => {
      // generated
      await expect(client.auth.km.getKeys()).resolves.toHaveProperty('public');
      await expect(client.auth.km.getKeys()).resolves.toHaveProperty('private');
      // from localStorage
      expect(localStorage.getItem('app-name_publicKey')).toBeDefined();
      expect(localStorage.getItem('app-name_privateKey')).toBeDefined();
    }, 10000);
  });

  describe('when I request login', () => {
    test('I should get an user-apy-key', async () => {
      await expect(() => client.login()).not.toThrow();
      expect(localStorage.getItem('user-api-key')).toBeDefined();
    }, 10000);
  });
});
