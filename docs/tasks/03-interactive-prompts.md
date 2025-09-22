# タスク03: 対話型プロンプトシステム

## 概要
team-flowの核となる対話型ユーザーインターフェースを実装し、初心者にも分かりやすい段階的なガイド機能を提供する。

## 優先度
🟡 **高** - UXの根幹を担う

## 現在の状況
- @inquirer/promptsパッケージが導入済み
- 対話型プロンプトの実装が未着手

## 実装すべき最小機能
1. **基本プロンプト機能**
   - 選択式メニュー（select）
   - テキスト入力（input）
   - 確認プロンプト（confirm）
   - 複数選択（checkbox）

2. **段階的ガイド機能**
   - 作業種別の選択ガイド
   - ブランチ名の入力支援
   - コミットメッセージの構成支援
   - レビュアー選択支援

3. **初心者向け説明機能**
   - 各選択肢の詳細説明
   - 操作の影響範囲の明示
   - おすすめオプションの提示
   - 安全性に関する警告

4. **入力検証機能**
   - ブランチ名の形式チェック
   - コミットメッセージの品質チェック
   - 必須項目の入力確認

## 実装ファイル
- `src/utils/prompts.js` - プロンプト機能のメインモジュール
- `src/templates/messages.js` - メッセージテンプレート

## 主要な関数
```javascript
// 基本プロンプト
async function selectWorkType()
async function inputBranchName(workType)
async function confirmAction(action, details)
async function selectReviewers(teamMembers)

// ガイド機能
async function guidedBranchCreation()
async function guidedCommitMessage()
async function guidedPullRequest()

// 検証機能
function validateBranchName(name)
function validateCommitMessage(message)
```

## プロンプトの設計方針
1. **段階的な情報提示**: 必要な情報のみを適切なタイミングで
2. **明確な選択肢**: 初心者にも理解しやすい選択肢の提示
3. **安全な操作**: 破壊的操作前の明確な確認
4. **効率的な操作**: 経験者向けのショートカット提供

## 依存関係
- **前提**: 00-project-structure, 01-env-config
- **後続**: 全コマンド実装（04-08）

## 実装時の注意点
- ユーザビリティを最優先
- レスポンスの速さを確保
- キーボード操作の統一性
- アクセシビリティの考慮

## 完了条件
- [ ] 基本プロンプト機能が実装済み
- [ ] 入力検証機能が動作
- [ ] 段階的ガイドが機能
- [ ] 初心者向け説明が適切
- [ ] エラーハンドリングが充実

## 推定工数
1日

## 備考
UXの品質がツール全体の使いやすさを左右するため、十分な検討とテストが必要。