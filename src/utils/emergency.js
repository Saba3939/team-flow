// 緊急時対応機能
const chalk = require('chalk');
const { confirm, input, select } = require('@inquirer/prompts');
const simpleGit = require('simple-git');
const fs = require('fs-extra');
const path = require('path');
const ora = require('ora');

const git = simpleGit();

/**
 * 緊急事態の処理
 */
async function handleEmergency(action, diagnosis) {
  console.log(chalk.yellow(`\n🚨 緊急対応: ${action} を実行します...\n`));

  // 安全性の確認
  const confirmed = await confirm({
    message: chalk.red('⚠️  この操作は重要です。続行しますか？'),
    default: false
  });

  if (!confirmed) {
    console.log(chalk.gray('操作がキャンセルされました。'));
    return;
  }

  try {
    switch (action) {
    case 'resolve_conflict':
      await resolveConflict(diagnosis);
      break;
    case 'reset_work':
      await resetWork(diagnosis);
      break;
    case 'restore_files':
      await restoreFiles(diagnosis);
      break;
    case 'repair_repo':
      await repairRepository(diagnosis);
      break;
    case 'emergency_backup':
      await createEmergencyBackup(diagnosis);
      break;
    default:
      console.log(chalk.red('不明な緊急対応アクションです。'));
    }
  } catch (error) {
    console.error(chalk.red('\n❌ 緊急対応中にエラーが発生しました:'));
    console.error(error.message);
  }
}

/**
 * 修正作業の処理
 */
async function handleFix(action, diagnosis) {
  console.log(chalk.yellow(`\n⚠️  修正作業: ${action} を実行します...\n`));

  try {
    switch (action) {
    case 'amend_commit':
      await amendCommit(diagnosis);
      break;
    case 'revert_commit':
      await revertCommit(diagnosis);
      break;
    case 'rename_branch':
      await renameBranch(diagnosis);
      break;
    case 'undo_push':
      await undoPush(diagnosis);
      break;
    case 'clean_history':
      await cleanHistory(diagnosis);
      break;
    default:
      console.log(chalk.red('不明な修正アクションです。'));
    }
  } catch (error) {
    console.error(chalk.red('\n❌ 修正作業中にエラーが発生しました:'));
    console.error(error.message);
  }
}

/**
 * マージコンフリクトの解決
 */
async function resolveConflict(_diagnosis) {
  console.log(chalk.blue('\n🔄 マージコンフリクト解決ガイド\n'));

  if (!_diagnosis.conflicts || _diagnosis.conflicts.length === 0) {
    console.log(chalk.green('✅ 現在、マージコンフリクトは検出されていません。'));
    return;
  }

  console.log('コンフリクトが発生しているファイル:');
  _diagnosis.conflicts.forEach((file, index) => {
    console.log(`${index + 1}. ${chalk.red(file)}`);
  });

  console.log(chalk.yellow('\n📝 解決手順:'));
  console.log('1. 各ファイルを開いてコンフリクトマーカーを確認');
  console.log('2. <<<<<<< HEAD と >>>>>>> の間のコードを編集');
  console.log('3. コンフリクトマーカーを削除');
  console.log('4. ファイルを保存');

  const autoResolve = await confirm({
    message: '自動解決を試行しますか？ (簡単なコンフリクトのみ)',
    default: false
  });

  if (autoResolve) {
    const spinner = ora('自動解決を試行中...').start();
    try {
      // 簡単なコンフリクトの自動解決ロジック
      await git.mergeFromTo('HEAD', 'main', ['--strategy=resolve']);
      spinner.succeed('自動解決完了');
    } catch (error) {
      spinner.fail('自動解決に失敗。手動で解決してください');
      console.log(chalk.gray('コンフリクトを手動で解決後、以下のコマンドを実行:'));
      console.log(chalk.cyan('git add .'));
      console.log(chalk.cyan('git commit'));
    }
  } else {
    console.log(chalk.gray('\nコンフリクトを手動で解決後、以下のコマンドを実行:'));
    console.log(chalk.cyan('git add .'));
    console.log(chalk.cyan('git commit'));
  }
}

/**
 * 作業の取り消し
 */
