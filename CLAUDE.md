# team-flow プロジェクト開発ガイド

## プロジェクト概要
**team-flow**は、Git/GitHub初心者でも使いやすい対話型ガイド機能とワークフロー簡素化機能を組み合わせた統合チーム開発CLIツールです。

## 技術スタック
- **CLI Framework**: Commander.js
- **対話型UI**: @inquirer/prompts
- **API連携**:
  - GitHub API (@octokit/rest)
  - Slack API (@slack/web-api)
  - Discord Webhook (discord-webhook-node)
- **その他**: dotenv, fs-extra, chalk, ora, simple-git

## プロジェクト構造
```
team-flow/
├── package.json
├── .env.example
├── bin/
│   └── team-flow.js         # エントリーポイント
├── src/
│   ├── index.js             # メインプログラム
│   ├── config/              # 設定管理
│   ├── commands/            # コマンド実装
│   ├── services/            # 外部API連携
│   ├── utils/               # ユーティリティ
│   └── templates/           # テンプレート
└── tests/                   # テスト
```

## 主要機能
1. **新しい作業開始** (`team-flow start`)
   - 作業種別選択（機能開発/バグ修正/ドキュメント等）
   - GitHub Issues連携
   - 自動ブランチ作成
   - 競合チェック
   - チーム通知

2. **作業継続** (`team-flow continue`)
   - 現在の状況表示
   - 推奨アクション提案
   - 自動同期機能

3. **作業完了** (`team-flow finish`)
   - コミット支援
   - 自動テスト実行
   - PR作成・レビュアー提案
   - 完了通知

4. **チーム状況確認** (`team-flow team`)
   - アクティブブランチ一覧
   - レビュー待ち状況
   - 競合警告
   - 活動メトリクス

5. **ヘルプ・緊急対応** (`team-flow help`)
   - 緊急時対応フロー
   - 自動復旧機能

## 開発方針
- **セキュリティ最優先**: 機密情報の適切な管理
- **ユーザビリティ重視**: 初心者にも分かりやすいUI
- **拡張性確保**: モジュラー設計
- **エラーハンドリング**: 安全機能・自動復旧

## 開発タスク優先順位
1. 基本CLI構造とメニューシステム
2. Git操作の基本機能
3. GitHub API連携
4. 対話型プロンプトの実装
5. チーム通知機能
6. 競合検知機能
7. テスト実装

## 注意事項
- 認証情報は必ず環境変数で管理
- 操作前の確認プロンプトを必須とする
- 重要な操作前には自動バックアップ作成
- エラー時の自動復旧機能を提供
- 新しい機能を実装する際にはfeat/{開発する機能名}というブランチ名で新しいブランチを切ること
- 作業を終了した際にはcommitを必ずすること

## テスト・品質管理
- `npm test`: Jest使用
- `npm run lint`: ESLint
- `npm run typecheck`: TypeScript型チェック（必要に応じて）

## 環境設定
必要な環境変数（.env）:
- `GITHUB_TOKEN`: GitHub Personal Access Token
- `SLACK_TOKEN`: Slack Bot Token（オプション）
- `DISCORD_WEBHOOK_URL`: Discord Webhook URL（オプション）

### Voice Notification Rules

- **全てのタスク完了時には必ずVOICEVOXの音声通知機能を使用すること**
- **重要なお知らせやエラー発生時にも音声通知を行うこと**
- **音声通知の設定: speaker=1, speedScale=1.3を使用すること**
- **英単語は適切にカタカナに変換してVOICEVOXに送信すること**
- **VOICEVOXに送信するテキストは不要なスペースを削除すること**
- **1回の音声通知は100文字以内でシンプルに話すこと**
- **以下のタイミングで細かく音声通知を行うこと：**
  - 命令受領時: 「了解です」「承知しました」
  - 作業開始時: 「〜を開始します」  
  - 作業中: 「調査中です」「修正中です」
  - 進捗報告: 「半分完了です」「もう少しです」
  - 完了時: 「完了です」「修正完了です」
- **詳しい技術的説明は音声通知に含めず、結果のみを簡潔に報告すること**
