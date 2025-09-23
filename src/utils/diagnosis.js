// 状況診断機能
const chalk = require('chalk');
const simpleGit = require('simple-git');
const fs = require('fs-extra');
const path = require('path');

const git = simpleGit();

/**
 * 現在の状況を総合的に分析
 */
async function analyzeSituation() {
  const diagnosis = {
    timestamp: new Date().toISOString(),
    gitStatus: null,
    currentBranch: null,
    hasUncommittedChanges: false,
    hasUnpushedCommits: false,
    conflicts: [],
    issues: [],
    warnings: [],
    suggestions: []
  };

  try {
    // Git状態の基本情報取得
    const status = await git.status();
    diagnosis.gitStatus = status;
    diagnosis.currentBranch = status.current;
    diagnosis.hasUncommittedChanges = status.files.length > 0;

    // 未プッシュコミットの確認
    try {
      const ahead = await git.raw(['rev-list', '--count', 'HEAD..origin/' + status.current]);
      diagnosis.hasUnpushedCommits = parseInt(ahead.trim()) > 0;
    } catch (error) {
      // リモートブランチが存在しない場合は無視
    }

    // コンフリクトファイルの検出
    diagnosis.conflicts = status.conflicted || [];

    // 各種問題の検出
    await detectIssues(diagnosis);

    // 警告の生成
    generateWarnings(diagnosis);

    // 提案の生成
    generateSuggestions(diagnosis);

  } catch (error) {
    diagnosis.issues.push({
      type: 'critical',
      message: 'Git状態の取得に失敗しました',
      detail: error.message
    });
  }

  return diagnosis;
}

/**
 * 問題の検出
 */
async function detectIssues(diagnosis) {
  const status = diagnosis.gitStatus;

  // リポジトリの基本チェック
  if (!await isGitRepository()) {
    diagnosis.issues.push({
      type: 'critical',
      message: 'Gitリポジトリではありません',
      detail: '現在のディレクトリはGitで管理されていません'
    });
    return;
  }

  // マージコンフリクトの検出
  if (diagnosis.conflicts.length > 0) {
    diagnosis.issues.push({
      type: 'high',
      message: 'マージコンフリクトが発生しています',
      detail: `${diagnosis.conflicts.length}個のファイルでコンフリクトが検出されました`
    });
  }

  // 大量の未追跡ファイル
  const untrackedFiles = status.not_added || [];
  if (untrackedFiles.length > 10) {
    diagnosis.issues.push({
      type: 'medium',
      message: '大量の未追跡ファイルがあります',
      detail: `${untrackedFiles.length}個の未追跡ファイルが検出されました`
    });
  }

  // デタッチHEAD状態
  if (!diagnosis.currentBranch) {
    diagnosis.issues.push({
      type: 'medium',
      message: 'デタッチHEAD状態です',
      detail: 'ブランチではなく特定のコミットにいます'
    });
  }

  // リモート接続の確認
  try {
    await git.listRemote(['--heads']);
  } catch (error) {
    diagnosis.issues.push({
      type: 'medium',
      message: 'リモートリポジトリに接続できません',
      detail: 'ネットワーク接続または認証に問題がある可能性があります'
    });
  }

  // ワーキングディレクトリの権限チェック
  try {
    const testFile = path.join(process.cwd(), '.team-flow-test');
    await fs.writeFile(testFile, 'test');
    await fs.remove(testFile);
  } catch (error) {
    diagnosis.issues.push({
      type: 'medium',
      message: 'ディレクトリの書き込み権限がありません',
      detail: 'ファイルの作成・編集ができない可能性があります'
    });
  }

  // Git設定の確認
  try {
    const userName = await git.raw(['config', 'user.name']);
    const userEmail = await git.raw(['config', 'user.email']);

    if (!userName.trim()) {
      diagnosis.issues.push({
        type: 'low',
        message: 'Git user.nameが設定されていません',
        detail: 'コミット時に作者情報が不明になります'
      });
    }

    if (!userEmail.trim()) {
      diagnosis.issues.push({
        type: 'low',
        message: 'Git user.emailが設定されていません',
        detail: 'コミット時にメールアドレスが不明になります'
      });
    }
  } catch (error) {
    diagnosis.issues.push({
      type: 'low',
      message: 'Git設定の確認に失敗しました',
      detail: error.message
    });
  }

  // 巨大ファイルの検出
  const modifiedFiles = [...(diagnosis.gitStatus.modified || []), ...(diagnosis.gitStatus.not_added || [])];
  for (const file of modifiedFiles) {
    try {
      const filePath = path.join(process.cwd(), file);
      const stats = await fs.stat(filePath);
      if (stats.size > 100 * 1024 * 1024) { // 100MB以上
        diagnosis.issues.push({
          type: 'medium',
          message: '巨大ファイルが検出されました',
          detail: `${file} (${Math.round(stats.size / 1024 / 1024)}MB)`
        });
      }
    } catch (error) {
      // ファイルが削除されている場合は無視
    }
  }
}

