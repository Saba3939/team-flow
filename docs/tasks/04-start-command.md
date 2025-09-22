# タスク04: team-flow start コマンド実装

## 概要
新しい作業を開始するための`team-flow start`コマンドを実装し、作業種別の選択からブランチ作成まで一連の流れを自動化する。

## 優先度
🟡 **高** - 開発ワークフローの起点

## 現在の状況
- コマンドの骨組みのみ実装済み（TODO状態）
- 実際の機能は未実装

## 実装すべき最小機能
1. **作業種別の選択**
   - 機能開発（feature）
   - バグ修正（bugfix）
   - ドキュメント更新（docs）
   - リファクタリング（refactor）
   - ホットフィックス（hotfix）

2. **GitHub Issues連携**
   - Issue一覧の取得・表示
   - 新しいIssueの作成支援
   - Issue番号の自動取得

3. **ブランチ作成・切り替え**
   - 作業種別に応じたブランチ名の提案
   - 安全なブランチ作成
   - ベースブランチの確認

4. **競合チェック機能**
   - 既存ブランチとの名前重複確認
   - 同一Issue番号の作業確認
   - チームメンバーの作業状況確認

5. **チーム通知機能**
   - Slack/Discord通知（任意）
   - 作業開始の共有

## 実装ファイル
- `src/commands/start.js` - startコマンドのメイン実装
- `src/services/github.js` - GitHub API連携
- `src/services/notifications.js` - 通知機能

## コマンドフロー
```
1. Git状態の確認
2. 作業種別の選択
3. Issue選択/作成
4. ブランチ名の決定
5. 競合チェック
6. ブランチ作成・切り替え
7. 通知送信（任意）
8. 次のステップ案内
```

## ブランチ命名規則
```
feature/issue-123-add-user-profile
bugfix/issue-456-fix-login-error
docs/issue-789-update-readme
refactor/issue-101-improve-performance
hotfix/issue-999-critical-security-fix
```

## 依存関係
- **前提**: 00-project-structure, 01-env-config, 02-git-basic-operations, 03-interactive-prompts
- **後続**: 05-continue-command, 06-finish-command

## 実装時の注意点
- Git初心者にも分かりやすい案内
- 既存作業への影響確認
- ネットワーク接続エラーの適切な処理
- GitHub API制限の考慮

## 完了条件
- [ ] 作業種別選択機能が動作
- [ ] GitHub Issues連携が機能
- [ ] ブランチ作成機能が動作
- [ ] 競合チェック機能が動作
- [ ] エラーハンドリングが適切
- [ ] 通知機能が動作（設定時）

## 推定工数
1.5日

## 備考
MVPでは基本的な機能に注力し、高度な競合チェックは後回しにする。