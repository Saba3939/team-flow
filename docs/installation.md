# インストールガイド

## システム要件

- Node.js 16.0.0以上
- npm または yarn
- Git 2.0以上
- GitHub アカウント

## インストール手順

### 1. Node.jsの確認

```bash
node --version
npm --version
```

### 2. team-flowのインストール

#### グローバルインストール（推奨）

```bash
npm install -g team-flow
```

#### ローカルインストール

```bash
npm install team-flow
npx team-flow --help
```

### 3. 初期設定

```bash
# 初回セットアップを実行
team-flow --setup
```

セットアップでは以下を設定します：
- GitHub Personal Access Token
- チーム通知設定（Slack/Discord）
- デフォルトプロジェクト設定

### 4. 認証情報の設定

プロジェクトルートに`.env`ファイルを作成：

```bash
# GitHub認証（必須）
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# Slack通知（オプション）
SLACK_TOKEN=xoxb-xxxxxxxxxxxxxxxxxx
SLACK_CHANNEL=#team-dev

# Discord通知（オプション）
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxxxx
```

### 5. 設定確認

```bash
team-flow --check-config
```

## GitHub Personal Access Tokenの取得

1. GitHub → Settings → Developer settings → Personal access tokens
2. "Generate new token (classic)" をクリック
3. 必要な権限を選択：
   - `repo` - プライベートリポジトリへのアクセス
   - `read:org` - 組織情報の読み取り
   - `user:email` - ユーザーメール情報の読み取り

## トラブルシューティング

### 権限エラー

```bash
# npmの権限設定
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

### 設定の修復

```bash
team-flow --fix-config
```

### 完全再インストール

```bash
npm uninstall -g team-flow
npm cache clean --force
npm install -g team-flow
```