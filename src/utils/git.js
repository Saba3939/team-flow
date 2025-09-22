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
    const ora = require('ora');
    try {
      const currentBranch = branch || await this.getCurrentBranch();
      
      // 進捗表示を追加
      const spinner = ora(`変更をリモートにプッシュ実行中... (${currentBranch})`).start();
      
      await this.git.push('origin', currentBranch);
      
      spinner.stop();
      logger.success(`プッシュしました: ${currentBranch}`);
      return true;
    } catch (error) {
      logger.error('プッシュに失敗', error);
      throw error; // エラーを再throwして上位で処理できるようにする
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

  // 未コミット変更の詳細を取得
  async getUncommittedChanges() {
    try {
      const status = await this.git.status();
      return status.files.map(file => ({
        path: file.path,
        status: file.index || file.working_dir,
        staged: !!file.index
      }));
    } catch (error) {
      logger.error('未コミット変更取得に失敗', error);
      return [];
    }
  }

  // 最後のプッシュ以降のコミットを取得
  async getCommitsSinceLastPush() {
    try {
      const currentBranch = await this.getCurrentBranch();
      const hasRemote = await this.hasRemoteBranch(currentBranch);

      if (!hasRemote) {
        // リモートブランチがない場合は全コミットを返す
        return await this.getCommitHistory();
      }

      const log = await this.git.log([`origin/${currentBranch}..HEAD`]);
      return log.all.map(commit => ({
        hash: commit.hash,
        message: commit.message,
        date: new Date(commit.date),
        author: commit.author_name
      }));
    } catch (error) {
      logger.error('未プッシュコミット取得に失敗', error);
      return [];
    }
  }

  // リモートブランチの存在確認
  async hasRemoteBranch(branchName) {
    try {
      const remoteBranches = await this.getRemoteBranches();
      return remoteBranches.some(branch =>
        branch.includes(`origin/${branchName}`) || branch.includes(branchName)
      );
    } catch (error) {
      logger.error(`リモートブランチ存在確認に失敗: ${branchName}`, error);
      return false;
    }
  }

  // ahead/behind 状況を取得
  async getAheadBehind(branchName = null) {
    try {
      const currentBranch = branchName || await this.getCurrentBranch();
      const status = await this.git.status();

      return {
        ahead: status.ahead || 0,
        behind: status.behind || 0
      };
    } catch (error) {
      logger.error('ahead/behind状況取得に失敗', error);
      return { ahead: 0, behind: 0 };
    }
  }

  // ブランチ作成時間を取得（概算）
  async getBranchCreationTime(branchName) {
    try {
      const log = await this.git.log([branchName, '--reverse', '--max-count=1']);
      if (log.all.length > 0) {
        return new Date(log.all[0].date);
      }
      return null;
    } catch (error) {
      logger.error(`ブランチ作成時間取得に失敗: ${branchName}`, error);
      return null;
    }
  }

  // 最終コミット時間を取得
  async getLastCommitTime() {
    try {
      const log = await this.git.log(['--max-count=1']);
      if (log.all.length > 0) {
        return new Date(log.all[0].date);
      }
      return null;
    } catch (error) {
      logger.error('最終コミット時間取得に失敗', error);
      return null;
    }
  }

  // すべての変更をステージング
  async stageAllChanges() {
    try {
      await this.git.add('.');
      logger.success('すべての変更をステージングしました');
      return true;
    } catch (error) {
      logger.error('ステージングに失敗', error);
      return false;
    }
  }

  // 自動コミットメッセージ生成
  async generateCommitMessage() {
    try {
      const status = await this.git.status();
      const changes = status.files;

      if (changes.length === 0) {
        return 'Update files';
      }

      const modifiedCount = changes.filter(f => f.working_dir === 'M').length;
      const addedCount = changes.filter(f => f.working_dir === 'A').length;
      const deletedCount = changes.filter(f => f.working_dir === 'D').length;

      let message = 'Update: ';
      const parts = [];

      if (addedCount > 0) parts.push(`add ${addedCount} files`);
      if (modifiedCount > 0) parts.push(`modify ${modifiedCount} files`);
      if (deletedCount > 0) parts.push(`delete ${deletedCount} files`);

      message += parts.join(', ');
      return message;
    } catch (error) {
      logger.error('コミットメッセージ生成に失敗', error);
      return 'Update files';
    }
  }

  // プル実行
  async pull(branchName = null) {
    try {
      const targetBranch = branchName || await this.getCurrentBranch();
      await this.git.pull('origin', targetBranch);
      logger.success(`プルを実行しました: ${targetBranch}`);
      return true;
    } catch (error) {
      logger.error('プルに失敗', error);
      throw error;
    }
  }

  // upstream設定でプッシュ
  async pushSetUpstream(branchName) {
    const ora = require('ora');
    try {
      // 進捗表示を追加
      const spinner = ora(`リモートブランチを作成してプッシュ実行中... (${branchName})`).start();
      
      await this.git.push('origin', branchName, ['-u']);
      
      spinner.stop();
      logger.success(`upstream設定でプッシュしました: ${branchName}`);
      return true;
    } catch (error) {
      logger.error('upstream設定プッシュに失敗', error);
      throw error; // 既にthrowされているが明示的に記述
    }
  }

  // stash操作
  async stash(message = 'WIP: temporary stash') {
    try {
      await this.git.stash(['push', '-m', message]);
      logger.success('変更を一時退避しました');
      return true;
    } catch (error) {
      logger.error('stashに失敗', error);
      throw error;
    }
  }

  async stashPop() {
    try {
      await this.git.stash(['pop']);
      logger.success('退避した変更を復元しました');
      return true;
    } catch (error) {
      logger.error('stash復元に失敗', error);
      throw error;
    }
  }

  async hasStash() {
    try {
      const stashList = await this.git.stashList();
      return stashList.all.length > 0;
    } catch (error) {
      logger.error('stash確認に失敗', error);
      return false;
    }
  }

  // rebase操作
  async rebase() {
    try {
      const currentBranch = await this.getCurrentBranch();
      await this.git.rebase(['origin/' + currentBranch]);
      logger.success('rebaseを実行しました');
      return true;
    } catch (error) {
      logger.error('rebaseに失敗', error);
      throw error;
    }
  }

  // merge操作
  async mergeFromOrigin() {
    try {
      const currentBranch = await this.getCurrentBranch();
      await this.git.merge(['origin/' + currentBranch]);
      logger.success('mergeを実行しました');
      return true;
    } catch (error) {
      logger.error('mergeに失敗', error);
      throw error;
    }
  }

  // npmスクリプトの存在確認
  async hasNpmScript(scriptName) {
    try {
      const fs = require('fs').promises;
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
      return !!(packageJson.scripts && packageJson.scripts[scriptName]);
    } catch (error) {
      return false;
    }
  }

  // npmスクリプト実行
  async runNpmScript(scriptName) {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const { stdout, stderr } = await execAsync(`npm run ${scriptName}`);
      logger.success(`npm script '${scriptName}' を実行しました`);
      return { success: true, stdout, stderr };
    } catch (error) {
      logger.error(`npm script '${scriptName}' の実行に失敗`, error);
      throw error;
    }
  }
}

module.exports = new GitHelper();