const { input, select, confirm } = require('@inquirer/prompts');
const chalk = require('chalk');
const Config = require('../config');

/**
 * グローバル設定コマンド
 */
async function configCommand(options = {}) {
  const config = new Config();

  try {
    if (options.global) {
      await setupGlobalConfig(config);
    } else if (options.check) {
      await checkConfig(config);
    } else if (options.show) {
      await showCurrentConfig(config);
    } else {
      // 対話型メニュー
      await showConfigMenu(config);
    }
  } catch (error) {
    console.error(chalk.red(`❌ 設定エラー: ${error.message}`));
    process.exit(1);
  }
}

/**
 * グローバル設定のセットアップ
 */
async function setupGlobalConfig(config) {
  console.log(chalk.yellow('\n🔧 team-flow グローバル設定セットアップ\n'));

  // 既存のグローバル設定を取得
  const existingConfig = config.getGlobalConfig();

  console.log(chalk.cyan('GitHub設定:'));
  const githubToken = await input({
    message: 'GitHub Personal Access Token を入力してください:',
    default: existingConfig.GITHUB_TOKEN || '',
    validate: (input) => {
      if (!input) return 'GitHub Token は必須です';
      if (!config.isValidGitHubToken(input)) return 'トークンの形式が正しくありません';
      return true;
    }
  });

  console.log(chalk.cyan('\n通知設定 (オプション):'));

  const setupSlack = await confirm({
    message: 'Slack通知を設定しますか？',
    default: !!existingConfig.SLACK_TOKEN
  });

  let slackConfig = {};
  if (setupSlack) {
    slackConfig.SLACK_TOKEN = await input({
      message: 'Slack Bot Token を入力してください:',
      default: existingConfig.SLACK_TOKEN || ''
    });

    slackConfig.SLACK_CHANNEL = await input({
      message: 'デフォルトのSlackチャンネルを入力してください:',
      default: existingConfig.SLACK_CHANNEL || '#general'
    });
  }

  const setupDiscord = await confirm({
    message: 'Discord通知を設定しますか？',
    default: !!existingConfig.DISCORD_WEBHOOK_URL
  });

  let discordConfig = {};
  if (setupDiscord) {
    discordConfig.DISCORD_WEBHOOK_URL = await input({
      message: 'Discord Webhook URL を入力してください:',
      default: existingConfig.DISCORD_WEBHOOK_URL || ''
    });
  }

  console.log(chalk.cyan('\nGit設定:'));

  const defaultBranch = await input({
    message: 'デフォルトブランチ名を入力してください:',
    default: existingConfig.DEFAULT_BRANCH || 'main'
  });

  const autoPush = await confirm({
    message: '自動プッシュを有効にしますか？',
    default: (existingConfig.AUTO_PUSH || 'false') === 'true'
  });

  const autoPR = await confirm({
    message: '自動PR作成を有効にしますか？',
    default: (existingConfig.AUTO_PR || 'false') === 'true'
  });

  // 設定をまとめる
  const newConfig = {
    GITHUB_TOKEN: githubToken,
    ...slackConfig,
    ...discordConfig,
    DEFAULT_BRANCH: defaultBranch,
    AUTO_PUSH: autoPush.toString(),
    AUTO_PR: autoPR.toString()
  };

  // 設定を保存
  const configPath = config.saveGlobalConfig(newConfig);

  console.log(chalk.green('\n✅ グローバル設定が保存されました！'));
  console.log(chalk.gray(`📁 保存場所: ${configPath}\n`));

  // 設定確認
  console.log(chalk.cyan('設定内容:'));
  console.log(`  GitHub Token: ${githubToken ? '設定済み ✓' : '未設定 ❌'}`);
  console.log(`  Slack: ${slackConfig.SLACK_TOKEN ? '設定済み ✓' : '未設定'}`);
  console.log(`  Discord: ${discordConfig.DISCORD_WEBHOOK_URL ? '設定済み ✓' : '未設定'}`);
  console.log(`  デフォルトブランチ: ${defaultBranch}`);
  console.log(`  自動プッシュ: ${autoPush ? 'ON' : 'OFF'}`);
  console.log(`  自動PR: ${autoPR ? 'ON' : 'OFF'}\n`);

  console.log(chalk.yellow('💡 これで全プロジェクトでこの設定が使用されます！'));
  console.log(chalk.gray('   ローカルの .env ファイルがある場合は、そちらが優先されます。'));
}

/**
 * 設定確認
 */
