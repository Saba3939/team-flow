const chalk = require('chalk');
const ora = require('ora');
const GitHubService = require('../services/github');
const git = require('../utils/git');
const logger = require('../utils/logger');

const githubService = new GitHubService();

/**
 * アクティブブランチ一覧を取得・表示
 */
async function getActiveBranches() {
  try {
    const spinner = ora('アクティブブランチを取得中...').start();

    // リモートブランチ一覧を取得
    const branches = await git.getAllBranches();
    const activeBranches = [];

    for (const branch of branches) {
      if (branch === 'main' || branch === 'master') continue;

      try {
        // 各ブランチの最終更新情報を取得
        const lastCommit = await git.getLastCommit(branch);
        const issueNumber = extractIssueNumber(branch);

        activeBranches.push({
          name: branch,
          lastCommit: lastCommit,
          issueNumber: issueNumber,
          author: lastCommit.author || 'unknown'
        });
      } catch (error) {
        // ブランチ情報取得に失敗した場合はスキップ
        continue;
      }
    }

    spinner.stop();
    return activeBranches;
  } catch (error) {
    logger.error('アクティブブランチ取得エラー:', error);
    return [];
  }
}

/**
 * PR/レビュー状況を取得・表示
 */
async function getReviewStatus() {
  try {
    const spinner = ora('レビュー状況を取得中...').start();

    // 詳細なPR情報を取得（レビュー情報含む）
    const pullRequests = await githubService.getPullRequestsDetailed('open');

    const reviewQueue = pullRequests.map(pr => ({
      number: pr.number,
      title: pr.title,
      author: pr.user.login,
      createdAt: pr.created_at,
      reviewers: pr.requested_reviewers || [],
      reviews: pr.reviews || [],
      status: getReviewStatusFromPR(pr)
    }));

    spinner.stop();
    return reviewQueue;
  } catch (error) {
    logger.error('レビュー状況取得エラー:', error);
    return [];
  }
}

/**
 * 競合可能性をチェック
 */
async function checkPotentialConflicts(activeBranches) {
  try {
    const spinner = ora('競合可能性をチェック中...').start();

    const conflicts = [];

    for (let i = 0; i < activeBranches.length; i++) {
      for (let j = i + 1; j < activeBranches.length; j++) {
        const branch1 = activeBranches[i];
        const branch2 = activeBranches[j];

        try {
          // 2つのブランチ間で変更されたファイルを比較
          const changedFiles1 = await git.getChangedFilesByBranch(branch1.name);
          const changedFiles2 = await git.getChangedFilesByBranch(branch2.name);

          // 共通のファイルがあるかチェック
          const commonFiles = changedFiles1.filter(file =>
            changedFiles2.includes(file)
          );

          if (commonFiles.length > 0) {
            conflicts.push({
              file: commonFiles[0], // 最初の共通ファイルを表示
              branches: [branch1.name, branch2.name]
            });
          }
        } catch (error) {
          // 比較エラーは無視
          continue;
        }
      }
    }

    spinner.stop();
    return conflicts;
  } catch (error) {
    logger.error('競合チェックエラー:', error);
    return [];
  }
}

/**
 * チーム活動メトリクスを計算
 */
async function getTeamMetrics() {
  try {
    const spinner = ora('活動メトリクスを計算中...').start();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 過去7日間のGitコミット数を取得
    const commits = await git.getRecentCommitsSince(sevenDaysAgo);

    // GitHubから包括的なメトリクスを取得
    const githubMetrics = await githubService.getRepositoryMetrics(sevenDaysAgo);

    spinner.stop();

    return {
      commits: Math.max(commits.length, githubMetrics.commits), // より多い方を採用
      prsCreated: githubMetrics.prsCreated,
      prsMerged: githubMetrics.prsMerged,
      avgReviewTime: githubMetrics.avgReviewTime
    };
  } catch (error) {
    logger.error('メトリクス計算エラー:', error);
    
    // GitHub APIが使用できない場合のフォールバック
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const commits = await git.getRecentCommitsSince(sevenDaysAgo);
      
      return {
        commits: commits.length,
        prsCreated: 0,
        prsMerged: 0,
        avgReviewTime: 0
      };
    } catch (fallbackError) {
      logger.error('フォールバックメトリクス取得エラー:', fallbackError);
      return {
        commits: 0,
        prsCreated: 0,
        prsMerged: 0,
        avgReviewTime: 0
      };
    }
  }
}

