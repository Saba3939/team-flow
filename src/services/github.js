const { Octokit } = require('@octokit/rest');
const logger = require('../utils/logger');

/**
 * GitHub API連携サービス
 */
class GitHubService {
  constructor() {
    this.octokit = null;
    this.owner = null;
    this.repo = null;
    this.initialized = false;
  }

  /**
   * GitHub設定の初期化
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      logger.warn('GITHUB_TOKEN が設定されていません');
      return;
    }

    this.octokit = new Octokit({
      auth: token
    });

    // リポジトリ情報を取得
    try {
      const repoInfo = await this.getRepositoryInfo();
      this.owner = repoInfo.owner;
      this.repo = repoInfo.repo;
      this.initialized = true;
      logger.info(`GitHub API initialized: ${this.owner}/${this.repo}`);
    } catch (error) {
      logger.error('GitHub API の初期化に失敗しました:', error);
    }
  }

  /**
   * GitHub設定が有効かチェック
   */
  static async isConfigured() {
    return process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.length > 0;
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
    await this.initialize();

    if (!this.initialized) {
      throw new Error('GitHub API が初期化されていません');
    }

    try {
      const response = await this.octokit.rest.issues.listForRepo({
        owner: this.owner,
        repo: this.repo,
        state: 'open',
        per_page: limit,
        sort: 'updated',
        direction: 'desc'
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
    await this.initialize();

    if (!this.initialized) {
      throw new Error('GitHub API が初期化されていません');
    }

    try {
      const response = await this.octokit.rest.issues.create({
        owner: this.owner,
        repo: this.repo,
        title,
        body,
        labels,
        assignees
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
   * プルリクエストを作成
   */
  async createPullRequest(title, body, head, base = 'main') {
    await this.initialize();

    if (!this.initialized) {
      throw new Error('GitHub API が初期化されていません');
    }

    try {
      const response = await this.octokit.rest.pulls.create({
        owner: this.owner,
        repo: this.repo,
        title,
        body,
        head,
        base
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
    await this.initialize();

    if (!this.initialized) {
      throw new Error('GitHub API が初期化されていません');
    }

    try {
      // 最近のコミット履歴からアクティブなコントリビューターを取得
      const response = await this.octokit.rest.repos.listContributors({
        owner: this.owner,
        repo: this.repo,
        per_page: 10
      });

      return response.data
        .filter(contributor => !excludeUsers.includes(contributor.login))
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
}

module.exports = new GitHubService();