async function resetWork(_diagnosis) {
  console.log(chalk.blue('\n↩️  作業取り消しオプション\n'));

  const resetOptions = [
    {
      name: '💾 変更を保持してリセット (--soft)',
      value: 'soft',
      description: 'コミットのみ取り消し、変更は保持'
    },
    {
      name: '📦 ステージングをリセット (--mixed)',
      value: 'mixed',
      description: 'コミットとステージングを取り消し、ファイルは保持'
    },
    {
      name: '🗑️  全て破棄してリセット (--hard)',
      value: 'hard',
      description: '⚠️ 全ての変更を完全に破棄'
    }
  ];

  const resetType = await select({
    message: 'リセットの種類を選択してください:',
    choices: resetOptions
  });

  // hardリセットの場合は追加確認
  if (resetType === 'hard') {
    const reallyHard = await confirm({
      message: chalk.red('⚠️ 本当に全ての変更を破棄しますか？この操作は取り消せません！'),
      default: false
    });

    if (!reallyHard) {
      console.log(chalk.gray('操作がキャンセルされました。'));
      return;
    }
  }

  const commits = await input({
    message: '何個前のコミットまで戻しますか？',
    default: '1',
    validate: (value) => {
      const num = parseInt(value);
      return num > 0 ? true : '1以上の数値を入力してください';
    }
  });

  const spinner = ora(`${resetType}リセットを実行中...`).start();
  try {
    await git.reset([`--${resetType}`, `HEAD~${commits}`]);
    spinner.succeed(`${commits}個前のコミットまでリセットしました`);
    console.log(chalk.green('\n✅ リセット完了'));
  } catch (error) {
    spinner.fail('リセットに失敗しました');
    throw error;
  }
}

/**
 * ファイルの復旧
 */