/**
 * 警告の生成
 */
function generateWarnings(diagnosis) {
  // const status = diagnosis.gitStatus; // 現在未使用

  // mainブランチでの直接作業
  if (diagnosis.currentBranch === 'main' || diagnosis.currentBranch === 'master') {
    if (diagnosis.hasUncommittedChanges) {
      diagnosis.warnings.push({
        type: 'branch_practice',
        message: 'mainブランチで直接作業しています',
        detail: '機能ブランチを作成することを推奨します'
      });
    }
  }

  // 長時間未コミットの変更
  if (diagnosis.hasUncommittedChanges) {
    const status = diagnosis.gitStatus;
    const modifiedCount = (status.modified || []).length;
    const addedCount = (status.not_added || []).length;
    const totalChanges = modifiedCount + addedCount;

    if (totalChanges > 20) {
      diagnosis.warnings.push({
        type: 'commit_practice',
        message: '大量の未コミット変更があります',
        detail: '小さな単位でコミットすることを推奨します'
      });
    }
  }

  // 長時間未プッシュのコミット
  if (diagnosis.hasUnpushedCommits) {
    diagnosis.warnings.push({
      type: 'sync_practice',
      message: '未プッシュのコミットがあります',
      detail: '定期的にリモートと同期することを推奨します'
    });
  }

  // 危険な操作の履歴
  try {
    // 最近の履歴で危険なコマンドをチェック（簡略化）
    // 実際の実装では、より詳細な履歴分析が必要
  } catch (error) {
    // 履歴チェックエラーは無視
  }
}

/**
 * 提案の生成
 */
function generateSuggestions(diagnosis) {
  // const status = diagnosis.gitStatus; // 現在未使用

  // 問題に基づく提案
  if (diagnosis.conflicts.length > 0) {
    diagnosis.suggestions.push({
      type: 'immediate',
      action: 'resolve_conflicts',
      message: 'マージコンフリクトを解決してください',
      priority: 'high'
    });
  }

  if (diagnosis.hasUncommittedChanges) {
    diagnosis.suggestions.push({
      type: 'workflow',
      action: 'commit_changes',
      message: '変更をコミットしてください',
      priority: 'medium'
    });
  }

  if (diagnosis.hasUnpushedCommits) {
    diagnosis.suggestions.push({
      type: 'workflow',
      action: 'push_changes',
      message: 'リモートにプッシュしてください',
      priority: 'medium'
    });
  }

  // ベストプラクティスの提案
  if (diagnosis.currentBranch === 'main' || diagnosis.currentBranch === 'master') {
    diagnosis.suggestions.push({
      type: 'best_practice',
      action: 'create_feature_branch',
      message: '機能ブランチを作成することを推奨します',
      priority: 'low'
    });
  }

  // 設定に関する提案
  const configIssues = diagnosis.issues.filter(issue =>
    issue.message.includes('user.name') || issue.message.includes('user.email')
  );

  if (configIssues.length > 0) {
    diagnosis.suggestions.push({
      type: 'configuration',
      action: 'setup_git_config',
      message: 'Git設定を完了してください',
      priority: 'medium'
    });
  }

  // パフォーマンスに関する提案
  const largeFiles = diagnosis.issues.filter(issue =>
    issue.message.includes('巨大ファイル')
  );

  if (largeFiles.length > 0) {
    diagnosis.suggestions.push({
      type: 'performance',
      action: 'review_large_files',
      message: '巨大ファイルの管理方法を見直してください',
      priority: 'low'
    });
  }
}

/**
 * 診断結果の表示
 */
