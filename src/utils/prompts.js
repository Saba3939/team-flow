/**
 * 対話型プロンプトシステム
 * team-flowの核となるユーザーインターフェース機能
 */

const { select, input, confirm, checkbox } = require('@inquirer/prompts');
const chalk = require('chalk');
const logger = require('./logger');
const validation = require('./validation');
const {
  WORK_TYPES,
  CONFIRMATIONS,
  HELP_MESSAGES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  PROMPT_CHOICES
} = require('../templates/messages');

/**
 * 基本プロンプト機能クラス
 */
class PromptHelper {
  /**
   * 作業種別を選択
   * @returns {string} 選択された作業種別のキー
   */
  static async selectWorkType() {
    try {
      console.log(chalk.cyan('\n🚀 どのような作業を始めますか？\n'));

      const workType = await select({
        message: '作業種別を選択してください:',
        choices: PROMPT_CHOICES.workTypes(),
        pageSize: 10
      });

      const selectedType = WORK_TYPES[workType];
      console.log(chalk.green(`\n✅ ${selectedType.name} を選択しました`));
      console.log(chalk.gray(`💡 ${selectedType.help}\n`));

      return workType;
    } catch (error) {
      if (error.name === 'ExitPromptError') {
        logger.info('操作がキャンセルされました');
        process.exit(0);
      }
      logger.error('作業種別選択でエラーが発生', error);
      throw error;
    }
  }

  /**
   * ブランチ名を入力
   * @param {string} workType 作業種別
   * @returns {string} 入力されたブランチ名
   */
  static async inputBranchName(workType = 'feature') {
    try {
      const typeInfo = WORK_TYPES[workType];
      const prefix = typeInfo ? typeInfo.branchPrefix : 'feat/';

      console.log(chalk.cyan('\n📝 ブランチ名を入力してください\n'));
      console.log(chalk.gray(`推奨プレフィックス: ${chalk.yellow(prefix)}`));
      console.log(chalk.gray(`例: ${typeInfo?.examples?.join(', ') || 'user-login, api-fix'}\n`));

      let branchName;
      let isValid = false;

      while (!isValid) {
        branchName = await input({
          message: 'ブランチ名:',
          default: prefix,
          validate: (value) => {
            const result = validation.validateBranchName(value);
            if (!result.valid) {
              return chalk.red(result.error);
            }
            return true;
          }
        });

        const validationResult = validation.validateBranchName(branchName);
        if (validationResult.valid) {
          isValid = true;
          branchName = validationResult.value;
        } else {
          console.log(ERROR_MESSAGES.invalidBranchName(branchName));
        }
      }

      console.log(chalk.green(`\n✅ ブランチ名: ${chalk.cyan(branchName)}\n`));
      return branchName;
    } catch (error) {
      if (error.name === 'ExitPromptError') {
        logger.info('操作がキャンセルされました');
        process.exit(0);
      }
      logger.error('ブランチ名入力でエラーが発生', error);
      throw error;
    }
  }

  /**
   * アクションの確認プロンプト
   * @param {string} actionType 確認するアクションの種類
   * @param {any} details アクションの詳細情報
   * @returns {boolean} 確認結果
   */
  static async confirmAction(actionType, details = null) {
    try {
      const confirmation = CONFIRMATIONS[actionType];
      if (!confirmation) {
        throw new Error(`未知の確認タイプ: ${actionType}`);
      }

      const config = typeof confirmation === 'function'
        ? confirmation(details)
        : confirmation;

      console.log(chalk.yellow('\n⚠️  確認が必要です\n'));

      if (config.warning) {
        console.log(chalk.red(`🚨 注意: ${config.warning}\n`));
      }

      const result = await confirm({
        message: config.message,
        default: false
      });

      if (result) {
        console.log(chalk.green('✅ 実行します\n'));
      } else {
        console.log(chalk.gray('❌ キャンセルしました\n'));
      }

      return result;
    } catch (error) {
      if (error.name === 'ExitPromptError') {
        logger.info('操作がキャンセルされました');
        process.exit(0);
      }
      logger.error('確認プロンプトでエラーが発生', error);
      throw error;
    }
  }