async function restoreFiles(_diagnosis) {
  console.log(chalk.blue('\n🗃️  ファイル復旧\n'));

  const restoreOptions = [
    {
      name: '📂 削除されたファイルを一覧表示',
      value: 'list_deleted',
      description: '削除されたファイルを確認'
    },
    {
      name: '↩️  特定のファイルを復旧',
      value: 'restore_specific',
      description: 'ファイル名を指定して復旧'
    },
    {
      name: '🔄 全ての削除ファイルを復旧',
      value: 'restore_all',
      description: '全ての削除されたファイルを復旧'
    }
  ];

  const restoreAction = await select({
    message: '復旧操作を選択してください:',
    choices: restoreOptions
  });

  const spinner = ora('削除されたファイルを検索中...').start();

  try {
    const status = await git.status();
    const deletedFiles = status.deleted;
    spinner.stop();

    if (deletedFiles.length === 0) {
      console.log(chalk.green('削除されたファイルは見つかりませんでした。'));
      return;
    }

    console.log('\n削除されたファイル:');
    deletedFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${chalk.red(file)}`);
    });

    switch (restoreAction) {
    case 'list_deleted':
      // 既に表示済み
      break;

    case 'restore_specific': {
      const fileName = await input({
        message: '復旧するファイル名を入力してください:',
        validate: (value) => value.trim() ? true : 'ファイル名を入力してください'
      });

      if (deletedFiles.includes(fileName.trim())) {
        await git.checkout(['HEAD', fileName.trim()]);
        console.log(chalk.green(`✅ ${fileName} を復旧しました`));
      } else {
        console.log(chalk.red('指定されたファイルが見つかりません。'));
      }
      break;
    }

    case 'restore_all': {
      const confirmAll = await confirm({
        message: `${deletedFiles.length}個のファイルを全て復旧しますか？`,
        default: false
      });

      if (confirmAll) {
        for (const file of deletedFiles) {
          await git.checkout(['HEAD', file]);
        }
        console.log(chalk.green(`✅ ${deletedFiles.length}個のファイルを復旧しました`));
      }
      break;
    }
    }
  } catch (error) {
    spinner.fail('ファイル復旧に失敗しました');
    throw error;
  }
}

/**
 * リポジトリの修復
 */
async function repairRepository(_diagnosis) {
  console.log(chalk.blue('\n🏥 リポジトリ修復\n'));

  const repairSteps = [
    'Git設定の確認',
    'リポジトリの整合性チェック',
    '破損したオブジェクトの修復',
    'インデックスの再構築',
    'リモートの再同期'
  ];

  console.log('修復手順:');
  repairSteps.forEach((step, index) => {
    console.log(`${index + 1}. ${step}`);
  });

  const proceedRepair = await confirm({
    message: '修復を開始しますか？',
    default: true
  });

  if (!proceedRepair) {
    console.log(chalk.gray('修復がキャンセルされました。'));
    return;
  }

  // 段階的修復
  for (let i = 0; i < repairSteps.length; i++) {
    const spinner = ora(`${repairSteps[i]}...`).start();

    try {
      switch (i) {
      case 0: // Git設定の確認
        await git.listConfig();
        break;
      case 1: // 整合性チェック
        await git.raw(['fsck', '--full']);
        break;
      case 2: // 破損オブジェクト修復
        await git.raw(['gc', '--prune=now']);
        break;
      case 3: // インデックス再構築
        await git.raw(['read-tree', '--empty']);
        await git.raw(['read-tree', 'HEAD']);
        break;
      case 4: // リモート再同期
        await git.fetch();
        break;
      }
      spinner.succeed(`${repairSteps[i]} 完了`);
    } catch (error) {
      spinner.warn(`${repairSteps[i]} でエラー: ${error.message}`);
    }
  }

  console.log(chalk.green('\n✅ リポジトリ修復完了'));
}

/**
 * 緊急バックアップの作成
 */
async function createEmergencyBackup(_diagnosis) {
  console.log(chalk.blue('\n💾 緊急バックアップ作成\n'));

  const backupDir = path.join(process.cwd(), '../team-flow-emergency-backup');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${backupDir}-${timestamp}`;

  const spinner = ora('緊急バックアップを作成中...').start();

  try {
    await fs.copy(process.cwd(), backupPath, {
      filter: (src) => {
        // .git, node_modules, build等は除外
        const excluded = ['.git', 'node_modules', 'dist', 'build', '.tmp'];
        return !excluded.some(dir => src.includes(dir));
      }
    });

    spinner.succeed('緊急バックアップ作成完了');
    console.log(chalk.green(`✅ バックアップ場所: ${backupPath}`));
    console.log(chalk.gray('問題が解決したら、このバックアップは削除できます。'));

  } catch (error) {
    spinner.fail('バックアップ作成に失敗しました');
    throw error;
  }
}

/**
 * コミットの修正
 */
async function amendCommit(_diagnosis) {
  console.log(chalk.blue('\n🔄 コミット修正\n'));

  const amendOptions = [
    {
      name: '📝 コミットメッセージのみ変更',
      value: 'message_only',
      description: 'ファイルはそのままでメッセージを変更'
    },
    {
      name: '📁 ファイルを追加してコミット修正',
      value: 'add_files',
      description: 'ファイルを追加してから修正'
    },
    {
      name: '🗑️  ファイルを削除してコミット修正',
      value: 'remove_files',
      description: 'ファイルを削除してから修正'
    }
  ];

  const amendType = await select({
    message: '修正の種類を選択してください:',
    choices: amendOptions
  });

  switch (amendType) {
  case 'message_only': {
    const newMessage = await input({
      message: '新しいコミットメッセージを入力してください:',
      validate: (value) => value.trim() ? true : 'メッセージを入力してください'
    });
    await git.commit(newMessage, undefined, { '--amend': true, '--no-edit': false });
    console.log(chalk.green('✅ コミットメッセージを修正しました'));
    break;
  }

  case 'add_files':
    console.log(chalk.gray('まず追加したいファイルをgit addしてから、以下のコマンドを実行してください:'));
    console.log(chalk.cyan('git commit --amend'));
    break;

  case 'remove_files':
    console.log(chalk.gray('まず削除したいファイルをgit rm または git reset してから、以下のコマンドを実行してください:'));
    console.log(chalk.cyan('git commit --amend'));
    break;
  }
}

/**
 * コミットの取り消し
 */
async function revertCommit(_diagnosis) {
  console.log(chalk.blue('\n↪️  コミット取り消し\n'));

  const commits = await input({
    message: '取り消したいコミット数を入力してください:',
    default: '1',
    validate: (value) => {
      const num = parseInt(value);
      return num > 0 ? true : '1以上の数値を入力してください';
    }
  });

  const spinner = ora(`最新${commits}個のコミットを取り消し中...`).start();

  try {
    for (let i = 0; i < parseInt(commits); i++) {
      await git.revert('HEAD~' + i);
    }
    spinner.succeed(`${commits}個のコミットを安全に取り消しました`);
    console.log(chalk.green('✅ 取り消し完了（履歴は保持されます）'));
  } catch (error) {
    spinner.fail('コミット取り消しに失敗しました');
    throw error;
  }
}

/**
 * ブランチ名の変更
 */
async function renameBranch(_diagnosis) {
  console.log(chalk.blue('\n🏷️  ブランチ名変更\n'));

  const currentBranch = _diagnosis.currentBranch || 'unknown';
  console.log(`現在のブランチ: ${chalk.cyan(currentBranch)}`);

  const newBranchName = await input({
    message: '新しいブランチ名を入力してください:',
    validate: (value) => {
      if (!value.trim()) return 'ブランチ名を入力してください';
      if (!/^[a-zA-Z0-9\-_/]+$/.test(value)) return '英数字、ハイフン、アンダースコア、スラッシュのみ使用可能です';
      return true;
    }
  });

  const spinner = ora('ブランチ名を変更中...').start();

  try {
    await git.branch(['-m', newBranchName.trim()]);
    spinner.succeed(`ブランチ名を "${newBranchName}" に変更しました`);

    // リモートにプッシュ済みの場合の案内
    const pushRemote = await confirm({
      message: 'リモートリポジトリにも反映しますか？',
      default: false
    });

    if (pushRemote) {
      await git.push('origin', newBranchName, { '--set-upstream': true });
      await git.push('origin', currentBranch, { '--delete': true });
      console.log(chalk.green('✅ リモートにも反映しました'));
    }

  } catch (error) {
    spinner.fail('ブランチ名変更に失敗しました');
    throw error;
  }
}

/**
 * プッシュの取り消し
 */
async function undoPush(_diagnosis) {
  console.log(chalk.red('\n⚠️  プッシュ取り消し - 危険な操作\n'));

  console.log(chalk.yellow('注意: この操作はチームメンバーに影響を与える可能性があります'));
  console.log(chalk.gray('- 他の人がpullしている場合、コンフリクトが発生する可能性があります'));
  console.log(chalk.gray('- パブリックなブランチでは避けるべき操作です\n'));

  const reallyUndo = await confirm({
    message: chalk.red('本当にプッシュを取り消しますか？'),
    default: false
  });

  if (!reallyUndo) {
    console.log(chalk.gray('操作がキャンセルされました。'));
    return;
  }

  const commits = await input({
    message: '何個前のコミットまで戻しますか？',
    default: '1',
    validate: (value) => {
      const num = parseInt(value);
      return num > 0 ? true : '1以上の数値を入力してください';
    }
  });

  const spinner = ora('プッシュを取り消し中...').start();

  try {
    // ローカルでリセット
    await git.reset(['--hard', `HEAD~${commits}`]);
    // 強制プッシュ
    await git.push('origin', _diagnosis.currentBranch, { '--force': true });

    spinner.succeed('プッシュを取り消しました');
    console.log(chalk.yellow('\n⚠️  チームメンバーに変更を通知してください'));

  } catch (error) {
    spinner.fail('プッシュ取り消しに失敗しました');
    throw error;
  }
}

/**
 * 履歴の整理
 */
async function cleanHistory(_diagnosis) {
  console.log(chalk.blue('\n📚 履歴整理\n'));

  console.log(chalk.yellow('⚠️  この機能は高度な操作です'));
  console.log(chalk.gray('- 初心者の方は避けることをお勧めします'));
  console.log(chalk.gray('- バックアップを作成してから実行してください\n'));

  const cleanOptions = [
    {
      name: '🧹 最新数コミットをまとめる (squash)',
      value: 'squash_recent',
      description: '最新のコミットをひとつにまとめる'
    },
    {
      name: '✏️  インタラクティブrebase',
      value: 'interactive_rebase',
      description: 'コミットを自由に編集・並び替え'
    },
    {
      name: '🗑️  特定のコミットを削除',
      value: 'remove_commit',
      description: '指定したコミットを履歴から削除'
    }
  ];

  const cleanAction = await select({
    message: '履歴整理の方法を選択してください:',
    choices: cleanOptions
  });

  console.log(chalk.red('\n⚠️  この操作は履歴を変更します。続行前にバックアップを強く推奨します。'));

  const proceedClean = await confirm({
    message: '続行しますか？',
    default: false
  });

  if (!proceedClean) {
    console.log(chalk.gray('操作がキャンセルされました。'));
    return;
  }

  // 実装は複雑になるため、基本的なガイダンスを提供
  switch (cleanAction) {
  case 'squash_recent':
    console.log(chalk.cyan('\n手動で以下のコマンドを実行してください:'));
    console.log(chalk.cyan('git rebase -i HEAD~[コミット数]'));
    console.log(chalk.gray('エディタでpickをsquashに変更してください'));
    break;

  case 'interactive_rebase':
    console.log(chalk.cyan('\n手動で以下のコマンドを実行してください:'));
    console.log(chalk.cyan('git rebase -i HEAD~[コミット数]'));
    break;

  case 'remove_commit':
    console.log(chalk.cyan('\n手動で以下のコマンドを実行してください:'));
    console.log(chalk.cyan('git rebase -i HEAD~[コミット数]'));
    console.log(chalk.gray('エディタで削除したい行を削除してください'));
    break;
  }
}

module.exports = {
  handleEmergency,
  handleFix
};