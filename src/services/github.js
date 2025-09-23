const { Octokit } = require('@octokit/rest');
const logger = require('../utils/logger');
const AuthManager = require('../utils/auth');
const RateLimitManager = require('../utils/rateLimit');

/**
 * GitHub API連携サービス
 */
class GitHubService {
  constructor() {
    this.octokit = null;
    this.owner = null;
    this.repo = null;
    this.initialized = false;
    this.authManager = new AuthManager();
    this.rateLimitManager = new RateLimitManager();
  }

  /**
   * GitHub設定の初期化
   */
  async initialize() {
    if (this.initialized) {
      return { success: true, message: '既に初期化済みです' };
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      const message = 'GITHUB_TOKEN が設定されていません';
      logger.warn(message);
      return {
        success: false,
        error: 'missing_token',
        message: message + '\n.envファイルにGITHUB_TOKENを設定してください。'
      };
    }

    this.octokit = new Octokit({
      auth: token
    });

    // 認証確認
    const authResult = await this.authManager.validateGitHubToken(this.octokit);
    if (!authResult.valid) {
      return {
        success: false,
        error: authResult.error,
        message: authResult.message
      };
    }

    // リポジトリ情報を取得
    try {
      const repoInfo = await this.getRepositoryInfo();
      this.owner = repoInfo.owner;
      this.repo = repoInfo.repo;

      // リポジトリ権限確認
      const permissions = await this.authManager.checkRepositoryPermissions(
        this.octokit,
        this.owner,
        this.repo
      );

      this.initialized = true;
      logger.info(`GitHub API initialized: ${this.owner}/${this.repo}`);
      logger.info(`権限: Issues=${permissions.canCreateIssues}, PRs=${permissions.canCreatePRs}, Push=${permissions.canPush}`);

      return {
        success: true,
        user: authResult.user,
        repository: permissions.repository,
        permissions: permissions.permissions,
        rateLimit: authResult.rateLimit
      };
    } catch (error) {
      logger.error('GitHub API の初期化に失敗しました:', error);
      return {
        success: false,
        error: 'initialization_failed',
        message: `GitHub API の初期化に失敗しました: ${error.message}`
      };
    }
  }

  /**
   * GitHub設定が有効かチェック
   */
  isConfigured() {
    return process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.length > 0;
  }

  /**
   * 認証状態と権限を確認
   */
  async checkAuthStatus() {
    const authStatus = this.authManager.getAuthStatus();
    const rateLimitStatus = this.rateLimitManager.getRateLimitStatus();

    return {
      authenticated: authStatus.authenticated,
      user: authStatus.user,
      rateLimit: authStatus.rateLimit,
      rateLimitStatus: rateLimitStatus,
      repository: this.owner && this.repo ? `${this.owner}/${this.repo}` : null
    };
  }

  /**
   * リポジトリ情報を取得
   */
  async getRepositoryInfo() {
    const git = require('../utils/git');

    try {
      const remoteUrl = await git.getRemoteUrl();
      const match = remoteUrl.match(/github\.com[/:]([\w-]+)\/([\w-]+)(?:\.git)?/);

      if (!match) {
        throw new Error('GitHub リポジトリのURLを解析できませんでした');
      }

      return {
        owner: match[1],
        repo: match[2]
      };
    } catch (error) {
      throw new Error('リポジトリ情報の取得に失敗しました: ' + error.message);
    }
  }

  /**
   * オープンなIssueを取得
   */
  async getOpenIssues(limit = 20) {
    const initResult = await this.initialize();
    if (!initResult.success) {
      throw new Error(initResult.message);
    }

    if (!this.initialized) {
      throw new Error('GitHub API が初期化されていません');
    }

    try {
      const response = await this.rateLimitManager.executeWithRateLimit(async () => {
        return await this.octokit.rest.issues.listForRepo({
          owner: this.owner,
          repo: this.repo,
          state: 'open',
          per_page: limit,
          sort: 'updated',
          direction: 'desc'
        });
      });

      return response.data.map(issue => ({
        number: issue.number,
        title: issue.title,
        body: issue.body,
        labels: issue.labels.map(label => label.name),
        assignees: issue.assignees.map(assignee => assignee.login),
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        html_url: issue.html_url
      }));
    } catch (error) {
      logger.error('Issue取得エラー:', error);
      throw new Error('Issueの取得に失敗しました: ' + error.message);
    }
  }

