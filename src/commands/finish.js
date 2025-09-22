const chalk = require('chalk');
const ora = require('ora');
const { select, input, confirm, checkbox } = require('@inquirer/prompts');
const git = require('../utils/git');
const GitHubService = require('../services/github');
const NotificationService = require('../services/notifications');
const logger = require('../utils/logger');
// const commit = require('../utils/commit'); // 将来的に使用予定
const testing = require('../utils/testing');

// サービスのインスタンス作成
const githubService = new GitHubService();
const notificationService = new NotificationService();

/**
 * 作業完了のコマンド
 */
async function finishCommand() {
  try {
    logger.info('作業完了プロセスを開始します');

    // 1. 作業状況の最終確認
    await checkWorkStatus();

    // 2. 変更ファイルのレビュー
    const filesToCommit = await reviewChangedFiles();

    // 3. コミットメッセージ作成とコミット実行
    await handleCommit(filesToCommit);

    // 4. テスト実行（任意）
    await runTests();

    // 5. リモートプッシュ
    await pushToRemote();

    // 6. PR作成
    const pullRequest = await createPullRequest();

    // 7. 完了通知送信
    await sendCompletionNotification(pullRequest);

    // 8. 次のステップ案内
    displayCompletionSteps(pullRequest);

  } catch (error) {
    logger.error('finishコマンドでエラーが発生しました:', error);
    console.log(chalk.red('❌ エラーが発生しました: ' + error.message));
  }
}

/**
 * 作業状況の最終確認
 */
async function checkWorkStatus() {
  const spinner = ora('作業状況を確認中...').start();

  try {
    // 現在のブランチ確認
    const currentBranch = await git.getCurrentBranch();

    // mainブランチでの作業確認
    if (currentBranch === 'main' || currentBranch === 'master') {
      spinner.stop();
      throw new Error('main/masterブランチで直接作業することは推奨されません');
    }

    // 未コミット変更の確認
    const isClean = await git.isWorkingDirectoryClean();
    if (isClean) {
      spinner.stop();
      console.log(chalk.yellow('⚠️  コミットする変更がありません'));

      const shouldContinue = await confirm({
        message: 'PR作成のみ実行しますか？',
        default: true
      });

      if (!shouldContinue) {
        throw new Error('作業を完了するための変更がありません');
      }
    }

    spinner.stop();
    console.log(chalk.green(`✅ 現在のブランチ: ${currentBranch}`));
  } catch (error) {
    spinner.stop();
    throw error;
  }
}

/**
 * 変更ファイルのレビュー
 */
async function reviewChangedFiles() {
  const spinner = ora('変更ファイルを確認中...').start();

  try {
    const changedFiles = await git.getChangedFiles();
    spinner.stop();

    if (changedFiles.length === 0) {
      return [];
    }

    console.log(chalk.bold('\n📄 変更されたファイル:'));
    changedFiles.forEach(file => {
      const statusIcon = getStatusIcon(file.status);
      console.log(`${statusIcon} ${file.path}`);
    });

    // ファイル選択
    const choices = changedFiles.map(file => ({
      name: `${getStatusIcon(file.status)} ${file.path}`,
      value: file.path,
      checked: true
    }));

    const selectedFiles = await checkbox({
      message: 'コミットするファイルを選択してください:',
      choices
    });

    return selectedFiles;
  } catch (error) {
    spinner.stop();
    throw error;
  }
}

/**
 * ファイルステータスのアイコンを取得
 */
function getStatusIcon(status) {
  const statusIcons = {
    'M': chalk.yellow('📝'), // Modified
    'A': chalk.green('➕'),  // Added
    'D': chalk.red('➖'),    // Deleted
    'R': chalk.blue('🔄'),   // Renamed
    '??': chalk.gray('❓')   // Untracked
  };
  return statusIcons[status] || '📄';
}

/**
 * コミット処理
 */
