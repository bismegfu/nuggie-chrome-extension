// Mock Chrome Extension APIs for Jest
global.chrome = {
  storage: {
    local: {
      get: jest.fn((keys, cb) => cb && cb({})),
      set: jest.fn((items, cb) => cb && cb()),
      remove: jest.fn((keys, cb) => cb && cb()),
    },
    sync: {
      get: jest.fn((keys, cb) => cb && cb({})),
      set: jest.fn((items, cb) => cb && cb()),
    },
    onChanged: {
      addListener: jest.fn(),
    },
  },
  alarms: {
    create: jest.fn(),
    clear: jest.fn(),
    onAlarm: {
      addListener: jest.fn(),
    },
  },
  idle: {
    setDetectionInterval: jest.fn(),
    queryState: jest.fn(),
    onStateChanged: {
      addListener: jest.fn(),
    },
  },
  tabs: {
    query: jest.fn(),
    onActivated: {
      addListener: jest.fn(),
    },
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
    },
    getURL: jest.fn((path) => `chrome-extension://test-id/${path}`),
  },
  scripting: {
    executeScript: jest.fn(),
  },
};