  /**
   * レビュアーを選択
   * @param {Array} teamMembers チームメンバーのリスト
   * @returns {Array} 選択されたレビュアーのリスト
   */
  static async selectReviewers(teamMembers = []) {
    try {
      if (!teamMembers || teamMembers.length === 0) {
        console.log(chalk.yellow('チームメンバーが設定されていません'));
        return [];
      }

      console.log(chalk.cyan('\n👥 レビュアーを選択してください\n'));

      const choices = teamMembers.map(member => ({
        name: `${member.name} (${member.username})`,
        value: member.username,
        checked: false
      }));

      choices.push({
        name: chalk.gray('後で指定する'),
        value: null,
        checked: false
      });

      const reviewers = await checkbox({
        message: 'レビュアーを選択:',
        choices: choices,
        required: false
      });

      const selectedReviewers = reviewers.filter(r => r !== null);

      if (selectedReviewers.length > 0) {
        console.log(chalk.green(`\n✅ ${selectedReviewers.length}人のレビュアーを選択しました`));
        selectedReviewers.forEach(reviewer => {
          console.log(chalk.cyan(`   • ${reviewer}`));
        });
      } else {
        console.log(chalk.gray('\n📝 レビュアーは後で指定します'));
      }

      return selectedReviewers;
    } catch (error) {
      if (error.name === 'ExitPromptError') {
        logger.info('操作がキャンセルされました');
        process.exit(0);
      }
      logger.error('レビュアー選択でエラーが発生', error);
      throw error;
    }
  }

  /**
   * コミットメッセージを入力
   * @param {string} workType 作業種別（ヒント用）
   * @returns {string} 入力されたコミットメッセージ
   */
  static async inputCommitMessage() {
    try {
      console.log(chalk.cyan('\n💬 コミットメッセージを入力してください\n'));
      console.log(HELP_MESSAGES.commitMessage);

      let message;
      let isValid = false;

      while (!isValid) {
        message = await input({
          message: 'コミットメッセージ:',
          validate: (value) => {
            const result = validation.validateCommitMessage(value);
            if (!result.valid) {
              return chalk.red(result.error);
            }
            return true;
          }
        });

        const validationResult = validation.validateCommitMessage(message);
        if (validationResult.valid) {
          isValid = true;
          message = validationResult.value;
        } else {
          console.log(ERROR_MESSAGES.invalidCommitMessage(message));
        }
      }

      console.log(chalk.green(`\n✅ コミットメッセージ: ${chalk.cyan(message)}\n`));
      return message;
    } catch (error) {
      if (error.name === 'ExitPromptError') {
        logger.info('操作がキャンセルされました');
        process.exit(0);
      }
      logger.error('コミットメッセージ入力でエラーが発生', error);
      throw error;
    }
  }

  /**
   * 選択肢から選択
   * @param {string} message プロンプトメッセージ
   * @param {Array} choices 選択肢の配列
   * @param {string} defaultValue デフォルト値
   * @returns {any} 選択された値
   */
  static async selectFromChoices(message, choices, defaultValue = null) {
    try {
      const result = await select({
        message: message,
        choices: choices,
        default: defaultValue
      });

      return result;
    } catch (error) {
      if (error.name === 'ExitPromptError') {
        logger.info('操作がキャンセルされました');
        process.exit(0);
      }
      logger.error('選択プロンプトでエラーが発生', error);
      throw error;
    }
  }

  /**
   * テキスト入力
   * @param {string} message プロンプトメッセージ
   * @param {string} defaultValue デフォルト値
   * @param {Function} validator 検証関数
   * @returns {string} 入力された値
   */
  static async inputText(message, defaultValue = '', validator = null) {
    try {
      const options = {
        message: message,
        default: defaultValue
      };

      if (validator) {
        options.validate = validator;
      }

      const result = await input(options);
      return result;
    } catch (error) {
      if (error.name === 'ExitPromptError') {
        logger.info('操作がキャンセルされました');
        process.exit(0);
      }
      logger.error('テキスト入力でエラーが発生', error);
      throw error;
    }
  }

  /**
   * ヘルプメッセージを表示
   * @param {string} topic ヘルプのトピック
   */
  static showHelp(topic = 'general') {
    console.log(chalk.cyan('\n📖 ヘルプ\n'));

    switch (topic) {
    case 'branchNaming':
      console.log(HELP_MESSAGES.branchNaming);
      break;
    case 'commitMessage':
      console.log(HELP_MESSAGES.commitMessage);
      break;
    case 'gitFlow':
      console.log(HELP_MESSAGES.gitFlow);
      break;
    case 'safety':
      console.log(HELP_MESSAGES.safety);
      break;
    default:
      console.log(HELP_MESSAGES.gitFlow);
      console.log(HELP_MESSAGES.safety);
      break;
    }

    console.log();
  }