async function handleCommit(filesToCommit) {
  if (filesToCommit.length === 0) {
    console.log(chalk.blue('ℹ️  コミットするファイルが選択されませんでした'));
    return;
  }

  // ファイルをステージング
  const spinner = ora('ファイルをステージング中...').start();
  await git.addFiles(filesToCommit);
  spinner.stop();

  // コミットメッセージ作成
  const commitMessage = await createCommitMessage();

  // 最終確認
  console.log(chalk.bold('\n📋 コミット内容の確認:'));
  console.log(chalk.gray('ファイル:'));
  filesToCommit.forEach(file => console.log(chalk.gray(`  - ${file}`)));
  console.log(chalk.gray(`メッセージ: ${commitMessage}`));

  const shouldCommit = await confirm({
    message: 'この内容でコミットしますか？',
    default: true
  });

  if (!shouldCommit) {
    throw new Error('コミットがキャンセルされました');
  }

  // コミット実行
  const commitSpinner = ora('コミット中...').start();
  await git.commit(commitMessage);
  commitSpinner.stop();

  console.log(chalk.green('✅ コミットが完了しました'));
}

/**
 * コミットメッセージを作成
 */
async function createCommitMessage() {
  // コミットタイプの選択
  const type = await select({
    message: 'コミットタイプを選択してください:',
    choices: [
      { name: 'feat: 新機能', value: 'feat' },
      { name: 'fix: バグ修正', value: 'fix' },
      { name: 'docs: ドキュメント', value: 'docs' },
      { name: 'style: スタイル修正', value: 'style' },
      { name: 'refactor: リファクタリング', value: 'refactor' },
      { name: 'test: テスト', value: 'test' },
      { name: 'chore: その他', value: 'chore' }
    ]
  });

  // コミットメッセージ入力
  const description = await input({
    message: 'コミット内容を入力してください:',
    validate: (input) => input.length > 0 || 'コミット内容は必須です'
  });

  // 詳細説明（任意）
  const body = await input({
    message: '詳細説明（任意）:'
  });

  // Conventional Commits形式でメッセージ構成
  let commitMessage = `${type}: ${description}`;
  if (body) {
    commitMessage += `\n\n${body}`;
  }

  return commitMessage;
}

/**
 * テスト実行
 */
async function runTests() {
  const hasTests = await testing.hasTestConfiguration();

  if (!hasTests) {
    console.log(chalk.gray('ℹ️  テスト設定が見つかりません'));
    return;
  }

  const shouldRunTests = await confirm({
    message: 'テストを実行しますか？',
    default: true
  });

  if (!shouldRunTests) {
    return;
  }

  try {
    await testing.runTests();
    console.log(chalk.green('✅ すべてのテストが通過しました'));
  } catch (error) {
    console.log(chalk.red('❌ テストが失敗しました'));
    console.log(chalk.yellow(error.message));

    const shouldContinue = await confirm({
      message: 'テストが失敗しましたが、続行しますか？',
      default: false
    });

    if (!shouldContinue) {
      throw new Error('テスト失敗のため処理を中止しました');
    }
  }
}

/**
 * リモートにプッシュ
 */
async function pushToRemote() {
  const spinner = ora('リモートにプッシュ中...').start();

  try {
    const currentBranch = await git.getCurrentBranch();
    await git.pushBranch(currentBranch);
    spinner.stop();
    console.log(chalk.green('✅ リモートにプッシュしました'));
  } catch (error) {
    spinner.stop();
    throw new Error(`プッシュに失敗しました: ${error.message}`);
  }
}

/**
 * プルリクエスト作成
 */
async function createPullRequest() {
  if (!await githubService.isConfigured()) {
    console.log(chalk.yellow('⚠️  GitHub設定が見つかりません'));
    console.log(chalk.blue('ℹ️  手動でPRを作成してください'));
    return null;
  }

  const shouldCreatePR = await confirm({
    message: 'プルリクエストを作成しますか？',
    default: true
  });

  if (!shouldCreatePR) {
    return null;
  }

  // PR情報の入力
  const prInfo = await getPullRequestInfo();

  const spinner = ora('プルリクエストを作成中...').start();

  try {
    const currentBranch = await git.getCurrentBranch();
    const pullRequest = await githubService.createPullRequest(
      prInfo.title,
      prInfo.body,
      currentBranch,
      prInfo.base
    );

    spinner.stop();
    console.log(chalk.green(`✅ プルリクエスト #${pullRequest.number} を作成しました`));
    console.log(chalk.blue(`🔗 ${pullRequest.html_url}`));

    return pullRequest;
  } catch (error) {
    spinner.stop();

    if (error.message.includes('GitHub Personal Access Token')) {
      console.log(chalk.red('❌ ' + error.message));
      console.log(chalk.blue('ℹ️  手動でPRを作成してください'));
      return null;
    }

    throw error;
  }
}