  /**
   * 新しいIssueを作成
   */
  async createIssue(title, body = '', labels = [], assignees = []) {
    const initResult = await this.initialize();
    if (!initResult.success) {
      throw new Error(initResult.message);
    }

    if (!this.initialized) {
      throw new Error('GitHub API が初期化されていません');
    }

    // 権限チェック
    const authStatus = await this.checkAuthStatus();
    if (!authStatus.authenticated) {
      throw new Error('GitHub API の認証が必要です');
    }

    try {
      const response = await this.rateLimitManager.executeWithRateLimit(async () => {
        return await this.octokit.rest.issues.create({
          owner: this.owner,
          repo: this.repo,
          title,
          body,
          labels,
          assignees
        });
      });

      const issue = response.data;
      logger.info(`Issue #${issue.number} を作成しました: ${title}`);

      return {
        number: issue.number,
        title: issue.title,
        body: issue.body,
        labels: issue.labels.map(label => label.name),
        assignees: issue.assignees.map(assignee => assignee.login),
        html_url: issue.html_url
      };
    } catch (error) {
      logger.error('Issue作成エラー:', error);

      // 権限エラーの場合、より具体的なメッセージを表示
      if (error.message && error.message.includes('Resource not accessible by personal access token')) {
        throw new Error(
          'GitHub Personal Access Tokenの権限が不足しています。\n' +
          'GitHubの設定で以下を確認してください：\n' +
          '1. Settings → Developer settings → Personal access tokens\n' +
          '2. "repo" スコープが有効になっているか確認\n' +
          '3. トークンが期限切れしていないか確認\n' +
          '詳細: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens'
        );
      }

      throw new Error('Issueの作成に失敗しました: ' + error.message);
    }
  }

  /**
   * Issueの詳細を取得
   */
  async getIssue(issueNumber) {
    await this.initialize();

    if (!this.initialized) {
      throw new Error('GitHub API が初期化されていません');
    }

    try {
      const response = await this.octokit.rest.issues.get({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber
      });

      const issue = response.data;
      return {
        number: issue.number,
        title: issue.title,
        body: issue.body,
        state: issue.state,
        labels: issue.labels.map(label => label.name),
        assignees: issue.assignees.map(assignee => assignee.login),
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        html_url: issue.html_url
      };
    } catch (error) {
      logger.error('Issue取得エラー:', error);
      throw new Error(`Issue #${issueNumber} の取得に失敗しました: ` + error.message);
    }
  }

  /**
   * Issueにコメントを追加
   */
  async addIssueComment(issueNumber, body) {
    await this.initialize();

    if (!this.initialized) {
      throw new Error('GitHub API が初期化されていません');
    }

    try {
      const response = await this.octokit.rest.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        body
      });

