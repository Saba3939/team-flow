const git = require('./git');
const { input, select, confirm } = require('@inquirer/prompts');
const chalk = require('chalk');

/**
 * コミット支援ユーティリティ
 */
class CommitHelper {
  /**
   * Conventional Commitsに基づくコミットメッセージを作成
   */
  static async createConventionalCommitMessage() {
    const type = await this.selectCommitType();
    const scope = await this.getScope();
    const description = await this.getDescription();
    const body = await this.getBody();
    const breaking = await this.checkBreakingChange();

    return this.formatCommitMessage(type, scope, description, body, breaking);
  }

  /**
   * コミットタイプを選択
   */
  static async selectCommitType() {
    return await select({
      message: 'コミットタイプを選択してください:',
      choices: [
        {
          name: 'feat: 新機能',
          value: 'feat',
          description: '新しい機能の追加'
        },
        {
          name: 'fix: バグ修正',
          value: 'fix',
          description: 'バグ修正'
        },
        {
          name: 'docs: ドキュメント',
          value: 'docs',
          description: 'ドキュメントのみの変更'
        },
        {
          name: 'style: スタイル',
          value: 'style',
          description: 'コードの意味に影響しない変更（空白、フォーマット等）'
        },
        {
          name: 'refactor: リファクタリング',
          value: 'refactor',
          description: 'バグ修正や機能追加ではないコード変更'
        },
        {
          name: 'perf: パフォーマンス改善',
          value: 'perf',
          description: 'パフォーマンスを改善するコード変更'
        },
        {
          name: 'test: テスト',
          value: 'test',
          description: 'テストの追加や修正'
        },
        {
          name: 'build: ビルド',
          value: 'build',
          description: 'ビルドシステムや外部依存関係に影響する変更'
        },
        {
          name: 'ci: CI',
          value: 'ci',
          description: 'CI設定ファイルやスクリプトの変更'
        },
        {
          name: 'chore: その他',
          value: 'chore',
          description: 'その他の変更'
        }
      ]
    });
  }

  /**
   * スコープを取得（任意）
   */
  static async getScope() {
    return await input({
      message: 'スコープ（任意、例: auth, api, ui）:'
    });
  }

  /**
   * 説明を取得
   */
  static async getDescription() {
    return await input({
      message: '変更内容の説明:',
      validate: (input) => {
        if (!input.trim()) {
          return '説明は必須です';
        }
        if (input.length > 72) {
          return '説明は72文字以下にしてください';
        }
        if (input.charAt(0) === input.charAt(0).toUpperCase()) {
          return '説明は小文字で始めてください';
        }
        if (input.endsWith('.')) {
          return '説明の末尾にピリオドは不要です';
        }
        return true;
      }
    });
  }

  /**
   * 詳細説明を取得（任意）
   */
  static async getBody() {
    return await input({
      message: '詳細説明（任意）:'
    });
  }

  /**
   * 破壊的変更をチェック
   */
  static async checkBreakingChange() {
    return await confirm({
      message: '破壊的変更が含まれますか？',
      default: false
    });
  }

  /**
   * コミットメッセージをフォーマット
   */
  static formatCommitMessage(type, scope, description, body, breaking) {
    let message = type;

    if (scope) {
      message += `(${scope})`;
    }

    if (breaking) {
      message += '!';
    }

    message += `: ${description}`;

    if (body) {
      message += `\n\n${body}`;
    }

    if (breaking) {
      message += '\n\nBREAKING CHANGE: ';
      // 破壊的変更の詳細は実際の実装では追加で入力を求める
    }

    return message;
  }

  /**
   * 変更ファイルを分析してコミットタイプを提案
   */
  static async suggestCommitType() {
    try {
      const changedFiles = await git.getChangedFiles();

      // ファイルパターンに基づく推奨
      const patterns = {
        docs: /\.(md|txt|rst)$/i,
        test: /\.(test|spec)\.(js|ts|py)$/i,
        style: /\.(css|scss|sass|less)$/i,
        ci: /\.(yml|yaml)$|\.github\/|Dockerfile/i,
        build: /package\.json|package-lock\.json|requirements\.txt|Gemfile/i
      };

      for (const [type, pattern] of Object.entries(patterns)) {
        if (changedFiles.some(file => pattern.test(file.path))) {
          return type;
        }
      }

      // デフォルトは feat
      return 'feat';
    } catch (error) {
      return 'feat';
    }
  }

  /**
   * コミット前チェック
   */
  static async preCommitCheck() {
    console.log(chalk.bold('📋 コミット前チェック'));

    // 1. 変更ファイル確認
    const changedFiles = await git.getChangedFiles();
    if (changedFiles.length === 0) {
      throw new Error('コミットする変更がありません');
    }

    console.log(chalk.green(`✅ ${changedFiles.length}個のファイルが変更されています`));

    // 2. 大きなファイルのチェック
    const largeFiles = changedFiles.filter(_file => {
      // ファイルサイズチェックは実際の実装では git ls-files -s などを使用
      return false; // 簡易実装
    });

    if (largeFiles.length > 0) {
      console.log(chalk.yellow('⚠️  大きなファイルが含まれています:'));
      largeFiles.forEach(file => {
        console.log(chalk.gray(`  - ${file.path}`));
      });

      const shouldContinue = await confirm({
        message: '続行しますか？',
        default: false
      });

      if (!shouldContinue) {
        throw new Error('大きなファイルのため中止されました');
      }
    }

    // 3. 機密ファイルのチェック
    const sensitiveFiles = changedFiles.filter(file => {
      const sensitivePatterns = [
        /\.env$/i,
        /\.env\./i,
        /secret/i,
        /password/i,
        /private.*key/i,
        /id_rsa/i
      ];
      return sensitivePatterns.some(pattern => pattern.test(file.path));
    });

    if (sensitiveFiles.length > 0) {
      console.log(chalk.red('🚨 機密ファイルが含まれています:'));
      sensitiveFiles.forEach(file => {
        console.log(chalk.red(`  - ${file.path}`));
      });

      const shouldContinue = await confirm({
        message: '本当に続行しますか？',
        default: false
      });

      if (!shouldContinue) {
        throw new Error('機密ファイルのため中止されました');
      }
    }

    return true;
  }

  /**
   * コミット履歴を表示
   */
  static async showRecentCommits(count = 5) {
    try {
      const commits = await git.getRecentCommits(count);

      console.log(chalk.bold(`\n📚 最近の${count}件のコミット:`));
      commits.forEach((commit, index) => {
        const number = chalk.gray(`${index + 1}.`);
        const hash = chalk.blue(commit.hash.substring(0, 7));
        const message = commit.message.split('\n')[0]; // 最初の行のみ
        const author = chalk.gray(`(${commit.author})`);

        console.log(`${number} ${hash} ${message} ${author}`);
      });
    } catch (error) {
      console.log(chalk.yellow('⚠️  コミット履歴の取得に失敗しました'));
    }
  }
}

module.exports = CommitHelper;