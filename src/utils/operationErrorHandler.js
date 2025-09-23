// const errorHandler = require('./errorHandler');
const RecoveryManager = require('./recovery');
const logger = require('./logger');
const chalk = require('chalk');

/**
 * 操作別エラー処理
 */
class OperationErrorHandler {
  constructor() {
    this.recoveryManager = new RecoveryManager();
    this.retryAttempts = {};
    this.maxRetries = 3;
  }

  /**
   * 初期化
   */
  async initialize() {
    await this.recoveryManager.initialize();
  }

  /**
   * Git操作エラーの処理
   */
  async handleGitError(error, operation, context = {}) {
    logger.error(`Git操作エラー: ${operation}`, error, context);

    const errorType = this.classifyGitError(error);
    const recovery = await this.getGitRecoveryStrategy(errorType, context);

    console.log(chalk.red(`\n🔴 Git操作エラーが発生しました: ${operation}`));
    console.log(chalk.yellow(`エラーの種類: ${errorType}`));
    console.log(chalk.cyan('\n📋 推奨対応:'));
    console.log(recovery.description);

    if (recovery.autoRecoverable) {
      return await this.attemptAutoRecovery(errorType, error, {
        ...context,
        operation: `git-${operation}`,
        strategy: recovery
      });
    } else {
      console.log(chalk.red('\n⚠️  手動での対応が必要です:'));
      recovery.manualSteps.forEach((step, index) => {
        console.log(chalk.yellow(`${index + 1}. ${step}`));
      });

      return {
        handled: true,
        recovered: false,
        requiresManualAction: true,
        steps: recovery.manualSteps
      };
    }
  }

  /**
   * GitHub API エラーの処理
   */
  async handleGitHubApiError(error, operation, context = {}) {
    logger.error(`GitHub APIエラー: ${operation}`, error, context);

    const errorType = this.classifyGitHubApiError(error);
    const recovery = await this.getGitHubApiRecoveryStrategy(errorType, context);

    console.log(chalk.red(`\n🔴 GitHub APIエラーが発生しました: ${operation}`));
    console.log(chalk.yellow(`エラーの種類: ${errorType}`));
    console.log(chalk.cyan('\n📋 推奨対応:'));
    console.log(recovery.description);

    if (recovery.autoRecoverable) {
      return await this.attemptAutoRecovery(errorType, error, {
        ...context,
        operation: `github-${operation}`,
        strategy: recovery
      });
    } else {
      console.log(chalk.red('\n⚠️  設定確認が必要です:'));
      recovery.manualSteps.forEach((step, index) => {
        console.log(chalk.yellow(`${index + 1}. ${step}`));
      });

      return {
        handled: true,
        recovered: false,
        requiresManualAction: true,
        steps: recovery.manualSteps
      };
    }
  }

  /**
   * ネットワークエラーの処理
   */
  async handleNetworkError(error, operation, context = {}) {
    logger.warn(`ネットワークエラー: ${operation}`, context);

    console.log(chalk.yellow(`\n🟡 ネットワークエラーが発生しました: ${operation}`));
    console.log(chalk.cyan('自動復旧を試行します...'));

    // 自動的に再試行
    const retryKey = `${operation}-${Date.now()}`;
    this.retryAttempts[retryKey] = 0;

    return await this.attemptNetworkRetry(error, operation, context, retryKey);
  }

  /**
   * ファイルシステムエラーの処理
   */
  async handleFileSystemError(error, operation, context = {}) {
    logger.error(`ファイルシステムエラー: ${operation}`, error, context);

    const errorType = this.classifyFileSystemError(error);
    const recovery = await this.getFileSystemRecoveryStrategy(errorType, context);

    console.log(chalk.red(`\n🔴 ファイルシステムエラーが発生しました: ${operation}`));
    console.log(chalk.yellow(`エラーの種類: ${errorType}`));

    if (recovery.critical) {
      console.log(chalk.red.bold('\n🚨 重大なエラーです。操作を停止します。'));
      console.log(chalk.yellow('\n解決方法:'));
      recovery.manualSteps.forEach((step, index) => {
        console.log(chalk.yellow(`${index + 1}. ${step}`));
      });

      return {
        handled: true,
        recovered: false,
        critical: true,
        requiresManualAction: true,
        steps: recovery.manualSteps
      };
    }

    if (recovery.autoRecoverable) {
      return await this.attemptAutoRecovery(errorType, error, {
        ...context,
        operation: `fs-${operation}`,
        strategy: recovery
      });
    }

    return {
      handled: true,
      recovered: false,
      requiresManualAction: true,
      steps: recovery.manualSteps
    };
  }

