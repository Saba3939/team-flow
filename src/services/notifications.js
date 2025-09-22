const { WebClient } = require('@slack/web-api');
const { Webhook } = require('discord-webhook-node');
const logger = require('../utils/logger');

/**
 * チーム通知サービス
 */
class NotificationService {
  constructor() {
    this.slackClient = null;
    this.discordWebhook = null;
    this.initialized = false;
  }

  /**
   * 通知サービスの初期化
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    // Slack の初期化
    const slackToken = process.env.SLACK_TOKEN;
    if (slackToken) {
      this.slackClient = new WebClient(slackToken);
      logger.info('Slack通知サービスを初期化しました');
    }

    // Discord の初期化
    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (discordWebhookUrl) {
      this.discordWebhook = new Webhook(discordWebhookUrl);
      logger.info('Discord通知サービスを初期化しました');
    }

    this.initialized = true;
  }

  /**
   * 通知サービスが設定されているかチェック
   */
  static async isConfigured() {
    return (process.env.SLACK_TOKEN && process.env.SLACK_TOKEN.length > 0) ||
           (process.env.DISCORD_WEBHOOK_URL && process.env.DISCORD_WEBHOOK_URL.length > 0);
  }

  /**
   * メッセージを送信
   */
  async send(message, options = {}) {
    await this.initialize();

    const results = [];

    // Slack に送信
    if (this.slackClient) {
      try {
        await this.sendToSlack(message, options);
        results.push({ platform: 'Slack', success: true });
      } catch (error) {
        logger.error('Slack送信エラー:', error);
        results.push({ platform: 'Slack', success: false, error: error.message });
      }
    }

    // Discord に送信
    if (this.discordWebhook) {
      try {
        await this.sendToDiscord(message, options);
        results.push({ platform: 'Discord', success: true });
      } catch (error) {
        logger.error('Discord送信エラー:', error);
        results.push({ platform: 'Discord', success: false, error: error.message });
      }
    }

    if (results.length === 0) {
      throw new Error('通知サービスが設定されていません');
    }

    const failures = results.filter(r => !r.success);
    if (failures.length === results.length) {
      throw new Error('すべての通知サービスで送信に失敗しました');
    }

    return results;
  }

  /**
   * Slack にメッセージを送信
   */
  async sendToSlack(message, options = {}) {
    if (!this.slackClient) {
      throw new Error('Slackクライアントが初期化されていません');
    }

    const channel = options.slackChannel || process.env.SLACK_CHANNEL || '#general';
    const username = options.username || 'Team Flow';
    const icon = options.icon || ':robot_face:';

    const slackMessage = {
      channel,
      username,
      icon_emoji: icon,
      text: message
    };

    // 添付ファイルやフィールドがある場合
    if (options.attachments) {
      slackMessage.attachments = options.attachments;
    }

    if (options.blocks) {
      slackMessage.blocks = options.blocks;
    }

    const response = await this.slackClient.chat.postMessage(slackMessage);
    logger.info(`Slackメッセージを送信しました: ${channel}`);
    return response;
  }

  /**
   * Discord にメッセージを送信
   */
  async sendToDiscord(message, options = {}) {
    if (!this.discordWebhook) {
      throw new Error('Discord Webhookが初期化されていません');
    }

    const username = options.username || 'Team Flow';
    const avatarUrl = options.avatarUrl || null;

    // Discord の埋め込みメッセージ形式
    if (options.embed) {
      await this.discordWebhook.send('', {
        username,
        avatarURL: avatarUrl,
        embeds: [options.embed]
      });
    } else {
      await this.discordWebhook.send(message, {
        username,
        avatarURL: avatarUrl
      });
    }

    logger.info('Discordメッセージを送信しました');
  }