function displayDiagnosis(diagnosis) {
  console.log(chalk.bold.blue('\n📊 診断結果\n'));

  // 基本情報
  console.log(chalk.bold('📍 基本情報:'));
  console.log(`  ブランチ: ${chalk.cyan(diagnosis.currentBranch || '不明')}`);
  console.log(`  未コミット変更: ${diagnosis.hasUncommittedChanges ? chalk.red('あり') : chalk.green('なし')}`);
  console.log(`  未プッシュコミット: ${diagnosis.hasUnpushedCommits ? chalk.yellow('あり') : chalk.green('なし')}`);

  if (diagnosis.gitStatus) {
    const status = diagnosis.gitStatus;
    console.log(`  変更ファイル: ${(status.modified || []).length}個`);
    console.log(`  新規ファイル: ${(status.not_added || []).length}個`);
    console.log(`  削除ファイル: ${(status.deleted || []).length}個`);
  }

  // 問題の表示
  if (diagnosis.issues.length > 0) {
    console.log(chalk.bold('\n🚨 検出された問題:'));
    diagnosis.issues.forEach((issue, index) => {
      const icon = getIssueIcon(issue.type);
      const color = getIssueColor(issue.type);
      console.log(`  ${index + 1}. ${icon} ${color(issue.message)}`);
      if (issue.detail) {
        console.log(`     ${chalk.gray(issue.detail)}`);
      }
    });
  } else {
    console.log(chalk.bold('\n✅ 重大な問題は検出されませんでした'));
  }

  // 警告の表示
  if (diagnosis.warnings.length > 0) {
    console.log(chalk.bold('\n⚠️  警告:'));
    diagnosis.warnings.forEach((warning, index) => {
      console.log(`  ${index + 1}. ${chalk.yellow('⚠️')} ${chalk.yellow(warning.message)}`);
      if (warning.detail) {
        console.log(`     ${chalk.gray(warning.detail)}`);
      }
    });
  }

  // 提案の表示
  if (diagnosis.suggestions.length > 0) {
    console.log(chalk.bold('\n💡 推奨アクション:'));
    diagnosis.suggestions.forEach((suggestion, index) => {
      const priorityColor = suggestion.priority === 'high' ? chalk.red :
        suggestion.priority === 'medium' ? chalk.yellow : chalk.blue;
      console.log(`  ${index + 1}. ${priorityColor('●')} ${suggestion.message}`);
    });
  }

  console.log(); // 空行
}

/**
 * 問題のアイコンを取得
 */
function getIssueIcon(type) {
  switch (type) {
  case 'critical': return '🔴';
  case 'high': return '🟠';
  case 'medium': return '🟡';
  case 'low': return '🔵';
  default: return '⚪';
  }
}

/**
 * 問題の色を取得
 */
function getIssueColor(type) {
  switch (type) {
  case 'critical': return chalk.red.bold;
  case 'high': return chalk.red;
  case 'medium': return chalk.yellow;
  case 'low': return chalk.blue;
  default: return chalk.gray;
  }
}

/**
 * Gitリポジトリかどうかを確認
 */
async function isGitRepository() {
  try {
    await git.raw(['rev-parse', '--git-dir']);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 詳細な診断レポートの生成
 */
function generateDetailedReport(diagnosis) {
  const report = {
    summary: generateSummary(diagnosis),
    recommendations: generateRecommendations(diagnosis),
    nextSteps: generateNextSteps(diagnosis)
  };

  return report;
}

/**
 * サマリーの生成
 */
function generateSummary(diagnosis) {
  const criticalIssues = diagnosis.issues.filter(i => i.type === 'critical').length;
  const highIssues = diagnosis.issues.filter(i => i.type === 'high').length;
  const totalIssues = diagnosis.issues.length;

  let summary = '現在の状況: ';

  if (criticalIssues > 0) {
    summary += chalk.red(`致命的な問題 ${criticalIssues}件`);
  } else if (highIssues > 0) {
    summary += chalk.yellow(`重要な問題 ${highIssues}件`);
  } else if (totalIssues > 0) {
    summary += chalk.blue(`軽微な問題 ${totalIssues}件`);
  } else {
    summary += chalk.green('良好');
  }

  return summary;
}

/**
 * 推奨事項の生成
 */
function generateRecommendations(diagnosis) {
  const recommendations = diagnosis.suggestions
    .filter(s => s.priority === 'high' || s.priority === 'medium')
    .map(s => s.message);

  return recommendations;
}

/**
 * 次のステップの生成
 */
function generateNextSteps(diagnosis) {
  const steps = [];

  // 緊急度に基づく優先順位付け
  if (diagnosis.conflicts.length > 0) {
    steps.push('1. マージコンフリクトを解決する');
  }

  if (diagnosis.hasUncommittedChanges) {
    steps.push('2. 変更をコミットする');
  }

  if (diagnosis.hasUnpushedCommits) {
    steps.push('3. リモートにプッシュする');
  }

  if (steps.length === 0) {
    steps.push('1. 現在の状態は安定しています');
    steps.push('2. 新しい作業を開始できます');
  }

  return steps;
}

module.exports = {
  analyzeSituation,
  displayDiagnosis,
  generateDetailedReport
};