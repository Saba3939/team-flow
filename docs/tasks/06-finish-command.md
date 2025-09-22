# タスク06: team-flow finish コマンド実装

## 概要
作業完了のための`team-flow finish`コマンドを実装し、コミット支援からPR作成まで一連の完了フローを自動化する。

## 優先度
🟡 **高** - 開発ワークフローの完結

## 現在の状況
- コマンドの骨組みのみ実装済み（TODO状態）
- 実際の機能は未実装

## 実装すべき最小機能
1. **コミット支援機能**
   - 変更ファイルの確認・選択
   - コミットメッセージの構成支援
   - Conventional Commits形式の提案
   - コミット前の最終確認

2. **自動テスト実行**
   - npm test実行（設定されている場合）
   - lint/typecheck実行
   - テスト失敗時の対応ガイド

3. **PR作成機能**
   - GitHub PR自動作成
   - テンプレートベースのPR説明生成
   - レビュアー自動提案
   - ラベル・マイルストーン設定

4. **完了通知機能**
   - チームへの完了通知
   - PR URLの共有
   - 次のステップ案内

## 実装ファイル
- `src/commands/finish.js` - finishコマンドのメイン実装
- `src/utils/commit.js` - コミット支援機能
- `src/utils/testing.js` - テスト実行管理

## コマンドフロー
```
1. 作業状況の最終確認
2. 変更ファイルのレビュー
3. コミットメッセージ作成
4. コミット実行
5. テスト実行（任意）
6. リモートプッシュ
7. PR作成
8. レビュアー設定
9. 完了通知送信
10. 次のステップ案内
```

## コミットメッセージ形式
```
feat: add user profile management
fix: resolve login error on mobile
docs: update API documentation
refactor: improve database query performance
test: add unit tests for user service
```

## PR作成テンプレート
```markdown
## 概要
[作業内容の簡潔な説明]

## 変更点
- [変更点1]
- [変更点2]

## テスト
- [ ] 単体テスト実行
- [ ] 手動テスト実行

## 関連Issue
Closes #[issue-number]
```

## 依存関係
- **前提**: 00-project-structure, 02-git-basic-operations, 03-interactive-prompts, 04-start-command
- **後続**: 07-team-command

## 実装時の注意点
- 破壊的操作前の十分な確認
- テスト失敗時の適切な案内
- PR作成の柔軟性確保
- 通知頻度の適切な管理

## 完了条件
- [ ] コミット支援機能が動作
- [ ] テスト実行機能が動作
- [ ] PR作成機能が動作
- [ ] レビュアー提案が機能
- [ ] 完了通知が送信される
- [ ] エラーハンドリングが適切

## 推定工数
1.5日

## 備考
MVPでは基本的なPR作成に注力し、高度な自動化は段階的に実装する。