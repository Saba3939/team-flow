/**
 * テストセットアップユーティリティ
 */

const fs = require('fs-extra');
const path = require('path');
const MockGit = require('../mocks/git');
const MockOctokit = require('../mocks/github');

class TestSetup {
  constructor() {
    this.testDir = null;
    this.originalCwd = process.cwd();
    this.mockGit = new MockGit();
    this.mockGitHub = new MockOctokit();
    this.envBackup = {};
  }

  /**
   * テスト用ディレクトリを作成
   */
  async createTestDirectory(testName = 'test') {
    const timestamp = Date.now();
    this.testDir = path.join(__dirname, '../../fixtures/temp', `${testName}-${timestamp}`);
    await fs.ensureDir(this.testDir);
    return this.testDir;
  }

  /**
   * テスト用のGitリポジトリを初期化
   */
  async initTestRepository() {
    if (!this.testDir) {
      throw new Error('Test directory not created. Call createTestDirectory() first.');
    }

    // .gitディレクトリを作成（モック用）
    await fs.ensureDir(path.join(this.testDir, '.git'));

    // 基本的なファイルを作成
    await fs.writeFile(path.join(this.testDir, 'README.md'), '# Test Repository\n');
    await fs.writeFile(path.join(this.testDir, 'package.json'), JSON.stringify({
      name: 'test-repo',
      version: '1.0.0',
      description: 'Test repository for team-flow'
    }, null, 2));

    // .team-flowディレクトリを作成
    await fs.ensureDir(path.join(this.testDir, '.team-flow'));
    await fs.writeJSON(path.join(this.testDir, '.team-flow', 'config.json'), {
      version: '1.0.0',
      defaultBranch: 'main',
      autoBackup: true
    });

    return this.testDir;
  }

  /**
   * 作業ディレクトリを変更
   */
  changeToTestDirectory() {
    if (!this.testDir) {
      throw new Error('Test directory not created.');
    }
    process.chdir(this.testDir);
  }

  /**
   * 元の作業ディレクトリに戻る
   */
  restoreWorkingDirectory() {
    process.chdir(this.originalCwd);
  }

  /**
   * 環境変数をセットアップ
   */
  setupEnvironment(env = {}) {
    // 現在の環境変数をバックアップ
    const envKeys = ['GITHUB_TOKEN', 'SLACK_TOKEN', 'DISCORD_WEBHOOK_URL', 'NODE_ENV'];
    envKeys.forEach(key => {
      this.envBackup[key] = process.env[key];
    });

    // テスト用環境変数を設定
    const testEnv = {
      NODE_ENV: 'test',
      GITHUB_TOKEN: 'ghp_test_token_1234567890',
      SLACK_TOKEN: 'xoxb-test-slack-token',
      DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/test',
      ...env
    };

    Object.assign(process.env, testEnv);
  }

  /**
   * 環境変数を復元
   */
  restoreEnvironment() {
    Object.keys(this.envBackup).forEach(key => {
      if (this.envBackup[key] !== undefined) {
        process.env[key] = this.envBackup[key];
      } else {
        delete process.env[key];
      }
    });
    this.envBackup = {};
  }

  /**
   * モックを初期化
   */
  setupMocks() {
    // Gitモックを設定
    jest.doMock('../../src/utils/git', () => this.mockGit);

    // GitHub APIモックを設定
    jest.doMock('@octokit/rest', () => ({
      Octokit: jest.fn(() => this.mockGitHub)
    }));

    // ファイルシステム操作のモック
    this.setupFileSystemMocks();

    // コンソール出力のモック
    this.setupConsoleMocks();
  }

  /**
   * ファイルシステム操作をモック
   */
  setupFileSystemMocks() {
    // fs-extraのモック
    this.mockFs = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      readJSON: jest.fn(),
      writeJSON: jest.fn(),
      pathExists: jest.fn(),
      ensureDir: jest.fn(),
      copy: jest.fn(),
      remove: jest.fn()
    };