  /**
   * Gitエラーの分類
   */
  classifyGitError(error) {
    const message = error.message.toLowerCase();

    if (message.includes('merge conflict')) return 'MERGE_CONFLICT';
    if (message.includes('not a git repository')) return 'NOT_GIT_REPOSITORY';
    if (message.includes('permission denied')) return 'PERMISSION_DENIED';
    if (message.includes('remote not found')) return 'REMOTE_NOT_FOUND';
    if (message.includes('branch not found')) return 'BRANCH_NOT_FOUND';
    if (message.includes('nothing to commit')) return 'NOTHING_TO_COMMIT';
    if (message.includes('uncommitted changes')) return 'UNCOMMITTED_CHANGES';
    if (message.includes('authentication failed')) return 'AUTH_FAILED';
    if (message.includes('network')) return 'NETWORK_ERROR';

    return 'UNKNOWN_GIT_ERROR';
  }

  /**
   * GitHub APIエラーの分類
   */
  classifyGitHubApiError(error) {
    const status = error.status || error.code;
    const message = error.message.toLowerCase();

    if (status === 401) return 'UNAUTHORIZED';
    if (status === 403 && message.includes('rate limit')) return 'RATE_LIMIT';
    if (status === 403) return 'FORBIDDEN';
    if (status === 404) return 'NOT_FOUND';
    if (status === 422) return 'VALIDATION_ERROR';
    if (message.includes('network')) return 'NETWORK_ERROR';
    if (message.includes('timeout')) return 'TIMEOUT';

    return 'UNKNOWN_API_ERROR';
  }

  /**
   * ファイルシステムエラーの分類
   */
  classifyFileSystemError(error) {
    const code = error.code;

    if (code === 'ENOENT') return 'FILE_NOT_FOUND';
    if (code === 'EACCES' || code === 'EPERM') return 'PERMISSION_DENIED';
    if (code === 'ENOSPC') return 'DISK_FULL';
    if (code === 'EBUSY') return 'FILE_BUSY';
    if (code === 'EMFILE' || code === 'ENFILE') return 'TOO_MANY_FILES';

    return 'UNKNOWN_FS_ERROR';
  }

  /**
   * Git復旧戦略を取得
   */
  async getGitRecoveryStrategy(errorType, _context) {
    const strategies = {
      'MERGE_CONFLICT': {
        description: 'マージコンフリクトが発生しています。対話的に解決する必要があります。',
        autoRecoverable: false,
        manualSteps: [
          'コンフリクトファイルを手動で編集してください',
          'git add <解決したファイル> でステージングしてください',
          'git commit でコミットを完了してください',
          'または git merge --abort でマージを中止してください'
        ]
      },
      'NOT_GIT_REPOSITORY': {
        description: 'Gitリポジトリではないディレクトリで操作を試行しました。',
        autoRecoverable: false,
        manualSteps: [
          'git init でリポジトリを初期化してください',
          'または正しいGitリポジトリディレクトリに移動してください'
        ]
      },
      'PERMISSION_DENIED': {
        description: 'ファイルアクセス権限が不足しています。',
        autoRecoverable: false,
        manualSteps: [
          'ファイル権限を確認してください (ls -la)',
          'chmod で適切な権限を設定してください',
          'または管理者権限で実行してください'
        ]
      },
      'UNCOMMITTED_CHANGES': {
        description: 'コミットされていない変更があります。',
        autoRecoverable: true,
        recoveryAction: 'stash_changes'
      },
      'NETWORK_ERROR': {
        description: 'ネットワーク接続エラーです。再試行します。',
        autoRecoverable: true,
        recoveryAction: 'retry_with_backoff'
      }
    };

    return strategies[errorType] || {
      description: '不明なGitエラーです。',
      autoRecoverable: false,
      manualSteps: ['git status で現在の状況を確認してください']
    };
  }

  /**
   * GitHub API復旧戦略を取得
   */
  async getGitHubApiRecoveryStrategy(errorType, _context) {
    const strategies = {
      'UNAUTHORIZED': {
        description: 'GitHub認証に失敗しました。トークンを確認してください。',
        autoRecoverable: false,
        manualSteps: [
          '.envファイルのGITHUB_TOKENを確認してください',
          'トークンの有効期限を確認してください',
          'トークンの権限（スコープ）を確認してください',
          '新しいPersonal Access Tokenを作成してください: https://github.com/settings/tokens'
        ]
      },
      'RATE_LIMIT': {
        description: 'GitHub APIの制限に達しました。待機後に再試行します。',
        autoRecoverable: true,
        recoveryAction: 'wait_and_retry'
      },
      'FORBIDDEN': {
        description: 'リポジトリへのアクセス権限がありません。',
        autoRecoverable: false,
        manualSteps: [
          'リポジトリの権限を確認してください',
          'コラボレーターとして追加されているか確認してください',
          'トークンの権限（スコープ）を確認してください'
        ]
      },
      'NOT_FOUND': {
        description: 'リポジトリまたはリソースが見つかりません。',
        autoRecoverable: false,
        manualSteps: [
          'リポジトリ名を確認してください',
          'リポジトリが存在するか確認してください',
          'リポジトリがプライベートの場合、アクセス権限を確認してください'
        ]
      },
      'TIMEOUT': {
        description: 'GitHub APIのタイムアウトです。再試行します。',
        autoRecoverable: true,
        recoveryAction: 'retry_with_backoff'
      }
    };

    return strategies[errorType] || {
      description: '不明なGitHub APIエラーです。',
      autoRecoverable: false,
      manualSteps: ['GitHub APIの状況を確認してください: https://status.github.com/']
    };
  }

