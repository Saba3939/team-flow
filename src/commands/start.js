const chalk = require('chalk');
const ora = require('ora');
const { select, input, confirm } = require('@inquirer/prompts');
const git = require('../utils/git');
const GitHubService = require('../services/github');
const NotificationService = require('../services/notifications');
const logger = require('../utils/logger');
// GitHubServiceのインスタンス作成
const githubService = new GitHubService();
const notificationService = new NotificationService();

/**
 * 新しい作業を開始するコマンド
 */
async function startCommand() {
  try {
    logger.info('新しい作業を開始します');

    // 1. Git状態の確認
    const spinner = ora('Git状態を確認中...').start();
    const isClean = await git.isWorkingDirectoryClean();
    spinner.stop();

    if (!isClean) {
      console.log(chalk.yellow('⚠️  未コミットの変更があります'));
      const shouldContinue = await confirm({
        message: '未コミットの変更がありますが、続行しますか？',
        default: false
      });

      if (!shouldContinue) {
        console.log(chalk.blue('ℹ️  作業をコミットしてから再度実行してください'));
        return;
      }
    }

    // 2. 作業種別の選択
    const workType = await selectWorkType();

    // 3. Issue選択/作成
    const issueInfo = await handleIssueSelection();

    // 4. ブランチ名の決定
    const branchName = generateBranchName(workType, issueInfo);

    // 5. 競合チェック
    await checkConflicts(branchName, issueInfo);

    // 6. ブランチ作成・切り替え
    await createAndSwitchBranch(branchName);

    // 7. 通知送信（任意）
    await sendNotification(workType, branchName, issueInfo);

    // 8. 次のステップ案内
    displayNextSteps(branchName);

  } catch (error) {
    logger.error('startコマンドでエラーが発生しました:', error);
    console.log(chalk.red('❌ エラーが発生しました: ' + error.message));
  }
}

/**
 * 作業種別を選択
 */
async function selectWorkType() {
  return await select({
    message: '作業種別を選択してください:',
    choices: [
      { name: '🆕 機能開発', value: 'feature' },
      { name: '🐛 バグ修正', value: 'bugfix' },
      { name: '📚 ドキュメント更新', value: 'docs' },
      { name: '♻️  リファクタリング', value: 'refactor' },
      { name: '🔥 ホットフィックス', value: 'hotfix' }
    ]
  });
}

/**
 * Issue選択/作成を処理
 */
async function handleIssueSelection() {
  const hasGitHub = await githubService.isConfigured();

  if (!hasGitHub) {
    console.log(chalk.yellow('⚠️  GitHub設定が見つかりません'));
    const issueNumber = await input({
      message: 'Issue番号を入力してください（任意）:'
    });
    const title = await input({
      message: '作業内容を入力してください:',
      validate: (input) => input.length > 0 || '作業内容は必須です'
    });

    return {
      number: issueNumber || null,
      title: title
    };
  }

  const action = await select({
    message: 'Issueの操作を選択してください:',
    choices: [
      { name: '既存のIssueから選択', value: 'select' },
      { name: '新しいIssueを作成', value: 'create' },
      { name: 'Issueなしで作業開始', value: 'none' }
    ]
  });

  switch (action) {
  case 'select':
    return await selectExistingIssue();
  case 'create':
    return await createNewIssue();
  case 'none': {
    const title = await input({
      message: '作業内容を入力してください:',
      validate: (input) => input.length > 0 || '作業内容は必須です'
    });
    return { number: null, title };
  }
  default:
    throw new Error('無効な選択です');
  }
}

/**
 * 既存のIssueから選択
 */
async function selectExistingIssue() {
  const spinner = ora('Issueを取得中...').start();
  
  try {
    const issues = await githubService.getOpenIssues();
    spinner.stop();

    if (issues.length === 0) {
      console.log(chalk.yellow('⚠️  オープンなIssueがありません'));
      return await createNewIssue();
    }

    const choices = issues.map(issue => ({
      name: `#${issue.number} ${issue.title}`,
      value: issue
    }));
    choices.push({ name: '新しいIssueを作成', value: 'create' });

    const selected = await select({
      message: 'Issueを選択してください:',
      choices
    });

    if (selected === 'create') {
      return await createNewIssue();
    }

    return selected;
  } catch (error) {
    spinner.stop();
    
    // 権限エラーの場合
    if (error.message.includes('GitHub Personal Access Token') || 
        error.message.includes('Resource not accessible')) {
      console.log(chalk.red('❌ Issue取得でエラーが発生しました: GitHub APIの権限が不足しています'));
      console.log(chalk.yellow('💡 新しいIssueを作成するか、Issueなしで作業を開始できます'));
      
      const action = await select({
        message: '次のアクションを選択してください:',
        choices: [
          { name: '新しいIssueを作成', value: 'create' },
          { name: 'Issueなしで作業開始', value: 'none' }
        ]
      });
      
      if (action === 'create') {
        return await createNewIssue();
      } else {
        const title = await input({
          message: '作業内容を入力してください:',
          validate: (input) => input.length > 0 || '作業内容は必須です'
        });
        return { number: null, title };
      }
    }
    
    // その他のエラー
    throw error;
  }
}

/**
 * 新しいIssueを作成
 */
