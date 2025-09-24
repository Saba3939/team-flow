const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

// 環境変数を読み込み
dotenv.config();

/**
 * 設定管理クラス
 * 環境変数の読み込み、検証、デフォルト値の管理を行う
 */
class Config {
  constructor() {
    this.config = {};
    this.required = ['GITHUB_TOKEN'];
    this.optional = [
      'SLACK_TOKEN',
      'SLACK_CHANNEL',
      'DISCORD_WEBHOOK_URL',
      'NODE_ENV',
      'DEBUG',
      'LOG_LEVEL',
      'DEFAULT_BRANCH',
      'AUTO_PUSH',
      'AUTO_PR',
      'CONFIRM_DESTRUCTIVE_ACTIONS'
    ];

    this.loadConfig();
  }

  /**
   * 設定を読み込み
   */
  loadConfig() {
    // グローバル設定を読み込み
    const globalConfig = this.getGlobalConfig();
    
    // 環境変数を優先し、なければグローバル設定、それもなければデフォルト値を使用
    const getConfigValue = (envKey, globalKey = envKey, defaultValue = undefined) => {
      return process.env[envKey] || globalConfig[globalKey] || defaultValue;
    };

    // 必須設定
    this.config.github = {
      token: getConfigValue('GITHUB_TOKEN')
    };

    // 通知設定（オプション）
    this.config.slack = {
      token: getConfigValue('SLACK_TOKEN'),
      channel: getConfigValue('SLACK_CHANNEL', 'SLACK_CHANNEL', '#general')
    };

    this.config.discord = {
      webhookUrl: getConfigValue('DISCORD_WEBHOOK_URL')
    };

    // アプリケーション設定
    this.config.app = {
      nodeEnv: getConfigValue('NODE_ENV', 'NODE_ENV', 'development'),
      debug: getConfigValue('DEBUG') === 'true' || false,
      logLevel: getConfigValue('LOG_LEVEL', 'LOG_LEVEL', 'info')
    };

    // Git設定
    this.config.git = {
      defaultBranch: getConfigValue('DEFAULT_BRANCH', 'DEFAULT_BRANCH', 'main'),
      autoPush: getConfigValue('AUTO_PUSH') === 'true' || false,
      autoPR: getConfigValue('AUTO_PR') === 'true' || false
    };

    // セキュリティ設定
    this.config.security = {
      confirmDestructiveActions: getConfigValue('CONFIRM_DESTRUCTIVE_ACTIONS') !== 'false'
    };
  }

  /**
   * 設定を検証
   * @returns {Object} 検証結果
   */
  validate() {
    const errors = [];
    const warnings = [];

    // 必須設定の確認
    if (!this.config.github.token) {
      errors.push('GITHUB_TOKEN is required. Please set your GitHub Personal Access Token.');
    } else if (!this.isValidGitHubToken(this.config.github.token)) {
      errors.push('GITHUB_TOKEN format appears to be invalid. Please check your token.');
    }

    // .envファイルの存在確認
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
      warnings.push('.env file not found. Please copy .env.example to .env and configure it.');
    }

