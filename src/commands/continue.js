const chalk = require('chalk');
const ora = require('ora');
const { select, confirm, input } = require('@inquirer/prompts');
const git = require('../utils/git');
const GitHubService = require('../services/github');
const NotificationService = require('../services/notifications');
const WorkStatus = require('../utils/workStatus');
const logger = require('../utils/logger');
// GitHubServiceのインスタンス作成
const githubService = new GitHubService();
const notificationService = new NotificationService();

/**
 * 進行中の作業を継続するコマンド
 */
async function continueCommand() {
  try {
    logger.info('作業継続を開始します');

    // 1. 現在の作業状況を分析
    const spinner = ora('作業状況を分析中...').start();
    const workStatus = new WorkStatus();
    const status = await workStatus.analyze();
    spinner.stop();

    // 2. 状況を表示
    workStatus.displayStatus();

    // 3. 推奨アクションがある場合は実行確認
    if (status.recommendations.length > 0) {
      await handleRecommendations(status.recommendations);
    } else {
      console.log(chalk.green('\n✨ 現在の状況は良好です！作業を続けてください。\n'));
      displayContinueOptions();
    }

    // 4. 次回継続時のヒント表示
    displayHints();

  } catch (error) {
    logger.error('continueコマンドでエラーが発生しました:', error);
    console.log(chalk.red('❌ エラーが発生しました: ' + error.message));
  }
}

/**
 * 推奨アクションを処理
 */
async function handleRecommendations(recommendations) {
  console.log(chalk.bold('\n🎯 推奨アクションを実行しますか？\n'));

  // 高優先度のアクションを最初に処理
  const highPriorityActions = recommendations.filter(rec => rec.priority === 'high');

  if (highPriorityActions.length > 0) {
    console.log(chalk.red.bold('⚠️  高優先度のアクションがあります:'));
    for (const action of highPriorityActions) {
      const shouldExecute = await confirm({
        message: `${action.icon} ${action.title} - ${action.description}`,
        default: true
      });

      if (shouldExecute) {
        const result = await executeAction(action);
        // スキップが要求された場合はメインメニューに戻る
        if (result && result.skipRemaining) {
          console.log(chalk.yellow('\n📋 メインメニューに戻ります'));
          displayContinueOptions();
          return;
        }
      }
    }
  }

  // その他のアクションを選択式で処理
  const otherActions = recommendations.filter(rec => rec.priority !== 'high');
  if (otherActions.length > 0) {
    const actionChoices = otherActions.map(action => ({
      name: `${action.icon} ${action.title} - ${action.description}`,
      value: action
    }));
    actionChoices.push({ name: '⏭️  作業を続ける', value: 'continue' });

    const selectedAction = await select({
      message: '実行するアクションを選択してください:',
      choices: actionChoices
    });

    if (selectedAction !== 'continue') {
      const result = await executeAction(selectedAction);
      
      // スキップが要求された場合はメインメニューに戻る
      if (result && result.skipRemaining) {
        console.log(chalk.yellow('\n📋 メインメニューに戻ります'));
        displayContinueOptions();
        return;
      }

      // 実行後、他のアクションも確認
      const hasMoreActions = await confirm({
        message: '他のアクションも実行しますか？',
        default: false
      });

      if (hasMoreActions) {
        const remainingActions = otherActions.filter(a => a !== selectedAction);
        if (remainingActions.length > 0) {
          await handleRecommendations(remainingActions);
        }
      }
    }
  }
}

/**
 * アクションを実行
 */
async function executeAction(action) {
  let spinner;
  
  // コミットアクション以外はスピナーを使用
  if (action.action !== 'commit') {
    spinner = ora(`${action.title}を実行中...`).start();
  }

  try {
    let result;
    switch (action.action) {
    case 'commit':
      // コミットアクションは独自の進捗表示を行う
      result = await executeCommitAction();
      break;
    case 'pull':
      result = await executePullAction();
      break;
    case 'push':
      result = await executePushAction();
      break;
    case 'sync':
      result = await executeSyncAction();
      break;
    case 'test':
      result = await executeTestAction();
      break;
    case 'update_issue':
      result = await executeUpdateIssueAction();
      break;
    case 'update_status':
      result = await executeUpdateStatusAction();
      break;
    default:
      throw new Error(`未対応のアクション: ${action.action}`);
    }

    if (spinner) {
      spinner.stop();
    }
    
    // スキップが要求された場合は早期リターン
    if (result && result.skipRemaining) {
      return result;
    }
    
    // コミットアクション以外のみメッセージを表示（コミットは独自メッセージあり）
    if (action.action !== 'commit') {
      console.log(chalk.green(`✅ ${action.title}が完了しました`));
    }
    return { success: true };
  } catch (error) {
    if (spinner) {
      spinner.stop();
    }
    console.log(chalk.red(`❌ ${action.title}でエラーが発生しました: ${error.message}`));
    logger.error(`アクション実行エラー [${action.action}]:`, error);
    return { success: false };
  }
}

