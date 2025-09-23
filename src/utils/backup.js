const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const logger = require('./logger');

/**
 * バックアップ管理機能
 */
class BackupManager {
  constructor() {
    this.backupDir = path.join(process.cwd(), '.team-flow', 'backups');
    this.maxBackups = 10; // 最大バックアップ数
    this.compressionEnabled = false; // 将来的に圧縮対応
  }

  /**
   * 初期化
   */
  async initialize() {
    try {
      await fs.ensureDir(this.backupDir);
      await this.loadBackupIndex();
      logger.info('バックアップマネージャーの初期化完了');
    } catch (error) {
      logger.error('バックアップマネージャーの初期化に失敗:', error);
      throw error;
    }
  }

  /**
   * バックアップインデックスを読み込み
   */
  async loadBackupIndex() {
    const indexPath = path.join(this.backupDir, 'index.json');

    try {
      if (await fs.pathExists(indexPath)) {
        this.backupIndex = await fs.readJSON(indexPath);
      } else {
        this.backupIndex = {
          version: '1.0.0',
          backups: [],
          createdAt: new Date().toISOString()
        };
        await this.saveBackupIndex();
      }
    } catch (error) {
      logger.warn('バックアップインデックスの読み込みに失敗:', error);
      this.backupIndex = { version: '1.0.0', backups: [], createdAt: new Date().toISOString() };
    }
  }

  /**
   * バックアップインデックスを保存
   */
  async saveBackupIndex() {
    const indexPath = path.join(this.backupDir, 'index.json');

    try {
      await fs.writeJSON(indexPath, this.backupIndex, { spaces: 2 });
    } catch (error) {
      logger.error('バックアップインデックスの保存に失敗:', error);
    }
  }

  /**
   * フルバックアップを作成
   */
  async createFullBackup(operation = 'manual', metadata = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `full-${operation}-${timestamp}`;
    const backupPath = path.join(this.backupDir, backupId);

    try {
      await fs.ensureDir(backupPath);

      // バックアップするファイル・ディレクトリのリスト
      const targets = [
        '.env',
        'package.json',
        'package-lock.json',
        '.gitignore',
        '.team-flow'
      ];

      const backupResult = {
        id: backupId,
        type: 'full',
        operation,
        timestamp: new Date().toISOString(),
        metadata,
        files: [],
        size: 0,
        checksum: null
      };

      // 各ターゲットをバックアップ
      for (const target of targets) {
        try {
          const result = await this.backupTarget(target, backupPath);
          if (result) {
            backupResult.files.push(result);
            backupResult.size += result.size;
          }
        } catch (error) {
          logger.warn(`ターゲットのバックアップに失敗: ${target}`, error);
        }
      }

      // Git情報のバックアップ
      const gitInfo = await this.backupGitInfo(backupPath);
      if (gitInfo) {
        backupResult.files.push(gitInfo);
        backupResult.size += gitInfo.size;
      }

      // チェックサムを計算
      backupResult.checksum = await this.calculateBackupChecksum(backupPath);

      // メタデータを保存
      await fs.writeJSON(path.join(backupPath, 'backup-info.json'), backupResult, { spaces: 2 });

      // インデックスに追加
      this.backupIndex.backups.unshift(backupResult);
      await this.cleanupOldBackups();
      await this.saveBackupIndex();

      logger.info(`フルバックアップ作成完了: ${backupId} (${this.formatSize(backupResult.size)})`);
      return backupResult;
    } catch (error) {
      logger.error('フルバックアップの作成に失敗:', error);

      // 失敗した場合はバックアップディレクトリを削除
      try {
        await fs.remove(backupPath);
      } catch (cleanupError) {
        logger.warn('失敗したバックアップの削除に失敗:', cleanupError);
      }

      throw error;
    }
  }

