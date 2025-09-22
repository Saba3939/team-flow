const git = require('./git');
const GitHubService = require('../services/github');
const chalk = require('chalk');
const logger = require('./logger');
// GitHubServiceのインスタンス作成
const githubService = new GitHubService();

/**
 * 現在の作業状況を分析するユーティリティ
 */
class WorkStatus {
  constructor() {
    this.status = {};
  }

  /**
   * 完全な作業状況を分析
   */
  async analyze() {
    try {
      this.status = {
        git: await this.analyzeGitStatus(),
        time: await this.analyzeWorkTime(),
        issue: await this.analyzeIssueStatus(),
        recommendations: []
      };

      this.generateRecommendations();
      return this.status;
    } catch (error) {
      logger.error('作業状況分析でエラーが発生しました:', error);
      throw error;
    }
  }

  /**
   * Git状況を分析
   */
  async analyzeGitStatus() {
    const currentBranch = await git.getCurrentBranch();
    const isClean = await git.isWorkingDirectoryClean();
    const uncommittedChanges = await git.getUncommittedChanges();
    const commitsSinceLastPush = await git.getCommitsSinceLastPush();
    const remoteSyncStatus = await this.checkRemoteSyncStatus();

    return {
      currentBranch,
      isClean,
      uncommittedChanges: uncommittedChanges.length,
      uncommittedFiles: uncommittedChanges,
      commitsSinceLastPush: commitsSinceLastPush.length,
      unpushedCommits: commitsSinceLastPush,
      remoteSyncStatus
    };
  }

  /**
   * リモート同期状況をチェック
   */
  async checkRemoteSyncStatus() {
    try {
      const currentBranch = await git.getCurrentBranch();
      const hasRemote = await git.hasRemoteBranch(currentBranch);

      if (!hasRemote) {
        return { status: 'no_remote', message: 'リモートブランチなし' };
      }

      const aheadBehind = await git.getAheadBehind(currentBranch);

      if (aheadBehind.behind > 0 && aheadBehind.ahead > 0) {
        return {
          status: 'diverged',
          message: `${aheadBehind.ahead}コミット進行、${aheadBehind.behind}コミット遅れ`,
          ahead: aheadBehind.ahead,
          behind: aheadBehind.behind
        };
      } else if (aheadBehind.behind > 0) {
        return {
          status: 'behind',
          message: `${aheadBehind.behind}コミット遅れ`,
          behind: aheadBehind.behind
        };
      } else if (aheadBehind.ahead > 0) {
        return {
          status: 'ahead',
          message: `${aheadBehind.ahead}コミット進行`,
          ahead: aheadBehind.ahead
        };
      } else {
        return { status: 'up_to_date', message: '最新' };
      }
    } catch (error) {
      return { status: 'unknown', message: '確認できませんでした' };
    }
  }

  /**
   * 作業時間を分析
   */
  async analyzeWorkTime() {
    try {
      const currentBranch = await git.getCurrentBranch();
      const branchCreationTime = await git.getBranchCreationTime(currentBranch);
      const lastCommitTime = await git.getLastCommitTime();

      const now = new Date();
      const workingHours = branchCreationTime ?
        Math.floor((now - branchCreationTime) / (1000 * 60 * 60)) : 0;
      const hoursSinceLastCommit = lastCommitTime ?
        Math.floor((now - lastCommitTime) / (1000 * 60 * 60)) : 0;

      return {
        branchCreationTime,
        lastCommitTime,
        workingHours,
        hoursSinceLastCommit,
        isLongRunning: workingHours > 8,
        isStale: hoursSinceLastCommit > 24
      };
    } catch (error) {
      return {
        workingHours: 0,
        hoursSinceLastCommit: 0,
        isLongRunning: false,
        isStale: false
      };
    }
  }

  /**
   * Issue状況を分析
   */
  async analyzeIssueStatus() {
    try {
      const currentBranch = await git.getCurrentBranch();
      const issueNumber = this.extractIssueNumber(currentBranch);

      if (!issueNumber || !await githubService.isConfigured()) {
        return { hasIssue: false };
      }

      const issue = await githubService.getIssue(issueNumber);
      if (!issue) {
        return { hasIssue: false };
      }

      return {
        hasIssue: true,
        issueNumber,
        title: issue.title,
        state: issue.state,
        updatedAt: new Date(issue.updated_at),
        labels: issue.labels || [],
        assignees: issue.assignees || []
      };
    } catch (error) {
      return { hasIssue: false };
    }
  }