    // 通知設定の警告
    if (!this.config.slack.token && !this.config.discord.webhookUrl) {
      warnings.push('No notification services configured. Team notifications will be disabled.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * GitHubトークンの基本的な形式チェック
   * @param {string} token - GitHubトークン
   * @returns {boolean} 有効かどうか
   */
  isValidGitHubToken(token) {
    // GitHub Personal Access Tokenの基本的な形式チェック
    // Classic tokens: ghp_xxxx (40文字)
    // Fine-grained tokens: github_pat_xxxx
    return /^(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82})$/.test(token);
  }

  /**
   * 設定の初期化ガイダンスを表示
   */
  showSetupGuide() {
    console.log(chalk.yellow('\n🔧 team-flow セットアップガイド\n'));

    console.log(chalk.cyan('1. 環境設定ファイルをコピー:'));
    console.log('   cp .env.example .env\n');

    console.log(chalk.cyan('2. GitHub Personal Access Tokenを取得:'));
    console.log('   - GitHub Settings > Developer settings > Personal access tokens');
    console.log('   - 必要な権限: repo, read:user\n');

    console.log(chalk.cyan('3. .envファイルを編集:'));
    console.log('   - GITHUB_TOKENを設定（必須）');
    console.log('   - 通知設定は任意\n');

    console.log(chalk.cyan('4. 設定確認:'));
    console.log('   team-flow --check-config\n');

    console.log(chalk.red('⚠️  重要: .envファイルは絶対にコミットしないでください！'));
  }

  /**
   * 設定を取得
   * @param {string} path - 設定のパス（例: 'github.token'）
   * @returns {any} 設定値
   */
  get(path) {
    const keys = path.split('.');
    let value = this.config;

    for (const key of keys) {
      value = value?.[key];
    }

    return value;
  }

  /**
   * 通知機能が有効かチェック
   * @returns {Object} 有効な通知サービス
   */
  getAvailableNotifications() {
    const available = {};

    if (this.config.slack.token) {
      available.slack = true;
    }

    if (this.config.discord.webhookUrl) {
      available.discord = true;
    }

    return available;
  }

  /**
   * 開発モードかチェック
   * @returns {boolean} 開発モードかどうか
   */
  isDevelopment() {
    return this.config.app.nodeEnv === 'development';
  }

  /**
   * デバッグモードかチェック
   * @returns {boolean} デバッグモードかどうか
   */
  isDebug() {
    return this.config.app.debug;
  }

  // 後方互換性のためのメソッド群
  validateGitHubConfig() {
    const validation = this.validate();
    if (!validation.isValid) {
      throw new Error(validation.errors.join('\n'));
    }
    return true;
  }

  validateSlackConfig() {
    return !!this.config.slack.token;
  }

  validateDiscordConfig() {
    return !!this.config.discord.webhookUrl;
  }

  getConfig() {
    return this.config;
  }

  getDebugInfo() {
    return {
      github: {
        hasToken: !!this.config.github.token,
        defaultBranch: this.config.git.defaultBranch
      },
      slack: {
        hasToken: !!this.config.slack.token,
        channel: this.config.slack.channel
      },
      discord: {
        hasWebhook: !!this.config.discord.webhookUrl
      },
      app: this.config.app,
      git: this.config.git,
      security: this.config.security
    };
  }

  /**
   * グローバル設定ファイルを作成・更新
   * @param {Object} config - 設定オブジェクト
   */
  saveGlobalConfig(config) {
    const os = require('os');
    const globalConfigDir = path.join(os.homedir(), '.team-flow');
    const globalConfigPath = path.join(globalConfigDir, 'config.json');
    
    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(globalConfigDir)) {
      fs.mkdirSync(globalConfigDir, { recursive: true });
    }
    
    // 既存の設定を読み込み
    let existingConfig = {};
    if (fs.existsSync(globalConfigPath)) {
      try {
        const content = fs.readFileSync(globalConfigPath, 'utf8');
        existingConfig = JSON.parse(content);
      } catch (error) {
        console.warn(`Warning: Failed to read existing global config: ${error.message}`);
      }
    }
    
    // 新しい設定をマージ
    const mergedConfig = { ...existingConfig, ...config };
    
    // 設定を保存
    try {
      fs.writeFileSync(globalConfigPath, JSON.stringify(mergedConfig, null, 2));
      return globalConfigPath;
    } catch (error) {
      throw new Error(`Failed to save global config: ${error.message}`);
    }
  }

  /**
   * グローバル設定ファイルを取得
   * @returns {Object} グローバル設定
   */
  getGlobalConfig() {
    const os = require('os');
    const globalConfigPath = path.join(os.homedir(), '.team-flow', 'config.json');
    
    if (!fs.existsSync(globalConfigPath)) {
      return {};
    }
    
    try {
      const content = fs.readFileSync(globalConfigPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`Warning: Failed to read global config: ${error.message}`);
      return {};
    }
  }

  /**
   * グローバル設定のセットアップガイドを表示
   */
  showGlobalSetupGuide() {
    const os = require('os');
    const globalConfigPath = path.join(os.homedir(), '.team-flow', 'config.json');
    
    console.log(chalk.yellow('\n🔧 team-flow グローバル設定ガイド\n'));
    
    console.log(chalk.cyan('グローバル設定を使用すると、全プロジェクトで共通の設定を使用できます。'));
    console.log(chalk.cyan('設定ファイルの場所:'));
    console.log(`   ${globalConfigPath}\n`);
    
    console.log(chalk.cyan('設定例:'));
    console.log(JSON.stringify({
      GITHUB_TOKEN: 'your_github_token_here',
      SLACK_TOKEN: 'xoxb-your-slack-token',
      SLACK_CHANNEL: '#general',
      DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/...',
      DEFAULT_BRANCH: 'main',
      AUTO_PUSH: 'false',
      AUTO_PR: 'false'
    }, null, 2));
    
    console.log(chalk.yellow('\n注意: ローカルの.envファイルがある場合は、そちらが優先されます。'));
    console.log(chalk.red('⚠️  重要: 設定ファイルには機密情報が含まれるため、適切に保護してください！'));
  }
}

module.exports = new Config();