async function createNewIssue() {
  const title = await input({
    message: 'Issue タイトル:',
    validate: (input) => input.length > 0 || 'タイトルは必須です'
  });

  const body = await input({
    message: 'Issue 内容（任意）:'
  });

  const spinner = ora('Issueを作成中...').start();
  
  try {
    const issue = await githubService.createIssue(title, body);
    spinner.stop();
    console.log(chalk.green(`✅ Issue #${issue.number} を作成しました`));
    return issue;
  } catch (error) {
    spinner.stop();
    
    // 権限エラーの場合、Issueなしでの作業継続を提案
    if (error.message.includes('GitHub Personal Access Token')) {
      console.log(chalk.red('❌ ' + error.message));
      console.log(chalk.yellow('\n💡 Issueなしで作業を続行することもできます'));
      
      const shouldContinue = await confirm({
        message: 'Issueなしで作業を開始しますか？',
        default: true
      });
      
      if (shouldContinue) {
        return { number: null, title };
      } else {
        throw new Error('Issue作成が必要ですが、権限が不足しています');
      }
    }
    
    // その他のエラーはそのまま投げる
    throw error;
  }
}

/**
 * ブランチ名を生成
 */
function generateBranchName(workType, issueInfo) {
  const issuePrefix = issueInfo.number ? `issue-${issueInfo.number}-` : '';
  const titleSlug = issueInfo.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 30);

  return `${workType}/${issuePrefix}${titleSlug}`;
}

/**
 * 競合をチェック
 */
async function checkConflicts(branchName, issueInfo) {
  const spinner = ora('競合をチェック中...').start();

  // ローカルブランチの重複確認
  const localBranches = await git.getLocalBranches();
  if (localBranches.includes(branchName)) {
    spinner.stop();
    console.log(chalk.yellow(`⚠️  ブランチ "${branchName}" は既に存在します`));

    const shouldContinue = await confirm({
      message: '既存のブランチに切り替えますか？',
      default: true
    });

    if (shouldContinue) {
      await git.switchBranch(branchName);
      console.log(chalk.green(`✅ ブランチ "${branchName}" に切り替えました`));
      throw new Error('BRANCH_EXISTS'); // 特別なエラーで処理を中断
    }

    throw new Error('ブランチ名が重複しています');
  }

  // GitHub上での同一Issue番号の作業確認
  if (issueInfo.number && await githubService.isConfigured()) {
    const remoteBranches = await git.getRemoteBranches();
    const conflictBranches = remoteBranches.filter(branch =>
      branch.includes(`issue-${issueInfo.number}-`)
    );

    if (conflictBranches.length > 0) {
      spinner.stop();
      console.log(chalk.yellow(`⚠️  Issue #${issueInfo.number} で既に作業中のブランチがあります:`));
      conflictBranches.forEach(branch => {
        console.log(chalk.gray(`   - ${branch}`));
      });

      const shouldContinue = await confirm({
        message: '続行しますか？',
        default: false
      });

      if (!shouldContinue) {
        throw new Error('同一Issueでの作業が既に存在します');
      }
    }
  }

  spinner.stop();
}

/**
 * ブランチを作成して切り替え
 */
async function createAndSwitchBranch(branchName) {
  const spinner = ora(`ブランチ "${branchName}" を作成中...`).start();

  // ベースブランチの確認
  const currentBranch = await git.getCurrentBranch();
  if (currentBranch !== 'main' && currentBranch !== 'master') {
    spinner.stop();
    console.log(chalk.yellow(`⚠️  現在のブランチ: ${currentBranch}`));

    const shouldSwitch = await confirm({
      message: 'main/masterブランチから新しいブランチを作成しますか？',
      default: true
    });

    if (shouldSwitch) {
      const baseBranch = await git.hasLocalBranch('main') ? 'main' : 'master';
      await git.switchBranch(baseBranch);
      console.log(chalk.blue(`ℹ️  ${baseBranch}ブランチに切り替えました`));
    }
  }

  await git.createAndSwitchBranch(branchName);
  spinner.stop();

  console.log(chalk.green(`✅ ブランチ "${branchName}" を作成し、切り替えました`));
}

/**
 * 通知を送信
 */
async function sendNotification(workType, branchName, issueInfo) {
  if (!await notificationService.isConfigured()) {
    return;
  }

  const workTypeNames = {
    feature: '機能開発',
    bugfix: 'バグ修正',
    docs: 'ドキュメント更新',
    refactor: 'リファクタリング',
    hotfix: 'ホットフィックス'
  };

  const message = '🚀 新しい作業を開始しました\n' +
                 `種別: ${workTypeNames[workType]}\n` +
                 `ブランチ: ${branchName}\n` +
                 `作業内容: ${issueInfo.title}` +
                 (issueInfo.number ? `\nIssue: #${issueInfo.number}` : '');

  try {
    await notificationService.send(message);
    console.log(chalk.blue('📢 チームに通知を送信しました'));
  } catch (error) {
    console.log(chalk.yellow('⚠️  通知の送信に失敗しました: ' + error.message));
  }
}

/**
 * 次のステップを案内
 */
function displayNextSteps(branchName) {
  console.log(chalk.bold.green('\n✨ 作業を開始しました！\n'));
  console.log('次のステップ:');
  console.log(chalk.cyan('  1. コードを編集'));
  console.log(chalk.cyan('  2. 変更をコミット'));
  console.log(chalk.cyan('  3. team-flow continue で進捗確認'));
  console.log(chalk.cyan('  4. team-flow finish で作業完了\n'));
  console.log(chalk.gray(`現在のブランチ: ${branchName}`));
}

module.exports = startCommand;