  /**
   * 作業開始通知
   */
  async notifyWorkStart(workType, branchName, issueInfo, userInfo = {}) {
    const workTypeNames = {
      feature: '機能開発',
      bugfix: 'バグ修正',
      docs: 'ドキュメント更新',
      refactor: 'リファクタリング',
      hotfix: 'ホットフィックス'
    };

    const userName = userInfo.name || 'メンバー';
    const message = `🚀 ${userName}が新しい作業を開始しました\n\n` +
                   `**種別:** ${workTypeNames[workType]}\n` +
                   `**ブランチ:** \`${branchName}\`\n` +
                   `**作業内容:** ${issueInfo.title}` +
                   (issueInfo.number ? `\n**Issue:** #${issueInfo.number}` : '');

    // Slack用の詳細な形式
    const slackAttachments = [{
      color: this.getColorForWorkType(workType),
      fields: [
        {
          title: '作業種別',
          value: workTypeNames[workType],
          short: true
        },
        {
          title: 'ブランチ',
          value: branchName,
          short: true
        },
        {
          title: '作業内容',
          value: issueInfo.title,
          short: false
        }
      ]
    }];

    if (issueInfo.number && issueInfo.html_url) {
      slackAttachments[0].fields.push({
        title: 'Issue',
        value: `<${issueInfo.html_url}|#${issueInfo.number}>`,
        short: true
      });
    }

    // Discord用の埋め込み形式
    const discordEmbed = {
      title: '🚀 新しい作業開始',
      description: `${userName}が作業を開始しました`,
      color: parseInt(this.getColorForWorkType(workType).replace('#', ''), 16),
      fields: [
        {
          name: '作業種別',
          value: workTypeNames[workType],
          inline: true
        },
        {
          name: 'ブランチ',
          value: `\`${branchName}\``,
          inline: true
        },
        {
          name: '作業内容',
          value: issueInfo.title,
          inline: false
        }
      ],
      timestamp: new Date().toISOString()
    };

    if (issueInfo.number && issueInfo.html_url) {
      discordEmbed.fields.push({
        name: 'Issue',
        value: `[#${issueInfo.number}](${issueInfo.html_url})`,
        inline: true
      });
    }

    return await this.send(message, {
      attachments: slackAttachments,
      embed: discordEmbed
    });
  }

  /**
   * 作業完了通知
   */
  async notifyWorkFinish(branchName, pullRequestInfo, userInfo = {}) {
    const userName = userInfo.name || 'メンバー';
    const message = `✅ ${userName}が作業を完了しました\n\n` +
                   `**ブランチ:** \`${branchName}\`\n` +
                   `**PR:** ${pullRequestInfo.title}` +
                   (pullRequestInfo.html_url ? `\n**URL:** ${pullRequestInfo.html_url}` : '');

    // Slack用の形式
    const slackAttachments = [{
      color: 'good',
      fields: [
        {
          title: 'ブランチ',
          value: branchName,
          short: true
        },
        {
          title: 'プルリクエスト',
          value: pullRequestInfo.html_url ?
            `<${pullRequestInfo.html_url}|${pullRequestInfo.title}>` :
            pullRequestInfo.title,
          short: false
        }
      ]
    }];

    // Discord用の埋め込み形式
    const discordEmbed = {
      title: '✅ 作業完了',
      description: `${userName}が作業を完了しました`,
      color: 0x28a745, // green
      fields: [
        {
          name: 'ブランチ',
          value: `\`${branchName}\``,
          inline: true
        },
        {
          name: 'プルリクエスト',
          value: pullRequestInfo.html_url ?
            `[${pullRequestInfo.title}](${pullRequestInfo.html_url})` :
            pullRequestInfo.title,
          inline: false
        }
      ],
      timestamp: new Date().toISOString()
    };

    return await this.send(message, {
      attachments: slackAttachments,
      embed: discordEmbed
    });
  }

  /**
   * レビュー依頼通知
   */
  async notifyReviewRequest(pullRequestInfo, reviewers, userInfo = {}) {
    const userName = userInfo.name || 'メンバー';
    const reviewerNames = reviewers.map(r => r.login || r.name).join(', ');

    const message = `👀 ${userName}がレビューを依頼しました\n\n` +
                   `**PR:** ${pullRequestInfo.title}\n` +
                   `**レビュアー:** ${reviewerNames}` +
                   (pullRequestInfo.html_url ? `\n**URL:** ${pullRequestInfo.html_url}` : '');

    return await this.send(message);
  }

  /**
   * 作業種別に応じた色を取得
   */
  getColorForWorkType(workType) {
    const colors = {
      feature: '#36a64f',   // green
      bugfix: '#ff9f00',    // orange
      docs: '#439fe0',      // blue
      refactor: '#9c27b0',  // purple
      hotfix: '#f44336'     // red
    };
    return colors[workType] || '#36a64f';
  }
}

module.exports = NotificationService;