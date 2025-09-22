const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const config = require('../config');

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
  async getLogContent() {
    try {
      return await fs.readFile(this.logFile, 'utf8');
    } catch (error) {
      this.warn('ログファイルが存在しません');
      return '';
    }
  }
}

module.exports = new Logger();