/**
 * コミットアクションを実行
 */
async function executeCommitAction() {
  try {
    const changes = await git.getUncommittedChanges();

    console.log(chalk.blue('\n📝 変更ファイル:'));
    changes.forEach(file => {
      console.log(`  ${file.status === 'M' ? '📝' : '➕'} ${file.path}`);
    });

    const shouldStageAll = await confirm({
      message: 'すべての変更をステージしますか？',
      default: true
    });

    if (shouldStageAll) {
      console.log(chalk.gray('ステージング中...'));
      const stageResult = await git.stageAllChanges();
      
      if (!stageResult) {
        throw new Error('ステージングに失敗しました');
      }
      
      // Conventional Commitsプレフィックスの選択
      const prefix = await select({
        message: 'コミットの種類を選択してください:',
        choices: [
          { 
            name: '🆕 feat: 新機能 (A new feature)', 
            value: 'feat' 
          },
          { 
            name: '🐛 fix: バグ修正 (A bug fix)', 
            value: 'fix' 
          },
          { 
            name: '📝 docs: ドキュメント (Documentation only changes)', 
            value: 'docs' 
          },
          { 
            name: '🎨 style: スタイル変更 (Code style changes)', 
            value: 'style' 
          },
          { 
            name: '♻️ refactor: リファクタリング (Code refactoring)', 
            value: 'refactor' 
          },
          { 
            name: '⚡ perf: パフォーマンス改善 (Performance improvement)', 
            value: 'perf' 
          },
          { 
            name: '🧪 test: テスト (Adding or correcting tests)', 
            value: 'test' 
          },
          { 
            name: '🔧 chore: その他 (Build process, tools, etc)', 
            value: 'chore' 
          }
        ]
      });
      
      // コミットメッセージの入力
      const message = await input({
        message: `コミットメッセージを入力してください (${prefix}:):`,
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return 'コミットメッセージは必須です';
          }
          if (input.trim().length < 3) {
            return 'コミットメッセージは3文字以上で入力してください';
          }
          return true;
        }
      });
      
      const fullCommitMessage = `${prefix}: ${message.trim()}`;
      
      console.log(chalk.gray(`コミット中: "${fullCommitMessage}"`));
      const commitResult = await git.commit(fullCommitMessage);
      
      if (!commitResult) {
        throw new Error('コミットに失敗しました');
      }
      
      console.log(chalk.green('✅ コミットが完了しました'));
      return { success: true };
    } else {
      // 個別ファイル選択は今回は省略し、手動での git add を推奨
      console.log(chalk.yellow('個別ファイル選択は手動で `git add <ファイル名>` を実行してください'));
      console.log(chalk.yellow('ステージング後、再度 `team-flow continue` を実行してください'));
      return { success: false, skipRemaining: true };
    }
  } catch (error) {
    console.log(chalk.red(`❌ コミット処理でエラーが発生しました: ${error.message}`));
    return { success: false, skipRemaining: true };
  }
}

/**
 * プルアクションを実行
 */
async function executePullAction() {
  const currentBranch = await git.getCurrentBranch();

  // プル前の確認
  const isClean = await git.isWorkingDirectoryClean();
  if (!isClean) {
    const shouldStash = await confirm({
      message: '未コミットの変更があります。一時的に退避（stash）しますか？',
      default: true
    });

    if (shouldStash) {
      await git.stash();
    } else {
      throw new Error('未コミットの変更があるため、プルできません');
    }
  }

  await git.pull(currentBranch);

  // stashがある場合は復元確認
  const hasStash = await git.hasStash();
  if (hasStash) {
    const shouldApplyStash = await confirm({
      message: '退避した変更を復元しますか？',
      default: true
    });

    if (shouldApplyStash) {
      await git.stashPop();
    }
  }
  
  return { success: true };
}

/**
 * プッシュアクションを実行
 */
