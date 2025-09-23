/**
 * team-flow 完全ワークフローの統合テスト
 */

const TestSetup = require('../../helpers/utils/testSetup');
const MockGit = require('../../helpers/mocks/git');
const MockOctokit = require('../../helpers/mocks/github');

// 必要なモジュールをモック
jest.mock('../../../src/utils/logger');
jest.mock('@octokit/rest');
jest.mock('@inquirer/prompts');

describe('Complete Workflow Integration', () => {
  let testSetup;
  let mockGit;
  let mockGitHub;
  let commands;

  beforeEach(async () => {
    testSetup = new TestSetup();
    await testSetup.createTestDirectory('workflow-test');
    await testSetup.initTestRepository();
    testSetup.changeToTestDirectory();
    testSetup.setupEnvironment();

    // モックを初期化
    mockGit = new MockGit();
    mockGitHub = new MockOctokit();

    // モックを設定
    jest.doMock('../../../src/utils/git', () => mockGit);

    const { Octokit } = require('@octokit/rest');
    Octokit.mockImplementation(() => mockGitHub);

    // Inquirerのモック
    const inquirer = require('@inquirer/prompts');
    inquirer.select = jest.fn();
    inquirer.input = jest.fn();
    inquirer.confirm = jest.fn();
    inquirer.checkbox = jest.fn();

    // コマンドをインポート
    commands = {
      start: require('../../../src/commands/start'),
      continue: require('../../../src/commands/continue'),
      finish: require('../../../src/commands/finish'),
      team: require('../../../src/commands/team')
    };
  });

  afterEach(async () => {
    await testSetup.cleanup();
    jest.resetAllMocks();
  });

  describe('完全な機能開発ワークフロー', () => {
    test('start → continue → finish の完全フロー', async () => {
      const inquirer = require('@inquirer/prompts');

      // === STEP 1: Start コマンド ===
      console.log('🚀 STEP 1: 新機能開発を開始');

      // ユーザー入力をモック（start用）
      inquirer.select
        .mockResolvedValueOnce('feature') // 作業種別
        .mockResolvedValueOnce('no'); // 既存Issue使用しない

      inquirer.input
        .mockResolvedValueOnce('ユーザープロファイル機能') // タイトル
        .mockResolvedValueOnce('ユーザーがプロファイルを編集できる機能を追加します'); // 詳細

      inquirer.checkbox.mockResolvedValueOnce(['enhancement']);

      inquirer.confirm
        .mockResolvedValueOnce(true) // ブランチ作成確認
        .mockResolvedValueOnce(true); // Issue作成確認

      // Gitの初期状態
      mockGit.setCurrentBranch('main');
      mockGit.mockFileChanges([], [], []);

      // startコマンド実行
      await commands.start.execute();

      // ブランチが作成されたことを確認
      expect(mockGit.createBranch).toHaveBeenCalledWith(
        expect.stringMatching(/^feature\/user-profile/)
      );
      expect(mockGit.checkoutBranch).toHaveBeenCalled();

      // Issueが作成されたことを確認
      expect(mockGitHub.rest.issues.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'ユーザープロファイル機能',
          labels: ['enhancement']
        })
      );

      // === STEP 2: 開発作業をシミュレート ===
      console.log('⚒️  STEP 2: 開発作業をシミュレート');

      // ファイル変更をシミュレート
      mockGit.mockFileChanges(
        ['src/components/Profile.js', 'src/utils/validation.js'], // 変更ファイル
        [], // ステージングファイル
        ['tests/Profile.test.js'] // 新規ファイル
      );

      // === STEP 3: Continue コマンド ===
      console.log('🔄 STEP 3: 作業継続状況の確認');

      // continueコマンド用のモック設定
      inquirer.select.mockResolvedValueOnce('status'); // 状況確認

      await commands.continue.execute();

      // 現在の状況が適切に表示されることを確認
      expect(mockGit.getStatus).toHaveBeenCalled();

      // === STEP 4: さらなる開発作業 ===
      console.log('⚒️  STEP 4: 追加の開発作業');

      // ファイルをステージング
      await mockGit.addFiles(['src/components/Profile.js', 'tests/Profile.test.js']);

      // コミット
      await mockGit.commit('feat: ユーザープロファイル機能の基本実装');

      // === STEP 5: Finish コマンド ===
      console.log('🏁 STEP 5: 作業完了とPR作成');

      // finishコマンド用のモック設定
      inquirer.confirm
        .mockResolvedValueOnce(true) // テスト実行確認
        .mockResolvedValueOnce(true) // PR作成確認
        .mockResolvedValueOnce(false); // レビュアー追加確認

      inquirer.input
        .mockResolvedValueOnce('ユーザープロファイル機能を実装') // PRタイトル
        .mockResolvedValueOnce('## 概要\nユーザープロファイル編集機能を実装しました。'); // PR本文

      // finishコマンド実行
      await commands.finish.execute();

      // PRが作成されたことを確認
      expect(mockGitHub.rest.pulls.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'ユーザープロファイル機能を実装',
          head: expect.stringMatching(/^feature\/user-profile/),
          base: 'main'
        })
      );

      // === STEP 6: Team コマンドで状況確認 ===
      console.log('👥 STEP 6: チーム状況の確認');

      await commands.team.execute();

      // チーム状況の取得が実行されたことを確認
      expect(mockGitHub.rest.pulls.list).toHaveBeenCalled();

      console.log('✅ 完全ワークフローテスト完了');
    });
  });

  describe('バグ修正ワークフロー', () => {
    test('既存Issueを使用したバグ修正フロー', async () => {
      const inquirer = require('@inquirer/prompts');

      // 既存のバグIssueを設定
      mockGitHub.setMockData('issues', [
        {
          number: 5,
          title: 'ログイン機能のバグ修正',
          body: 'ログイン時にエラーが発生する問題を修正する',
          labels: [{ name: 'bug' }, { name: 'high-priority' }],
          state: 'open'
        }
      ]);

      // === STEP 1: バグ修正開始 ===
      inquirer.select
        .mockResolvedValueOnce('bugfix') // 作業種別
        .mockResolvedValueOnce('yes') // 既存Issue使用
        .mockResolvedValueOnce(5); // Issue選択

      inquirer.confirm.mockResolvedValueOnce(true); // ブランチ作成確認

      await commands.start.execute();

      // バグ修正用ブランチが作成されることを確認
      expect(mockGit.createBranch).toHaveBeenCalledWith(
        expect.stringMatching(/^bugfix\/issue-5/)
      );

      // === STEP 2: 修正作業 ===
      mockGit.mockFileChanges(['src/auth/login.js'], [], []);
      await mockGit.addFiles(['src/auth/login.js']);
      await mockGit.commit('fix: ログイン時のエラーハンドリングを修正');

      // === STEP 3: 修正完了 ===
      inquirer.confirm
        .mockResolvedValueOnce(true) // テスト実行
        .mockResolvedValueOnce(true) // PR作成
        .mockResolvedValueOnce(true); // Issueクローズ

      inquirer.input
        .mockResolvedValueOnce('fix: ログイン機能のバグ修正')
        .mockResolvedValueOnce('Fixes #5\n\nログイン時のエラーハンドリングを改善しました。');

      await commands.finish.execute();

      // PRが作成され、Issueがリンクされることを確認
      expect(mockGitHub.rest.pulls.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('Fixes #5')
        })
      );
    });
  });

  describe('ホットフィックスワークフロー', () => {
    test('緊急修正のワークフロー', async () => {
      const inquirer = require('@inquirer/prompts');

      // === STEP 1: 緊急修正開始 ===
      inquirer.select
        .mockResolvedValueOnce('hotfix') // 作業種別
        .mockResolvedValueOnce('no'); // 新規Issue

      inquirer.input
        .mockResolvedValueOnce('緊急セキュリティ修正') // タイトル
        .mockResolvedValueOnce('重大なセキュリティ脆弱性を修正します'); // 詳細

      inquirer.checkbox.mockResolvedValueOnce(['bug', 'security']);

      inquirer.confirm
        .mockResolvedValueOnce(true) // ブランチ作成
        .mockResolvedValueOnce(true); // Issue作成

      await commands.start.execute();

      // ホットフィックス用ブランチが作成されることを確認
      expect(mockGit.createBranch).toHaveBeenCalledWith(
        expect.stringMatching(/^hotfix\//)
      );

      // === STEP 2: 緊急修正作業 ===
      mockGit.mockFileChanges(['src/security/auth.js'], [], []);
      await mockGit.addFiles(['src/security/auth.js']);
      await mockGit.commit('security: 重大な脆弱性を修正');

      // === STEP 3: 緊急デプロイ準備 ===
      inquirer.confirm
        .mockResolvedValueOnce(true) // テスト実行
        .mockResolvedValueOnce(true) // PR作成
        .mockResolvedValueOnce(true); // 緊急マージ

      inquirer.input
        .mockResolvedValueOnce('security: 緊急セキュリティ修正')
        .mockResolvedValueOnce('🚨 緊急修正\n\n重大なセキュリティ脆弱性を修正しました。');

      await commands.finish.execute();

      // 緊急PRが作成されることを確認
      expect(mockGitHub.rest.pulls.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'security: 緊急セキュリティ修正',
          body: expect.stringContaining('🚨 緊急修正')
        })
      );
    });
  });

  describe('エラー復旧ワークフロー', () => {
    test('マージコンフリクト発生時の復旧', async () => {
      const inquirer = require('@inquirer/prompts');

      // === STEP 1: 通常の開発開始 ===
      inquirer.select.mockResolvedValueOnce('feature');
      inquirer.input
        .mockResolvedValueOnce('競合テスト機能')
        .mockResolvedValueOnce('詳細');
      inquirer.confirm
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await commands.start.execute();

      // === STEP 2: 競合状況をシミュレート ===
      mockGit.mockMergeConflict(['package.json', 'src/config.js']);

      // === STEP 3: 作業継続時の競合検知 ===
      inquirer.select.mockResolvedValueOnce('sync'); // 同期選択

      // 競合が検知され、適切な対応が提案されることを確認
      await expect(commands.continue.execute()).rejects.toThrow('Merge conflict');
    });

    test('ネットワークエラー時の復旧', async () => {
      const inquirer = require('@inquirer/prompts');

      // GitHub APIでネットワークエラー
      mockGitHub.mockNetworkError('issues.listForRepo');

      // チーム状況確認時にエラーが発生
      await expect(commands.team.execute()).rejects.toThrow();

      // エラー後の復旧確認
      mockGitHub.clearMocks();
      mockGitHub.rest.issues.listForRepo.mockResolvedValue({ data: [] });

      // 復旧後は正常に動作することを確認
      await expect(commands.team.execute()).resolves.not.toThrow();
    });
  });

  describe('並行開発ワークフロー', () => {
    test('複数ブランチでの並行作業', async () => {
      const scenarioData = testSetup.createScenarioData();

      // チーム状況に複数のアクティブブランチを設定
      mockGitHub.setMockData('pullRequests', [
        {
          number: 1,
          title: 'Feature A: 新機能A',
          head: { ref: 'feature/feature-a' },
          base: { ref: 'main' },
          state: 'open',
          user: { login: 'developer-1' }
        },
        {
          number: 2,
          title: 'Feature B: 新機能B',
          head: { ref: 'feature/feature-b' },
          base: { ref: 'main' },
          state: 'open',
          user: { login: 'developer-2' }
        }
      ]);

      mockGit.setState({
        branches: ['main', 'feature/feature-a', 'feature/feature-b', 'feature/current-work']
      });

      // チーム状況確認
      await commands.team.execute();

      // 複数のアクティブブランチが検知されることを確認
      expect(mockGitHub.rest.pulls.list).toHaveBeenCalled();
    });
  });

  describe('設定カスタマイズワークフロー', () => {
    test('カスタム設定での動作確認', async () => {
      // カスタム設定を作成
      const customConfig = {
        version: '1.0.0',
        defaultBranch: 'develop', // mainの代わりにdevelop
        autoBackup: false,
        notifications: {
          slack: true,
          discord: false
        },
        branchNaming: {
          feature: 'feat',
          bugfix: 'fix',
          hotfix: 'emergency'
        }
      };

      await testSetup.createFixtures();
      const fs = require('fs-extra');
      await fs.writeJSON(
        `${testSetup.testDir}/.team-flow/config.json`,
        customConfig
      );

      const inquirer = require('@inquirer/prompts');

      // カスタム設定での機能開発
      inquirer.select.mockResolvedValueOnce('feature');
      inquirer.input
        .mockResolvedValueOnce('カスタム設定テスト')
        .mockResolvedValueOnce('詳細');
      inquirer.confirm
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await commands.start.execute();

      // カスタムプレフィックスが使用されることを確認
      expect(mockGit.createBranch).toHaveBeenCalledWith(
        expect.stringMatching(/^feat\//) // featプレフィックス
      );
    });
  });
});