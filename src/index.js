// team-flow メインプログラム
require('dotenv').config();
const { Command } = require('commander');
const chalk = require('chalk');

const program = new Command();

// プログラム情報設定
program
  .name('team-flow')
  .description('Git/GitHub初心者でも使いやすい対話型ガイド機能とワークフロー簡素化機能を組み合わせた統合チーム開発CLIツール')
  .version('1.0.0');

// コマンド定義
program
  .command('start')
  .description('新しい作業を開始')
  .action(() => {
    console.log(chalk.blue('🚀 新しい作業を開始します...'));
    // TODO: startコマンドの実装
  });

program
  .command('continue')
  .description('作業を継続')
  .action(() => {
    console.log(chalk.green('⏯️  作業を継続します...'));
    // TODO: continueコマンドの実装
  });

program
  .command('finish')
  .description('作業を完了')
  .action(() => {
    console.log(chalk.yellow('✅ 作業を完了します...'));
    // TODO: finishコマンドの実装
  });

program
  .command('team')
  .description('チーム状況を確認')
  .action(() => {
    console.log(chalk.cyan('👥 チーム状況を確認します...'));
    // TODO: teamコマンドの実装
  });

program
  .command('help-flow')
  .description('ヘルプ・緊急対応')
  .action(() => {
    console.log(chalk.red('🆘 ヘルプ・緊急対応モードです...'));
    // TODO: help-flowコマンドの実装
  });

// デフォルトアクション（引数なしの場合）
if (process.argv.length === 2) {
  console.log(chalk.bold.blue('\n🔧 Team Flow - チーム開発ワークフローCLI\n'));
  console.log('利用可能なコマンド:');
  console.log(chalk.green('  team-flow start      ') + '- 新しい作業を開始');
  console.log(chalk.green('  team-flow continue   ') + '- 作業を継続');
  console.log(chalk.green('  team-flow finish     ') + '- 作業を完了');
  console.log(chalk.green('  team-flow team       ') + '- チーム状況を確認');
  console.log(chalk.green('  team-flow help-flow  ') + '- ヘルプ・緊急対応');
  console.log(chalk.green('  team-flow --help     ') + '- 詳細なヘルプを表示\n');
  process.exit(0);
}

// プログラム実行
program.parse(process.argv);