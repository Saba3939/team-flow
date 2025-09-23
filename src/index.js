// team-flow メインプログラム
require('dotenv').config();
const { Command } = require('commander');
const chalk = require('chalk');
const ConfigValidator = require('./utils/config-validator');

const program = new Command();

// SIGINT (Ctrl+C) のハンドリング設定
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n⚠️  操作がキャンセルされました'));
  console.log(chalk.gray('team-flow を終了します...'));
  process.exit(0);
});

// プロセス終了時のクリーンアップ
process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n\n⚠️  プロセスが終了されました'));
  process.exit(0);
});

// 未処理の例外をキャッチ
process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n❌ 予期しないエラーが発生しました:'));
  console.error(error.message);
  console.log(chalk.gray('team-flow を終了します...'));
  process.exit(1);
});

// 未処理のPromise拒否をキャッチ  
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('\n❌ 未処理のPromise拒否:'));
  console.error(reason);
  console.log(chalk.gray('team-flow を終了します...'));
  process.exit(1);
});

// プログラム情報設定
program
  .name('team-flow')
  .description('Git/GitHub初心者でも使いやすい対話型ガイド機能とワークフロー簡素化機能を組み合わせた統合チーム開発CLIツール')
  .version('1.0.0');

// コマンド定義
program
  .command('start')
  .description('新しい作業を開始')
  .action(async () => {
    const startCommand = require('./commands/start');
    await startCommand();
  });

program
  .command('continue')
  .description('作業を継続')
  .action(async () => {
    const continueCommand = require('./commands/continue');
    await continueCommand();
  });

program
  .command('finish')
  .description('作業を完了')
  .action(async () => {
    const finishCommand = require('./commands/finish');
    await finishCommand();
  });

program
  .command('team')
  .description('チーム状況を確認')
  .action(async () => {
    const { teamCommand } = require('./commands/team');
    await teamCommand();
  });

program
  .command('help-flow')
  .description('ヘルプ・緊急対応')
  .action(async () => {
    const helpFlowCommand = require('./commands/help-flow');
    await helpFlowCommand();
  });

// 設定関連のコマンド処理（Commanderより先に処理）
if (process.argv.includes('--check-config')) {
  ConfigValidator.validateAndReport();
  process.exit(0);
}

if (process.argv.includes('--setup')) {
  ConfigValidator.runFirstTimeSetup();
  process.exit(0);
}

if (process.argv.includes('--fix-config')) {
  ConfigValidator.autoFix();
  process.exit(0);
}

// 設定関連のオプション定義
program
  .option('--check-config', '設定を確認')
  .option('--setup', '初回セットアップを実行')
  .option('--fix-config', '設定の自動修復を試行');

// デフォルトアクション（引数なしの場合）
if (process.argv.length === 2) {
  console.log(chalk.bold.blue('\n🔧 Team Flow - チーム開発ワークフローCLI\n'));
  console.log('利用可能なコマンド:');
  console.log(chalk.green('  team-flow start         ') + '- 新しい作業を開始');
  console.log(chalk.green('  team-flow continue      ') + '- 作業を継続');
  console.log(chalk.green('  team-flow finish        ') + '- 作業を完了');
  console.log(chalk.green('  team-flow team          ') + '- チーム状況を確認');
  console.log(chalk.green('  team-flow help-flow     ') + '- ヘルプ・緊急対応');
  console.log(chalk.green('  team-flow --help        ') + '- 詳細なヘルプを表示\n');

  console.log('設定コマンド:');
  console.log(chalk.blue('  team-flow --check-config') + '- 設定を確認');
  console.log(chalk.blue('  team-flow --setup       ') + '- 初回セットアップを実行');
  console.log(chalk.blue('  team-flow --fix-config  ') + '- 設定の自動修復を試行\n');
  process.exit(0);
}

// プログラム実行
program.parse(process.argv);