  /**
   * ブランチ名からIssue番号を抽出
   */
  extractIssueNumber(branchName) {
    const match = branchName.match(/issue-(\d+)-/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * 推奨アクションを生成
   */
  generateRecommendations() {
    const recommendations = [];

    // Git関連の推奨
    if (!this.status.git.isClean) {
      recommendations.push({
        type: 'commit',
        priority: 'high',
        icon: '💾',
        title: '未コミット変更をコミット',
        description: `${this.status.git.uncommittedChanges}個のファイルに変更があります`,
        action: 'commit'
      });
    }

    if (this.status.git.remoteSyncStatus.status === 'behind') {
      recommendations.push({
        type: 'pull',
        priority: 'high',
        icon: '🔄',
        title: 'リモートから最新を取得',
        description: this.status.git.remoteSyncStatus.message,
        action: 'pull'
      });
    }

    if (this.status.git.commitsSinceLastPush > 0) {
      recommendations.push({
        type: 'push',
        priority: 'medium',
        icon: '🚀',
        title: '変更をリモートにプッシュ',
        description: `${this.status.git.commitsSinceLastPush}個のコミットが未プッシュです`,
        action: 'push'
      });
    }

    if (this.status.git.remoteSyncStatus.status === 'diverged') {
      recommendations.push({
        type: 'sync',
        priority: 'high',
        icon: '⚠️',
        title: 'ブランチの競合を解決',
        description: 'リモートとローカルが分岐しています',
        action: 'sync'
      });
    }

    // 時間関連の推奨
    if (this.status.time.isStale) {
      recommendations.push({
        type: 'status_update',
        priority: 'low',
        icon: '📝',
        title: '進捗状況を更新',
        description: '24時間以上コミットがありません',
        action: 'update_status'
      });
    }

    if (this.status.time.isLongRunning) {
      recommendations.push({
        type: 'test',
        priority: 'medium',
        icon: '🧪',
        title: 'テストを実行',
        description: '長時間の作業です。テストを確認してください',
        action: 'test'
      });
    }

    // Issue関連の推奨
    if (this.status.issue.hasIssue && this.status.git.commitsSinceLastPush > 0) {
      recommendations.push({
        type: 'issue_update',
        priority: 'low',
        icon: '📋',
        title: 'Issue進捗を更新',
        description: `Issue #${this.status.issue.issueNumber} の進捗を更新`,
        action: 'update_issue'
      });
    }

    // 優先度順にソート
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    this.status.recommendations = recommendations;
  }

  /**
   * 状況を分かりやすく表示
   */
  displayStatus() {
    const { git, time, issue, recommendations } = this.status;

    console.log(chalk.bold.blue('\n📊 現在の作業状況\n'));

    // Git状況
    console.log(chalk.bold('🔧 Git状況:'));
    console.log(`  ブランチ: ${chalk.cyan(git.currentBranch)}`);
    console.log(`  作業ディレクトリ: ${git.isClean ? chalk.green('クリーン') : chalk.yellow('変更あり')}`);
    if (!git.isClean) {
      console.log(`  未コミット変更: ${chalk.yellow(git.uncommittedChanges)}ファイル`);
    }
    if (git.commitsSinceLastPush > 0) {
      console.log(`  未プッシュコミット: ${chalk.yellow(git.commitsSinceLastPush)}個`);
    }
    console.log(`  リモート同期: ${this.formatSyncStatus(git.remoteSyncStatus)}`);

    // 時間情報
    if (time.workingHours > 0) {
      console.log(chalk.bold('\n⏰ 作業時間:'));
      console.log(`  作業時間: ${chalk.cyan(time.workingHours)}時間`);
      if (time.hoursSinceLastCommit > 0) {
        console.log(`  最終コミット: ${chalk.gray(time.hoursSinceLastCommit)}時間前`);
      }
    }

    // Issue情報
    if (issue.hasIssue) {
      console.log(chalk.bold('\n📋 Issue情報:'));
      console.log(`  Issue #${issue.issueNumber}: ${chalk.cyan(issue.title)}`);
      console.log(`  状態: ${issue.state === 'open' ? chalk.green('オープン') : chalk.gray('クローズ')}`);
    }

    // 推奨アクション
    if (recommendations.length > 0) {
      console.log(chalk.bold('\n💡 推奨アクション:'));
      recommendations.forEach((rec, index) => {
        const priorityColor = rec.priority === 'high' ? chalk.red :
          rec.priority === 'medium' ? chalk.yellow : chalk.gray;
        console.log(`  ${index + 1}. ${rec.icon} ${chalk.bold(rec.title)}`);
        console.log(`     ${chalk.gray(rec.description)} ${priorityColor(`[${rec.priority}]`)}`);
      });
    } else {
      console.log(chalk.bold.green('\n✅ すべて最新の状態です！'));
    }
  }

  /**
   * 同期状況をフォーマット
   */
  formatSyncStatus(syncStatus) {
    switch (syncStatus.status) {
    case 'up_to_date':
      return chalk.green('最新');
    case 'ahead':
      return chalk.blue(syncStatus.message);
    case 'behind':
      return chalk.yellow(syncStatus.message);
    case 'diverged':
      return chalk.red(syncStatus.message);
    case 'no_remote':
      return chalk.gray('リモートなし');
    default:
      return chalk.gray('不明');
    }
  }
}

module.exports = WorkStatus;