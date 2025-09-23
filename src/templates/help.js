// ヘルプメッセージテンプレート
const chalk = require('chalk');
const { confirm, select } = require('@inquirer/prompts');

/**
 * Git基本概念の説明
 */
function showGitConcepts() {
  console.log(chalk.bold.blue('\n📖 Git基本概念ガイド\n'));

  const concepts = [
    {
      title: 'リポジトリ (Repository)',
      description: 'プロジェクトの全ファイルとその変更履歴を保存する場所',
      example: '📁 プロジェクトフォルダ全体がリポジトリです'
    },
    {
      title: 'ブランチ (Branch)',
      description: '並行して作業を進めるための分岐点',
      example: '🌿 main(メイン)、feature/login(ログイン機能)など'
    },
    {
      title: 'コミット (Commit)',
      description: 'ファイルの変更を記録・保存する操作',
      example: '📝 「ログイン機能を追加」などのメッセージと一緒に保存'
    },
    {
      title: 'プル (Pull)',
      description: 'リモートリポジトリから最新の変更を取得',
      example: '⬇️ チームメンバーの変更を自分の環境に取り込む'
    },
    {
      title: 'プッシュ (Push)',
      description: 'ローカルの変更をリモートリポジトリに送信',
      example: '⬆️ 自分の変更をチームに共有する'
    },
    {
      title: 'マージ (Merge)',
      description: 'ブランチの変更を別のブランチに統合',
      example: '🔀 feature/loginの変更をmainに統合'
    }
  ];

  concepts.forEach((concept, index) => {
    console.log(`${index + 1}. ${chalk.bold.green(concept.title)}`);
    console.log(`   ${concept.description}`);
    console.log(`   ${chalk.gray(concept.example)}\n`);
  });

  console.log(chalk.blue('💡 ポイント:'));
  console.log('• Gitは「タイムマシン」のようなもの - いつでも過去に戻れます');
  console.log('• ブランチを使って安全に実験・開発ができます');
  console.log('• 定期的なコミットで作業を細かく保存しましょう');
  console.log('• team-flowがこれらの操作を簡単にしてくれます\n');
}

/**
 * Team-Flowの使い方ガイド
 */
function showTeamFlowGuide() {
  console.log(chalk.bold.blue('\n🛠️ Team-Flow使い方ガイド\n'));

  const commands = [
    {
      command: 'team-flow start',
      description: '新しい作業を開始',
      details: [
        '• 作業種別を選択（機能開発、バグ修正など）',
        '• GitHub Issuesと連携',
        '• 適切なブランチ名を自動生成',
        '• チームに作業開始を通知'
      ]
    },
    {
      command: 'team-flow continue',
      description: '作業を継続',
      details: [
        '• 現在の進捗状況を表示',
        '• 推奨される次のアクションを提案',
        '• 必要に応じて同期やテスト実行'
      ]
    },
    {
      command: 'team-flow finish',
      description: '作業を完了',
      details: [
        '• 変更内容の確認とコミット',
        '• 自動テスト実行',
        '• プルリクエスト作成',
        '• レビュアーの提案と通知'
      ]
    },
    {
      command: 'team-flow team',
      description: 'チーム状況を確認',
      details: [
        '• アクティブなブランチ一覧',
        '• レビュー待ちPR確認',
        '• 競合リスクの警告',
        '• チーム活動メトリクス'
      ]
    },
    {
      command: 'team-flow help-flow',
      description: 'ヘルプ・緊急対応',
      details: [
        '• 問題の診断と解決支援',
        '• Git操作のガイド',
        '• 緊急時の自動復旧',
        '• 学習支援とベストプラクティス'
      ]
    }
  ];

  commands.forEach((cmd, index) => {
    console.log(`${index + 1}. ${chalk.bold.green(cmd.command)}`);
    console.log(`   ${cmd.description}\n`);
    cmd.details.forEach(detail => {
      console.log(`   ${detail}`);
    });
    console.log();
  });

  console.log(chalk.blue('🚀 使い始めのステップ:'));
  console.log('1. team-flow --setup で初期設定');
  console.log('2. team-flow start で最初の作業を開始');
  console.log('3. 普段の作業では continue → finish の流れ');
  console.log('4. 困ったときは team-flow help-flow\n');
}