/**
 * PR情報を取得
 */
async function getPullRequestInfo() {
  const currentBranch = await git.getCurrentBranch();

  // デフォルトタイトル生成
  const defaultTitle = currentBranch
    .replace(/^(feat|fix|docs|refactor|hotfix)\//, '')
    .replace(/issue-\d+-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  const title = await input({
    message: 'PR タイトル:',
    default: defaultTitle,
    validate: (input) => input.length > 0 || 'タイトルは必須です'
  });

  const description = await input({
    message: 'PR 説明（任意）:'
  });

  // ベースブランチ選択
  const base = await select({
    message: 'マージ先ブランチを選択してください:',
    choices: [
      { name: 'main', value: 'main' },
      { name: 'master', value: 'master' },
      { name: 'develop', value: 'develop' }
    ]
  });

  // PR本文テンプレート生成
  const body = generatePRBody(description, currentBranch);

  return { title, body, base };
}

/**
 * PR本文テンプレートを生成
 */
function generatePRBody(description, branchName) {
  let body = '## 概要\n';
  body += description || '変更内容の説明をここに記載してください。\n';
  body += '\n## 変更点\n';
  body += '- \n';
  body += '\n## テスト\n';
  body += '- [ ] 単体テスト実行\n';
  body += '- [ ] 手動テスト実行\n';
  body += '\n## 関連Issue\n';

  // ブランチ名からIssue番号を抽出
  const issueMatch = branchName.match(/issue-(\d+)-/);
  if (issueMatch) {
    body += `Closes #${issueMatch[1]}\n`;
  } else {
    body += 'N/A\n';
  }

  return body;
}

/**
 * 完了通知を送信
 */
async function sendCompletionNotification(pullRequest) {
  if (!await NotificationService.isConfigured()) {
    return;
  }

  const currentBranch = await git.getCurrentBranch();
  let message = '🎉 作業が完了しました\n' +
                `ブランチ: ${currentBranch}\n`;

  if (pullRequest) {
    message += `プルリクエスト: #${pullRequest.number}\n` +
               `URL: ${pullRequest.html_url}`;
  } else {
    message += 'プルリクエストは手動で作成してください';
  }

  try {
    await notificationService.send(message);
    console.log(chalk.blue('📢 チームに完了通知を送信しました'));
  } catch (error) {
    console.log(chalk.yellow('⚠️  通知の送信に失敗しました: ' + error.message));
  }
}

/**
 * 完了ステップを表示
 */
function displayCompletionSteps(pullRequest) {
  console.log(chalk.bold.green('\n🎉 作業完了プロセスが終了しました！\n'));

  if (pullRequest) {
    console.log('次のステップ:');
    console.log(chalk.cyan('  1. レビュアーにレビューを依頼'));
    console.log(chalk.cyan('  2. フィードバックに対応'));
    console.log(chalk.cyan('  3. 承認後にマージ'));
    console.log(chalk.cyan(`\n🔗 PR URL: ${pullRequest.html_url}`));
  } else {
    console.log('次のステップ:');
    console.log(chalk.cyan('  1. GitHubでプルリクエストを手動作成'));
    console.log(chalk.cyan('  2. レビュアーにレビューを依頼'));
    console.log(chalk.cyan('  3. フィードバックに対応'));
    console.log(chalk.cyan('  4. 承認後にマージ'));
  }

  console.log(chalk.gray('\nお疲れさまでした！'));
}

module.exports = finishCommand;