# タスク02: 基本Git操作機能

## 概要
team-flowで使用する基本的なGit操作（ブランチ作成、ステータス確認、コミットなど）のヘルパー機能を実装する。

## 優先度
🟡 **高** - 全コマンドの基盤となる

## 現在の状況
- simple-gitパッケージが導入済み
- Git操作の実装が未着手

## 実装すべき最小機能
1. **Git状態確認**
   - リポジトリの存在確認
   - 現在のブランチ取得
   - 作業ディレクトリの状態確認
   - リモートの同期状況確認

2. **基本ブランチ操作**
   - 新しいブランチの作成
   - ブランチの切り替え
   - ブランチ一覧取得
   - ブランチの削除（安全な削除のみ）

3. **ファイル操作**
   - 変更ファイル一覧
   - ステージング操作
   - コミット作成
   - プッシュ操作

4. **安全性チェック**
   - 未保存変更の検知
   - コンフリクトの確認
   - リモートとの差分確認

## 実装ファイル
- `src/utils/git.js` - Git操作のメインモジュール
- `src/utils/validation.js` - Git状態の検証

## 主要な関数
```javascript
// Git状態確認
async function getGitStatus()
async function getCurrentBranch()
async function hasUncommittedChanges()

// ブランチ操作
async function createBranch(branchName)
async function switchBranch(branchName)
async function getBranches()

// ファイル操作
async function addFiles(files)
async function commit(message)
async function push(branch)

// 安全性チェック
async function isRepoClean()
async function hasConflicts()
```

## 依存関係
- **前提**: 00-project-structure, 01-env-config
- **後続**: 04-start-command, 05-continue-command, 06-finish-command

## 実装時の注意点
- 破壊的操作前の確認プロンプト必須
- エラーハンドリングの充実
- Git初心者にも分かりやすいエラーメッセージ
- 操作前のバックアップ推奨案内

## 完了条件
- [ ] Git基本操作関数が実装済み
- [ ] 安全性チェック機能が動作
- [ ] エラーハンドリングが適切
- [ ] 単体テストが作成済み
- [ ] Git未初期化時の適切な案内

## 推定工数
1日

## 備考
Git初心者の安全性を最優先に、段階的な操作ガイドも検討する。