/**
 * ベストプラクティスの表示
 */
function showBestPractices() {
  console.log(chalk.bold.blue('\n💡 チーム開発ベストプラクティス\n'));

  const practices = [
    {
      category: '🌿 ブランチ戦略',
      tips: [
        'mainブランチは常に安定した状態に保つ',
        '機能ごとに新しいブランチを作成する',
        'ブランチ名は明確で理解しやすくする (feat/user-login)',
        '作業完了後は速やかにブランチを削除する'
      ]
    },
    {
      category: '📝 コミット運用',
      tips: [
        '小さな変更を頻繁にコミットする',
        'コミットメッセージは変更内容を明確に記述',
        '1つのコミットには1つの論理的変更のみ含める',
        'WIP(Work In Progress)コミットは避ける'
      ]
    },
    {
      category: '🔄 プルリクエスト',
      tips: [
        'プルリクエストは小さく、レビューしやすいサイズに',
        '説明文には変更理由と影響範囲を記述',
        'テストが通ることを確認してから作成',
        'レビューを受けたら速やかに対応する'
      ]
    },
    {
      category: '👥 チーム連携',
      tips: [
        '作業開始前にチームに共有する',
        '重要な変更は事前に相談する',
        'レビューは建設的で丁寧に行う',
        '困ったときは早めに相談する'
      ]
    },
    {
      category: '⚡ 効率化',
      tips: [
        'team-flowを活用して作業を標準化',
        '定期的にリモートと同期する',
        'CI/CDパイプラインを活用する',
        '自動化できる作業は自動化する'
      ]
    }
  ];

  practices.forEach((practice, index) => {
    console.log(`${index + 1}. ${chalk.bold.yellow(practice.category)}`);
    practice.tips.forEach(tip => {
      console.log(`   • ${tip}`);
    });
    console.log();
  });

  console.log(chalk.green('✨ チーム開発の成功の鍵は、一貫性と継続的なコミュニケーションです！\n'));
}

/**
 * よくある問題と解決方法
 */
function showCommonIssues() {
  console.log(chalk.bold.blue('\n🎯 よくある問題と解決方法\n'));

  const issues = [
    {
      problem: '🔴 マージコンフリクトが発生した',
      solution: [
        '1. team-flow help-flow でコンフリクト解決ガイドを使用',
        '2. コンフリクトファイルを開いて手動修正',
        '3. git add . && git commit で解決を完了',
        '4. 今後は定期的にpullして予防'
      ]
    },
    {
      problem: '🟡 間違ったブランチで作業してしまった',
      solution: [
        '1. git stash で変更を一時保存',
        '2. git checkout -b 正しいブランチ名',
        '3. git stash pop で変更を復元',
        '4. 通常通り作業を続行'
      ]
    },
    {
      problem: '🟠 プッシュが拒否された',
      solution: [
        '1. git pull でリモートの変更を取得',
        '2. 必要に応じてコンフリクトを解決',
        '3. git push で再度プッシュ',
        '4. force pushは避ける'
      ]
    },
    {
      problem: '🔵 コミットメッセージを間違えた',
      solution: [
        '1. git commit --amend でメッセージ修正',
        '2. プッシュ済みの場合は新しいコミットで補足',
        '3. team-flow help-flow の修正機能を使用'
      ]
    },
    {
      problem: '🟣 ローカルの変更を破棄したい',
      solution: [
        '1. git status で現在の状態を確認',
        '2. git restore ファイル名 で特定ファイルを復元',
        '3. git restore . で全ての変更を破棄',
        '4. 重要な変更の場合はstashで保存'
      ]
    },
    {
      problem: '⚪ リモートとローカルが同期されない',
      solution: [
        '1. git remote -v でリモート設定を確認',
        '2. git fetch --all で全ブランチを取得',
        '3. git status で状態を確認',
        '4. 必要に応じてgit reset --hard origin/ブランチ名'
      ]
    }
  ];

  issues.forEach((issue, index) => {
    console.log(`${index + 1}. ${chalk.bold.red(issue.problem)}`);
    issue.solution.forEach(step => {
      console.log(`   ${step}`);
    });
    console.log();
  });

  console.log(chalk.blue('💡 予防のコツ:'));
  console.log('• 作業前に必ずgit pull');
  console.log('• 小さな変更を頻繁にコミット');
  console.log('• team-flowを使って標準化された手順で作業');
  console.log('• 困ったときは早めにチームに相談\n');
}

