const simpleGit = require('simple-git');
const logger = require('./logger');
const config = require('../config');

class GitHelper {
  constructor() {
    // タイムアウト設定を追加
    this.git = simpleGit({
      timeout: {
        block: 30000, // 30秒でタイムアウト
      },
      maxConcurrentProcesses: 1,
    });
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

  // 変更されたファイルの一覧を取得
  async getChangedFiles() {
    try {
      const status = await this.git.status();
      
      const files = [];
      
      // 変更されたファイル
      status.modified.forEach(file => files.push({ path: file, status: 'M' }));
      
      // 追加されたファイル  
      status.created.forEach(file => files.push({ path: file, status: 'A' }));
      
      // 削除されたファイル
      status.deleted.forEach(file => files.push({ path: file, status: 'D' }));
      
      // 名前変更されたファイル
      status.renamed.forEach(file => files.push({ path: file.to, status: 'R' }));
      
      // 未追跡ファイル
      status.not_added.forEach(file => files.push({ path: file, status: '??' }));
      
      return files;
    } catch (error) {
      logger.error('変更ファイル取得エラー:', error);
      throw new Error('変更ファイルの取得に失敗しました: ' + error.message);
    }
  }

  // PRメッセージ用：ファイルパスのみを配列で返す
  async getChangedFilesPaths() {
    try {
      const files = await this.getChangedFiles();
      return files.map(file => file.path);
    } catch (error) {
      logger.error('変更ファイルパス取得エラー:', error);
      return [];
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
    let spinner;
    
    try {
      const currentBranch = branch || await this.getCurrentBranch();
      
      // 進捗表示を追加
      spinner = ora(`変更をリモートにプッシュ実行中... (${currentBranch})`).start();
      
      // プッシュ実行（タイムアウト保護済み）
      await Promise.race([
        this.git.push('origin', currentBranch),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('プッシュがタイムアウトしました（30秒）')), 30000)
        )
      ]);
      
      spinner.stop();
      logger.success(`プッシュしました: ${currentBranch}`);
      return true;
    } catch (error) {
      if (spinner) spinner.stop();
      
      // より詳細なエラー情報を提供
      let errorMessage = 'プッシュに失敗';
      if (error.message.includes('timeout')) {
        errorMessage = 'プッシュがタイムアウトしました。ネットワーク接続を確認してください';
      } else if (error.message.includes('Authentication') || error.message.includes('permission')) {
        errorMessage = '認証に失敗しました。GitHubの認証情報を確認してください';
      } else if (error.message.includes('rejected')) {
        errorMessage = 'プッシュが拒否されました。リモートの変更をpullしてから再実行してください';
      }
      
      logger.error(errorMessage, error);
      throw new Error(errorMessage);
    }
  }

  // 指定したブランチをプッシュ
  async pushBranch(branchName) {
    try {
      await this.git.push('origin', branchName);
      logger.success(`ブランチ ${branchName} をプッシュしました`);
      return true;
    } catch (error) {
      logger.error('ブランチプッシュに失敗', error);
      throw new Error(`ブランチ ${branchName} のプッシュに失敗しました: ${error.message}`);
    }
  }

  // 代替のプッシュメソッド（直接gitコマンド実行）
  async pushDirect(branch = null) {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    const ora = require('ora');
    let spinner;
    
    try {
      const currentBranch = branch || await this.getCurrentBranch();
      spinner = ora(`変更をリモートにプッシュ実行中... (${currentBranch}) - 直接実行`).start();

      // 直接gitコマンドを実行（タイムアウト付き）
      const command = `git push origin ${currentBranch}`;
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000, // 30秒タイムアウト
        cwd: process.cwd()
      });
      
      
      spinner.stop();
      logger.success(`プッシュしました: ${currentBranch}`);
      return true;
    } catch (error) {
      if (spinner) spinner.stop();
      
      let errorMessage = '直接gitコマンドでプッシュに失敗';
      if (error.killed && error.signal === 'SIGTERM') {
        errorMessage = 'プッシュがタイムアウトしました（30秒）';
      } else if (error.message.includes('Authentication') || error.message.includes('permission')) {
        errorMessage = '認証に失敗しました。GitHubの認証情報を確認してください';
      } else if (error.message.includes('rejected')) {
        errorMessage = 'プッシュが拒否されました。リモートの変更をpullしてから再実行してください';
      }
      
      logger.error(errorMessage, error);
      throw new Error(errorMessage);
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

  // 最近のコミット一覧を取得
  async getRecentCommits(count = 5) {
    try {
      const log = await this.git.log({ maxCount: count });
      
      return log.all.map(commit => ({
        hash: commit.hash,
        message: commit.message,
        author: commit.author_name,
        date: commit.date
      }));
    } catch (error) {
      logger.error('最近のコミット取得エラー:', error);
      throw new Error('最近のコミットの取得に失敗しました: ' + error.message);
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
  async getAheadBehind(_branchName = null) {
    try {
      // const currentBranch = branchName || await this.getCurrentBranch(); // 必要に応じて使用
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
    let spinner;
    
    try {
      // 進捗表示を追加
      spinner = ora(`リモートブランチを作成してプッシュ実行中... (${branchName})`).start();
      
      // upstream設定でプッシュ実行（タイムアウト保護済み）
      await Promise.race([
        this.git.push('origin', branchName, ['-u']),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('プッシュがタイムアウトしました（30秒）')), 30000)
        )
      ]);
      
      spinner.stop();
      logger.success(`upstream設定でプッシュしました: ${branchName}`);
      return true;
    } catch (error) {
      if (spinner) spinner.stop();
      
      // より詳細なエラー情報を提供
      let errorMessage = 'upstream設定プッシュに失敗';
      if (error.message.includes('timeout')) {
        errorMessage = 'プッシュがタイムアウトしました。ネットワーク接続を確認してください';
      } else if (error.message.includes('Authentication') || error.message.includes('permission')) {
        errorMessage = '認証に失敗しました。GitHubの認証情報を確認してください';
      }
      
      logger.error(errorMessage, error);
      throw new Error(errorMessage);
    }
  }

  // 代替のpushSetUpstreamメソッド（直接gitコマンド実行）
  async pushSetUpstreamDirect(branchName) {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    const ora = require('ora');
    let spinner;
    
    try {
      spinner = ora(`リモートブランチを作成してプッシュ実行中... (${branchName}) - 直接実行`).start();

      // 直接gitコマンドを実行（タイムアウト付き）
      const command = `git push -u origin ${branchName}`;
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000, // 30秒タイムアウト
        cwd: process.cwd()
      });
      
      
      spinner.stop();
      logger.success(`upstream設定でプッシュしました: ${branchName}`);
      return true;
    } catch (error) {
      if (spinner) spinner.stop();
      
      let errorMessage = '直接gitコマンドでupstream設定プッシュに失敗';
      if (error.killed && error.signal === 'SIGTERM') {
        errorMessage = 'プッシュがタイムアウトしました（30秒）';
      } else if (error.message.includes('Authentication') || error.message.includes('permission')) {
        errorMessage = '認証に失敗しました。GitHubの認証情報を確認してください';
      } else if (error.message.includes('rejected')) {
        errorMessage = 'プッシュが拒否されました。リモートの変更をpullしてから再実行してください';
      }
      
      logger.error(errorMessage, error);
      throw new Error(errorMessage);
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

  // teamコマンド用: 全ブランチを取得（ローカル・リモート）
  async getAllBranches() {
    try {
      const [localBranches, remoteBranches] = await Promise.all([
        this.getLocalBranches(),
        this.getRemoteBranches()
      ]);

      // リモートブランチから origin/ プレフィックスを除去し、重複を削除
      const remoteNames = remoteBranches
        .map(branch => branch.replace('origin/', ''))
        .filter(branch => !branch.includes('HEAD'));

      // ローカルとリモートを統合して重複を除去
      const allBranches = [...new Set([...localBranches, ...remoteNames])];
      
      return allBranches;
    } catch (error) {
      logger.error('全ブランチ取得に失敗', error);
      return [];
    }
  }

  // teamコマンド用: 特定ブランチの最終コミット情報を取得
  async getLastCommit(branchName) {
    try {
      const log = await this.git.log([branchName, '--max-count=1']);
      if (log.all.length > 0) {
        const commit = log.all[0];
        return {
          hash: commit.hash,
          message: commit.message,
          author: commit.author_name,
          date: commit.date
        };
      }
      return null;
    } catch (error) {
      logger.error(`ブランチ ${branchName} の最終コミット取得に失敗`, error);
      return null;
    }
  }

  // teamコマンド用: 特定ブランチで変更されたファイル一覧を取得
  async getChangedFilesByBranch(branchName, baseBranch = 'main') {
    try {
      // ベースブランチとの差分でファイル一覧を取得
      const diff = await this.git.diff([`${baseBranch}...${branchName}`, '--name-only']);
      return diff.split('\n').filter(file => file.trim() !== '');
    } catch (error) {
      logger.error(`ブランチ ${branchName} の変更ファイル取得に失敗`, error);
      return [];
    }
  }

  // teamコマンド用: 特定日時以降のコミットを取得（改良版）
  async getRecentCommitsSince(since) {
    try {
      const sinceDate = since instanceof Date ? since.toISOString().split('T')[0] : since;
      const log = await this.git.log(['--since=' + sinceDate, '--all']);
      
      return log.all.map(commit => ({
        hash: commit.hash,
        message: commit.message,
        author: commit.author_name,
        date: new Date(commit.date)
      }));
    } catch (error) {
      logger.error('特定日時以降のコミット取得に失敗', error);
      return [];
    }
  }
}

module.exports = new GitHelper();