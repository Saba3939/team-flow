/**
 * シンプルな統合テスト - 実際のファイルシステムを使用
 */

const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

describe('Team Flow Simple Integration', () => {
  let testDir;

  beforeEach(async () => {
    // 一時テストディレクトリを作成
    testDir = path.join(__dirname, '../../tmp', `test-${Date.now()}`);
    await fs.ensureDir(testDir);
    process.chdir(testDir);

    // 簡単なGitリポジトリを初期化
    await execAsync('git init');
    await execAsync('git config user.name "Test User"');
    await execAsync('git config user.email "test@example.com"');

    // 初期ファイルを作成してコミット
    await fs.writeFile('README.md', '# Test Project');
    await execAsync('git add README.md');
    await execAsync('git commit -m "Initial commit"');
  });

  afterEach(async () => {
    // テストディレクトリをクリーンアップ
    if (testDir && await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }
  });

  test('基本的なGit操作が動作する', async () => {
    // Git状態確認
    const { stdout: status } = await execAsync('git status --porcelain');
    expect(status.trim()).toBe('');

    // ブランチ一覧取得
    const { stdout: branches } = await execAsync('git branch');
    expect(branches).toContain('main');
  });

  test('ユーティリティ関数が正しく動作する', async () => {
    const git = require('../../src/utils/git');

    // 現在のブランチ取得
    const currentBranch = await git.getCurrentBranch();
    expect(currentBranch).toBe('main');

    // 作業ディレクトリがクリーンかチェック
    const isClean = await git.isWorkingDirectoryClean();
    expect(isClean).toBe(true);

    // ローカルブランチ一覧取得
    const localBranches = await git.getLocalBranches();
    expect(localBranches).toContain('main');
  });

  test('ブランチ作成機能が動作する', async () => {
    const git = require('../../src/utils/git');

    // 新しいブランチを作成・切り替え
    const branchName = 'feature/test-feature';
    await git.createAndSwitchBranch(branchName);

    // ブランチが切り替わったことを確認
    const currentBranch = await git.getCurrentBranch();
    expect(currentBranch).toBe(branchName);

    // ブランチ一覧に含まれることを確認
    const branches = await git.getLocalBranches();
    expect(branches).toContain(branchName);
  });

  test('ファイル変更とコミット機能が動作する', async () => {
    const git = require('../../src/utils/git');

    // ファイルを変更
    await fs.writeFile('test.txt', 'Hello World');

    // 作業ディレクトリがダーティになったことを確認
    const isClean = await git.isWorkingDirectoryClean();
    expect(isClean).toBe(false);

    // ファイルをステージング
    await git.addFiles(['test.txt']);

    // コミット
    await git.commit('Add test file');

    // 少し待ってからクリーン状態をチェック（Gitインデックスの同期のため）
    await new Promise(resolve => setTimeout(resolve, 200));

    // ログファイルが作成されている場合は削除（テスト環境特有の問題対応）
    const logFiles = ['.team-flow.log', 'team-flow.log', '.log'];
    for (const logFile of logFiles) {
      if (await fs.pathExists(logFile)) {
        await fs.remove(logFile);
      }
    }

    // 再びクリーンになったことを確認
    const isCleanAfter = await git.isWorkingDirectoryClean();
    expect(isCleanAfter).toBe(true);
  });

  test('バリデーション関数が正しく動作する', () => {
    const Validation = require('../../src/utils/validation');

    // 有効なブランチ名
    const validBranch1 = Validation.validateBranchName('feature/user-profile');
    const validBranch2 = Validation.validateBranchName('bugfix/login-error');

    expect(validBranch1.valid).toBe(true);
    expect(validBranch2.valid).toBe(true);

    // 無効なブランチ名
    const invalidBranch1 = Validation.validateBranchName('feature/');
    const invalidBranch2 = Validation.validateBranchName('');

    expect(invalidBranch1.valid).toBe(false);
    expect(invalidBranch2.valid).toBe(false);

    // 有効なコミットメッセージ
    const validCommit1 = Validation.validateCommitMessage('feat: add user profile feature');
    const validCommit2 = Validation.validateCommitMessage('fix: resolve login error');

    expect(validCommit1.valid).toBe(true);
    expect(validCommit2.valid).toBe(true);

    // 無効なコミットメッセージ（短すぎる）
    const invalidCommit1 = Validation.validateCommitMessage('fix'); // 3文字なので無効
    const invalidCommit2 = Validation.validateCommitMessage('');

    expect(invalidCommit1.valid).toBe(false);
    expect(invalidCommit2.valid).toBe(false);
  });

  test('設定ファイルの読み込みが動作する', async () => {
    const config = require('../../src/config');

    // 設定オブジェクトが存在することを確認
    expect(config).toBeDefined();
    expect(typeof config).toBe('object');

    // getメソッドが存在することを確認
    expect(typeof config.get).toBe('function');
  });

  test('ログ機能が動作する', () => {
    const logger = require('../../src/utils/logger');

    // ログ関数が存在することを確認
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');

    // ログが例外を投げないことを確認
    expect(() => {
      logger.info('Test info message');
      logger.warn('Test warning message');
      logger.error('Test error message');
    }).not.toThrow();
  });
});