/**
 * インタラクティブチュートリアル
 */
async function runInteractiveTutorial() {
  console.log(chalk.bold.blue('\n🏃 Team-Flow インタラクティブチュートリアル\n'));

  const tutorials = [
    {
      name: '🌟 初心者向け: Git基礎',
      value: 'git_basics',
      description: 'Gitの基本概念と操作を学ぶ'
    },
    {
      name: '🚀 team-flow基本ワークフロー',
      value: 'teamflow_workflow',
      description: 'start → continue → finishの基本的な流れ'
    },
    {
      name: '🔀 ブランチとマージの実践',
      value: 'branch_merge',
      description: 'ブランチ作成からマージまでの実習'
    },
    {
      name: '🆘 トラブルシューティング',
      value: 'troubleshooting',
      description: 'よくある問題の解決方法を実践'
    },
    {
      name: '👥 チーム開発シミュレーション',
      value: 'team_collaboration',
      description: 'チームでの協力開発を体験'
    }
  ];

  const selectedTutorial = await select({
    message: '学習したいチュートリアルを選択してください:',
    choices: tutorials
  });

  switch (selectedTutorial) {
  case 'git_basics':
    await runGitBasicsTutorial();
    break;
  case 'teamflow_workflow':
    await runTeamFlowWorkflowTutorial();
    break;
  case 'branch_merge':
    await runBranchMergeTutorial();
    break;
  case 'troubleshooting':
    await runTroubleshootingTutorial();
    break;
  case 'team_collaboration':
    await runTeamCollaborationTutorial();
    break;
  }
}

/**
 * Git基礎チュートリアル
 */
async function runGitBasicsTutorial() {
  console.log(chalk.bold.green('\n🌟 Git基礎チュートリアル開始\n'));

  const steps = [
    {
      title: 'ステップ1: リポジトリの確認',
      description: '現在のリポジトリ状態を確認します',
      command: 'git status',
      explanation: 'このコマンドで現在の作業状態が分かります'
    },
    {
      title: 'ステップ2: ブランチの確認',
      description: '利用可能なブランチを確認します',
      command: 'git branch -a',
      explanation: 'ローカルとリモートのブランチ一覧が表示されます'
    },
    {
      title: 'ステップ3: 履歴の確認',
      description: 'コミット履歴を確認します',
      command: 'git log --oneline -5',
      explanation: '最新5件のコミット履歴が確認できます'
    }
  ];

  for (const step of steps) {
    console.log(chalk.bold.blue(step.title));
    console.log(step.description);
    console.log(chalk.gray(`実行コマンド: ${chalk.cyan(step.command)}`));
    console.log(chalk.gray(step.explanation));

    const proceed = await confirm({
      message: '次に進みますか？',
      default: true
    });

    if (!proceed) break;
    console.log();
  }

  console.log(chalk.green('\n🎉 Git基礎チュートリアル完了！'));
  console.log(chalk.gray('実際のコマンドを試してみることをお勧めします。\n'));
}

/**
 * Team-Flowワークフローチュートリアル
 */