async function checkConfig(config) {
  console.log(chalk.yellow('\n📋 team-flow 設定確認\n'));

  const validation = config.validate();
  const globalConfig = config.getGlobalConfig();
  const hasGlobal = Object.keys(globalConfig).length > 0;

  // 設定ソース表示
  console.log(chalk.cyan('設定ソース:'));
  if (hasGlobal) {
    console.log(chalk.green('  ✓ グローバル設定ファイル'));
  } else {
    console.log(chalk.gray('  - グローバル設定ファイル (未作成)'));
  }

  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    console.log(chalk.green('  ✓ ローカル .env ファイル'));
  } else {
    console.log(chalk.gray('  - ローカル .env ファイル (未作成)'));
  }

  // 設定状況表示
  console.log(chalk.cyan('\n現在の設定:'));
  const currentConfig = config.getConfig();

  console.log(`  GitHub Token: ${currentConfig.github.token ? chalk.green('設定済み ✓') : chalk.red('未設定 ❌')}`);
  console.log(`  Slack Token: ${currentConfig.slack.token ? chalk.green('設定済み ✓') : chalk.gray('未設定')}`);
  console.log(`  Discord Webhook: ${currentConfig.discord.webhookUrl ? chalk.green('設定済み ✓') : chalk.gray('未設定')}`);
  console.log(`  デフォルトブランチ: ${currentConfig.git.defaultBranch}`);
  console.log(`  自動プッシュ: ${currentConfig.git.autoPush ? 'ON' : 'OFF'}`);
  console.log(`  自動PR: ${currentConfig.git.autoPR ? 'ON' : 'OFF'}`);

  // バリデーション結果表示
  if (validation.errors.length > 0) {
    console.log(chalk.red('\n❌ エラー:'));
    validation.errors.forEach(error => {
      console.log(chalk.red(`  - ${error}`));
    });
  }

  if (validation.warnings.length > 0) {
    console.log(chalk.yellow('\n⚠️  警告:'));
    validation.warnings.forEach(warning => {
      console.log(chalk.yellow(`  - ${warning}`));
    });
  }

  if (validation.isValid && validation.warnings.length === 0) {
    console.log(chalk.green('\n✅ 全ての設定が正常です！'));
  } else if (validation.isValid) {
    console.log(chalk.yellow('\n⚠️  設定は有効ですが、改善の余地があります。'));
  } else {
    console.log(chalk.red('\n❌ 設定に問題があります。修正が必要です。'));

    if (!hasGlobal && !fs.existsSync(envPath)) {
      console.log(chalk.cyan('\n推奨アクション:'));
      console.log('  team-flow config --global  # グローバル設定を作成');
    }
  }
}

/**
 * 現在の設定を表示
 */
async function showCurrentConfig(config) {
  console.log(chalk.yellow('\n📋 現在の team-flow 設定\n'));

  const debugInfo = config.getDebugInfo();

  console.log(chalk.cyan('GitHub:'));
  console.log(`  Token: ${debugInfo.github.hasToken ? '設定済み' : '未設定'}`);
  console.log(`  デフォルトブランチ: ${debugInfo.github.defaultBranch}`);

  console.log(chalk.cyan('\nSlack:'));
  console.log(`  Token: ${debugInfo.slack.hasToken ? '設定済み' : '未設定'}`);
  console.log(`  チャンネル: ${debugInfo.slack.channel}`);

  console.log(chalk.cyan('\nDiscord:'));
  console.log(`  Webhook: ${debugInfo.discord.hasWebhook ? '設定済み' : '未設定'}`);

  console.log(chalk.cyan('\nGit設定:'));
  console.log(`  自動プッシュ: ${debugInfo.git.autoPush ? 'ON' : 'OFF'}`);
  console.log(`  自動PR: ${debugInfo.git.autoPR ? 'ON' : 'OFF'}`);

  console.log(chalk.cyan('\nアプリケーション:'));
  console.log(`  環境: ${debugInfo.app.nodeEnv}`);
  console.log(`  デバッグ: ${debugInfo.app.debug ? 'ON' : 'OFF'}`);
  console.log(`  ログレベル: ${debugInfo.app.logLevel}`);
}

/**
 * 設定メニュー
 */
async function showConfigMenu(config) {
  console.log(chalk.yellow('\n🔧 team-flow 設定管理\n'));

  const choice = await select({
    message: '実行する操作を選択してください:',
    choices: [
      {
        name: 'グローバル設定のセットアップ',
        value: 'global',
        description: '全プロジェクトで使用する設定を作成'
      },
      {
        name: '設定確認',
        value: 'check',
        description: '現在の設定状況を確認'
      },
      {
        name: '設定内容表示',
        value: 'show',
        description: '詳細な設定内容を表示'
      },
      {
        name: 'セットアップガイド表示',
        value: 'guide',
        description: 'セットアップ方法を表示'
      }
    ]
  });

  switch (choice) {
    case 'global':
      await setupGlobalConfig(config);
      break;
    case 'check':
      await checkConfig(config);
      break;
    case 'show':
      await showCurrentConfig(config);
      break;
    case 'guide':
      config.showSetupGuide();
      config.showGlobalSetupGuide();
      break;
  }
}

module.exports = {
  configCommand,
  setupGlobalConfig,
  checkConfig,
  showCurrentConfig
};