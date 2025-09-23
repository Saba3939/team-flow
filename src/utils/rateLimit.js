const logger = require('./logger');

/**
 * GitHub API レート制限管理
 */
class RateLimitManager {
  constructor() {
    this.requestQueue = [];
    this.isProcessing = false;
    this.lastRequestTime = 0;
    this.minRequestInterval = 100; // 最小リクエスト間隔（ミリ秒）
    this.rateLimit = null;
  }

  /**
   * レート制限を考慮してAPIリクエストを実行
   */
  async executeWithRateLimit(apiCall) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        apiCall,
        resolve,
        reject,
        timestamp: Date.now()
      });

      this.processQueue();
    });
  }

  /**
   * リクエストキューを処理
   */
  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.requestQueue.length > 0) {
        const request = this.requestQueue.shift();

        // レート制限チェック
        await this.checkAndWaitForRateLimit();

        // 最小間隔の確保
        const timeSinceLastRequest = Date.now() - this.lastRequestTime;
        if (timeSinceLastRequest < this.minRequestInterval) {
          const waitTime = this.minRequestInterval - timeSinceLastRequest;
          await this.sleep(waitTime);
        }

        try {
          this.lastRequestTime = Date.now();
          const result = await request.apiCall();

          // レスポンスヘッダーからレート制限情報を更新
          if (result && result.headers) {
            this.updateRateLimitFromHeaders(result.headers);
          }

          request.resolve(result);
        } catch (error) {
          // レート制限エラーの場合は再試行
          if (this.isRateLimitError(error)) {
            logger.warn('レート制限に達しました。待機します...');
            await this.waitForRateLimit(error);

            // リクエストをキューの先頭に戻す
            this.requestQueue.unshift(request);
          } else {
            request.reject(error);
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * レート制限状況をチェックして必要に応じて待機
   */
  async checkAndWaitForRateLimit() {
    if (!this.rateLimit) {
      return;
    }

    const { remaining, reset } = this.rateLimit;

    if (remaining <= 0) {
      const resetTime = new Date(reset * 1000);
      const waitTime = resetTime.getTime() - Date.now();

      if (waitTime > 0) {
        logger.info(`レート制限により ${Math.ceil(waitTime / 1000)} 秒待機します...`);
        await this.sleep(waitTime);
      }
    } else if (remaining < 5) {
      // 残り5未満の場合のみ警告（従来の10から変更）
      logger.warn(`API制限残り: ${remaining}。少し待機します...`);
      await this.sleep(1000);
    }
  }

  /**
   * レート制限エラーかどうかをチェック
   */
  isRateLimitError(error) {
    return error.status === 403 &&
           (error.message.includes('rate limit') ||
            error.message.includes('API rate limit exceeded'));
  }

  /**
   * レート制限エラー時の待機処理
   */
  async waitForRateLimit(error) {
    let waitTime = 60000; // デフォルト1分

    // エラーレスポンスから待機時間を取得
    if (error.response && error.response.headers) {
      const rateLimitReset = error.response.headers['x-ratelimit-reset'];
      if (rateLimitReset) {
        const resetTime = parseInt(rateLimitReset) * 1000;
        waitTime = Math.max(resetTime - Date.now(), 0) + 1000; // 1秒余裕を持たせる
      }
    }

    logger.info(`レート制限エラー。${Math.ceil(waitTime / 1000)}秒待機します...`);
    await this.sleep(waitTime);
  }

  /**
   * レスポンスヘッダーからレート制限情報を更新
   */
  updateRateLimitFromHeaders(headers) {
    const limit = headers['x-ratelimit-limit'];
    const remaining = headers['x-ratelimit-remaining'];
    const reset = headers['x-ratelimit-reset'];

    if (limit && remaining && reset) {
      this.rateLimit = {
        limit: parseInt(limit),
        remaining: parseInt(remaining),
        reset: parseInt(reset),
        used: parseInt(limit) - parseInt(remaining)
      };

      // 残り10未満の場合のみ警告（従来の100から変更）
      if (this.rateLimit.remaining < 10) {
        const resetDate = new Date(this.rateLimit.reset * 1000);
        const minutesUntilReset = Math.ceil((resetDate - new Date()) / (1000 * 60));
        logger.warn(`API制限残り: ${this.rateLimit.remaining}/${this.rateLimit.limit} (${minutesUntilReset}分後にリセット)`);
      }
    }
  }

  /**
   * 現在のレート制限状況を取得
   */
  getRateLimitStatus() {
    if (!this.rateLimit) {
      return {
        available: true,
        message: 'レート制限情報が不明です'
      };
    }

    const { remaining, limit, reset } = this.rateLimit;
    const resetDate = new Date(reset * 1000);
    const minutesUntilReset = Math.ceil((resetDate - new Date()) / (1000 * 60));

    if (remaining === 0) {
      return {
        available: false,
        message: `レート制限に達しました。${minutesUntilReset}分後にリセットされます。`,
        resetAt: resetDate
      };
    }

    return {
      available: true,
      remaining,
      limit,
      resetAt: resetDate,
      message: `API制限: ${remaining}/${limit} (${minutesUntilReset}分後にリセット)`
    };
  }

  /**
   * キューの統計情報を取得
   */
  getQueueStats() {
    return {
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessing,
      lastRequestTime: this.lastRequestTime,
      rateLimit: this.rateLimit
    };
  }

  /**
   * 指定時間待機
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * キューをクリア
   */
  clearQueue() {
    this.requestQueue.forEach(request => {
      request.reject(new Error('リクエストキューがクリアされました'));
    });
    this.requestQueue = [];
    this.isProcessing = false;
  }
}

module.exports = RateLimitManager;