const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');
const git = require('./git');

/**
 * 自動復旧機能
 */
class RecoveryManager {
  constructor() {
    this.backupDir = path.join(process.cwd(), '.team-flow', 'backups');
    this.stateDir = path.join(process.cwd(), '.team-flow', 'state');
    this.recoveryHistory = [];
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1秒
  }

  /**
   * 初期化
   */
  async initialize() {
    try {
      await fs.ensureDir(this.backupDir);
      await fs.ensureDir(this.stateDir);
      logger.info('復旧マネージャーの初期化完了');
    } catch (error) {
      logger.error('復旧マネージャーの初期化に失敗:', error);
      throw error;
    }
  }

  /**
   * 操作前の状態をバックアップ
   */
  async createBackup(operation, metadata = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `${operation}-${timestamp}`;
    const backupPath = path.join(this.backupDir, backupId);

    try {
      await fs.ensureDir(backupPath);

      // Git状態のバックアップ
      const gitState = await this.captureGitState();
      await fs.writeJSON(path.join(backupPath, 'git-state.json'), gitState);

      // 設定ファイルのバックアップ
      await this.backupConfigFiles(backupPath);

      // メタデータの保存
      const backupMetadata = {
        id: backupId,
        operation,
        timestamp: new Date().toISOString(),
        metadata,
        gitState
      };
      await fs.writeJSON(path.join(backupPath, 'metadata.json'), backupMetadata);

      logger.info(`バックアップ作成完了: ${backupId}`);
      return backupId;
    } catch (error) {
      logger.error('バックアップ作成に失敗:', error);
      throw error;
    }
  }

