# 使用方法

## 基本的なワークフロー

team-flowは以下の4つの主要フェーズでチーム開発をサポートします。

### 1. 作業開始 (`team-flow start`)

新しい作業を開始する際に使用します。

```bash
team-flow start
```

#### 機能：
- **作業種別の選択**: 機能開発、バグ修正、ドキュメント更新など
- **GitHub Issues連携**: 既存のIssueから選択または新規作成
- **自動ブランチ作成**: 作業種別に応じた命名規則でブランチ作成
- **競合チェック**: 他のメンバーとの作業重複を確認
- **チーム通知**: Slack/Discordで作業開始を通知

#### 対話型プロンプト例：
```
? 作業の種類を選択してください:
  ◯ 新機能開発
  ◯ バグ修正
  ◯ ドキュメント更新
  ◯ リファクタリング
  ◯ テスト追加

? GitHub Issueを選択してください:
  ◯ #123 ユーザー認証機能の追加
  ◯ #124 レスポンシブデザインの改善
  ◯ 新しいIssueを作成

? ブランチ名を確認してください: feat/user-authentication
```

### 2. 作業継続 (`team-flow continue`)

作業を再開する際や進捗確認に使用します。

```bash
team-flow continue
```

#### 機能：
- **現在の状況表示**: ブランチ、コミット、変更ファイルの確認
- **推奨アクション提案**: 次に実行すべき操作を提案
- **自動同期**: リモートブランチとの同期確認
- **進捗レポート**: 作業時間や変更量の表示

#### 表示例：
```
📊 現在の作業状況

ブランチ: feat/user-authentication
最終コミット: 2時間前
変更ファイル: 5個
未コミット: 3個

🎯 推奨アクション:
1. 変更をコミット
2. テストを実行
3. Pull Requestを作成
```

### 3. 作業完了 (`team-flow finish`)

作業を完了してチームに共有する際に使用します。

```bash
team-flow finish
```

#### 機能：
- **コミット支援**: 変更内容の確認とコミットメッセージの提案
- **自動テスト実行**: プロジェクトのテストスイートを実行
- **Pull Request作成**: GitHub上でPRを自動作成
- **レビュアー提案**: チームメンバーから適切なレビュアーを提案
- **完了通知**: チームチャンネルに完了報告

#### フロー例：
```
? 変更をコミットしますか？
  変更されたファイル:
  - src/auth/login.js
  - src/auth/register.js
  - tests/auth.test.js

? コミットメッセージ:
  feat: Add user authentication functionality

  - Implement login/logout functionality
  - Add registration form validation
  - Add comprehensive test coverage

? Pull Requestを作成しますか？
  タイトル: Add user authentication functionality
  レビュアー: @tanaka, @suzuki
```

### 4. チーム状況確認 (`team-flow team`)

チーム全体の開発状況を確認します。

```bash
team-flow team
```

#### 機能：
- **アクティブブランチ一覧**: 各メンバーの作業中ブランチ
- **レビュー待ち状況**: 未レビューのPull Request
- **競合警告**: 同じファイルを編集している場合の警告
- **活動メトリクス**: コミット数、PR数などの統計

#### 表示例：
```
👥 チーム開発状況

🔧 アクティブブランチ:
  @tanaka    feat/payment-integration  (2日前)
  @suzuki    fix/responsive-layout     (1時間前)
  @yamada    docs/api-documentation    (30分前)

📋 レビュー待ち:
  #125 feat/payment-integration (@tanaka)
  #126 fix/responsive-layout (@suzuki)

⚠️  競合警告:
  src/components/Header.js - @tanaka, @suzuki
```

### 5. ヘルプ・緊急対応 (`team-flow help-flow`)

困ったときやエラー時のサポート機能です。

```bash
team-flow help-flow
```

#### 機能：
- **緊急時対応フロー**: Git操作のミスからの復旧
- **自動復旧機能**: 一般的な問題の自動解決
- **診断機能**: 現在の状況を分析して問題を特定
- **専門ヘルプ**: 状況に応じた詳細なガイダンス

## 設定とカスタマイズ

### 設定確認

```bash
team-flow --check-config
```

### 設定の自動修復

```bash
team-flow --fix-config
```

### 初回セットアップ

```bash
team-flow --setup
```

## ベストプラクティス

1. **作業開始前**: 必ず`team-flow team`でチーム状況を確認
2. **定期的な同期**: 作業中に`team-flow continue`で進捗確認
3. **小まめなコミット**: 意味のある単位でこまめにコミット
4. **PR作成時**: 適切なレビュアーを設定
5. **緊急時**: 慌てずに`team-flow help-flow`を実行