      logger.info(`Issue #${issueNumber} にコメントを追加しました`);
      return {
        id: response.data.id,
        body: response.data.body,
        created_at: response.data.created_at,
        html_url: response.data.html_url
      };
    } catch (error) {
      logger.error('Issueコメント追加エラー:', error);
      throw new Error(`Issue #${issueNumber} へのコメント追加に失敗しました: ` + error.message);
    }
  }

  /**
   * プルリクエストを作成
   */
  async createPullRequest(title, body, head, base = 'main', isDraft = false) {
    const initResult = await this.initialize();
    if (!initResult.success) {
      throw new Error(initResult.message);
    }

    if (!this.initialized) {
      throw new Error('GitHub API が初期化されていません');
    }

    // 権限チェック
    const authStatus = await this.checkAuthStatus();
    if (!authStatus.authenticated) {
      throw new Error('GitHub API の認証が必要です');
    }

    try {
      const response = await this.rateLimitManager.executeWithRateLimit(async () => {
        return await this.octokit.rest.pulls.create({
          owner: this.owner,
          repo: this.repo,
          title,
          body,
          head,
          base,
          draft: isDraft
        });
      });

      const pr = response.data;
      logger.info(`PR #${pr.number} を作成しました: ${title}`);

      return {
        number: pr.number,
        title: pr.title,
        body: pr.body,
        head: pr.head.ref,
        base: pr.base.ref,
        html_url: pr.html_url,
        draft: pr.draft
      };
    } catch (error) {
      logger.error('PR作成エラー:', error);

      // 一般的なエラーに対する具体的なメッセージ
      if (error.status === 422) {
        if (error.message.includes('No commits')) {
          throw new Error(`ブランチ '${head}' とベースブランチ '${base}' の間に差分がありません`);
        }
        if (error.message.includes('already exists')) {
          throw new Error(`同じ内容のプルリクエストが既に存在します`);
        }
      }

      throw new Error('プルリクエストの作成に失敗しました: ' + error.message);
    }
  }

  /**
   * プルリクエスト一覧を取得
   */
  async getPullRequests(state = 'open', limit = 20) {
    await this.initialize();

    if (!this.initialized) {
      throw new Error('GitHub API が初期化されていません');
    }

    try {
      const response = await this.octokit.rest.pulls.list({
        owner: this.owner,
        repo: this.repo,
        state,
        per_page: limit,
        sort: 'updated',
        direction: 'desc'
      });

      return response.data.map(pr => ({
        number: pr.number,
        title: pr.title,
        head: pr.head.ref,
        base: pr.base.ref,
        state: pr.state,
        draft: pr.draft,
        user: pr.user.login,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        html_url: pr.html_url
      }));
    } catch (error) {
      logger.error('PR取得エラー:', error);
      throw new Error('プルリクエストの取得に失敗しました: ' + error.message);
    }
  }

  /**
   * レビュアーを提案
   */
  async suggestReviewers(excludeUsers = []) {
    const initResult = await this.initialize();
    if (!initResult.success) {
      logger.warn('レビュアー提案: GitHub API が初期化されていません');
      return [];
    }

    if (!this.initialized) {
      logger.warn('レビュアー提案: GitHub API が初期化されていません');
      return [];
    }

    try {
      // 最近のコミット履歴からアクティブなコントリビューターを取得
      const response = await this.rateLimitManager.executeWithRateLimit(async () => {
        return await this.octokit.rest.repos.listContributors({
          owner: this.owner,
          repo: this.repo,
          per_page: 10
        });
      });

      const currentUser = this.authManager.getAuthStatus().user;
      const currentUserLogin = currentUser ? currentUser.login : null;

      return response.data
        .filter(contributor =>
          !excludeUsers.includes(contributor.login) &&
          contributor.login !== currentUserLogin // 自分自身を除外
        )
        .slice(0, 3)
        .map(contributor => ({
          login: contributor.login,
          avatar_url: contributor.avatar_url,
          contributions: contributor.contributions
        }));
    } catch (error) {
      logger.error('レビュアー提案エラー:', error);
      return [];
    }
  }

  /**
   * ブランチ一覧を取得
   */
  async getBranches() {
    await this.initialize();

    if (!this.initialized) {
      throw new Error('GitHub API が初期化されていません');
    }

    try {
      const response = await this.octokit.rest.repos.listBranches({
        owner: this.owner,
        repo: this.repo,
        per_page: 100
      });

      return response.data.map(branch => ({
        name: branch.name,
        commit: {
          sha: branch.commit.sha,
          url: branch.commit.url
        },
        protected: branch.protected
      }));
    } catch (error) {
      logger.error('ブランチ取得エラー:', error);
      throw new Error('ブランチの取得に失敗しました: ' + error.message);
    }
  }

  /**
   * teamコマンド用: 詳細なPR情報（レビュー情報含む）を取得
   */
  async getPullRequestsDetailed(state = 'open', limit = 20) {
    await this.initialize();

    if (!this.initialized) {
      throw new Error('GitHub API が初期化されていません');
    }

    try {
      const response = await this.octokit.rest.pulls.list({
        owner: this.owner,
        repo: this.repo,
        state,
        per_page: limit,
        sort: 'updated',
        direction: 'desc'
      });

      // 各PRのレビュー情報を取得
      const detailedPRs = await Promise.all(
        response.data.map(async (pr) => {
          try {
            // レビュー情報を取得
            const reviewsResponse = await this.octokit.rest.pulls.listReviews({
              owner: this.owner,
              repo: this.repo,
              pull_number: pr.number
            });

            return {
              number: pr.number,
              title: pr.title,
              head: pr.head.ref,
              base: pr.base.ref,
              state: pr.state,
              draft: pr.draft,
              user: {
                login: pr.user.login,
                avatar_url: pr.user.avatar_url
              },
              requested_reviewers: pr.requested_reviewers?.map(reviewer => ({
                login: reviewer.login,
                avatar_url: reviewer.avatar_url
              })) || [],
              reviews: reviewsResponse.data.map(review => ({
                user: review.user.login,
                state: review.state,
                submitted_at: review.submitted_at
              })),
              created_at: pr.created_at,
              updated_at: pr.updated_at,
              merged_at: pr.merged_at,
              html_url: pr.html_url
            };
          } catch (error) {
            // レビュー情報取得に失敗した場合は基本情報のみ返す
            logger.warn(`PR #${pr.number} のレビュー情報取得に失敗: ${error.message}`);
            return {
              number: pr.number,
              title: pr.title,
              head: pr.head.ref,
              base: pr.base.ref,
              state: pr.state,
              draft: pr.draft,
              user: {
                login: pr.user.login,
                avatar_url: pr.user.avatar_url
              },
              requested_reviewers: pr.requested_reviewers?.map(reviewer => ({
                login: reviewer.login,
                avatar_url: reviewer.avatar_url
              })) || [],
              reviews: [],
              created_at: pr.created_at,
              updated_at: pr.updated_at,
              merged_at: pr.merged_at,
              html_url: pr.html_url
            };
          }
        })
      );

      return detailedPRs;
    } catch (error) {
      logger.error('詳細PR取得エラー:', error);
      throw new Error('詳細なプルリクエスト情報の取得に失敗しました: ' + error.message);
    }
  }

  /**
   * teamコマンド用: リポジトリの活動メトリクスを取得
   */
  async getRepositoryMetrics(since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
    await this.initialize();

    if (!this.initialized) {
      throw new Error('GitHub API が初期化されていません');
    }

    try {
      const sinceISO = since.toISOString();

      // 並行してデータを取得
      const [prsResponse, commitsResponse] = await Promise.all([
        this.octokit.rest.pulls.list({
          owner: this.owner,
          repo: this.repo,
          state: 'all',
          since: sinceISO,
          per_page: 100
        }),
        this.octokit.rest.repos.listCommits({
          owner: this.owner,
          repo: this.repo,
          since: sinceISO,
          per_page: 100
        })
      ]);

      const prs = prsResponse.data;
      const commits = commitsResponse.data;

      // 期間内に作成されたPR
      const createdPRs = prs.filter(pr => new Date(pr.created_at) >= since);
      
      // 期間内にマージされたPR
      const mergedPRs = prs.filter(pr => 
        pr.merged_at && new Date(pr.merged_at) >= since
      );

      // レビュー時間の計算（マージされたPRのみ）
      let totalReviewTime = 0;
      let reviewedPRsCount = 0;

      for (const pr of mergedPRs) {
        if (pr.created_at && pr.merged_at) {
          const createdTime = new Date(pr.created_at);
          const mergedTime = new Date(pr.merged_at);
          const reviewTime = (mergedTime - createdTime) / (1000 * 60 * 60); // 時間単位
          
          if (reviewTime > 0) {
            totalReviewTime += reviewTime;
            reviewedPRsCount++;
          }
        }
      }

      const avgReviewTime = reviewedPRsCount > 0 
        ? Math.round(totalReviewTime / reviewedPRsCount * 10) / 10 
        : 0;

      return {
        commits: commits.length,
        prsCreated: createdPRs.length,
        prsMerged: mergedPRs.length,
        avgReviewTime: avgReviewTime,
        period: {
          since: sinceISO,
          until: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('リポジトリメトリクス取得エラー:', error);
      return {
        commits: 0,
        prsCreated: 0,
        prsMerged: 0,
        avgReviewTime: 0,
        period: {
          since: since.toISOString(),
          until: new Date().toISOString()
        }
      };
    }
  }
}

module.exports = GitHubService;