  /**
   * エラーメッセージを表示
   * @param {string} errorType エラーの種類
   * @param {any} details エラーの詳細
   */
  static showError(errorType, details = null) {
    const errorMessage = ERROR_MESSAGES[errorType];
    if (errorMessage) {
      if (typeof errorMessage === 'function') {
        console.log(errorMessage(details));
      } else {
        console.log(errorMessage);
      }
    } else {
      console.log(chalk.red(`未知のエラー: ${errorType}`));
    }
  }

  /**
   * 成功メッセージを表示
   * @param {string} successType 成功の種類
   * @param {any} details 成功の詳細
   */
  static showSuccess(successType, details = null) {
    const successMessage = SUCCESS_MESSAGES[successType];
    if (successMessage) {
      if (typeof successMessage === 'function') {
        console.log(successMessage(details));
      } else {
        console.log(successMessage);
      }
    } else {
      console.log(chalk.green(`成功: ${successType}`));
    }
  }
}

/**
 * 段階的ガイド機能クラス
 */
class GuidedWorkflow {
  /**
   * ブランチ作成の段階的ガイド
   * @returns {Object} 作成されたブランチの情報
   */
  static async guidedBranchCreation() {
    try {
      console.log(chalk.cyan('\n🌿 新しいブランチを作成します\n'));

      // Step 1: 作業種別選択
      const workType = await PromptHelper.selectWorkType();

      // Step 2: ブランチ名入力
      const branchName = await PromptHelper.inputBranchName(workType);

      // Step 3: 確認
      const confirmed = await PromptHelper.confirmAction('createBranch', branchName);

      if (!confirmed) {
        console.log(chalk.gray('ブランチ作成をキャンセルしました'));
        return null;
      }

      return {
        workType,
        branchName,
        confirmed: true
      };
    } catch (error) {
      logger.error('ガイド付きブランチ作成でエラーが発生', error);
      throw error;
    }
  }

  /**
   * コミットメッセージの段階的ガイド
   * @param {string} workType 作業種別
   * @returns {Object} コミット情報
   */
  static async guidedCommitMessage(workType = null) {
    try {
      console.log(chalk.cyan('\n💬 コミットを作成します\n'));

      // Step 1: 変更内容の確認を促す
      console.log(chalk.yellow('📋 コミット前のチェックリスト:'));
      console.log(chalk.gray('  ✓ 変更内容を確認しましたか？'));
      console.log(chalk.gray('  ✓ テストは通りますか？'));
      console.log(chalk.gray('  ✓ 不要なファイルは含まれていませんか？\n'));

      const readyToCommit = await PromptHelper.confirmAction('commit', 'チェックリストを確認しました');
      if (!readyToCommit) {
        console.log(chalk.gray('コミット作成をキャンセルしました'));
        return null;
      }

      // Step 2: コミットメッセージ入力
      const message = await PromptHelper.inputCommitMessage(workType);

      // Step 3: 最終確認
      const confirmed = await PromptHelper.confirmAction('commit', message);

      if (!confirmed) {
        console.log(chalk.gray('コミット作成をキャンセルしました'));
        return null;
      }

      return {
        message,
        workType,
        confirmed: true
      };
    } catch (error) {
      logger.error('ガイド付きコミット作成でエラーが発生', error);
      throw error;
    }
  }