async function executePushAction() {
  const currentBranch = await git.getCurrentBranch();
  const hasRemote = await git.hasRemoteBranch(currentBranch);

  if (!hasRemote) {
    const shouldSetUpstream = await confirm({
      message: 'リモートブランチが存在しません。新しく作成しますか？',
      default: true
    });

    if (shouldSetUpstream) {
      await git.pushSetUpstream(currentBranch);
    } else {
      throw new Error('リモートブランチが設定されていません');
    }
  } else {
    await git.push();
  }
  
  return { success: true };
}

/**
 * 同期アクションを実行（競合解決）
 */
async function executeSyncAction() {
  console.log(chalk.yellow('\n⚠️  ブランチの競合解決が必要です。'));
  console.log('このプロセスは慎重に行う必要があります。');

  const syncMethod = await select({
    message: '同期方法を選択してください:',
    choices: [
      { name: '🔄 Rebase（推奨）- 履歴をきれいに保つ', value: 'rebase' },
      { name: '🔀 Merge - 安全だが履歴が複雑', value: 'merge' },
      { name: '❌ キャンセル', value: 'cancel' }
    ]
  });

  if (syncMethod === 'cancel') {
    throw new Error('同期をキャンセルしました');
  }

  if (syncMethod === 'rebase') {
    await git.rebase();
  } else {
    await git.mergeFromOrigin();
  }
  
  return { success: true };
}

/**
 * テストアクションを実行
 */
async function executeTestAction() {
  // package.jsonからテストスクリプトを確認
  const hasTestScript = await git.hasNpmScript('test');

  if (hasTestScript) {
    await git.runNpmScript('test');
  } else {
    console.log(chalk.yellow('⚠️  テストスクリプトが見つかりません'));
    console.log('package.jsonにtestスクリプトを追加するか、手動でテストを実行してください');
  }
  
  return { success: true };
}

/**
 * Issue更新アクションを実行
 */
async function executeUpdateIssueAction() {
  if (!await githubService.isConfigured()) {
    console.log(chalk.yellow('⚠️  GitHub設定が見つかりません'));
    return { success: true };
  }

  const currentBranch = await git.getCurrentBranch();
  const issueNumber = extractIssueNumber(currentBranch);

  if (!issueNumber) {
    console.log(chalk.yellow('⚠️  ブランチからIssue番号を特定できません'));
    return { success: true };
  }

  const commits = await git.getCommitsSinceLastPush();
  const progressUpdate = `進捗更新: ${commits.length}個の新しいコミットを追加しました\n\n` +
                        commits.map(commit => `- ${commit.message}`).join('\n');

  await githubService.addIssueComment(issueNumber, progressUpdate);
  console.log(chalk.blue(`📋 Issue #${issueNumber} に進捗を更新しました`));
  
  return { success: true };
}

/**
 * ステータス更新アクションを実行
 */
async function executeUpdateStatusAction() {
  // チーム通知があれば送信
  if (await notificationService.isConfigured()) {
    const currentBranch = await git.getCurrentBranch();
    const workStatus = new WorkStatus();
    const status = await workStatus.analyze();

    const message = `📊 作業状況更新\n` +
                   `ブランチ: ${currentBranch}\n` +
                   `作業時間: ${status.time.workingHours}時間\n` +
                   `最新コミット: ${status.time.hoursSinceLastCommit}時間前`;

    await notificationService.send(message);
    console.log(chalk.blue('📢 チームに状況を通知しました'));
  } else {
    console.log(chalk.blue('📊 作業状況を記録しました'));
  }
  
  return { success: true };
}

/**
 * 作業継続オプションを表示
 */
function displayContinueOptions() {
  console.log(chalk.bold('💡 作業継続のヒント:'));
  console.log(chalk.cyan('  • コードを編集して変更を加える'));
  console.log(chalk.cyan('  • 定期的に小さなコミットを作成する'));
  console.log(chalk.cyan('  • team-flow finish で作業完了する'));
  console.log(chalk.cyan('  • team-flow team でチーム状況を確認する'));
}

/**
 * 次回継続時のヒントを表示
 */
function displayHints() {
  console.log(chalk.bold.gray('\n💡 次回のヒント:'));
  console.log(chalk.gray('  • 作業区切りで team-flow continue を実行'));
  console.log(chalk.gray('  • 長時間作業時は定期的な同期を推奨'));
  console.log(chalk.gray('  • 重要な変更前にはブランチの状況を確認'));
}

/**
 * ブランチ名からIssue番号を抽出
 */
function extractIssueNumber(branchName) {
  const match = branchName.match(/issue-(\d+)-/);
  return match ? parseInt(match[1]) : null;
}

module.exports = continueCommand;