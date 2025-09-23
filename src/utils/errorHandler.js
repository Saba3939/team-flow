const logger = require('./logger');
const chalk = require('chalk');

/**
 * エラーハンドリングのメインモジュール
 */
class ErrorHandler {
  constructor() {
    this.errorCount = 0;
    this.criticalErrors = new Set();
    this.setupGlobalHandlers();
  }

  /**
   * グローバルエラーハンドラーをセットアップ
   */
  setupGlobalHandlers() {
    // 未処理の例外をキャッチ
    process.on('uncaughtException', (error) => {
      this.handleCriticalError('UNCAUGHT_EXCEPTION', error);
    });

    // 未処理のPromise rejectionをキャッチ
    process.on('unhandledRejection', (reason, promise) => {
      this.handleCriticalError('UNHANDLED_REJECTION', reason, { promise });
    });

    // SIGINT (Ctrl+C) のハンドリング
    process.on('SIGINT', () => {
      this.handleGracefulShutdown('SIGINT');
    });

    // SIGTERM のハンドリング
    process.on('SIGTERM', () => {
      this.handleGracefulShutdown('SIGTERM');
    });
  }

  /**
   * エラーを分類して適切に処理
   */
  classifyAndHandle(error, context = {}) {
    this.errorCount++;

    const errorInfo = this.analyzeError(error, context);

    switch (errorInfo.severity) {
    case 'critical':
      return this.handleCriticalError(errorInfo.type, error, context);
    case 'recoverable':
      return this.handleRecoverableError(errorInfo.type, error, context);
    case 'warning':
      return this.handleWarningError(errorInfo.type, error, context);
    default:
      return this.handleUnknownError(error, context);
    }
  }

  /**
   * エラーを分析して分類
   */
  analyzeError(error, _context) {
    const message = error.message || error.toString();
    const code = error.code || error.errno;

    // Critical Errors（即座に停止）
    if (this.isCriticalError(error, message, code)) {
      return {
        severity: 'critical',
        type: this.getCriticalErrorType(error, message, code),
        recoverable: false
      };
    }

    // Recoverable Errors（自動復旧試行）
    if (this.isRecoverableError(error, message, code)) {
      return {
        severity: 'recoverable',
        type: this.getRecoverableErrorType(error, message, code),
        recoverable: true
      };
    }

    // Warning Errors（継続可能）
    if (this.isWarningError(error, message, code)) {
      return {
        severity: 'warning',
        type: this.getWarningErrorType(error, message, code),
        recoverable: true
      };
    }

    return {
      severity: 'unknown',
      type: 'UNKNOWN_ERROR',
      recoverable: false
    };
  }

  /**
   * Critical Errorかどうかを判定
   */
  isCriticalError(error, message, code) {
    const criticalPatterns = [
      /repository.*corrupt/i,
      /permission denied/i,
      /enospc|no space left/i,
      /enomem|out of memory/i,
      /authentication.*failed/i,
      /invalid.*credentials/i,
      /eacces/i
    ];

    const criticalCodes = ['EACCES', 'ENOSPC', 'ENOMEM', 'EPERM'];

    return criticalPatterns.some(pattern => pattern.test(message)) ||
           criticalCodes.includes(code) ||
           error.name === 'GitRepositoryError';
  }

