# 設定ガイド

## 環境変数設定

team-flowは`.env`ファイルで設定を管理します。プロジェクトルートに`.env`ファイルを作成してください。

### 必須設定

```bash
# GitHub Personal Access Token（必須）
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

### オプション設定

```bash
# Slack連携（オプション）
SLACK_TOKEN=xoxb-xxxxxxxxxxxxxxxxxx
SLACK_CHANNEL=#team-dev
SLACK_USERNAME=team-flow-bot

# Discord連携（オプション）
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxxxx
DISCORD_USERNAME=team-flow

# GitHub設定
GITHUB_ORG=your-organization
GITHUB_REPO=your-repository

# 作業設定
DEFAULT_BRANCH=main
AUTO_SYNC=true
AUTO_TEST=true

# 通知設定
NOTIFY_ON_START=true
NOTIFY_ON_FINISH=true
NOTIFY_ON_ERROR=true
```

## GitHub Personal Access Token

### 必要な権限

以下の権限（スコープ）が必要です：

- `repo` - リポジトリへのフルアクセス
- `read:org` - 組織情報の読み取り
- `user:email` - ユーザーメール情報の読み取り

### 取得手順

1. [GitHub Settings](https://github.com/settings/tokens) にアクセス
2. "Generate new token (classic)" をクリック
3. 適切な権限を選択
4. "Generate token" をクリック
5. 生成されたトークンを`.env`ファイルに設定

## Slack連携設定

### Bot Token取得

1. [Slack API](https://api.slack.com/apps) でアプリを作成
2. "OAuth & Permissions" → "Scopes" で以下の権限を追加：
   - `chat:write`
   - `channels:read`
   - `users:read`
3. "Install App to Workspace" でワークスペースにインストール
4. Bot User OAuth Token を取得

### チャンネル設定

```bash
# 特定のチャンネルに通知
SLACK_CHANNEL=#team-dev

# 複数チャンネルに通知（カンマ区切り）
SLACK_CHANNEL=#team-dev,#general

# DMで通知
SLACK_CHANNEL=@username
```

## Discord連携設定

### Webhook URL取得

1. Discordサーバーの設定 → 連携サービス → ウェブフック
2. 「新しいウェブフック」を作成
3. WebhookのURLをコピー
4. `.env`ファイルに設定

## プロジェクト固有設定

### .team-flow設定ファイル

プロジェクトルートに`.team-flow/config.json`を作成することで、プロジェクト固有の設定が可能です：

```json
{
  "project": {
    "name": "MyProject",
    "type": "web-app",
    "defaultBranch": "main"
  },
  "workflow": {
    "branchNaming": {
      "feature": "feat/",
      "bugfix": "fix/",
      "hotfix": "hotfix/",
      "docs": "docs/"
    },
    "autoTest": true,
    "autoLint": true
  },
  "notifications": {
    "channels": {
      "start": "#dev-log",
      "finish": "#general",
      "error": "#alerts"
    },
    "mentions": {
      "critical": ["@admin"],
      "review": ["@reviewers"]
    }
  },
  "integrations": {
    "ci": "github-actions",
    "issueTracker": "github"
  }
}
```

### ブランチ命名規則

デフォルトの命名規則：

- 機能開発: `feat/feature-name`
- バグ修正: `fix/bug-description`
- ホットフィックス: `hotfix/critical-fix`
- ドキュメント: `docs/document-name`
- リファクタリング: `refactor/code-improvement`

カスタマイズ例：
```json
{
  "workflow": {
    "branchNaming": {
      "feature": "feature/",
      "bugfix": "bugfix/",
      "task": "task/",
      "improvement": "improve/"
    }
  }
}
```

## レビュアー自動提案

### チーム設定

`.team-flow/team.json`でチーム構成を定義：

```json
{
  "teams": {
    "frontend": ["tanaka", "suzuki"],
    "backend": ["yamada", "sato"],
    "fullstack": ["tanaka", "yamada"]
  },
  "skills": {
    "tanaka": ["react", "typescript", "css"],
    "suzuki": ["vue", "javascript", "design"],
    "yamada": ["node", "python", "database"],
    "sato": ["go", "docker", "kubernetes"]
  },
  "reviewRules": {
    "minReviewers": 1,
    "requireSkillMatch": true,
    "excludeSelf": true
  }
}
```

## テスト・品質設定

### 自動テスト設定

```json
{
  "testing": {
    "runOnFinish": true,
    "commands": {
      "test": "npm test",
      "lint": "npm run lint",
      "typecheck": "npm run typecheck"
    },
    "failOnError": true
  }
}
```

### CI/CD連携

```json
{
  "ci": {
    "provider": "github-actions",
    "waitForChecks": true,
    "requiredChecks": ["test", "lint", "build"],
    "timeout": 600
  }
}
```

## 設定検証

### 設定確認コマンド

```bash
# 現在の設定を表示
team-flow --check-config

# 設定の詳細診断
team-flow --check-config --verbose

# 設定ファイルの場所を表示
team-flow --check-config --show-files
```

### 自動修復

```bash
# 設定の自動修復
team-flow --fix-config

# 対話式修復
team-flow --fix-config --interactive
```

## トラブルシューティング

### よくある設定エラー

1. **GitHub Token権限不足**
   ```
   Error: GitHub API rate limit exceeded
   → より強い権限のTokenを生成してください
   ```

2. **Slack Channel権限不足**
   ```
   Error: channel_not_found
   → BotをChannelに招待してください
   ```

3. **Discord Webhook無効**
   ```
   Error: Webhook URL is invalid
   → Discord設定を確認してください
   ```

### ログ確認

```bash
# 設定関連のログを確認
team-flow --check-config --debug

# 詳細ログの出力先
~/.team-flow/logs/config.log
```