  /**
   * 増分バックアップを作成
   */
  async createIncrementalBackup(operation = 'auto', metadata = {}) {
    const lastBackup = this.getLatestBackup();
    if (!lastBackup) {
      // 最初のバックアップはフルバックアップ
      return await this.createFullBackup(operation, metadata);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `inc-${operation}-${timestamp}`;
    const backupPath = path.join(this.backupDir, backupId);

    try {
      await fs.ensureDir(backupPath);

      const backupResult = {
        id: backupId,
        type: 'incremental',
        operation,
        timestamp: new Date().toISOString(),
        metadata,
        basedOn: lastBackup.id,
        files: [],
        size: 0,
        checksum: null
      };

      // 変更されたファイルのみをバックアップ
      const changedFiles = await this.findChangedFiles(lastBackup);

      for (const file of changedFiles) {
        try {
          const result = await this.backupTarget(file, backupPath);
          if (result) {
            backupResult.files.push(result);
            backupResult.size += result.size;
          }
        } catch (error) {
          logger.warn(`ファイルのバックアップに失敗: ${file}`, error);
        }
      }

      // チェックサムを計算
      backupResult.checksum = await this.calculateBackupChecksum(backupPath);

      // メタデータを保存
      await fs.writeJSON(path.join(backupPath, 'backup-info.json'), backupResult, { spaces: 2 });

      // インデックスに追加
      this.backupIndex.backups.unshift(backupResult);
      await this.cleanupOldBackups();
      await this.saveBackupIndex();

      logger.info(`増分バックアップ作成完了: ${backupId} (${this.formatSize(backupResult.size)})`);
      return backupResult;
    } catch (error) {
      logger.error('増分バックアップの作成に失敗:', error);

      try {
        await fs.remove(backupPath);
      } catch (cleanupError) {
        logger.warn('失敗したバックアップの削除に失敗:', cleanupError);
      }

      throw error;
    }
  }

  /**
   * ターゲットをバックアップ
   */
  async backupTarget(target, backupPath) {
    const sourcePath = path.join(process.cwd(), target);
    const targetPath = path.join(backupPath, 'files', target);

    try {
      if (!(await fs.pathExists(sourcePath))) {
        return null;
      }

      const stats = await fs.stat(sourcePath);
      await fs.ensureDir(path.dirname(targetPath));

      if (stats.isDirectory()) {
        await fs.copy(sourcePath, targetPath);
      } else {
        await fs.copy(sourcePath, targetPath);
      }

      return {
        path: target,
        type: stats.isDirectory() ? 'directory' : 'file',
        size: stats.size || (await this.calculateDirectorySize(targetPath)),
        mtime: stats.mtime.toISOString(),
        checksum: stats.isFile() ? await this.calculateFileChecksum(sourcePath) : null
      };
    } catch (error) {
      logger.warn(`ターゲットのバックアップに失敗: ${target}`, error);
      return null;
    }
  }

  /**
   * Git情報をバックアップ
   */
  async backupGitInfo(backupPath) {
    try {
      const git = require('./git');

      const gitInfo = {
        currentBranch: await git.getCurrentBranch().catch(() => null),
        status: await git.getStatus().catch(() => null),
        remoteUrl: await git.getRemoteUrl().catch(() => null),
        lastCommit: await git.getLastCommit().catch(() => null)
      };

      const gitInfoPath = path.join(backupPath, 'git-info.json');
      const gitInfoContent = JSON.stringify(gitInfo, null, 2);
      await fs.writeFile(gitInfoPath, gitInfoContent);

      return {
        path: 'git-info.json',
        type: 'file',
        size: gitInfoContent.length,
        mtime: new Date().toISOString(),
        checksum: this.calculateStringChecksum(gitInfoContent)
      };
    } catch (error) {
      logger.warn('Git情報のバックアップに失敗:', error);
      return null;
    }
  }

  /**
   * バックアップからファイルを復元
   */
  async restoreFromBackup(backupId, targetPath = null) {
    const backup = this.findBackup(backupId);
    if (!backup) {
      throw new Error(`バックアップが見つかりません: ${backupId}`);
    }

    const backupPath = path.join(this.backupDir, backupId);
    const filesPath = path.join(backupPath, 'files');

    if (!(await fs.pathExists(filesPath))) {
      throw new Error(`バックアップファイルが見つかりません: ${backupId}`);
    }

    const restorePath = targetPath || process.cwd();

    try {
      // バックアップの検証
      const isValid = await this.verifyBackup(backupId);
      if (!isValid) {
        throw new Error('バックアップの整合性チェックに失敗しました');
      }

      // ファイルを復元
      await fs.copy(filesPath, restorePath, { overwrite: true });

      logger.info(`バックアップから復元完了: ${backupId} → ${restorePath}`);
      return true;
    } catch (error) {
      logger.error('バックアップからの復元に失敗:', error);
      throw error;
    }
  }

  /**
   * バックアップの整合性を検証
   */
  async verifyBackup(backupId) {
    const backup = this.findBackup(backupId);
    if (!backup) {
      return false;
    }

    const backupPath = path.join(this.backupDir, backupId);

    try {
      // チェックサムを再計算して比較
      const currentChecksum = await this.calculateBackupChecksum(backupPath);
      const isValid = currentChecksum === backup.checksum;

      if (!isValid) {
        logger.warn(`バックアップの整合性チェックに失敗: ${backupId}`);
      }

      return isValid;
    } catch (error) {
      logger.error('バックアップの検証に失敗:', error);
      return false;
    }
  }

  /**
   * 変更されたファイルを検索
   */
  async findChangedFiles(lastBackup) {
    const changedFiles = [];
    const targets = ['.env', 'package.json', '.team-flow'];

    for (const target of targets) {
      try {
        const currentPath = path.join(process.cwd(), target);
        if (!(await fs.pathExists(currentPath))) {
          continue;
        }

        const currentStats = await fs.stat(currentPath);
        const lastBackupFile = lastBackup.files.find(f => f.path === target);

        if (!lastBackupFile) {
          // 新しいファイル
          changedFiles.push(target);
        } else if (currentStats.isFile()) {
          // ファイルの場合、チェックサムで比較
          const currentChecksum = await this.calculateFileChecksum(currentPath);
          if (currentChecksum !== lastBackupFile.checksum) {
            changedFiles.push(target);
          }
        } else {
          // ディレクトリの場合、更新時刻で比較
          if (new Date(currentStats.mtime) > new Date(lastBackupFile.mtime)) {
            changedFiles.push(target);
          }
        }
      } catch (error) {
        logger.warn(`ファイル変更チェックに失敗: ${target}`, error);
      }
    }

    return changedFiles;
  }

  /**
   * 古いバックアップをクリーンアップ
   */
  async cleanupOldBackups() {
    if (this.backupIndex.backups.length <= this.maxBackups) {
      return;
    }

    const backupsToRemove = this.backupIndex.backups.slice(this.maxBackups);

    for (const backup of backupsToRemove) {
      try {
        const backupPath = path.join(this.backupDir, backup.id);
        await fs.remove(backupPath);
        logger.info(`古いバックアップを削除: ${backup.id}`);
      } catch (error) {
        logger.warn(`バックアップの削除に失敗: ${backup.id}`, error);
      }
    }

    this.backupIndex.backups = this.backupIndex.backups.slice(0, this.maxBackups);
  }

  /**
   * バックアップのチェックサムを計算
   */
  async calculateBackupChecksum(backupPath) {
    const filesPath = path.join(backupPath, 'files');

    if (!(await fs.pathExists(filesPath))) {
      return null;
    }

    return await this.calculateDirectoryChecksum(filesPath);
  }

  /**
   * ファイルのチェックサムを計算
   */
  async calculateFileChecksum(filePath) {
    try {
      const content = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
      logger.warn(`チェックサム計算に失敗: ${filePath}`, error);
      return null;
    }
  }

  /**
   * 文字列のチェックサムを計算
   */
  calculateStringChecksum(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * ディレクトリのチェックサムを計算
   */
  async calculateDirectoryChecksum(dirPath) {
    try {
      const files = await this.getAllFiles(dirPath);
      const hash = crypto.createHash('sha256');

      for (const file of files.sort()) {
        const relativePath = path.relative(dirPath, file);
        const content = await fs.readFile(file);
        hash.update(`${relativePath}:${content}`);
      }

      return hash.digest('hex');
    } catch (error) {
      logger.warn(`ディレクトリチェックサム計算に失敗: ${dirPath}`, error);
      return null;
    }
  }

  /**
   * ディレクトリ内の全ファイルを取得
   */
  async getAllFiles(dirPath) {
    const files = [];

    const scan = async (currentPath) => {
      const items = await fs.readdir(currentPath);

      for (const item of items) {
        const itemPath = path.join(currentPath, item);
        const stats = await fs.stat(itemPath);

        if (stats.isDirectory()) {
          await scan(itemPath);
        } else {
          files.push(itemPath);
        }
      }
    };

    await scan(dirPath);
    return files;
  }

  /**
   * ディレクトリサイズを計算
   */
  async calculateDirectorySize(dirPath) {
    try {
      const files = await this.getAllFiles(dirPath);
      let totalSize = 0;

      for (const file of files) {
        const stats = await fs.stat(file);
        totalSize += stats.size;
      }

      return totalSize;
    } catch (error) {
      return 0;
    }
  }

  /**
   * バックアップを検索
   */
  findBackup(backupId) {
    return this.backupIndex.backups.find(backup => backup.id === backupId);
  }

  /**
   * 最新のバックアップを取得
   */
  getLatestBackup() {
    return this.backupIndex.backups[0] || null;
  }

  /**
   * バックアップ一覧を取得
   */
  listBackups() {
    return this.backupIndex.backups.map(backup => ({
      id: backup.id,
      type: backup.type,
      operation: backup.operation,
      timestamp: backup.timestamp,
      size: this.formatSize(backup.size),
      fileCount: backup.files.length
    }));
  }

  /**
   * サイズをフォーマット
   */
  formatSize(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * バックアップ統計を取得
   */
  getBackupStats() {
    const totalSize = this.backupIndex.backups.reduce((sum, backup) => sum + backup.size, 0);
    const fullBackups = this.backupIndex.backups.filter(b => b.type === 'full').length;
    const incrementalBackups = this.backupIndex.backups.filter(b => b.type === 'incremental').length;

    return {
      totalBackups: this.backupIndex.backups.length,
      fullBackups,
      incrementalBackups,
      totalSize: this.formatSize(totalSize),
      oldestBackup: this.backupIndex.backups[this.backupIndex.backups.length - 1]?.timestamp || null,
      newestBackup: this.backupIndex.backups[0]?.timestamp || null
    };
  }
}

module.exports = BackupManager;