  /**
   * プルリクエスト作成の段階的ガイド
   * @param {Array} teamMembers チームメンバー一覧
   * @returns {Object} プルリクエスト情報
   */
  static async guidedPullRequest(teamMembers = []) {
    try {
      console.log(chalk.cyan('\n🔄 プルリクエストを作成します\n'));

      // Step 1: PR作成前のチェック
      console.log(chalk.yellow('📋 プルリクエスト前のチェックリスト:'));
      console.log(chalk.gray('  ✓ 最新のmainブランチと同期されていますか？'));
      console.log(chalk.gray('  ✓ 変更内容は完成していますか？'));
      console.log(chalk.gray('  ✓ テストが通ることを確認しましたか？'));
      console.log(chalk.gray('  ✓ 不要なコードは削除しましたか？\n'));

      const readyForPR = await confirm({
        message: 'プルリクエストを作成する準備はできていますか？',
        default: false
      });

      if (!readyForPR) {
        console.log(chalk.gray('プルリクエスト作成をキャンセルしました'));
        return null;
      }

      // Step 2: PRのタイトル入力
      const title = await PromptHelper.inputText(
        'プルリクエストのタイトル:',
        '',
        (value) => {
          if (!value || value.trim().length < 5) {
            return '5文字以上のタイトルを入力してください';
          }
          return true;
        }
      );

      // Step 3: PRの説明入力
      const description = await PromptHelper.inputText(
        'プルリクエストの説明（任意）:',
        '',
        null
      );

      // Step 4: レビュアー選択
      const reviewers = await PromptHelper.selectReviewers(teamMembers);

      // Step 5: ドラフトかどうか
      const isDraft = await confirm({
        message: 'ドラフトとして作成しますか？',
        default: false
      });

      // Step 6: 最終確認
      console.log(chalk.cyan('\n📄 プルリクエスト情報:'));
      console.log(chalk.white(`タイトル: ${title}`));
      if (description) {
        console.log(chalk.white(`説明: ${description}`));
      }
      if (reviewers.length > 0) {
        console.log(chalk.white(`レビュアー: ${reviewers.join(', ')}`));
      }
      console.log(chalk.white(`ドラフト: ${isDraft ? 'はい' : 'いいえ'}\n`));

      const confirmed = await PromptHelper.confirmAction('createPR');

      if (!confirmed) {
        console.log(chalk.gray('プルリクエスト作成をキャンセルしました'));
        return null;
      }

      return {
        title,
        description,
        reviewers,
        isDraft,
        confirmed: true
      };
    } catch (error) {
      logger.error('ガイド付きPR作成でエラーが発生', error);
      throw error;
    }
  }

  /**
   * 作業開始の総合ガイド
   * @returns {Object} 作業開始の設定情報
   */
  static async guidedWorkStart() {
    try {
      console.log(chalk.cyan('\n🚀 新しい作業を開始します\n'));

      // 現在のGit状態をチェック
      console.log(chalk.yellow('📋 作業開始前のチェック:'));
      console.log(chalk.gray('  • 現在のブランチと作業状況を確認します'));
      console.log(chalk.gray('  • 最新の変更を取得します'));
      console.log(chalk.gray('  • 新しいブランチを作成します\n'));

      // ブランチ作成ガイド
      const branchInfo = await this.guidedBranchCreation();
      if (!branchInfo) {
        return null;
      }

      // 作業方針の説明
      const workType = WORK_TYPES[branchInfo.workType];
      console.log(chalk.green('\n✅ 作業準備が完了しました！\n'));
      console.log(chalk.cyan('📝 作業のポイント:'));
      workType.examples.forEach(example => {
        console.log(chalk.gray(`  • ${example}`));
      });
      console.log();

      // 次のステップの案内
      console.log(chalk.yellow('🔄 作業フロー:'));
      console.log(chalk.gray('  1. コードを変更'));
      console.log(chalk.gray('  2. team-flow continue で進捗確認'));
      console.log(chalk.gray('  3. team-flow finish で作業完了'));
      console.log();

      return branchInfo;
    } catch (error) {
      logger.error('ガイド付き作業開始でエラーが発生', error);
      throw error;
    }
  }

  /**
   * 作業完了の総合ガイド
   * @param {Array} teamMembers チームメンバー一覧
   * @returns {Object} 作業完了の情報
   */
  static async guidedWorkFinish(teamMembers = []) {
    try {
      console.log(chalk.cyan('\n🏁 作業を完了します\n'));

      // Step 1: コミット作成
      const commitInfo = await this.guidedCommitMessage();
      if (!commitInfo) {
        return null;
      }

      // Step 2: プッシュ確認
      const shouldPush = await confirm({
        message: 'リモートリポジトリにプッシュしますか？',
        default: true
      });

      // Step 3: プルリクエスト作成するか
      let prInfo = null;
      if (shouldPush) {
        const shouldCreatePR = await confirm({
          message: 'プルリクエストを作成しますか？',
          default: true
        });

        if (shouldCreatePR) {
          prInfo = await this.guidedPullRequest(teamMembers);
        }
      }

      return {
        commit: commitInfo,
        push: shouldPush,
        pullRequest: prInfo,
        completed: true
      };
    } catch (error) {
      logger.error('ガイド付き作業完了でエラーが発生', error);
      throw error;
    }
  }
}

module.exports = { PromptHelper, GuidedWorkflow };