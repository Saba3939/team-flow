# 推奨コマンド一覧

## 開発コマンド
```bash
# 依存関係のインストール
npm install

# 開発モードで実行
npm run dev

# 直接実行
node src/index.js

# CLIとして実行（インストール後）
team-flow
```

## テスト・品質管理コマンド
```bash
# テスト実行
npm test
npm run test

# リンティング実行
npm run lint
eslint src/**/*.js

# 手動でリンティング修正
eslint src/**/*.js --fix
```

## team-flowの主要コマンド
```bash
# 新しい作業開始
team-flow start

# 作業継続
team-flow continue

# 作業完了
team-flow finish

# チーム状況確認
team-flow team

# ヘルプ・緊急対応
team-flow help

# バージョン確認
team-flow --version
team-flow -V
```

## システムコマンド（macOS）
```bash
# ディレクトリ操作
ls -la          # ファイル一覧表示
cd <dir>        # ディレクトリ移動
pwd             # 現在のディレクトリ

# ファイル操作
cat <file>      # ファイル内容表示
grep <pattern>  # パターン検索
find <path>     # ファイル検索

# Git操作
git status      # Git状態確認
git log         # コミット履歴
git branch      # ブランチ一覧
```

## 環境設定
```bash
# 環境変数設定（.envファイル作成）
cp .env.example .env

# 環境変数の例
GITHUB_TOKEN=your_github_token
SLACK_TOKEN=your_slack_token
DISCORD_WEBHOOK_URL=your_discord_webhook
```