  /**
   * Recoverable Errorかどうかを判定
   */
  isRecoverableError(error, message, code) {
    const recoverablePatterns = [
      /timeout/i,
      /network.*error/i,
      /connection.*refused/i,
      /merge.*conflict/i,
      /rate.*limit/i,
      /enoent/i,
      /file.*busy/i
    ];

    const recoverableCodes = ['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'EBUSY', 'ENOENT'];

    return recoverablePatterns.some(pattern => pattern.test(message)) ||
           recoverableCodes.includes(code) ||
           error.name === 'GitMergeConflictError';
  }

  /**
   * Warning Errorかどうかを判定
   */
  isWarningError(error, message, _code) {
    const warningPatterns = [
      /optional.*feature/i,
      /configuration.*missing/i,
      /performance.*warning/i,
      /deprecated/i
    ];

    return warningPatterns.some(pattern => pattern.test(message));
  }

  /**
   * Critical Errorの処理
   */
  handleCriticalError(type, error, context = {}) {
    this.criticalErrors.add(type);

    const errorMessage = this.formatErrorMessage('CRITICAL', type, error);
    console.error(chalk.red.bold('🚨 CRITICAL ERROR:'), errorMessage);

    logger.error('Critical Error', {
      type,
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      context,
      timestamp: new Date().toISOString()
    });

    // 復旧を試みるかユーザーに確認
    const recovery = this.suggestCriticalRecovery(type, error);
    console.log(chalk.yellow('\n📋 推奨対応:'));
    console.log(recovery.suggestion);

    if (recovery.canRecover) {
      console.log(chalk.cyan('\n🔧 自動復旧を試行するか、手動で対応してください。'));
      return { handled: true, recoverable: true, suggestion: recovery.suggestion };
    } else {
      console.log(chalk.red('\n⚠️  手動での対応が必要です。'));
      return { handled: true, recoverable: false, suggestion: recovery.suggestion };
    }
  }

  /**
   * Recoverable Errorの処理
   */
  handleRecoverableError(type, error, context = {}) {
    const errorMessage = this.formatErrorMessage('RECOVERABLE', type, error);
    console.log(chalk.yellow.bold('⚠️  RECOVERABLE ERROR:'), errorMessage);

    logger.warn('Recoverable Error', {
      type,
      error: {
        message: error.message,
        code: error.code
      },
      context,
      timestamp: new Date().toISOString()
    });

    const recovery = this.suggestRecoverableRecovery(type, error);
    console.log(chalk.cyan('\n🔧 自動復旧を試行します...'));
    console.log(recovery.suggestion);

    return { handled: true, recoverable: true, suggestion: recovery.suggestion };
  }

  /**
   * Warning Errorの処理
   */
  handleWarningError(type, error, context = {}) {
    const errorMessage = this.formatErrorMessage('WARNING', type, error);
    console.log(chalk.yellow('⚠️  WARNING:'), errorMessage);

    logger.warn('Warning', {
      type,
      error: {
        message: error.message,
        code: error.code
      },
      context,
      timestamp: new Date().toISOString()
    });

    return { handled: true, recoverable: true, suggestion: '継続可能です' };
  }

  /**
   * Unknown Errorの処理
   */
  handleUnknownError(error, context = {}) {
    const errorMessage = this.formatErrorMessage('UNKNOWN', 'UNKNOWN_ERROR', error);
    console.log(chalk.magenta.bold('❓ UNKNOWN ERROR:'), errorMessage);

    logger.error('Unknown Error', {
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code,
        name: error.name
      },
      context,
      timestamp: new Date().toISOString()
    });

    console.log(chalk.cyan('\n📝 このエラーについてサポートにお問い合わせください。'));
    return { handled: true, recoverable: false, suggestion: 'サポートにお問い合わせください' };
  }

  /**
   * グレースフルシャットダウンの処理
   */
  handleGracefulShutdown(signal) {
    console.log(chalk.blue(`\n🛑 ${signal} を受信しました。安全にシャットダウンします...`));

    logger.info('Graceful Shutdown', {
      signal,
      errorCount: this.errorCount,
      criticalErrors: Array.from(this.criticalErrors),
      timestamp: new Date().toISOString()
    });

    // クリーンアップ処理
    this.cleanup()
      .then(() => {
        console.log(chalk.green('✅ シャットダウンが完了しました。'));
        process.exit(0);
      })
      .catch((error) => {
        console.error(chalk.red('❌ シャットダウン中にエラーが発生しました:'), error.message);
        process.exit(1);
      });
  }

  /**
   * クリーンアップ処理
   */
  async cleanup() {
    // 一時ファイルの削除、接続の切断など
    logger.info('Cleanup started');

    // 実際のクリーンアップ処理をここに実装
    await new Promise(resolve => setTimeout(resolve, 100));

    logger.info('Cleanup completed');
  }

  /**
   * エラーメッセージのフォーマット
   */
  formatErrorMessage(severity, type, error) {
    const message = error.message || error.toString();
    return `[${severity}] ${type}: ${message}`;
  }