  /**
   * ファイルシステム復旧戦略を取得
   */
  async getFileSystemRecoveryStrategy(errorType, _context) {
    const strategies = {
      'FILE_NOT_FOUND': {
        description: 'ファイルまたはディレクトリが見つかりません。',
        autoRecoverable: true,
        recoveryAction: 'create_default_file'
      },
      'PERMISSION_DENIED': {
        description: 'ファイルアクセス権限が不足しています。',
        autoRecoverable: false,
        critical: true,
        manualSteps: [
          'ファイル権限を確認してください (ls -la)',
          'chmod で適切な権限を設定してください',
          '管理者権限で実行してください'
        ]
      },
      'DISK_FULL': {
        description: 'ディスク容量が不足しています。',
        autoRecoverable: false,
        critical: true,
        manualSteps: [
          'ディスク使用量を確認してください (df -h)',
          '不要なファイルを削除してください',
          '別のディスクに移動してください'
        ]
      },
      'FILE_BUSY': {
        description: 'ファイルが他のプロセスで使用中です。',
        autoRecoverable: true,
        recoveryAction: 'wait_and_retry'
      }
    };

    return strategies[errorType] || {
      description: '不明なファイルシステムエラーです。',
      autoRecoverable: false,
      manualSteps: ['システム管理者に相談してください']
    };
  }

  /**
   * 自動復旧を試行
   */
  async attemptAutoRecovery(errorType, error, context) {
    try {
      console.log(chalk.cyan('\n🔧 自動復旧を試行中...'));

      const result = await this.recoveryManager.attemptRecovery(errorType, error, context);

      if (result.success) {
        console.log(chalk.green(`✅ 復旧に成功しました: ${result.message}`));
        return {
          handled: true,
          recovered: true,
          message: result.message
        };
      } else {
        console.log(chalk.yellow(`⚠️  自動復旧に失敗しました: ${result.message}`));
        return {
          handled: true,
          recovered: false,
          message: result.message,
          requiresManualAction: true
        };
      }
    } catch (recoveryError) {
      logger.error('自動復旧中にエラーが発生', recoveryError);
      console.log(chalk.red(`❌ 復旧処理中にエラーが発生しました: ${recoveryError.message}`));

      return {
        handled: true,
        recovered: false,
        error: recoveryError.message,
        requiresManualAction: true
      };
    }
  }

  /**
   * ネットワーク再試行
   */
  async attemptNetworkRetry(error, operation, context, retryKey) {
    this.retryAttempts[retryKey]++;

    if (this.retryAttempts[retryKey] > this.maxRetries) {
      console.log(chalk.red(`❌ ${this.maxRetries}回の再試行に失敗しました`));
      delete this.retryAttempts[retryKey];

      return {
        handled: true,
        recovered: false,
        message: `${this.maxRetries}回の再試行に失敗しました。ネットワーク接続を確認してください。`
      };
    }

    const delay = 1000 * Math.pow(2, this.retryAttempts[retryKey] - 1); // 指数バックオフ
    console.log(chalk.yellow(`⏳ ${delay / 1000}秒待機後、再試行します... (${this.retryAttempts[retryKey]}/${this.maxRetries})`));

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      // コンテキストに再実行可能な操作がある場合は実行
      if (context.retryOperation && typeof context.retryOperation === 'function') {
        await context.retryOperation();
        console.log(chalk.green('✅ 再試行に成功しました'));
        delete this.retryAttempts[retryKey];

        return {
          handled: true,
          recovered: true,
          message: '再試行に成功しました'
        };
      }

      // そうでなければ準備完了を返す
      return {
        handled: true,
        recovered: true,
        message: '再試行準備が完了しました。操作を再実行してください。'
      };
    } catch (retryError) {
      console.log(chalk.yellow(`⚠️  再試行 ${this.retryAttempts[retryKey]} が失敗: ${retryError.message}`));
      return await this.attemptNetworkRetry(retryError, operation, context, retryKey);
    }
  }

  /**
   * エラーハンドリング統計を取得
   */
  getErrorStats() {
    return {
      activeRetries: Object.keys(this.retryAttempts).length,
      retryAttempts: { ...this.retryAttempts }
    };
  }

  /**
   * 再試行カウンターをクリア
   */
  clearRetryCounters() {
    this.retryAttempts = {};
  }
}

module.exports = OperationErrorHandler;