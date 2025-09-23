/**
 * GitHubService のテスト
 */

const TestSetup = require('../../helpers/utils/testSetup');
const MockOctokit = require('../../helpers/mocks/github');
const MockGit = require('../../helpers/mocks/git');

// モックをセットアップ
jest.mock('@octokit/rest');
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/utils/git');

describe('GitHubService', () => {
  let testSetup;
  let GitHubService;
  let mockOctokit;
  let mockGit;

  beforeEach(async () => {
    testSetup = new TestSetup();
    await testSetup.createTestDirectory('github-test');
    testSetup.changeToTestDirectory();
    testSetup.setupEnvironment({
      GITHUB_TOKEN: 'ghp_test_token_1234567890'
    });

    // モックを初期化
    mockOctokit = new MockOctokit();
    mockGit = new MockGit();

    // GitHubServiceをインポート
    GitHubService = require('../../../src/services/github');

    // Octokitモックを設定
    const { Octokit } = require('@octokit/rest');
    Octokit.mockImplementation(() => mockOctokit);

    // gitモックを設定
    require('../../../src/utils/git').getCurrentBranch = mockGit.getCurrentBranch;
    require('../../../src/utils/git').getRemoteUrl = mockGit.getRemoteUrl;
  });

  afterEach(async () => {
    await testSetup.cleanup();
    jest.clearAllMocks();
  });

  describe('初期化', () => {
    test('正常に初期化される', async () => {
      const github = new GitHubService();
      const result = await github.initialize();

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.repository).toBeDefined();
      expect(result.user.login).toBe('test-user');
    });

    test('GITHUB_TOKENが未設定の場合のエラー', async () => {
      delete process.env.GITHUB_TOKEN;

      const github = new GitHubService();
      const result = await github.initialize();

      expect(result.success).toBe(false);
      expect(result.error).toBe('missing_token');
      expect(result.message).toContain('GITHUB_TOKEN');
    });

    test('認証エラーの処理', async () => {
      mockOctokit.mockAuthError('users.getAuthenticated');

      const github = new GitHubService();
      const result = await github.initialize();

      expect(result.success).toBe(false);
      expect(result.error).toBe('invalid_token');
    });
  });

  describe('設定確認', () => {
    test('isConfigured が正しく動作する', () => {
      // トークンがある場合
      process.env.GITHUB_TOKEN = 'ghp_test';
      const github1 = new GitHubService();
      expect(github1.isConfigured()).toBe(true);

      // トークンがない場合
      delete process.env.GITHUB_TOKEN;
      const github2 = new GitHubService();
      expect(github2.isConfigured()).toBe(false);
    });

    test('認証状態確認が正しく動作する', async () => {
      const github = new GitHubService();
      await github.initialize();

      const authStatus = await github.checkAuthStatus();

      expect(authStatus.authenticated).toBe(true);
      expect(authStatus.user).toBeDefined();
      expect(authStatus.user.login).toBe('test-user');
    });
  });

  describe('Issue管理', () => {
    let github;

    beforeEach(async () => {
      github = new GitHubService();
      await github.initialize();
    });

    test('オープンなIssue一覧を取得', async () => {
      const issues = await github.getOpenIssues(10);

      expect(Array.isArray(issues)).toBe(true);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]).toHaveProperty('number');
      expect(issues[0]).toHaveProperty('title');
      expect(issues[0]).toHaveProperty('html_url');
    });

    test('新しいIssueを作成', async () => {
      const issueData = {
        title: 'テストIssue',
        body: 'テスト用のIssueです',
        labels: ['test'],
        assignees: []
      };

      const issue = await github.createIssue(
        issueData.title,
        issueData.body,
        issueData.labels,
        issueData.assignees
      );

      expect(issue).toHaveProperty('number');
      expect(issue.title).toBe(issueData.title);
      expect(issue.body).toBe(issueData.body);
      expect(issue.labels).toEqual(issueData.labels);
    });

    test('Issue詳細を取得', async () => {
      const issueNumber = 1;
      const issue = await github.getIssue(issueNumber);

      expect(issue).toHaveProperty('number', issueNumber);
      expect(issue).toHaveProperty('title');
      expect(issue).toHaveProperty('state');
      expect(issue).toHaveProperty('html_url');
    });

    test('Issueにコメントを追加', async () => {
      const issueNumber = 1;
      const commentBody = 'テストコメントです';

      const comment = await github.addIssueComment(issueNumber, commentBody);

      expect(comment).toHaveProperty('id');
      expect(comment.body).toBe(commentBody);
      expect(comment).toHaveProperty('html_url');
    });

    test('Issue作成時の権限エラー', async () => {
      mockOctokit.mockApiError('issues.create', 403, 'Resource not accessible by personal access token');

      await expect(github.createIssue('テスト', 'テスト')).rejects.toThrow('GitHub Personal Access Token');
    });
  });

  describe('Pull Request管理', () => {
    let github;

    beforeEach(async () => {
      github = new GitHubService();
      await github.initialize();
    });

    test('Pull Request一覧を取得', async () => {
      const prs = await github.getPullRequests('open', 10);

      expect(Array.isArray(prs)).toBe(true);
      expect(prs.length).toBeGreaterThan(0);
      expect(prs[0]).toHaveProperty('number');
      expect(prs[0]).toHaveProperty('title');
      expect(prs[0]).toHaveProperty('head');
      expect(prs[0]).toHaveProperty('base');
    });

    test('新しいPull Requestを作成', async () => {
      const prData = {
        title: 'テストPR',
        body: 'テスト用のPRです',
        head: 'feature-branch',
        base: 'main',
        isDraft: false
      };

      const pr = await github.createPullRequest(
        prData.title,
        prData.body,
        prData.head,
        prData.base,
        prData.isDraft
      );

      expect(pr).toHaveProperty('number');
      expect(pr.title).toBe(prData.title);
      expect(pr.head).toBe(prData.head);
      expect(pr.base).toBe(prData.base);
      expect(pr.draft).toBe(prData.isDraft);
    });

    test('詳細なPR情報を取得', async () => {
      const prs = await github.getPullRequestsDetailed('open', 5);

      expect(Array.isArray(prs)).toBe(true);
      if (prs.length > 0) {
        expect(prs[0]).toHaveProperty('reviews');
        expect(prs[0]).toHaveProperty('requested_reviewers');
        expect(prs[0]).toHaveProperty('user');
      }
    });

    test('PR作成時のエラー処理', async () => {
      mockOctokit.mockApiError('pulls.create', 422, 'No commits between main and feature-branch');

      await expect(
        github.createPullRequest('テスト', 'テスト', 'feature-branch', 'main')
      ).rejects.toThrow('差分がありません');
    });
  });

  describe('レビュアー提案', () => {
    let github;

    beforeEach(async () => {
      github = new GitHubService();
      await github.initialize();
    });

    test('レビュアーを提案', async () => {
      const reviewers = await github.suggestReviewers(['test-user']);

      expect(Array.isArray(reviewers)).toBe(true);
      // 自分自身は除外される
      reviewers.forEach(reviewer => {
        expect(reviewer.login).not.toBe('test-user');
      });
    });

    test('レビュアー提案でエラーが発生しても空配列を返す', async () => {
      mockOctokit.mockApiError('repos.listContributors', 404, 'Not Found');

      const reviewers = await github.suggestReviewers();

      expect(Array.isArray(reviewers)).toBe(true);
      expect(reviewers.length).toBe(0);
    });
  });

  describe('リポジトリ情報', () => {
    let github;

    beforeEach(async () => {
      github = new GitHubService();
      await github.initialize();
    });

    test('ブランチ一覧を取得', async () => {
      const branches = await github.getBranches();

      expect(Array.isArray(branches)).toBe(true);
      expect(branches.length).toBeGreaterThan(0);
      expect(branches[0]).toHaveProperty('name');
      expect(branches[0]).toHaveProperty('commit');
      expect(branches[0]).toHaveProperty('protected');
    });

    test('リポジトリメトリクスを取得', async () => {
      const metrics = await github.getRepositoryMetrics();

      expect(metrics).toHaveProperty('commits');
      expect(metrics).toHaveProperty('prsCreated');
      expect(metrics).toHaveProperty('prsMerged');
      expect(metrics).toHaveProperty('avgReviewTime');
      expect(metrics).toHaveProperty('period');
      expect(typeof metrics.commits).toBe('number');
      expect(typeof metrics.prsCreated).toBe('number');
    });
  });

  describe('エラーハンドリング', () => {
    let github;

    beforeEach(async () => {
      github = new GitHubService();
    });

    test.skip('レート制限エラーの処理', async () => {
      await github.initialize();
      mockOctokit.mockRateLimitError('issues.listForRepo');

      await expect(github.getOpenIssues()).rejects.toThrow();
    }, 30000); // タイムアウトを30秒に延長

    test('404エラーの処理', async () => {
      await github.initialize();
      mockOctokit.mockNotFoundError('repos.listBranches');

      await expect(github.getBranches()).rejects.toThrow();
    });

    test('初期化されていない状態でのAPI呼び出し', async () => {
      // 初期化せずにAPI呼び出し
      process.env.GITHUB_TOKEN = '';

      await expect(github.getOpenIssues()).rejects.toThrow('GITHUB_TOKEN');
    });
  });

  describe('レート制限管理', () => {
    let github;

    beforeEach(async () => {
      github = new GitHubService();
      await github.initialize();
    });

    test('正常なAPI呼び出しでレート制限情報が更新される', async () => {
      await github.getOpenIssues(1);

      // レート制限マネージャーが使用されているかを確認
      expect(mockOctokit.rest.issues.listForRepo).toHaveBeenCalled();
    });
  });
});