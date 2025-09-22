/**
 * メッセージテンプレート
 * 対話型プロンプトで使用する各種メッセージとヘルプテキスト
 */

const chalk = require('chalk');

/**
 * 作業種別の選択肢とその説明
 */
const WORK_TYPES = {
  feature: {
    name: '機能開発',
    description: '新しい機能の開発・実装',
    branchPrefix: 'feat/',
    examples: ['ログイン機能', 'ユーザープロフィール', 'API連携'],
    help: '新機能の追加や既存機能の拡張を行う場合に選択してください。'
  },
  bugfix: {
    name: 'バグ修正',
    description: '既存のバグやエラーの修正',
    branchPrefix: 'fix/',
    examples: ['ログイン エラー修正', 'UI レイアウト修正', 'API エラー対応'],
    help: 'システムの不具合や予期しない動作を修正する場合に選択してください。'
  },
  hotfix: {
    name: '緊急修正',
    description: '本番環境の緊急対応',
    branchPrefix: 'hotfix/',
    examples: ['セキュリティ問題対応', 'サービス停止対応', 'データ破損対応'],
    help: '本番環境で発生した重大な問題を緊急で修正する場合に選択してください。'
  },
  docs: {
    name: 'ドキュメント',
    description: 'README やドキュメントの更新',
    branchPrefix: 'docs/',
    examples: ['README更新', 'API仕様書', 'セットアップガイド'],
    help: 'プロジェクトのドキュメント作成・更新を行う場合に選択してください。'
  },
  refactor: {
    name: 'リファクタリング',
    description: 'コードの構造改善（機能変更なし）',
    branchPrefix: 'refactor/',
    examples: ['コード整理', 'パフォーマンス改善', 'アーキテクチャ見直し'],
    help: '既存コードの品質向上や保守性改善を行う場合に選択してください。'
  },
  test: {
    name: 'テスト',
    description: 'テストコードの追加・修正',
    branchPrefix: 'test/',
    examples: ['単体テスト追加', 'E2Eテスト', 'テストカバレッジ改善'],
    help: 'テストコードの作成や既存テストの改善を行う場合に選択してください。'
  }
};

/**
 * 確認プロンプトで使用するメッセージ
 */
const CONFIRMATIONS = {
  createBranch: (branchName) => ({
    message: `ブランチ '${chalk.cyan(branchName)}' を作成しますか？`,
    description: 'このブランチで作業を開始します。',
    warning: null
  }),

  switchBranch: (branchName) => ({
    message: `ブランチ '${chalk.cyan(branchName)}' に切り替えますか？`,
    description: '現在の作業内容は保存されます。',
    warning: '未コミットの変更がある場合は事前にコミットすることをお勧めします。'
  }),

  deleteBranch: (branchName) => ({
    message: `ブランチ '${chalk.red(branchName)}' を削除しますか？`,
    description: 'この操作は取り消せません。',
    warning: '削除したブランチの復元は困難です。本当に削除して良いか確認してください。'
  }),

  commit: (message) => ({
    message: 'コミットを作成しますか？',
    description: `メッセージ: ${chalk.cyan(message)}`,
    warning: null
  }),

  push: (branchName) => ({
    message: `ブランチ '${chalk.cyan(branchName)}' をリモートにプッシュしますか？`,
    description: 'リモートリポジトリに変更内容が反映されます。',
    warning: null
  }),

  createPR: () => ({
    message: 'プルリクエストを作成しますか？',
    description: 'チームメンバーがコードレビューできるようになります。',
    warning: null
  })
};

/**
 * ヘルプメッセージ
 */
const HELP_MESSAGES = {
  branchNaming: `
${chalk.yellow('ブランチ名の命名規則:')}
• ${chalk.green('良い例:')} feat/user-login, fix/api-error, docs/readme-update
• ${chalk.red('悪い例:')} branch1, test, fix
• 英数字、ハイフン、スラッシュのみ使用可能
• 分かりやすく具体的な名前をつけましょう
`,

  commitMessage: `
${chalk.yellow('コミットメッセージの書き方:')}
• 1行目: 変更内容の要約（50文字以内推奨）
• ${chalk.green('良い例:')} ユーザーログイン機能を追加
• ${chalk.red('悪い例:')} update, fix, 修正
• 何をしたかを明確に記述しましょう
`,

  gitFlow: `
${chalk.yellow('Git フローの基本:')}
1. ${chalk.cyan('ブランチ作成')} → 2. ${chalk.cyan('コード変更')} → 3. ${chalk.cyan('コミット')} → 4. ${chalk.cyan('プッシュ')} → 5. ${chalk.cyan('プルリクエスト')}
• 小さな単位で頻繁にコミット
• 意味のある単位でブランチを分ける
• プルリクエストでコードレビュー
`,

  safety: `
${chalk.yellow('安全な作業のために:')}
• 作業前に ${chalk.cyan('git pull')} で最新状態に更新
• 重要な変更の前にバックアップブランチを作成
• ${chalk.red('main/master ブランチでの直接作業は避ける')}
• 不明な点があれば team-flow help で相談
`
};

/**
 * エラーメッセージ
 */
const ERROR_MESSAGES = {
  invalidBranchName: (name) => `
${chalk.red('ブランチ名が無効です:')} ${name}
${HELP_MESSAGES.branchNaming}
`,

  invalidCommitMessage: (message) => `
${chalk.red('コミットメッセージが無効です:')} ${message}
${HELP_MESSAGES.commitMessage}
`,

  gitNotInitialized: `
${chalk.red('Git リポジトリが初期化されていません')}
現在のディレクトリで ${chalk.cyan('git init')} を実行してください。
`,

  noRemoteRepository: `
${chalk.yellow('リモートリポジトリが設定されていません')}
GitHub リポジトリを作成し、リモートを追加してください:
${chalk.cyan('git remote add origin <repository-url>')}
`,

  hasUncommittedChanges: `
${chalk.yellow('未コミットの変更があります')}
ブランチを切り替える前に変更をコミットまたはスタッシュしてください。
`,

  branchAlreadyExists: (name) => `
${chalk.yellow('ブランチが既に存在します:')} ${name}
既存のブランチに切り替えるか、別の名前を選択してください。
`
};

/**
 * 成功メッセージ
 */
const SUCCESS_MESSAGES = {
  branchCreated: (name) => `
${chalk.green('✅ ブランチを作成しました:')} ${chalk.cyan(name)}
作業を開始してください！
`,

  branchSwitched: (name) => `
${chalk.green('✅ ブランチを切り替えました:')} ${chalk.cyan(name)}
`,

  committed: (message) => `
${chalk.green('✅ コミットしました:')} ${message}
`,

  pushed: (branch) => `
${chalk.green('✅ プッシュしました:')} ${chalk.cyan(branch)}
`,

  prCreated: (url) => `
${chalk.green('✅ プルリクエストを作成しました:')}
${chalk.blue(url)}
`
};

/**
 * プロンプトの選択肢を生成
 */
const PROMPT_CHOICES = {
  workTypes: () => Object.entries(WORK_TYPES).map(([key, type]) => ({
    name: `${type.name} - ${chalk.gray(type.description)}`,
    value: key,
    description: type.help
  })),

  yesNo: [
    { name: 'はい', value: true },
    { name: 'いいえ', value: false }
  ],

  continueCancel: [
    { name: '続行', value: 'continue' },
    { name: 'キャンセル', value: 'cancel' },
    { name: 'ヘルプを見る', value: 'help' }
  ]
};

module.exports = {
  WORK_TYPES,
  CONFIRMATIONS,
  HELP_MESSAGES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  PROMPT_CHOICES
};