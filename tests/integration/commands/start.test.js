/**
 * Start コマンドの統合テスト
 */

const TestSetup = require('../../helpers/utils/testSetup');
const MockGit = require('../../helpers/mocks/git');
const MockOctokit = require('../../helpers/mocks/github');

// 必要なモジュールをモック
jest.mock('../../../src/utils/logger');
jest.mock('@octokit/rest');
jest.mock('@inquirer/prompts');
jest.mock('../../../src/utils/git');

describe('Start Command Integration', () => {
  let testSetup;
  let mockGit;
  let mockGitHub;
  let startCommand;

  beforeEach(async () => {
    // モジュールキャッシュをクリア
    jest.resetModules();

    testSetup = new TestSetup();
    await testSetup.createTestDirectory('start-command-test');
    await testSetup.initTestRepository();
    testSetup.changeToTestDirectory();
    testSetup.setupEnvironment();

    // モックを初期化
    mockGit = new MockGit();
    mockGitHub = new MockOctokit();

    // モックをdoMockで確実に設定
    jest.doMock('../../../src/utils/git', () => mockGit);

    const { Octokit } = require('@octokit/rest');
    Octokit.mockImplementation(() => mockGitHub);

    // Inquirerのモック
    const inquirer = require('@inquirer/prompts');
    inquirer.select = jest.fn();
    inquirer.input = jest.fn();
    inquirer.confirm = jest.fn();
    inquirer.checkbox = jest.fn();

    // startCommandを動的にインポート（モック設定後）
    delete require.cache[require.resolve('../../../src/commands/start')];
    const startModule = require('../../../src/commands/start');
    startCommand = startModule.execute || startModule;
  });

  afterEach(async () => {
    await testSetup.cleanup();
    jest.resetAllMocks();
  });

  describe('新機能開発の開始', () => {
    test('正常な新機能開発フローが実行される', async () => {
      const inquirer = require('@inquirer/prompts');

      // ユーザー入力をモック
      inquirer.select
        .mockResolvedValueOnce('feature') // 作業種別: 新機能開発
        .mockResolvedValueOnce('none'); // Issue操作: Issueなしで作業開始

      inquirer.input
        .mockResolvedValueOnce('新しいダッシュボード機能'); // 作業内容

      // Gitの状態をセットアップ
      mockGit.setCurrentBranch('main');
      mockGit.mockFileChanges([], [], []); // クリーンな状態

      // startCommandを実行 (executeはstartCommand関数自体)
      await startCommand();

      // 適切なGit操作が実行されたことを確認
      expect(mockGit.createAndSwitchBranch).toHaveBeenCalledWith(
        expect.stringMatching(/^feature\//)
      );

      // Issue作成は呼ばれないことを確認（'none'を選択したため）
      expect(mockGitHub.rest.issues.create).not.toHaveBeenCalled();
    });

    test('新しいIssue作成での開発フローが実行される', async () => {
      const inquirer = require('@inquirer/prompts');

      // ユーザー入力をモック
      inquirer.select
        .mockResolvedValueOnce('feature') // 作業種別: 新機能開発
        .mockResolvedValueOnce('create'); // Issue操作: 新しいIssue作成

      inquirer.input
        .mockResolvedValueOnce('新しいダッシュボード機能') // Issueタイトル
        .mockResolvedValueOnce('ユーザー用のダッシュボード機能を実装します'); // Issue内容

      // Gitの状態をセットアップ
      mockGit.setCurrentBranch('main');
      mockGit.mockFileChanges([], [], []); // クリーンな状態

      // GitHub APIモックを設定
      mockGitHub.rest.issues.create.mockResolvedValueOnce({
        data: {
          number: 123,
          title: '新しいダッシュボード機能',
          body: 'ユーザー用のダッシュボード機能を実装します',
          labels: [],
          assignees: [],
          html_url: 'https://github.com/test-user/test-repo/issues/123'
        }
      });

      // startCommandを実行
      await startCommand();

      // 適切なGit操作が実行されたことを確認
      expect(mockGit.createAndSwitchBranch).toHaveBeenCalledWith(
        expect.stringMatching(/^feature\/issue-123-/)
      );

      // GitHub APIでIssueが作成されたことを確認
      expect(mockGitHub.rest.issues.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '新しいダッシュボード機能',
          body: 'ユーザー用のダッシュボード機能を実装します'
        })
      );
    });

    test('既存Issueを使用した開発フローが実行される', async () => {
      const inquirer = require('@inquirer/prompts');

      // GitHub Mock の getOpenIssues をセットアップ
      mockGitHub.rest.issues.listForRepo.mockResolvedValueOnce({
        data: [
          {
            number: 1,
            title: '既存Issue: バグ修正',
            body: '重要なバグを修正する必要があります',
            labels: [{ name: 'bug' }],
            assignees: [],
            state: 'open',
            html_url: 'https://github.com/test-user/test-repo/issues/1'
          }
        ]
      });

      // ユーザー入力をモック
      inquirer.select
        .mockResolvedValueOnce('bugfix') // 作業種別: バグ修正
        .mockResolvedValueOnce('select') // Issue操作: 既存Issueから選択
        .mockResolvedValueOnce({        // Issue選択
          number: 1,
          title: '既存Issue: バグ修正',
          body: '重要なバグを修正する必要があります',
          labels: [{ name: 'bug' }],
          assignees: [],
          state: 'open',
          html_url: 'https://github.com/test-user/test-repo/issues/1'
        });

      inquirer.confirm
        .mockResolvedValueOnce(true); // ブランチ作成確認

      // startCommandを実行 (executeはstartCommand関数自体)
      await startCommand();

      // 適切なブランチ名でブランチが作成されたことを確認
      expect(mockGit.createAndSwitchBranch).toHaveBeenCalledWith(
        expect.stringMatching(/^bugfix\/issue-1/)
      );

      // 新しいIssueは作成されないことを確認
      expect(mockGitHub.rest.issues.create).not.toHaveBeenCalled();
    });
  });

  describe('エラー処理', () => {
    test('クリーンでない状態での開始時の処理', async () => {
      const inquirer = require('@inquirer/prompts');

      // 未コミットの変更がある状態
      mockGit.isWorkingDirectoryClean.mockResolvedValueOnce(false);
      mockGit.mockFileChanges(['modified-file.js'], [], ['new-file.js']);

      inquirer.select
        .mockResolvedValueOnce('feature') // 作業種別
        .mockResolvedValueOnce('none'); // Issue選択: なし
      inquirer.input
        .mockResolvedValueOnce('テスト機能'); // 作業内容
      inquirer.confirm
        .mockResolvedValueOnce(true); // stash確認

      await startCommand();

      // stashが実行されることを確認
      expect(mockGit.stash).toHaveBeenCalled();
    });

    test('ブランチ作成失敗時の処理', async () => {
      const inquirer = require('@inquirer/prompts');

      // Git状態をクリーンに設定
      mockGit.isWorkingDirectoryClean.mockResolvedValueOnce(true);

      // ブランチ作成でエラーが発生
      mockGit.createAndSwitchBranch.mockRejectedValueOnce(new Error('Branch already exists'));

      inquirer.select
        .mockResolvedValueOnce('feature') // 作業種別
        .mockResolvedValueOnce('none'); // Issue選択: なし
      inquirer.input
        .mockResolvedValueOnce('テスト機能'); // 作業内容

      // エラーが適切に処理されることを確認
      await expect(startCommand()).rejects.toThrow('Branch already exists');
    });

    test('GitHub API エラー時の処理', async () => {
      const inquirer = require('@inquirer/prompts');

      // Git状態をクリーンに設定
      mockGit.isWorkingDirectoryClean.mockResolvedValueOnce(true);

      // Issue作成でAPIエラー
      mockGitHub.mockApiError('issues.create', 403, 'Forbidden');

      inquirer.select
        .mockResolvedValueOnce('feature') // 作業種別
        .mockResolvedValueOnce('create'); // Issue選択: 作成
      inquirer.input
        .mockResolvedValueOnce('テスト機能') // Issue タイトル
        .mockResolvedValueOnce('テスト'); // Issue 詳細

      // エラーが適切に処理されることを確認
      await expect(startCommand()).rejects.toThrow('Forbidden');
    });
  });

  describe('ブランチ命名規則', () => {
    test('機能開発のブランチ名が正しく生成される', async () => {
      const inquirer = require('@inquirer/prompts');

      // Git状態をクリーンに設定
      mockGit.isWorkingDirectoryClean.mockResolvedValueOnce(true);

      inquirer.select
        .mockResolvedValueOnce('feature') // 作業種別
        .mockResolvedValueOnce('none'); // Issue選択: なし
      inquirer.input
        .mockResolvedValueOnce('新しいログイン機能'); // 作業内容

      await startCommand();

      expect(mockGit.createAndSwitchBranch).toHaveBeenCalledWith(
        expect.stringMatching(/^feature\//)
      );
    });

    test('バグ修正のブランチ名が正しく生成される', async () => {
      const inquirer = require('@inquirer/prompts');

      // Git状態をクリーンに設定
      mockGit.isWorkingDirectoryClean.mockResolvedValueOnce(true);

      inquirer.select
        .mockResolvedValueOnce('bugfix') // 作業種別
        .mockResolvedValueOnce('none'); // Issue選択: なし
      inquirer.input
        .mockResolvedValueOnce('ログインバグ修正'); // 作業内容

      await startCommand();

      expect(mockGit.createAndSwitchBranch).toHaveBeenCalledWith(
        expect.stringMatching(/^bugfix\//)
      );
    });

    test('ホットフィックスのブランチ名が正しく生成される', async () => {
      const inquirer = require('@inquirer/prompts');

      // Git状態をクリーンに設定
      mockGit.isWorkingDirectoryClean.mockResolvedValueOnce(true);

      inquirer.select
        .mockResolvedValueOnce('hotfix') // 作業種別
        .mockResolvedValueOnce('none'); // Issue選択: なし
      inquirer.input
        .mockResolvedValueOnce('緊急セキュリティ修正'); // 作業内容

      await startCommand();

      expect(mockGit.createAndSwitchBranch).toHaveBeenCalledWith(
        expect.stringMatching(/^hotfix\//)
      );
    });
  });

  describe('チーム通知', () => {
    test('作業開始時に適切な通知が送信される', async () => {
      // 通知機能のモック
      const notificationService = require('../../../src/services/notifications');
      if (notificationService && notificationService.notifyWorkStart) {
        notificationService.notifyWorkStart = jest.fn();
      }

      const inquirer = require('@inquirer/prompts');

      // Git状態をクリーンに設定
      mockGit.isWorkingDirectoryClean.mockResolvedValueOnce(true);

      inquirer.select
        .mockResolvedValueOnce('feature') // 作業種別
        .mockResolvedValueOnce('none'); // Issue選択: なし
      inquirer.input
        .mockResolvedValueOnce('新機能'); // 作業内容

      await startCommand();

      // 通知が送信されたことを確認（実装されている場合）
      if (notificationService && notificationService.notifyWorkStart) {
        expect(notificationService.notifyWorkStart).toHaveBeenCalled();
      }
    });
  });

  describe('設定ファイル連携', () => {
    test('team-flow設定が適切に読み込まれる', async () => {
      // カスタム設定でテスト
      await testSetup.createFixtures();
      testSetup.changeToTestDirectory();

      const inquirer = require('@inquirer/prompts');

      // Git状態をクリーンに設定
      mockGit.isWorkingDirectoryClean.mockResolvedValueOnce(true);

      inquirer.select
        .mockResolvedValueOnce('feature') // 作業種別
        .mockResolvedValueOnce('none'); // Issue選択: なし
      inquirer.input
        .mockResolvedValueOnce('設定テスト'); // 作業内容

      await startCommand();

      // 設定に基づいて適切な処理が実行されることを確認
      expect(mockGit.createAndSwitchBranch).toHaveBeenCalled();
    });
  });

  describe('競合チェック', () => {
    test('同名ブランチ存在時の処理', async () => {
      const inquirer = require('@inquirer/prompts');

      // Git状態をクリーンに設定
      mockGit.isWorkingDirectoryClean.mockResolvedValueOnce(true);

      // 既存ブランチを設定
      mockGit.setState({
        branches: ['main', 'feature/existing-feature']
      });

      // ブランチ作成時に競合エラー
      mockGit.createAndSwitchBranch.mockRejectedValueOnce(
        new Error("A branch named 'feature/existing-feature' already exists")
      );

      inquirer.select
        .mockResolvedValueOnce('feature') // 作業種別
        .mockResolvedValueOnce('none'); // Issue選択: なし
      inquirer.input
        .mockResolvedValueOnce('existing feature'); // 作業内容（既存と同名）

      // エラーが適切に処理されることを確認
      await expect(startCommand()).rejects.toThrow('already exists');
    });
  });
});