async function runTeamFlowWorkflowTutorial() {
  console.log(chalk.bold.green('\n🚀 Team-Flowワークフローチュートリアル開始\n'));

  console.log('このチュートリアルでは、team-flowを使った典型的な開発フローを学びます:\n');

  const workflow = [
    {
      step: '1. 作業開始',
      command: 'team-flow start',
      description: '新しい機能やバグ修正の作業を開始',
      details: [
        '• 作業種別を選択',
        '• GitHub Issueとの連携',
        '• ブランチの自動作成',
        '• チームへの通知'
      ]
    },
    {
      step: '2. 作業継続',
      command: 'team-flow continue',
      description: '作業の進捗確認と継続',
      details: [
        '• 現在の状況表示',
        '• 推奨アクションの提案',
        '• 同期とテストの実行',
        '• 進捗の追跡'
      ]
    },
    {
      step: '3. 作業完了',
      command: 'team-flow finish',
      description: '作業の完了とプルリクエスト作成',
      details: [
        '• 変更のコミット',
        '• テストの実行',
        '• PRの作成',
        '• レビュアーの割り当て'
      ]
    }
  ];

  for (const item of workflow) {
    console.log(chalk.bold.yellow(item.step));
    console.log(`コマンド: ${chalk.cyan(item.command)}`);
    console.log(item.description);
    item.details.forEach(detail => {
      console.log(`  ${detail}`);
    });

    const proceed = await confirm({
      message: '次のステップに進みますか？',
      default: true
    });

    if (!proceed) break;
    console.log();
  }

  console.log(chalk.green('\n🎉 ワークフローチュートリアル完了！'));
  console.log(chalk.gray('実際にteam-flowコマンドを試してワークフローを体験してください。\n'));
}

/**
 * ブランチ・マージチュートリアル
 */
async function runBranchMergeTutorial() {
  console.log(chalk.bold.green('\n🔀 ブランチ・マージチュートリアル開始\n'));

  console.log(chalk.blue('ブランチとマージの基本概念:'));
  console.log('• ブランチ: 並行して作業を進めるための分岐');
  console.log('• マージ: ブランチの変更を統合する操作');
  console.log('• team-flowがこれらの操作を安全に実行してくれます\n');

  const scenarios = [
    {
      title: 'シナリオ1: 新機能開発',
      steps: [
        'mainブランチから新しいブランチを作成',
        '機能を実装してコミット',
        'プルリクエストを作成',
        'レビュー後にマージ'
      ]
    },
    {
      title: 'シナリオ2: バグ修正',
      steps: [
        'hotfixブランチを作成',
        'バグを修正してテスト',
        '緊急マージのプロセス',
        'mainとdevelopブランチ両方に適用'
      ]
    },
    {
      title: 'シナリオ3: コンフリクト解決',
      steps: [
        'コンフリクトが発生する状況',
        '手動でのコンフリクト解決',
        'マージの完了',
        '今後の予防策'
      ]
    }
  ];

  for (const scenario of scenarios) {
    console.log(chalk.bold.blue(scenario.title));
    scenario.steps.forEach((step, index) => {
      console.log(`  ${index + 1}. ${step}`);
    });

    const learn = await confirm({
      message: 'このシナリオについて詳しく学びますか？',
      default: false
    });

    if (learn) {
      console.log(chalk.gray('📝 実際のプロジェクトでteam-flowを使ってこの流れを実践してみてください。'));
    }
    console.log();
  }

  console.log(chalk.green('🎉 ブランチ・マージチュートリアル完了！\n'));
}

/**
 * トラブルシューティングチュートリアル
 */
