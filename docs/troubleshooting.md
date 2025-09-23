# トラブルシューティング

## よくある問題と解決方法

### 1. 認証関連の問題

#### GitHub認証エラー

**症状:**
```bash
Error: Bad credentials
fatal: Authentication failed
```

**原因と解決方法:**

1. **Personal Access Token が無効**
   ```bash
   # トークンを再確認
   team-flow --check-config

   # 新しいトークンを生成して設定
   # GitHub Settings > Developer settings > Personal access tokens
   ```

2. **権限不足**
   ```bash
   # 必要な権限を確認
   repo, read:org, user:email

   # 既存トークンの権限を更新するか、新規作成
   ```

3. **環境変数の設定ミス**
   ```bash
   # .envファイルを確認
   cat .env | grep GITHUB_TOKEN

   # 正しい形式で設定
   echo "GITHUB_TOKEN=ghp_xxxxxxxxxxxx" >> .env
   ```

#### Slack連携エラー

**症状:**
```bash
Error: channel_not_found
Error: not_in_channel
```

**解決方法:**
```bash
# 1. BotをChannelに招待
/invite @team-flow-bot

# 2. Channel名の確認（#を含める）
SLACK_CHANNEL=#team-dev

# 3. Bot権限の確認
chat:write, channels:read, users:read
```

### 2. Git操作関連の問題

#### マージ競合の解決

**症状:**
```bash
Auto-merging src/components/Header.js
CONFLICT (content): Merge conflict in src/components/Header.js
```

**team-flowでの解決:**
```bash
# 自動診断と復旧支援
team-flow help-flow

# 対話型競合解決
? 競合解決方法を選択:
  ◯ 自動マージを試行
  ◯ 手動解決を支援
  ◯ 作業を一時保存して後で解決
  ◯ マージを中止
```

**手動解決:**
```bash
# 競合ファイルを確認
git status

# 競合を解決
# ファイル内の <<<<<<< ======= >>>>>>> を編集

# 解決後
git add .
git commit
team-flow continue
```

#### ブランチ切り替えエラー

**症状:**
```bash
error: Your local changes to the following files would be overwritten by checkout
```

**解決方法:**
```bash
# team-flowの自動保存機能
team-flow help-flow

# または手動で保存
git stash
git checkout target-branch
git stash pop
```

### 3. 設定関連の問題

#### 設定ファイルが見つからない

**症状:**
```bash
Warning: .env file not found
Warning: Configuration incomplete
```

**解決方法:**
```bash
# 設定ファイルの作成
team-flow --setup

# または手動作成
cp .env.example .env
# 必要な値を編集

# 設定の検証
team-flow --check-config
```

#### プロジェクト設定の競合

**症状:**
```bash
Error: Multiple configuration sources found
```

**解決方法:**
```bash
# 設定の優先順位確認
team-flow --check-config --verbose

# 設定の統合
team-flow --fix-config

# 手動設定
rm .team-flow/config.json  # 重複設定を削除
```

### 4. ネットワーク関連の問題

#### API Rate Limit

**症状:**
```bash
Error: API rate limit exceeded
```

**解決方法:**
```bash
# Rate Limit状況確認
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/rate_limit

# 待機またはToken権限の強化
# Enterprise Tokenの使用を検討
```

#### 接続タイムアウト

**症状:**
```bash
Error: Request timeout
Error: ECONNRESET
```

**解決方法:**
```bash
# プロキシ設定の確認
echo $HTTP_PROXY
echo $HTTPS_PROXY

# team-flowでのタイムアウト設定調整
export TEAM_FLOW_TIMEOUT=30000

# ネットワーク診断
team-flow --check-config --network
```

### 5. パフォーマンス関連の問題

#### 大きなリポジトリでの遅延

**症状:**
```bash
操作が非常に遅い
メモリ使用量が高い
```

**最適化方法:**
```bash
# .gitignoreの確認と最適化
# 不要なファイルをignore

# Gitの最適化
git gc --aggressive
git repack -a -d

# team-flowの軽量モード
export TEAM_FLOW_LIGHT_MODE=true
```

#### 多数のブランチによる遅延

**解決方法:**
```bash
# 古いブランチのクリーンアップ
git branch --merged | grep -v main | xargs git branch -d

# リモートブランチの整理
git remote prune origin

# team-flowのブランチ制限設定
export TEAM_FLOW_MAX_BRANCHES=50
```

### 6. チーム連携の問題

#### 通知が届かない

**チェックポイント:**
```bash
# 1. 設定確認
team-flow --check-config

# 2. 権限確認
# Slack: Bot権限、Channel参加状況
# Discord: Webhook有効性

# 3. ネットワーク確認
# ファイアウォール、プロキシ設定

# 4. テスト送信
team-flow test-notification
```

#### 競合検知が機能しない

**症状:**
```bash
同じファイルを編集しているのに警告が出ない
```

**解決方法:**
```bash
# チーム設定の確認
cat .team-flow/team.json

# メンバー情報の更新
team-flow team --sync

# 手動競合チェック
team-flow team --check-conflicts
```

### 7. 緊急時の復旧手順

#### 重要な変更を誤って削除

```bash
# team-flowの緊急復旧
team-flow help-flow

# Gitの復旧コマンド
git reflog
git reset --hard HEAD@{n}

# バックアップからの復旧
# team-flowは自動バックアップを作成
ls ~/.team-flow/backups/
```

#### リポジトリが破損

```bash
# 診断実行
team-flow help-flow --diagnose

# 自動修復試行
git fsck --full
git gc --aggressive

# 最終手段: 再クローン
git clone <repository-url> <new-directory>
# 変更を手動で移行
```

## 診断コマンド一覧

### 基本診断

```bash
# 設定診断
team-flow --check-config

# ネットワーク診断
team-flow --check-config --network

# 権限診断
team-flow --check-config --permissions
```

### 詳細診断

```bash
# 完全診断
team-flow help-flow --diagnose

# ログ出力
team-flow --debug

# 環境情報出力
team-flow --env-info
```

## ログファイルの場所

```bash
# 設定ログ
~/.team-flow/logs/config.log

# 操作ログ
~/.team-flow/logs/operations.log

# エラーログ
~/.team-flow/logs/errors.log

# API通信ログ
~/.team-flow/logs/api.log
```

## サポート情報の収集

問題報告時に必要な情報：

```bash
# 環境情報収集
team-flow --collect-debug-info

# 生成される情報:
# - team-flow バージョン
# - Node.js バージョン
# - Git バージョン
# - OS情報
# - 設定情報（機密情報は除く）
# - エラーログ
```

## よくある質問 (FAQ)

**Q: team-flowが突然動かなくなりました**
A: まず`team-flow --check-config`で設定を確認し、`team-flow --fix-config`で自動修復を試してください。

**Q: チームメンバーが表示されません**
A: `.team-flow/team.json`ファイルの設定と、GitHub組織のメンバー権限を確認してください。

**Q: 通知が重複して送信されます**
A: 複数の設定ファイルが存在している可能性があります。`team-flow --check-config --verbose`で確認してください。

**Q: 大きなファイルのコミットに時間がかかります**
A: `.gitignore`の設定を確認し、不要な大きなファイルが含まれていないかチェックしてください。