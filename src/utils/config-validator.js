const chalk = require('chalk');
const config = require('../config');

/**
 * 設定検証ユーティリティ
 * 設定の妥当性チェックと初期セットアップ支援
 */
class ConfigValidator {
  /**
   * 設定を検証し、結果を表示
   * @returns {boolean} 設定が有効かどうか
   */
  static validateAndReport() {
    console.log(chalk.yellow('🔍 設定を検証しています...\n'));

    const validation = config.validate();

    // エラーの表示
    if (validation.errors.length > 0) {
      console.log(chalk.red('❌ エラーが見つかりました:\n'));
      validation.errors.forEach((error, index) => {
        console.log(chalk.red(`${index + 1}. ${error}`));
      });
      console.log('');
    }

    // 警告の表示
    if (validation.warnings.length > 0) {
      console.log(chalk.yellow('⚠️  警告:\n'));
      validation.warnings.forEach((warning, index) => {
        console.log(chalk.yellow(`${index + 1}. ${warning}`));
      });
      console.log('');
    }

    // 成功時の表示
    if (validation.isValid) {
      console.log(chalk.green('✅ 設定は正常です！\n'));
      this.showConfigStatus();
    } else {
      console.log(chalk.red('❌ 設定に問題があります。上記のエラーを修正してください。\n'));
      config.showSetupGuide();
    }

    return validation.isValid;
  }

  /**
   * 現在の設定状況を表示
   */
  static showConfigStatus() {
    const debugInfo = config.getDebugInfo();
    const notifications = config.getAvailableNotifications();

    console.log(chalk.cyan('📋 設定状況:\n'));

    // GitHub設定
    console.log(chalk.white('🐙 GitHub:'));
    console.log(`   Token: ${debugInfo.github.hasToken ? chalk.green('✓ 設定済み') : chalk.red('✗ 未設定')}`);
    console.log(`   デフォルトブランチ: ${chalk.blue(debugInfo.github.defaultBranch)}\n`);

    // 通知設定
    console.log(chalk.white('📢 通知サービス:'));
    console.log(`   Slack: ${debugInfo.slack.hasToken ? chalk.green('✓ 設定済み') : chalk.gray('○ 未設定（オプション）')}`);
    if (debugInfo.slack.hasToken) {
      console.log(`   チャンネル: ${chalk.blue(debugInfo.slack.channel)}`);
    }
    console.log(`   Discord: ${debugInfo.discord.hasWebhook ? chalk.green('✓ 設定済み') : chalk.gray('○ 未設定（オプション）')}\n`);

    // アプリケーション設定
    console.log(chalk.white('⚙️  アプリケーション:'));
    console.log(`   実行環境: ${chalk.blue(debugInfo.app.nodeEnv)}`);
    console.log(`   デバッグモード: ${debugInfo.app.debug ? chalk.green('ON') : chalk.gray('OFF')}`);
    console.log(`   ログレベル: ${chalk.blue(debugInfo.app.logLevel)}\n`);

    // Git設定
    console.log(chalk.white('🌿 Git:'));
    console.log(`   自動プッシュ: ${debugInfo.git.autoPush ? chalk.yellow('ON') : chalk.gray('OFF')}`);
    console.log(`   自動PR作成: ${debugInfo.git.autoPR ? chalk.yellow('ON') : chalk.gray('OFF')}\n`);

    // セキュリティ設定
    console.log(chalk.white('🔒 セキュリティ:'));
    console.log(`   破壊的操作の確認: ${debugInfo.security.confirmDestructiveActions ? chalk.green('ON') : chalk.red('OFF')}\n`);

    // 有効な通知サービスの報告
    const notificationCount = Object.keys(notifications).length;
    if (notificationCount > 0) {
      console.log(chalk.green(`✅ ${notificationCount}つの通知サービスが利用可能です`));
    } else {
      console.log(chalk.gray('ℹ️  通知サービスは設定されていません（オプション）'));
    }
  }

  /**
   * 初回セットアップの実行
   */
  static runFirstTimeSetup() {
    console.log(chalk.cyan('🚀 team-flow 初回セットアップ\n'));

    const validation = config.validate();

    if (validation.isValid) {
      console.log(chalk.green('✅ 設定は既に完了しています！\n'));
      this.showConfigStatus();
      return true;
    }

    config.showSetupGuide();
    return false;
  }

  /**
   * 特定の設定項目をチェック
   * @param {string} service - チェックするサービス名
   * @returns {boolean} 設定されているかどうか
   */
  static checkService(service) {
    switch (service.toLowerCase()) {
    case 'github':
      return !!config.get('github.token');
    case 'slack':
      return !!config.get('slack.token');
    case 'discord':
      return !!config.get('discord.webhookUrl');
    default:
      return false;
    }
  }

  /**
   * 設定の問題を自動修復（可能な範囲で）
   */
  static autoFix() {
    console.log(chalk.yellow('🔧 自動修復を試行しています...\n'));

    const fs = require('fs');
    const path = require('path');

    // .envファイルが存在しない場合、.env.exampleからコピー
    const envPath = path.join(process.cwd(), '.env');
    const examplePath = path.join(process.cwd(), '.env.example');

    if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
      try {
        fs.copyFileSync(examplePath, envPath);
        console.log(chalk.green('✅ .env.exampleから.envファイルを作成しました'));
        console.log(chalk.yellow('⚠️  .envファイルを編集して適切な値を設定してください\n'));
        return true;
      } catch (error) {
        console.log(chalk.red(`❌ .envファイルの作成に失敗しました: ${error.message}\n`));
        return false;
      }
    }

    console.log(chalk.blue('ℹ️  自動修復できる問題は見つかりませんでした\n'));
    return false;
  }
}

module.exports = ConfigValidator;