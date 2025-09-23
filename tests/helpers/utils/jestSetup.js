/**
 * Jest セットアップファイル
 */

// 全テストで共通のタイムアウト設定
jest.setTimeout(10000);

// 元の作業ディレクトリを保存
const originalCwd = process.cwd();

// 各テスト後に作業ディレクトリを確実に戻す
afterEach(() => {
  try {
    // 作業ディレクトリが存在する場合のみ戻す
    if (originalCwd && require('fs').existsSync(originalCwd)) {
      process.chdir(originalCwd);
    }
  } catch (error) {
    // 元のディレクトリに戻れない場合は、プロジェクトルートを探す
    try {
      const path = require('path');
      let current = process.cwd();
      while (current !== '/' && current !== path.dirname(current)) {
        if (require('fs').existsSync(path.join(current, 'package.json'))) {
          process.chdir(current);
          break;
        }
        current = path.dirname(current);
      }
    } catch (fallbackError) {
      // 最終手段として安全なディレクトリに移動
      try {
        process.chdir('/tmp');
      } catch (finalError) {
        console.warn('作業ディレクトリの復元に失敗しました');
      }
    }
  }
});

// コンソール出力の抑制（必要に応じて）
if (process.env.SUPPRESS_CONSOLE === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// テスト環境の設定
process.env.NODE_ENV = 'test';
process.env.GITHUB_TOKEN = 'ghp_test_token_1234567890';
process.env.SLACK_TOKEN = 'xoxb-test-slack-token';
process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test';

// グローバルなモック設定
global.mockTimestamp = () => '2025-01-01T00:00:00.000Z';

// 日付のモック
const OriginalDate = Date;
const mockDate = new OriginalDate('2025-01-01T00:00:00.000Z');
global.Date = class extends OriginalDate {
  constructor(...args) {
    if (args.length === 0) {
      return mockDate;
    }
    return new OriginalDate(...args);
  }

  static now() {
    return mockDate.getTime();
  }
};

// プロセス終了の防止
const originalExit = process.exit;
process.exit = jest.fn();

// テスト終了時の復元
afterAll(() => {
  process.exit = originalExit;
});

// 未処理のPromise rejectionをキャッチ
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// グローバルなテストヘルパー
global.createMockFunction = (returnValue) => {
  return jest.fn().mockResolvedValue(returnValue);
};

global.createMockError = (message, code) => {
  const error = new Error(message);
  if (code) error.code = code;
  return error;
};

// 非同期待機ヘルパー
global.waitFor = async (condition, timeout = 5000, interval = 100) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
};

// ファイルシステムモックヘルパー
global.mockFileSystem = () => {
  return {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    readJSON: jest.fn(),
    writeJSON: jest.fn(),
    pathExists: jest.fn(),
    ensureDir: jest.fn(),
    copy: jest.fn(),
    remove: jest.fn(),
    stat: jest.fn(),
    readdir: jest.fn()
  };
};

// Git操作モックヘルパー
global.mockGitOperations = () => {
  return {
    getCurrentBranch: jest.fn().mockResolvedValue('main'),
    getBranches: jest.fn().mockResolvedValue(['main', 'develop']),
    getStatus: jest.fn().mockResolvedValue({
      current: 'main',
      modified: [],
      staged: [],
      untracked: []
    }),
    createBranch: jest.fn().mockResolvedValue(),
    checkoutBranch: jest.fn().mockResolvedValue(),
    addFiles: jest.fn().mockResolvedValue(),
    commit: jest.fn().mockResolvedValue({ hash: 'abc123' }),
    push: jest.fn().mockResolvedValue(),
    pull: jest.fn().mockResolvedValue()
  };
};

// GitHub API モックヘルパー
global.mockGitHubAPI = () => {
  return {
    rest: {
      users: {
        getAuthenticated: jest.fn().mockResolvedValue({
          data: { login: 'test-user', name: 'Test User' }
        })
      },
      repos: {
        get: jest.fn().mockResolvedValue({
          data: { full_name: 'test-user/test-repo' }
        }),
        listBranches: jest.fn().mockResolvedValue({ data: [] }),
        listContributors: jest.fn().mockResolvedValue({ data: [] })
      },
      issues: {
        listForRepo: jest.fn().mockResolvedValue({ data: [] }),
        create: jest.fn().mockResolvedValue({
          data: { number: 1, title: 'Test Issue' }
        }),
        get: jest.fn().mockResolvedValue({
          data: { number: 1, title: 'Test Issue' }
        })
      },
      pulls: {
        list: jest.fn().mockResolvedValue({ data: [] }),
        create: jest.fn().mockResolvedValue({
          data: { number: 1, title: 'Test PR' }
        })
      },
      rateLimit: {
        get: jest.fn().mockResolvedValue({
          data: { rate: { limit: 5000, remaining: 4999 } }
        })
      }
    }
  };
};

// テストデータ生成ヘルパー
global.generateTestData = {
  user: () => ({
    login: 'test-user',
    name: 'Test User',
    email: 'test@example.com',
    avatar_url: 'https://github.com/images/test.png'
  }),

  repository: () => ({
    full_name: 'test-user/test-repo',
    name: 'test-repo',
    owner: { login: 'test-user' },
    private: false
  }),

  issue: (overrides = {}) => ({
    number: 1,
    title: 'Test Issue',
    body: 'This is a test issue',
    state: 'open',
    labels: [{ name: 'bug' }],
    assignees: [],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    html_url: 'https://github.com/test-user/test-repo/issues/1',
    ...overrides
  }),

  pullRequest: (overrides = {}) => ({
    number: 1,
    title: 'Test PR',
    body: 'This is a test PR',
    state: 'open',
    head: { ref: 'feature-branch' },
    base: { ref: 'main' },
    user: { login: 'test-user' },
    draft: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    html_url: 'https://github.com/test-user/test-repo/pull/1',
    ...overrides
  }),

  gitStatus: (overrides = {}) => ({
    current: 'main',
    tracking: 'origin/main',
    ahead: 0,
    behind: 0,
    staged: [],
    modified: [],
    untracked: [],
    conflicted: [],
    ...overrides
  })
};

// エラーアサーションヘルパー
global.expectError = async (asyncFn, expectedMessage) => {
  try {
    await asyncFn();
    throw new Error('Expected function to throw an error');
  } catch (error) {
    if (typeof expectedMessage === 'string') {
      expect(error.message).toContain(expectedMessage);
    } else if (expectedMessage instanceof RegExp) {
      expect(error.message).toMatch(expectedMessage);
    } else {
      expect(error).toEqual(expectedMessage);
    }
  }
};

// モック状態のリセットヘルパー
global.resetAllMocks = () => {
  jest.clearAllMocks();
  jest.resetAllMocks();
  jest.restoreAllMocks();
};

// テスト実行前後のフック
beforeEach(() => {
  // 各テストの前にモックをクリア
  jest.clearAllMocks();
});

afterEach(() => {
  // 各テストの後にタイマーをクリア
  jest.clearAllTimers();
  jest.useRealTimers();
});

// カスタムマッチャー
expect.extend({
  toBeValidBranchName(received) {
    const branchNameRegex = /^(feature|bugfix|hotfix)\/[a-z0-9-]+$/;
    const pass = branchNameRegex.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid branch name`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid branch name (format: type/name)`,
        pass: false,
      };
    }
  },

  toBeGitHash(received) {
    const gitHashRegex = /^[a-f0-9]{7,40}$/;
    const pass = gitHashRegex.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid Git hash`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid Git hash`,
        pass: false,
      };
    }
  }
});

console.log('🧪 Jest セットアップ完了');