# team-flow

Git/GitHub初心者でも使いやすい対話型ガイド機能とワークフロー簡素化機能を組み合わせた統合チーム開発CLIツール

## インストール

```bash
npm install -g team-flow
```

## 初期設定

```bash
# 初回セットアップ(各プロジェクトディレクトリごとに行なってください)
team-flow --setup

# 設定確認
team-flow --check-config
```

## 使い方

### 基本コマンド

```bash
# 新しい作業を開始
team-flow start

# 作業を継続
team-flow continue

# 作業を完了
team-flow finish

# チーム状況を確認
team-flow team

# ヘルプ・緊急対応
team-flow help-flow
```

### 設定コマンド

```bash
# 設定を確認
team-flow --check-config

# 初回セットアップ
team-flow --setup

# 設定の自動修復
team-flow --fix-config
```

## 主な機能

- **対話型ワークフロー**: Git/GitHub操作を段階的にガイド
- **自動ブランチ管理**: 作業種別に応じた適切なブランチ作成
- **GitHub連携**: Issues、Pull Requests、レビュアー提案
- **チーム通知**: Slack/Discord連携による進捗共有
- **競合検知**: チーム内の作業競合を事前に警告
- **自動復旧**: エラー時の安全機能と復旧支援

## 環境設定

各プロジェクトディレクトリごとに`.env`ファイルを作成し、必要な認証情報を設定してください：

```bash
# 必須
GITHUB_TOKEN=your_github_personal_access_token

# オプション（チーム通知機能用）
SLACK_TOKEN=your_slack_bot_token
DISCORD_WEBHOOK_URL=your_discord_webhook_url
```

## 動作要件

- Node.js 16.0.0以上
- Git 2.0以上
- GitHub アカウント

## ライセンス

MIT

## 詳細ドキュメント

詳細な使い方については、[docsディレクトリ](./docs/)をご覧ください。
