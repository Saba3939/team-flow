const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const Config = require('../config');
const config = new Config();

class Logger {
  constructor() {
    this.logLevel = config.get('app.debug') ? 'debug' : 'info';
    this.logFile = path.join(process.cwd(), '.team-flow.log');
  }

  // ログレベルのチェック
  _shouldLog(level) {
    const levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    return levels[level] <= levels[this.logLevel];
  }

  // 現在時刻のフォーマット
  _getCurrentTime() {
    return new Date().toISOString();
  }

  // ログファイルへの書き込み
  async _writeToFile(level, message) {
    try {
      const logEntry = `[${this._getCurrentTime()}] [${level.toUpperCase()}] ${message}\n`;
      await fs.appendFile(this.logFile, logEntry);
    } catch (error) {
      // ログファイル書き込みエラーは無視（循環参照を避けるため）
      console.error('ログファイル書き込みエラー:', error.message);
    }
  }


  // エラーログ
  error(message, error = null) {
    if (!this._shouldLog('error')) return;

    const errorMsg = error ? `${message} - ${error.message}` : message;
    console.error(chalk.red('❌ エラー:'), errorMsg);

    if (error && config.get('app.debug')) {
      console.error(chalk.gray(error.stack));
    }

    this._writeToFile('error', errorMsg);
  }

  // 警告ログ
  warn(message) {
    if (!this._shouldLog('warn')) return;

    console.warn(chalk.yellow('⚠️  警告:'), message);
    this._writeToFile('warn', message);
  }

  // 情報ログ
  info(message) {
    if (!this._shouldLog('info')) return;

    console.info(chalk.blue('ℹ️  情報:'), message);
    this._writeToFile('info', message);
  }

  // 成功ログ
  success(message) {
    if (!this._shouldLog('info')) return;

    console.log(chalk.green('✅ 成功:'), message);
    this._writeToFile('info', `SUCCESS: ${message}`);
  }

  // デバッグログ
  debug(message) {
    if (!this._shouldLog('debug')) return;

    console.log(chalk.gray('🔍 デバッグ:'), message);
    this._writeToFile('debug', message);
  }

  // プロセス開始ログ
  startProcess(message) {
    console.log(chalk.cyan('🚀 開始:'), message);
    this._writeToFile('info', `START: ${message}`);
  }

  // プロセス終了ログ
  endProcess(message) {
    console.log(chalk.magenta('🏁 完了:'), message);
    this._writeToFile('info', `END: ${message}`);
  }

  // ログファイルのクリア
  async clearLog() {
    try {
      await fs.remove(this.logFile);
      this.info('ログファイルをクリアしました');
    } catch (error) {
      this.error('ログファイルクリアに失敗', error);
    }
  }

  // ログファイルの内容を取得
  async getLogContent(lines = 100) {
    try {
      if (!(await fs.pathExists(this.logFile))) {
        return '';
      }

      const content = await fs.readFile(this.logFile, 'utf8');
      const logLines = content.split('\n').filter(line => line.trim());

      // 最新のN行を返す
      return logLines.slice(-lines).join('\n');
    } catch (error) {
      this.warn('ログファイルの読み取りに失敗');
      return '';
    }
  }

  // エラーログの内容を取得
  async getErrorLogContent(lines = 50) {
    try {
      if (!(await fs.pathExists(this.errorLogFile))) {
        return '';
      }

      const content = await fs.readFile(this.errorLogFile, 'utf8');
      const logLines = content.split('\n').filter(line => line.trim());

      return logLines.slice(-lines).join('\n');
    } catch (error) {
      return '';
    }
  }

  // ログ統計を取得
  async getLogStats() {
    try {
      const stats = {
        mainLogSize: 0,
        errorLogSize: 0,
        totalFiles: 0,
        oldestLog: null,
        newestLog: null
      };

      if (await fs.pathExists(this.logFile)) {
        const mainStats = await fs.stat(this.logFile);
        stats.mainLogSize = mainStats.size;
        stats.newestLog = mainStats.mtime;
      }

      if (await fs.pathExists(this.errorLogFile)) {
        const errorStats = await fs.stat(this.errorLogFile);
        stats.errorLogSize = errorStats.size;
      }

      const logFiles = await fs.readdir(this.logDir);
      stats.totalFiles = logFiles.filter(f => f.endsWith('.log')).length;

      // 最古のログファイルを検索
      for (const file of logFiles) {
        if (file.endsWith('.log')) {
          const filePath = path.join(this.logDir, file);
          const fileStats = await fs.stat(filePath);

          if (!stats.oldestLog || fileStats.mtime < stats.oldestLog) {
            stats.oldestLog = fileStats.mtime;
          }
        }
      }

      return stats;
    } catch (error) {
      return {
        mainLogSize: 0,
        errorLogSize: 0,
        totalFiles: 0,
        oldestLog: null,
        newestLog: null
      };
    }
  }

  // セキュリティログ（機密情報をマスク）
  securityLog(level, message, data = {}) {
    // 機密情報をマスク
    const maskedData = this._maskSensitiveData(data);
    const maskedMessage = this._maskSensitiveMessage(message);

    this[level](maskedMessage, maskedData);
  }

  // 機密情報をマスク
  _maskSensitiveData(data) {
    const sensitiveKeys = ['token', 'password', 'secret', 'key', 'auth', 'credential'];
    const masked = { ...data };

    for (const key in masked) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        masked[key] = '***masked***';
      }
    }

    return masked;
  }

  // メッセージ内の機密情報をマスク
  _maskSensitiveMessage(message) {
    // トークンパターンをマスク
    return message
      .replace(/token[:\s=]+[\w-]+/gi, 'token: ***masked***')
      .replace(/password[:\s=]+\S+/gi, 'password: ***masked***')
      .replace(/ghp_[\w]+/g, 'ghp_***masked***');
  }
}

module.exports = new Logger();