const logger = require('./logger');

/**
 * 認証管理ユーティリティ
 */
class AuthManager {
  constructor() {
    this.authenticated = false;
    this.userInfo = null;
    this.rateLimit = null;
  }

  /**
   * GitHub認証状態をチェック
   */
  isAuthenticated() {
    return this.authenticated && process.env.GITHUB_TOKEN;
  }

  /**
   * GitHubトークンの有効性を検証
   */
  async validateGitHubToken(octokit) {
    try {
      // まずユーザー情報を取得してトークンが有効かチェック
      const { data: user } = await octokit.rest.users.getAuthenticated();

      // レート制限情報を取得
      const { data: rateLimit } = await octokit.rest.rateLimit.get();

      this.userInfo = {
        login: user.login,
        name: user.name || user.login,
        email: user.email,
        avatar_url: user.avatar_url,
        plan: user.plan?.name || 'free',
        created_at: user.created_at
      };

      this.rateLimit = {
        limit: rateLimit.rate.limit,
        remaining: rateLimit.rate.remaining,
        reset: rateLimit.rate.reset,
        used: rateLimit.rate.used
      };

      this.authenticated = true;

      logger.info(`GitHub認証成功: ${user.login} (${user.name || 'No name'})`);
      logger.info(`API制限: ${this.rateLimit.remaining}/${this.rateLimit.limit} 残り`);

      return {
        valid: true,
        user: this.userInfo,
        rateLimit: this.rateLimit
      };
    } catch (error) {
      this.authenticated = false;
      this.userInfo = null;
      this.rateLimit = null;

      logger.error('GitHub認証エラー:', error.message);

      // エラーの種類に応じて詳細なメッセージを返す
      if (error.status === 401) {
        return {
          valid: false,
          error: 'invalid_token',
          message: 'GitHub Personal Access Tokenが無効です。以下を確認してください:\n' +
                  '1. トークンが正しく設定されているか\n' +
                  '2. トークンの有効期限が切れていないか\n' +
                  '3. トークンが削除されていないか\n' +
                  '新しいトークンを作成する場合: https://github.com/settings/tokens'
        };
      } else if (error.status === 403) {
        return {
          valid: false,
          error: 'rate_limit',
          message: 'GitHub APIの制限に達しています。しばらく待ってから再試行してください。'
        };
      } else {
        return {
          valid: false,
          error: 'network_error',
          message: `GitHub APIに接続できませんでした: ${error.message}`
        };
      }
    }
  }

  /**
   * リポジトリに対する権限をチェック
   */
  async checkRepositoryPermissions(octokit, owner, repo) {
    try {
      // リポジトリ情報を取得
      const { data: repository } = await octokit.rest.repos.get({
        owner,
        repo
      });

      // ユーザーのリポジトリ権限を取得
      let permissions = { admin: false, push: false, pull: false };

      try {
        const { data: permission } = await octokit.rest.repos.getCollaboratorPermissionLevel({
          owner,
          repo,
          username: this.userInfo.login
        });

        permissions = {
          admin: permission.permission === 'admin',
          push: ['admin', 'write'].includes(permission.permission),
          pull: ['admin', 'write', 'read'].includes(permission.permission)
        };
      } catch (permError) {
        // パブリックリポジトリの場合、権限チェックでエラーになることがある
        if (repository.private === false) {
          permissions.pull = true;
          // フォークかオーナーの場合はpush権限もある可能性
          if (repository.owner.login === this.userInfo.login) {
            permissions.push = true;
            permissions.admin = true;
          }
        }
      }

      return {
        repository: {
          name: repository.full_name,
          private: repository.private,
          fork: repository.fork,
          owner: repository.owner.login
        },
        permissions,
        canCreateIssues: permissions.pull && !repository.archived,
        canCreatePRs: permissions.pull && !repository.archived,
        canPush: permissions.push && !repository.archived
      };
    } catch (error) {
      if (error.status === 404) {
        throw new Error(`リポジトリ ${owner}/${repo} が見つからないか、アクセス権限がありません`);
      }
      throw new Error(`リポジトリ権限の確認に失敗しました: ${error.message}`);
    }
  }

  /**
   * 現在の認証状態を取得
   */
  getAuthStatus() {
    return {
      authenticated: this.authenticated,
      user: this.userInfo,
      rateLimit: this.rateLimit
    };
  }

  /**
   * API制限の状況をチェック
   */
  checkRateLimit() {
    if (!this.rateLimit) {
      return { ok: true, message: 'レート制限情報が不明です' };
    }

    const { remaining, limit, reset } = this.rateLimit;
    const resetDate = new Date(reset * 1000);
    const now = new Date();
    const minutesUntilReset = Math.ceil((resetDate - now) / (1000 * 60));

    if (remaining === 0) {
      return {
        ok: false,
        message: `GitHub APIの制限に達しました。${minutesUntilReset}分後にリセットされます。`,
        resetAt: resetDate
      };
    }

    if (remaining < 100) {
      return {
        ok: true,
        warning: true,
        message: `GitHub APIの残り制限: ${remaining}/${limit} (${minutesUntilReset}分後にリセット)`,
        remaining,
        limit
      };
    }

    return {
      ok: true,
      message: `GitHub API制限: ${remaining}/${limit}`,
      remaining,
      limit
    };
  }

  /**
   * 認証情報をクリア
   */
  clearAuth() {
    this.authenticated = false;
    this.userInfo = null;
    this.rateLimit = null;
  }
}

module.exports = AuthManager;