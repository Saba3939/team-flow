const dotenv = require('dotenv');
const path = require('path');

// 環境変数の読み込み
dotenv.config();

class Config {
  constructor() {
    this.github = {
      token: process.env.GITHUB_TOKEN,
      defaultBranch: process.env.DEFAULT_BRANCH || 'main'
    };

    this.slack = {
      token: process.env.SLACK_TOKEN,
      channel: process.env.SLACK_CHANNEL || '#general'
    };

    this.discord = {
      webhookUrl: process.env.DISCORD_WEBHOOK_URL
    };

    this.app = {
      nodeEnv: process.env.NODE_ENV || 'development',
      debug: process.env.DEBUG === 'true',
      autoPush: process.env.AUTO_PUSH === 'true',
      autoPR: process.env.AUTO_PR === 'true'
    };
  }

  // GitHub設定の検証
  validateGitHubConfig() {
    if (!this.github.token) {
      throw new Error('GITHUB_TOKEN環境変数が設定されていません。.envファイルを確認してください。');
    }
    return true;
  }

  // Slack設定の検証（オプション）
  validateSlackConfig() {
    return !!this.slack.token;
  }

  // Discord設定の検証（オプション）
  validateDiscordConfig() {
    return !!this.discord.webhookUrl;
  }

  // 設定情報を取得
  getConfig() {
    return {
      github: this.github,
      slack: this.slack,
      discord: this.discord,
      app: this.app
    };
  }

  // デバッグ情報を取得（トークンなどの機密情報は除外）
  getDebugInfo() {
    return {
      github: {
        hasToken: !!this.github.token,
        defaultBranch: this.github.defaultBranch
      },
      slack: {
        hasToken: !!this.slack.token,
        channel: this.slack.channel
      },
      discord: {
        hasWebhook: !!this.discord.webhookUrl
      },
      app: this.app
    };
  }
}

module.exports = new Config();