    jest.doMock('fs-extra', () => this.mockFs);
  }

  /**
   * コンソール出力をモック
   */
  setupConsoleMocks() {
    this.originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info
    };

    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    console.info = jest.fn();
  }

  /**
   * コンソール出力を復元
   */
  restoreConsole() {
    if (this.originalConsole) {
      Object.assign(console, this.originalConsole);
    }
  }

  /**
   * モックをクリア
   */
  clearMocks() {
    this.mockGit.clearMocks();
    this.mockGitHub.clearMocks();

    if (this.mockFs) {
      Object.values(this.mockFs).forEach(mock => {
        if (jest.isMockFunction(mock)) {
          mock.mockClear();
        }
      });
    }

    // Jestモックをクリア
    jest.clearAllMocks();
  }

  /**
   * テストファイクスチャを作成
   */
  async createFixtures() {
    if (!this.testDir) {
      throw new Error('Test directory not created.');
    }

    const fixtures = {
      // テスト用の設定ファイル
      config: {
        version: '1.0.0',
        defaultBranch: 'main',
        autoBackup: true,
        notifications: {
          slack: false,
          discord: false
        }
      },

      // テスト用のPackage.json
      packageJson: {
        name: 'test-team-flow',
        version: '1.0.0',
        scripts: {
          test: 'jest',
          lint: 'eslint src/',
          start: 'node bin/team-flow.js'
        },
        dependencies: {
          '@octokit/rest': '^19.0.0',
          'chalk': '^5.0.0',
          'fs-extra': '^11.0.0'
        }
      },

      // テスト用の.env
      env: 'GITHUB_TOKEN=ghp_test_token\nSLACK_TOKEN=xoxb-test\nDISCORD_WEBHOOK_URL=https://discord.com/webhooks/test'
    };

    // フィクスチャファイルを作成
    await fs.writeJSON(path.join(this.testDir, '.team-flow', 'config.json'), fixtures.config);
    await fs.writeJSON(path.join(this.testDir, 'package.json'), fixtures.packageJson);
    await fs.writeFile(path.join(this.testDir, '.env'), fixtures.env);

    // テスト用のソースファイル
    await fs.writeFile(path.join(this.testDir, 'test-file.js'), 'console.log("Hello, World!");');
    await fs.writeFile(path.join(this.testDir, 'README.md'), '# Test Project\n\nThis is a test project.');

    return fixtures;
  }

  /**
   * テストシナリオデータを作成
   */
  createScenarioData() {
    return {
      user: {
        login: 'test-user',
        name: 'Test User',
        email: 'test@example.com'
      },
      repository: {
        owner: 'test-user',
        repo: 'test-repo',
        fullName: 'test-user/test-repo'
      },
      branches: [
        'main',
        'develop',
        'feature/new-feature',
        'hotfix/critical-bug'
      ],
      issues: [
        {
          number: 1,
          title: 'バグを修正してください',
          body: 'ログイン機能にバグがあります',
          labels: ['bug', 'high-priority']
        },
        {
          number: 2,
          title: '新機能の追加',
          body: 'ダークモード機能を追加したいです',
          labels: ['enhancement', 'feature']
        }
      ],
      pullRequests: [
        {
          number: 1,
          title: 'バグ修正: ログイン機能',
          head: 'hotfix/login-bug',
          base: 'main',
          state: 'open'
        }
      ]
    };
  }

  /**
   * テスト後のクリーンアップ
   */
  async cleanup() {
    try {
      // 必ず元の作業ディレクトリに戻る
      this.restoreWorkingDirectory();
    } catch (error) {
      // 元のディレクトリが削除されている場合に備えて、プロジェクトルートに戻る
      try {
        process.chdir(this.originalCwd);
      } catch (cwdError) {
        // 最後の手段として、まだ存在するディレクトリに移動
        process.chdir('/');
      }
    }

    // 環境変数を復元
    this.restoreEnvironment();

    // コンソールを復元
    this.restoreConsole();

    // テストディレクトリを削除（遅延削除で他のテストとの競合を避ける）
    if (this.testDir && await fs.pathExists(this.testDir)) {
      // 少し待ってから削除を試行
      setTimeout(async () => {
        try {
          if (await fs.pathExists(this.testDir)) {
            await fs.remove(this.testDir);
          }
        } catch (error) {
          // 削除失敗は警告のみ（テストの実行は継続）
          console.warn(`テストディレクトリの削除に失敗: ${error.message}`);
        }
      }, 100);
    }

    // モックをクリア
    this.clearMocks();

    // Jest設定をリセット
    jest.resetAllMocks();
    jest.restoreAllMocks();
  }

  /**
   * 非同期テストのヘルパー
   */
  async waitFor(condition, timeout = 5000, interval = 100) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error(`Timeout waiting for condition after ${timeout}ms`);
  }

  /**
   * エラーテストのヘルパー
   */
  async expectError(asyncFn, expectedError) {
    try {
      await asyncFn();
      throw new Error('Expected function to throw an error');
    } catch (error) {
      if (typeof expectedError === 'string') {
        expect(error.message).toContain(expectedError);
      } else if (expectedError instanceof RegExp) {
        expect(error.message).toMatch(expectedError);
      } else {
        expect(error).toEqual(expectedError);
      }
    }
  }
}

module.exports = TestSetup;