async function runTroubleshootingTutorial() {
  console.log(chalk.bold.green('\n🆘 トラブルシューティングチュートリアル開始\n'));

  console.log(chalk.yellow('よくあるトラブルと対処法を学びましょう：\n'));

  const troubles = [
    {
      problem: 'マージコンフリクト',
      severity: 'high',
      solution: 'team-flow help-flowのコンフリクト解決機能を使用'
    },
    {
      problem: '間違ったブランチでの作業',
      severity: 'medium',
      solution: 'stash → checkout → stash pop の手順'
    },
    {
      problem: 'プッシュの拒否',
      severity: 'medium',
      solution: 'pull → conflict解決 → push の手順'
    },
    {
      problem: 'コミットの取り消し',
      severity: 'low',
      solution: 'reset または revert の適切な使い分け'
    }
  ];

  for (const trouble of troubles) {
    const severityColor = trouble.severity === 'high' ? chalk.red :
      trouble.severity === 'medium' ? chalk.yellow : chalk.blue;

    console.log(`${severityColor('●')} ${chalk.bold(trouble.problem)}`);
    console.log(`  解決方法: ${trouble.solution}`);

    const practice = await confirm({
      message: 'この問題の解決手順を詳しく確認しますか？',
      default: false
    });

    if (practice) {
      console.log(chalk.gray('💡 team-flow help-flow を実行して実際の解決手順を確認してください。'));
    }
    console.log();
  }

  console.log(chalk.green('🎉 トラブルシューティングチュートリアル完了！'));
  console.log(chalk.gray('実際に問題が発生したときはteam-flow help-flowを思い出してください。\n'));
}

/**
 * チーム開発シミュレーション
 */
async function runTeamCollaborationTutorial() {
  console.log(chalk.bold.green('\n👥 チーム開発シミュレーション開始\n'));

  console.log(chalk.blue('チーム開発の流れを疑似体験しましょう：\n'));

  const roles = ['開発者A（あなた）', '開発者B', '開発者C', 'レビュアー'];
  console.log('登場人物:');
  roles.forEach((role, index) => {
    console.log(`  ${index + 1}. ${role}`);
  });

  const timeline = [
    {
      time: '月曜日 09:00',
      actor: '開発者A',
      action: 'team-flow start で新機能開発開始',
      result: 'feat/user-profile ブランチ作成'
    },
    {
      time: '月曜日 14:00',
      actor: '開発者B',
      action: '同じ機能の別部分を開発開始',
      result: 'feat/user-settings ブランチ作成'
    },
    {
      time: '火曜日 11:00',
      actor: '開発者A',
      action: 'team-flow finish でPR作成',
      result: 'レビュー待ち状態'
    },
    {
      time: '火曜日 15:00',
      actor: 'レビュアー',
      action: 'コードレビューと修正依頼',
      result: '修正が必要'
    },
    {
      time: '水曜日 10:00',
      actor: '開発者A',
      action: '修正後に再プッシュ',
      result: 'レビュー承認'
    },
    {
      time: '水曜日 16:00',
      actor: 'レビュアー',
      action: 'mainブランチにマージ',
      result: '機能完成'
    }
  ];

  console.log(chalk.bold('\n📅 開発タイムライン:'));

  for (const event of timeline) {
    console.log(`\n${chalk.cyan(event.time)} - ${chalk.yellow(event.actor)}`);
    console.log(`  アクション: ${event.action}`);
    console.log(`  結果: ${chalk.green(event.result)}`);

    const next = await confirm({
      message: '次の場面に進みますか？',
      default: true
    });

    if (!next) break;
  }

  console.log(chalk.bold.blue('\n🎯 学習ポイント:'));
  console.log('• チーム開発では計画的なブランチ戦略が重要');
  console.log('• レビューは品質向上の重要なプロセス');
  console.log('• team-flowでワークフローを標準化');
  console.log('• 継続的なコミュニケーションが成功の鍵');

  console.log(chalk.green('\n🎉 チーム開発シミュレーション完了！'));
  console.log(chalk.gray('実際のチーム開発でもこの流れを意識してください。\n'));
}

module.exports = {
  showGitConcepts,
  showTeamFlowGuide,
  showBestPractices,
  showCommonIssues,
  runInteractiveTutorial
};