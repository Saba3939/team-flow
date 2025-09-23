// team-flow help-flow コマンド - 緊急時対応とヘルプ機能
const chalk = require('chalk');
const { select, confirm } = require('@inquirer/prompts');
const emergencyService = require('../utils/emergency');
const diagnosisService = require('../utils/diagnosis');
const helpTemplates = require('../templates/help');
const ora = require('ora');

/**
 * ヘルプ・緊急対応メインコマンド
 */
async function helpFlowCommand() {
  try {
    console.log(chalk.bold.red('\n🆘 Team Flow - 緊急時対応・ヘルプモード\n'));

    // 緊急度の確認
    const urgencyLevel = await select({
      message: '現在の状況の緊急度を選択してください:',
      choices: [
        {
          name: '🚨 緊急 - 作業が続行不可能',
          value: 'high',
          description: 'マージコンフリクト、重要ファイルの誤削除、リポジトリ破損など'
        },
        {
          name: '⚠️  中程度 - 修正が必要',
          value: 'medium',
          description: '間違ったコミット、プッシュの取り消し、ブランチ名変更など'
        },
        {
          name: 'ℹ️  低 - 情報や学習支援',
          value: 'low',
          description: '使い方、概念の理解、ベストプラクティス、チュートリアルなど'
        }
      ]
    });

    console.log(chalk.gray('\n📊 現在の状況を診断しています...\n'));

    // 状況診断
    const spinner = ora('Git状態を分析中...').start();
    const diagnosis = await diagnosisService.analyzeSituation();
    spinner.succeed('診断完了');

    // 診断結果の表示
    diagnosisService.displayDiagnosis(diagnosis);

    // 緊急度別の対応
    switch (urgencyLevel) {
    case 'high':
      await handleHighUrgency(diagnosis);
      break;
    case 'medium':
      await handleMediumUrgency(diagnosis);
      break;
    case 'low':
      await handleLowUrgency();
      break;
    }

  } catch (error) {
    console.error(chalk.red('\n❌ ヘルプコマンドでエラーが発生しました:'));
    console.error(error.message);
    console.log(chalk.gray('\nteam-flow help-flow を再実行するか、手動でGit操作を行ってください。'));
  }
}

/**
 * 高緊急度の問題への対応
 */
async function handleHighUrgency(diagnosis) {
  console.log(chalk.bold.red('\n🚨 緊急事態対応モード\n'));

  const emergencyOptions = [
    {
      name: '🔄 マージコンフリクトの解決',
      value: 'resolve_conflict',
      description: 'ステップバイステップでコンフリクトを解決'
    },
    {
      name: '↩️  作業の取り消し（reset）',
      value: 'reset_work',
      description: '最新のコミットや変更を取り消し'
    },
    {
      name: '🗃️  重要ファイルの復旧',
      value: 'restore_files',
      description: '削除されたファイルを復旧'
    },
    {
      name: '🏥 リポジトリの修復',
      value: 'repair_repo',
      description: 'リポジトリの整合性を修復'
    },
    {
      name: '💾 緊急バックアップの作成',
      value: 'emergency_backup',
      description: '現在の状態をバックアップしてから対応'
    }
  ];

  const emergencyAction = await select({
    message: '実行したい緊急対応を選択してください:',
    choices: emergencyOptions
  });

  await emergencyService.handleEmergency(emergencyAction, diagnosis);
}

/**
 * 中程度緊急度の問題への対応
 */
async function handleMediumUrgency(diagnosis) {
  console.log(chalk.bold.yellow('\n⚠️  修正対応モード\n'));

  const fixOptions = [
    {
      name: '🔄 最新コミットの修正',
      value: 'amend_commit',
      description: 'コミットメッセージやファイルの修正'
    },
    {
      name: '↪️  コミットの取り消し',
      value: 'revert_commit',
      description: 'コミットを安全に取り消し'
    },
    {
      name: '🏷️  ブランチ名の変更',
      value: 'rename_branch',
      description: 'ブランチ名を変更'
    },
    {
      name: '🔄 プッシュの取り消し',
      value: 'undo_push',
      description: 'プッシュした内容を取り消し（注意が必要）'
    },
    {
      name: '📚 履歴の整理',
      value: 'clean_history',
      description: 'コミット履歴の整理とクリーンアップ'
    }
  ];

  const fixAction = await select({
    message: '実行したい修正作業を選択してください:',
    choices: fixOptions
  });

  await emergencyService.handleFix(fixAction, diagnosis);
}

/**
 * 低緊急度（学習支援）への対応
 */
async function handleLowUrgency() {
  console.log(chalk.bold.blue('\nℹ️  学習支援モード\n'));

  const helpOptions = [
    {
      name: '📖 Git基本概念の説明',
      value: 'git_concepts',
      description: 'リポジトリ、ブランチ、コミットなどの概念'
    },
    {
      name: '🛠️  team-flowの使い方',
      value: 'teamflow_guide',
      description: 'コマンドの使い方と実践的なワークフロー'
    },
    {
      name: '💡 ベストプラクティス',
      value: 'best_practices',
      description: 'チーム開発での推奨事項'
    },
    {
      name: '🎯 よくある問題と解決方法',
      value: 'common_issues',
      description: 'よくあるトラブルシューティング'
    },
    {
      name: '🏃 インタラクティブチュートリアル',
      value: 'tutorial',
      description: 'ハンズオンでGitとteam-flowを学習'
    }
  ];

  const helpAction = await select({
    message: '学習したい内容を選択してください:',
    choices: helpOptions
  });

  await displayHelpContent(helpAction);
}

/**
 * ヘルプコンテンツの表示
 */
async function displayHelpContent(action) {
  switch (action) {
  case 'git_concepts':
    helpTemplates.showGitConcepts();
    break;
  case 'teamflow_guide':
    helpTemplates.showTeamFlowGuide();
    break;
  case 'best_practices':
    helpTemplates.showBestPractices();
    break;
  case 'common_issues':
    helpTemplates.showCommonIssues();
    break;
  case 'tutorial':
    await helpTemplates.runInteractiveTutorial();
    break;
  }

  // 追加の質問があるかを確認
  const hasMoreQuestions = await confirm({
    message: '\n他にも質問がありますか？',
    default: false
  });

  if (hasMoreQuestions) {
    await handleLowUrgency();
  } else {
    console.log(chalk.green('\n✅ ヘルプを完了しました！'));
    console.log(chalk.gray('何か問題が発生した場合は、いつでも team-flow help-flow を実行してください。\n'));
  }
}

module.exports = helpFlowCommand;