  /**
   * Critical Error用の復旧提案を取得
   */
  getCriticalErrorType(error, message, code) {
    if (/repository.*corrupt/i.test(message)) return 'GIT_REPOSITORY_CORRUPTION';
    if (/permission denied/i.test(message) || code === 'EACCES') return 'PERMISSION_DENIED';
    if (/enospc|no space left/i.test(message) || code === 'ENOSPC') return 'DISK_SPACE_FULL';
    if (/enomem|out of memory/i.test(message) || code === 'ENOMEM') return 'OUT_OF_MEMORY';
    if (/authentication.*failed/i.test(message)) return 'AUTHENTICATION_FAILED';
    return 'UNKNOWN_CRITICAL';
  }

  /**
   * Critical Error用の復旧提案
   */
  suggestCriticalRecovery(type, _error) {
    const suggestions = {
      'GIT_REPOSITORY_CORRUPTION': {
        suggestion: 'Gitリポジトリが破損しています。\n' +
                   '1. バックアップから復元してください\n' +
                   '2. または `git fsck` でチェックしてください',
        canRecover: false
      },
      'PERMISSION_DENIED': {
        suggestion: 'ファイルアクセス権限が不足しています。\n' +
                   '1. ファイル権限を確認してください (chmod)\n' +
                   '2. 管理者権限で実行してください',
        canRecover: false
      },
      'DISK_SPACE_FULL': {
        suggestion: 'ディスク容量が不足しています。\n' +
                   '1. 不要なファイルを削除してください\n' +
                   '2. 別のディスクを使用してください',
        canRecover: false
      },
      'AUTHENTICATION_FAILED': {
        suggestion: 'GitHub認証に失敗しました。\n' +
                   '1. GITHUB_TOKENを確認してください\n' +
                   '2. トークンの権限を確認してください',
        canRecover: false
      }
    };

    return suggestions[type] || {
      suggestion: '原因不明の重大なエラーです。サポートにお問い合わせください。',
      canRecover: false
    };
  }

  /**
   * Recoverable Error用の復旧提案を取得
   */
  getRecoverableErrorType(error, message, code) {
    if (/timeout/i.test(message) || code === 'ETIMEDOUT') return 'NETWORK_TIMEOUT';
    if (/connection.*refused/i.test(message) || code === 'ECONNREFUSED') return 'CONNECTION_REFUSED';
    if (/merge.*conflict/i.test(message)) return 'MERGE_CONFLICT';
    if (/rate.*limit/i.test(message)) return 'API_RATE_LIMIT';
    if (code === 'ENOENT') return 'FILE_NOT_FOUND';
    return 'UNKNOWN_RECOVERABLE';
  }

  /**
   * Recoverable Error用の復旧提案
   */
  suggestRecoverableRecovery(type, _error) {
    const suggestions = {
      'NETWORK_TIMEOUT': {
        suggestion: 'ネットワークタイムアウトが発生しました。再試行します。'
      },
      'CONNECTION_REFUSED': {
        suggestion: '接続が拒否されました。ネットワーク設定を確認して再試行します。'
      },
      'MERGE_CONFLICT': {
        suggestion: 'マージコンフリクトが発生しました。対話的に解決します。'
      },
      'API_RATE_LIMIT': {
        suggestion: 'API制限に達しました。しばらく待機してから再試行します。'
      },
      'FILE_NOT_FOUND': {
        suggestion: '必要なファイルが見つかりません。デフォルト設定を使用します。'
      }
    };

    return suggestions[type] || {
      suggestion: '自動復旧を試行します。'
    };
  }

  /**
   * Warning Error用のタイプを取得
   */
  getWarningErrorType(_error, message, _code) {
    if (/optional.*feature/i.test(message)) return 'OPTIONAL_FEATURE_UNAVAILABLE';
    if (/configuration.*missing/i.test(message)) return 'CONFIGURATION_MISSING';
    if (/performance.*warning/i.test(message)) return 'PERFORMANCE_WARNING';
    if (/deprecated/i.test(message)) return 'DEPRECATED_FEATURE';
    return 'UNKNOWN_WARNING';
  }

  /**
   * エラー統計を取得
   */
  getErrorStats() {
    return {
      totalErrors: this.errorCount,
      criticalErrors: Array.from(this.criticalErrors),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * エラーカウントをリセット
   */
  resetErrorCount() {
    this.errorCount = 0;
    this.criticalErrors.clear();
  }
}

// シングルトンインスタンス
const errorHandler = new ErrorHandler();

module.exports = errorHandler;