const simpleGit = require('simple-git');
const logger = require('./logger');
const config = require('../config');

class GitHelper {
  constructor() {
    this.git = simpleGit();
    this.defaultBranch = config.get('git.defaultBranch') || 'main';
  }

  // リポジトリがGitリポジトリかチェック
  async isGitRepository() {
    try {
      await this.git.status();
      return true;
    } catch (error) {
      return false;
    }
  }

  // 現在のブランチ名を取得
  async getCurrentBranch() {
    try {
      const status = await this.git.status();
      return status.current;
    } catch (error) {
      logger.error('現在のブランチ取得に失敗', error);
      return null;
    }
  }

  // 現在の状態を取得
  async getStatus() {
    try {
      return await this.git.status();
    } catch (error) {
      logger.error('Gitステータス取得に失敗', error);
      return null;
    }
  }

  // 変更があるかチェック
  async hasChanges() {
    try {
      const status = await this.git.status();
      return status.files.length > 0;
    } catch (error) {
      logger.error('変更確認に失敗', error);
      return false;
    }
  }

  // ワーキングディレクトリがクリーンかチェック
  async isWorkingDirectoryClean() {
    try {
      const status = await this.git.status();
      return status.files.length === 0;
    } catch (error) {
      logger.error('ワーキングディレクトリクリーン状態確認に失敗', error);
      return false;
    }
  }

  // 未コミットの変更があるかチェック
  async hasUncommittedChanges() {
    try {
      const status = await this.git.status();
      return status.modified.length > 0 || status.not_added.length > 0;
    } catch (error) {
      logger.error('未コミット変更確認に失敗', error);
      return false;
    }
  }

  // ブランチ作成
  async createBranch(branchName) {
    try {
      await this.git.checkoutLocalBranch(branchName);
      logger.success(`ブランチ '${branchName}' を作成しました`);
      return true;
    } catch (error) {
      logger.error(`ブランチ作成に失敗: ${branchName}`, error);
      return false;
    }
  }

  // ブランチ作成と切り替えを同時実行
  async createAndSwitchBranch(branchName) {
    try {
      await this.git.checkoutLocalBranch(branchName);
      logger.success(`ブランチ '${branchName}' を作成し、切り替えました`);
      return true;
    } catch (error) {
      logger.error(`ブランチ作成・切り替えに失敗: ${branchName}`, error);
      return false;
    }
  }

  // ブランチ切り替え
  async switchBranch(branchName) {
    try {
      await this.git.checkout(branchName);
      logger.success(`ブランチ '${branchName}' に切り替えました`);
      return true;
    } catch (error) {
      logger.error(`ブランチ切り替えに失敗: ${branchName}`, error);
      return false;
    }
  }

  // リモートブランチリストを取得
  async getRemoteBranches() {
    try {
      const branches = await this.git.branch(['-r']);
      return branches.all.filter(branch => !branch.includes('HEAD'));
    } catch (error) {
      logger.error('リモートブランチ取得に失敗', error);
      return [];
    }
  }

  // ローカルブランチリストを取得
  async getLocalBranches() {
    try {
      const branches = await this.git.branchLocal();
      return branches.all;
    } catch (error) {
      logger.error('ローカルブランチ取得に失敗', error);
      return [];
    }
  }

  // 特定のローカルブランチが存在するかチェック
  async hasLocalBranch(branchName) {
    try {
      const branches = await this.getLocalBranches();
      return branches.includes(branchName);
    } catch (error) {
      logger.error(`ローカルブランチ存在確認に失敗: ${branchName}`, error);
      return false;
    }
  }

  // リモートURLを取得
  async getRemoteUrl(remoteName = 'origin') {
    try {
      const remotes = await this.git.getRemotes(true);
      const remote = remotes.find(r => r.name === remoteName);
      return remote ? remote.refs.fetch : null;
    } catch (error) {
      logger.error(`リモートURL取得に失敗: ${remoteName}`, error);
      return null;
    }
  }

  // 最新の状態にプル
  async pullLatest(branch = null) {
    try {
      const targetBranch = branch || this.defaultBranch;
      await this.git.pull('origin', targetBranch);
      logger.success(`最新の状態にプルしました: ${targetBranch}`);
      return true;
    } catch (error) {
      logger.error('プルに失敗', error);
      return false;
    }
  }

  // ファイルをステージング
  async addFiles(files = '.') {
    try {
      await this.git.add(files);
      logger.success('ファイルをステージングしました');
      return true;
    } catch (error) {
      logger.error('ファイルステージングに失敗', error);
      return false;
    }
  }

  // コミット
  async commit(message) {
    try {
      await this.git.commit(message);
      logger.success(`コミットしました: ${message}`);
      return true;
    } catch (error) {
      logger.error('コミットに失敗', error);
      return false;
    }
  }

  // プッシュ
  async push(branch = null) {
    try {
      const currentBranch = branch || await this.getCurrentBranch();
      await this.git.push('origin', currentBranch);
      logger.success(`プッシュしました: ${currentBranch}`);
      return true;
    } catch (error) {
      logger.error('プッシュに失敗', error);
      return false;
    }
  }

  // 競合があるかチェック
  async hasConflicts() {
    try {
      const status = await this.git.status();
      return status.conflicted.length > 0;
    } catch (error) {
      logger.error('競合確認に失敗', error);
      return false;
    }
  }

  // コミット履歴を取得
  async getCommitHistory(limit = 10) {
    try {
      const log = await this.git.log({ maxCount: limit });
      return log.all;
    } catch (error) {
      logger.error('コミット履歴取得に失敗', error);
      return [];
    }
  }

  // 特定のブランチとの差分を取得
  async getDiffWithBranch(targetBranch) {
    try {
      const diff = await this.git.diff([targetBranch]);
      return diff;
    } catch (error) {
      logger.error(`差分取得に失敗: ${targetBranch}`, error);
      return '';
    }
  }

  // 安全にブランチを削除
  async deleteBranch(branchName, force = false) {
    try {
      const currentBranch = await this.getCurrentBranch();
      if (currentBranch === branchName) {
        logger.warn('現在のブランチは削除できません');
        return false;
      }

      if (force) {
        await this.git.deleteLocalBranch(branchName, true);
      } else {
        await this.git.deleteLocalBranch(branchName);
      }

      logger.success(`ブランチ '${branchName}' を削除しました`);
      return true;
    } catch (error) {
      logger.error(`ブランチ削除に失敗: ${branchName}`, error);
      return false;
    }
  }

  // リポジトリの初期化状態をチェック
  async validateRepository() {
    const isRepo = await this.isGitRepository();
    if (!isRepo) {
      throw new Error('現在のディレクトリはGitリポジトリではありません');
    }

    const hasRemote = await this.hasRemoteOrigin();
    if (!hasRemote) {
      logger.warn('リモートリポジトリが設定されていません');
    }

    return true;
  }

  // リモートorigin の存在チェック
  async hasRemoteOrigin() {
    try {
      const remotes = await this.git.getRemotes();
      return remotes.some(remote => remote.name === 'origin');
    } catch (error) {
      logger.error('リモート確認に失敗', error);
      return false;
    }
  }

  // リポジトリがクリーンかチェック（未コミット変更・ステージング変更なし）
  async isRepoClean() {
    try {
      const status = await this.git.status();
      return status.files.length === 0;
    } catch (error) {
      logger.error('リポジトリクリーン状態確認に失敗', error);
      return false;
    }
  }
}

module.exports = new GitHelper();