/**
 * teamコマンドのメイン処理
 */
async function teamCommand() {
  try {
    console.log(chalk.blue('📊 Team Flow Status\n'));

    // 各種情報を並行取得
    const [activeBranches, reviewQueue, metrics] = await Promise.all([
      getActiveBranches(),
      getReviewStatus(),
      getTeamMetrics()
    ]);

    // 競合チェック（アクティブブランチが必要なので後で実行）
    const conflicts = await checkPotentialConflicts(activeBranches);

    // 結果を表示
    displayTeamStatus(activeBranches, reviewQueue, conflicts, metrics);

  } catch (error) {
    logger.error('teamコマンドでエラーが発生しました:', error);
    console.log(chalk.red('❌ エラーが発生しました: ' + error.message));
  }
}

/**
 * チーム状況を表示
 */
function displayTeamStatus(activeBranches, reviewQueue, conflicts, metrics) {
  // アクティブブランチ表示
  console.log(chalk.green(`🌿 Active Branches (${activeBranches.length})`));
  if (activeBranches.length === 0) {
    console.log('   なし');
  } else {
    activeBranches.slice(0, 5).forEach(branch => {
      const timeAgo = getTimeAgo(branch.lastCommit.date);
      const issueInfo = branch.issueNumber ? ` #${branch.issueNumber}` : '';
      console.log(`├─ ${branch.name} (${branch.author}, ${timeAgo})${issueInfo}`);
    });
    if (activeBranches.length > 5) {
      console.log(`└─ ...他${activeBranches.length - 5}個`);
    }
  }
  console.log();

  // レビューキュー表示
  console.log(chalk.yellow(`🔍 Review Queue (${reviewQueue.length})`));
  if (reviewQueue.length === 0) {
    console.log('   なし');
  } else {
    reviewQueue.slice(0, 5).forEach(pr => {
      console.log(`├─ PR #${pr.number}: ${pr.title} [${pr.status}]`);
    });
    if (reviewQueue.length > 5) {
      console.log(`└─ ...他${reviewQueue.length - 5}個`);
    }
  }
  console.log();

  // 競合警告表示
  console.log(chalk.red(`⚠️  Potential Conflicts (${conflicts.length})`));
  if (conflicts.length === 0) {
    console.log('   なし');
  } else {
    conflicts.slice(0, 3).forEach(conflict => {
      console.log(`└─ ${conflict.file}: ${conflict.branches.join(' ↔ ')}`);
    });
  }
  console.log();

  // メトリクス表示
  console.log(chalk.cyan('📈 Team Metrics (7日間)'));
  console.log(`├─ Commits: ${metrics.commits}`);
  console.log(`├─ PRs: ${metrics.prsCreated} created, ${metrics.prsMerged} merged`);
  console.log(`└─ Review time: 平均 ${metrics.avgReviewTime}時間`);
  console.log();
}

// ユーティリティ関数

/**
 * ブランチ名からIssue番号を抽出
 */
function extractIssueNumber(branchName) {
  const match = branchName.match(/#?(\d+)/);
  return match ? match[1] : null;
}

/**
 * PRのレビュー状況を判定
 */
function getReviewStatusFromPR(pr) {
  // レビューが完了しているかチェック
  const approvedReviews = pr.reviews?.filter(review => review.state === 'APPROVED') || [];
  const requestedChanges = pr.reviews?.filter(review => review.state === 'CHANGES_REQUESTED') || [];

  if (requestedChanges.length > 0) {
    return '変更要求';
  } else if (pr.requested_reviewers && pr.requested_reviewers.length > 0) {
    return '要レビュー';
  } else if (approvedReviews.length > 0) {
    return '承認済み';
  } else if (pr.state === 'merged') {
    return 'マージ済み';
  } else {
    return '承認待ち';
  }
}

/**
 * 時間差を人間が読める形式で表示
 */
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffDays > 0) {
    return `${diffDays}日前`;
  } else if (diffHours > 0) {
    return `${diffHours}時間前`;
  } else {
    return '1時間以内';
  }
}


module.exports = {
  execute: teamCommand,
  teamCommand
};