  /**
   * Git状態をキャプチャ
   */
  async captureGitState() {
    try {
      const [currentBranch, status, remoteUrl] = await Promise.all([
        git.getCurrentBranch().catch(() => null),
        git.getStatus().catch(() => null),
        git.getRemoteUrl().catch(() => null)
      ]);

      return {
        currentBranch,
        status,
        remoteUrl,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.warn('Git状態のキャプチャに失敗:', error);
      return null;
    }
  }

  /**
   * 設定ファイルをバックアップ
   */
  async backupConfigFiles(backupPath) {
    const configFiles = [
      '.env',
      'package.json',
      '.gitconfig',
      '.team-flow/config.json'
    ];

    for (const configFile of configFiles) {
      try {
        const filePath = path.join(process.cwd(), configFile);
        if (await fs.pathExists(filePath)) {
          const targetPath = path.join(backupPath, 'config', configFile);
          await fs.ensureDir(path.dirname(targetPath));
          await fs.copy(filePath, targetPath);
        }
      } catch (error) {
        logger.warn(`設定ファイルのバックアップに失敗: ${configFile}`, error);
      }
    }
  }

  /**
   * 操作の自動復旧を試行
   */
  async attemptRecovery(errorType, error, context = {}) {
    const recoveryStrategy = this.getRecoveryStrategy(errorType);

    if (!recoveryStrategy) {
      logger.warn(`復旧戦略が見つかりません: ${errorType}`);
      return { success: false, message: '復旧方法が不明です' };
    }

    logger.info(`復旧を試行します: ${errorType}`);

    try {
      const result = await this.executeRecoveryStrategy(recoveryStrategy, error, context);

      this.recoveryHistory.push({
        errorType,
        strategy: recoveryStrategy.name,
        success: result.success,
        timestamp: new Date().toISOString(),
        context
      });

      return result;
    } catch (recoveryError) {
      logger.error('復旧処理中にエラーが発生:', recoveryError);
      return {
        success: false,
        message: `復旧処理に失敗しました: ${recoveryError.message}`
      };
    }
  }

  /**
   * 復旧戦略を取得
   */
  getRecoveryStrategy(errorType) {
    const strategies = {
      'NETWORK_TIMEOUT': {
        name: 'RETRY_WITH_BACKOFF',
        handler: this.retryWithBackoff.bind(this)
      },
      'CONNECTION_REFUSED': {
        name: 'OFFLINE_MODE',
        handler: this.switchToOfflineMode.bind(this)
      },
      'MERGE_CONFLICT': {
        name: 'RESTORE_BACKUP',
        handler: this.restoreFromBackup.bind(this)
      },
      'API_RATE_LIMIT': {
        name: 'WAIT_AND_RETRY',
        handler: this.waitAndRetry.bind(this)
      },
      'FILE_NOT_FOUND': {
        name: 'CREATE_DEFAULT',
        handler: this.createDefaultFile.bind(this)
      },
      'CONFIGURATION_MISSING': {
        name: 'RESTORE_CONFIG',
        handler: this.restoreConfiguration.bind(this)
      }
    };

    return strategies[errorType];
  }

  /**
   * 復旧戦略を実行
   */
  async executeRecoveryStrategy(strategy, error, context) {
    logger.info(`復旧戦略を実行: ${strategy.name}`);
    return await strategy.handler(error, context);
  }

  /**
   * バックオフ付き再試行
   */
  async retryWithBackoff(error, context) {
    const { operation, maxRetries = this.maxRetries } = context;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`再試行 ${attempt}/${maxRetries}`);

        // 指数バックオフ
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        await this.sleep(delay);

        // 操作を再実行（contextから取得）
        if (typeof operation === 'function') {
          await operation();
          return { success: true, message: `${attempt}回目の試行で成功しました` };
        }

        return { success: true, message: '再試行準備完了' };
      } catch (retryError) {
        logger.warn(`試行 ${attempt} が失敗:`, retryError.message);

        if (attempt === maxRetries) {
          return {
            success: false,
            message: `${maxRetries}回の再試行がすべて失敗しました`
          };
        }
      }
    }
  }

  /**
   * オフラインモードに切り替え
   */
  async switchToOfflineMode(error, context) {
    logger.info('オフラインモードに切り替えます');

    try {
      // オフラインモードの設定を保存
      const offlineConfig = {
        mode: 'offline',
        timestamp: new Date().toISOString(),
        reason: error.message
      };

      await fs.writeJSON(path.join(this.stateDir, 'offline-mode.json'), offlineConfig);

      return {
        success: true,
        message: 'オフラインモードに切り替えました。ネットワーク機能は無効になります。'
      };
    } catch (offlineError) {
      return {
        success: false,
        message: `オフラインモード切り替えに失敗: ${offlineError.message}`
      };
    }
  }

  /**
   * バックアップから復元
   */
  async restoreFromBackup(error, context) {
    const { backupId } = context;

    if (!backupId) {
      // 最新のバックアップを探す
      const latestBackup = await this.findLatestBackup();
      if (!latestBackup) {
        return { success: false, message: '復元可能なバックアップが見つかりません' };
      }
      context.backupId = latestBackup;
    }

    try {
      logger.info(`バックアップから復元します: ${context.backupId}`);

      const backupPath = path.join(this.backupDir, context.backupId);
      const metadataPath = path.join(backupPath, 'metadata.json');

      if (!(await fs.pathExists(metadataPath))) {
        return { success: false, message: 'バックアップメタデータが見つかりません' };
      }

      const metadata = await fs.readJSON(metadataPath);

      // Git状態の復元
      if (metadata.gitState) {
        await this.restoreGitState(metadata.gitState);
      }

      // 設定ファイルの復元
      await this.restoreConfigFiles(backupPath);

      return {
        success: true,
        message: `バックアップ ${context.backupId} から復元しました`
      };
    } catch (restoreError) {
      return {
        success: false,
        message: `復元に失敗: ${restoreError.message}`
      };
    }
  }

  /**
   * API制限時の待機と再試行
   */
  async waitAndRetry(error, context) {
    // エラーメッセージから待機時間を抽出
    let waitTime = 60000; // デフォルト1分

    const resetMatch = error.message.match(/reset.*?(\d+)/i);
    if (resetMatch) {
      const resetTime = parseInt(resetMatch[1]) * 1000;
      waitTime = Math.max(resetTime - Date.now(), 60000);
    }

    logger.info(`API制限のため${Math.ceil(waitTime / 1000)}秒待機します`);

    await this.sleep(waitTime);

    return {
      success: true,
      message: 'API制限の待機が完了しました。操作を再試行してください。'
    };
  }

  /**
   * デフォルトファイルを作成
   */
  async createDefaultFile(error, context) {
    const { filePath, defaultContent } = context;

    if (!filePath) {
      return { success: false, message: 'ファイルパスが指定されていません' };
    }

    try {
      const content = defaultContent || this.getDefaultContent(filePath);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, content);

      logger.info(`デフォルトファイルを作成: ${filePath}`);

      return {
        success: true,
        message: `デフォルトファイルを作成しました: ${filePath}`
      };
    } catch (createError) {
      return {
        success: false,
        message: `ファイル作成に失敗: ${createError.message}`
      };
    }
  }

  /**
   * 設定を復元
   */
  async restoreConfiguration(error, context) {
    try {
      const defaultConfig = this.getDefaultConfiguration();
      const configPath = path.join(process.cwd(), '.team-flow', 'config.json');

      await fs.ensureDir(path.dirname(configPath));
      await fs.writeJSON(configPath, defaultConfig, { spaces: 2 });

      return {
        success: true,
        message: 'デフォルト設定を復元しました'
      };
    } catch (configError) {
      return {
        success: false,
        message: `設定復元に失敗: ${configError.message}`
      };
    }
  }

  /**
   * 最新のバックアップを検索
   */
  async findLatestBackup() {
    try {
      const backups = await fs.readdir(this.backupDir);
      if (backups.length === 0) return null;

      // タイムスタンプでソート
      backups.sort((a, b) => b.localeCompare(a));
      return backups[0];
    } catch (error) {
      logger.warn('バックアップ検索に失敗:', error);
      return null;
    }
  }

  /**
   * Git状態を復元
   */
  async restoreGitState(gitState) {
    try {
      if (gitState.currentBranch) {
        const currentBranch = await git.getCurrentBranch();
        if (currentBranch !== gitState.currentBranch) {
          await git.checkoutBranch(gitState.currentBranch);
        }
      }
    } catch (error) {
      logger.warn('Git状態の復元に失敗:', error);
    }
  }

  /**
   * 設定ファイルを復元
   */
  async restoreConfigFiles(backupPath) {
    const configBackupPath = path.join(backupPath, 'config');

    if (!(await fs.pathExists(configBackupPath))) {
      return;
    }

    try {
      await fs.copy(configBackupPath, process.cwd(), { overwrite: true });
      logger.info('設定ファイルを復元しました');
    } catch (error) {
      logger.warn('設定ファイルの復元に失敗:', error);
    }
  }

  /**
   * デフォルトコンテンツを取得
   */
  getDefaultContent(filePath) {
    const fileName = path.basename(filePath);

    const defaults = {
      '.env': 'GITHUB_TOKEN=\nSLACK_TOKEN=\nDISCORD_WEBHOOK_URL=\n',
      'config.json': JSON.stringify({
        defaultBranch: 'main',
        autoBackup: true,
        notifications: {
          slack: false,
          discord: false
        }
      }, null, 2)
    };

    return defaults[fileName] || '';
  }

  /**
   * デフォルト設定を取得
   */
  getDefaultConfiguration() {
    return {
      version: '1.0.0',
      defaultBranch: 'main',
      autoBackup: true,
      notifications: {
        slack: false,
        discord: false
      },
      recovery: {
        maxRetries: 3,
        retryDelay: 1000
      },
      createdAt: new Date().toISOString()
    };
  }

  /**
   * 復旧履歴を取得
   */
  getRecoveryHistory() {
    return this.recoveryHistory;
  }

  /**
   * 待機
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * クリーンアップ（古いバックアップの削除）
   */
  async cleanup(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7日
    try {
      const backups = await fs.readdir(this.backupDir);
      const now = Date.now();

      for (const backup of backups) {
        const backupPath = path.join(this.backupDir, backup);
        const stats = await fs.stat(backupPath);

        if (now - stats.mtime.getTime() > maxAge) {
          await fs.remove(backupPath);
          logger.info(`古いバックアップを削除: ${backup}`);
        }
      }
    } catch (error) {
      logger.warn('バックアップクリーンアップに失敗:', error);
    }
  }
}

module.exports = RecoveryManager;