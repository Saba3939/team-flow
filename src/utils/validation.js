// Validationクラスはloggerを直接使用せず、呼び出し元でログを処理する

class Validation {
  // ブランチ名の検証
  static validateBranchName(branchName) {
    if (!branchName || typeof branchName !== 'string') {
      return { valid: false, error: 'ブランチ名が入力されていません' };
    }

    // 空白文字のトリム
    branchName = branchName.trim();

    if (branchName.length === 0) {
      return { valid: false, error: 'ブランチ名が空です' };
    }

    if (branchName.length > 100) {
      return { valid: false, error: 'ブランチ名が長すぎます（100文字以内）' };
    }

    // Git のブランチ名規則に従った検証
    const invalidPatterns = [
      /\s/,              // 空白文字
      /\.\./,            // 連続するドット
      /[~^:?*[\]\\]/,   // 特殊文字
      /^-/,              // ハイフンで始まる
      /-$/,              // ハイフンで終わる
      /^HEAD$/i,         // HEADは予約語
      /^\./,             // ドットで始まる
      /\.$/,             // ドットで終わる
      /\/$/,             // スラッシュで終わる
      /^\/|\/\//         // スラッシュで始まるか連続するスラッシュ
    ];

    for (const pattern of invalidPatterns) {
      if (pattern.test(branchName)) {
        return { valid: false, error: 'ブランチ名に使用できない文字が含まれています' };
      }
    }

    return { valid: true, value: branchName };
  }

  // コミットメッセージの検証
  static validateCommitMessage(message) {
    if (!message || typeof message !== 'string') {
      return { valid: false, error: 'コミットメッセージが入力されていません' };
    }

    message = message.trim();

    if (message.length === 0) {
      return { valid: false, error: 'コミットメッセージが空です' };
    }

    if (message.length < 5) {
      return { valid: false, error: 'コミットメッセージが短すぎます（5文字以上）' };
    }

    if (message.length > 200) {
      return { valid: false, error: 'コミットメッセージが長すぎます（200文字以内）' };
    }

    return { valid: true, value: message };
  }

  // GitHub Token の検証
  static validateGitHubToken(token) {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'GitHub Token が入力されていません' };
    }

    token = token.trim();

    // GitHub Personal Access Token の形式チェック
    // classic: ghp_で始まる40文字
    // fine-grained: github_pat_で始まる
    const tokenPatterns = [
      /^ghp_[A-Za-z0-9]{36}$/,           // Classic PAT
      /^github_pat_[A-Za-z0-9_]{82}$/   // Fine-grained PAT
    ];

    const isValidPattern = tokenPatterns.some(pattern => pattern.test(token));

    if (!isValidPattern) {
      return { valid: false, error: 'GitHub Token の形式が正しくありません' };
    }

    return { valid: true, value: token };
  }

  // Slack チャンネル名の検証
  static validateSlackChannel(channel) {
    if (!channel || typeof channel !== 'string') {
      return { valid: false, error: 'Slack チャンネル名が入力されていません' };
    }

    channel = channel.trim();

    if (!channel.startsWith('#')) {
      channel = '#' + channel;
    }

    if (channel.length < 2) {
      return { valid: false, error: 'チャンネル名が短すぎます' };
    }

    if (channel.length > 22) {
      return { valid: false, error: 'チャンネル名が長すぎます（21文字以内）' };
    }

    // Slack チャンネル名の規則
    const channelPattern = /^#[a-z0-9_-]+$/;
    if (!channelPattern.test(channel)) {
      return { valid: false, error: 'チャンネル名は小文字、数字、ハイフン、アンダースコアのみ使用可能です' };
    }

    return { valid: true, value: channel };
  }

  // URL の検証
  static validateUrl(url, protocol = 'https') {
    if (!url || typeof url !== 'string') {
      return { valid: false, error: 'URL が入力されていません' };
    }

    url = url.trim();

    try {
      const urlObj = new URL(url);

      if (protocol && urlObj.protocol !== `${protocol}:`) {
        return { valid: false, error: `${protocol} プロトコルを使用してください` };
      }

      return { valid: true, value: url };
    } catch (error) {
      return { valid: false, error: 'URL の形式が正しくありません' };
    }
  }

  // Discord Webhook URL の検証
  static validateDiscordWebhook(url) {
    const basicValidation = this.validateUrl(url);
    if (!basicValidation.valid) {
      return basicValidation;
    }

    // Discord Webhook URL の形式チェック
    const discordPattern = /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/;
    if (!discordPattern.test(url)) {
      return { valid: false, error: 'Discord Webhook URL の形式が正しくありません' };
    }

    return { valid: true, value: url };
  }

  // ファイルパスの検証
  static validateFilePath(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      return { valid: false, error: 'ファイルパスが入力されていません' };
    }

    filePath = filePath.trim();

    // 危険なパスパターンをチェック
    const dangerousPatterns = [
      /\.\./,           // ディレクトリトラバーサル
      /^\/etc/,         // システムディレクトリ
      /^\/root/,        // ルートディレクトリ
      /^\/var\/log/,    // ログディレクトリ
      /\0/              // ヌル文字
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(filePath)) {
        return { valid: false, error: '危険なファイルパスです' };
      }
    }

    return { valid: true, value: filePath };
  }

  // 一般的な入力値の検証
  static validateInput(value, options = {}) {
    const {
      required = true,
      minLength = 1,
      maxLength = 255,
      pattern = null,
      customValidator = null
    } = options;

    if (required && (!value || (typeof value === 'string' && value.trim().length === 0))) {
      return { valid: false, error: '入力が必要です' };
    }

    if (!required && !value) {
      return { valid: true, value: null };
    }

    if (typeof value === 'string') {
      value = value.trim();

      if (value.length < minLength) {
        return { valid: false, error: `${minLength}文字以上入力してください` };
      }

      if (value.length > maxLength) {
        return { valid: false, error: `${maxLength}文字以内で入力してください` };
      }

      if (pattern && !pattern.test(value)) {
        return { valid: false, error: '入力形式が正しくありません' };
      }
    }

    if (customValidator) {
      const customResult = customValidator(value);
      if (!customResult.valid) {
        return customResult;
      }
    }

    return { valid: true, value };
  }

  // 複数の検証結果をまとめる
  static validateAll(validations) {
    const errors = [];
    const values = {};

    for (const [key, result] of Object.entries(validations)) {
      if (!result.valid) {
        errors.push(`${key}: ${result.error}`);
      } else {
        values[key] = result.value;
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors, values: null };
    }

    return { valid: true, errors: [], values };
  }
}

module.exports = Validation;