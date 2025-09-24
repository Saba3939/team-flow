const chalk = require('chalk');
const Config = require('../config');
const config = new Config();

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

    // 通知サービスの概要のみ
    const notificationCount = Object.keys(notifications).length;
    if (notificationCount > 0) {
      console.log(`   通知: ${chalk.green(`✓ ${notificationCount}サービス利用可能`)}`);
    }

    console.log();
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