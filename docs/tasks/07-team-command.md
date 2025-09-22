# タスク07: team-flow team コマンド実装

## 概要
チーム全体の開発状況を確認するための`team-flow team`コマンドを実装し、チームの活動状況とコラボレーションを支援する。

## 優先度
🟠 **中** - チーム連携の効率化

## 現在の状況
- コマンドの骨組みのみ実装済み（TODO状態）
- 実際の機能は未実装

## 実装すべき最小機能
1. **アクティブブランチ一覧**
   - チームメンバーの作業中ブランチ
   - 各ブランチの最終更新日時
   - 関連するIssue情報
   - 進捗状況の推定

2. **レビュー待ち状況**
   - オープンなPull Request一覧
   - レビュー担当者の割り当て状況
   - レビュー期限の確認
   - 自分がレビューすべきPR

3. **競合警告機能**
   - 同じファイルを編集中のブランチ検出
   - 潜在的なマージコンフリクト警告
   - 依存関係の競合確認

4. **活動メトリクス表示**
   - チーム全体のコミット頻度
   - PR作成・マージ状況
   - Issue完了率
   - コードレビューの応答時間

## 実装ファイル
- `src/commands/team.js` - teamコマンドのメイン実装
- `src/utils/teamStatus.js` - チーム状況分析
- `src/utils/conflictDetection.js` - 競合検知

## コマンドフロー
```
1. リモートリポジトリ情報取得
2. アクティブブランチ分析
3. PR状況確認
4. 競合可能性チェック
5. メトリクス計算
6. 統合レポート生成
7. 推奨アクション提案
```

## 表示項目例
```
📊 Team Flow Status

🌿 Active Branches (5)
├─ feature/user-auth (Alice, 2日前) #123
├─ bugfix/payment-fix (Bob, 1日前) #124
└─ docs/api-update (Carol, 3時間前) #125

🔍 Review Queue (3)
├─ PR #122: Add dashboard [要レビュー]
├─ PR #121: Fix mobile layout [承認待ち]
└─ PR #120: Update dependencies [変更要求]

⚠️  Potential Conflicts (1)
└─ user.js: feature/user-auth ↔ bugfix/user-validation

📈 Team Metrics (7日間)
├─ Commits: 45 (+12%)
├─ PRs: 8 created, 6 merged
└─ Review time: 平均 4.2時間
```

## 依存関係
- **前提**: 00-project-structure, 01-env-config, 09-github-integration
- **後続**: なし（独立機能）

## 実装時の注意点
- API呼び出し回数の最適化
- 大規模チームでのパフォーマンス考慮
- プライベートな情報の適切な表示
- リアルタイム性とキャッシュのバランス

## 完了条件
- [ ] アクティブブランチ一覧が表示される
- [ ] レビュー状況が確認できる
- [ ] 競合警告が機能する
- [ ] 活動メトリクスが表示される
- [ ] パフォーマンスが適切
- [ ] 大規模チームでも動作する

## 推定工数
1日

## 備考
MVPでは基本的な情報表示に注力し、高度な分析機能は将来実装とする。