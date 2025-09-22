# team-flow プロジェクト概要

## プロジェクトの目的
team-flowは、Git/GitHub初心者でも使いやすい対話型ガイド機能とワークフロー簡素化機能を組み合わせた統合チーム開発CLIツールです。

## 技術スタック
- **Node.js**: >= 16.0.0
- **CLI Framework**: Commander.js v11.0.0
- **対話型UI**: @inquirer/prompts v3.0.0
- **API連携**:
  - GitHub API: @octokit/rest v20.0.0
  - Slack API: @slack/web-api v6.9.0
  - Discord Webhook: discord-webhook-node v1.1.8
- **ユーティリティ**:
  - dotenv v16.3.1（環境変数管理）
  - fs-extra v11.1.1（ファイル操作）
  - chalk v4.1.2（色付きターミナル出力）
  - ora v5.4.1（スピナー表示）
  - simple-git v3.19.1（Git操作）
- **開発ツール**:
  - Jest v29.6.2（テスト）
  - ESLint v8.46.0（リンティング）

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

## エントリーポイント
- **CLI実行**: `team-flow` (bin/team-flow.js)
- **開発実行**: `npm run dev`
- **直接実行**: `node src/index.js`