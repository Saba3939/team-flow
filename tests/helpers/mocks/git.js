/**
 * Git操作モック
 */

class MockGit {
  constructor() {
    this.mockState = {
      currentBranch: 'main',
      branches: ['main', 'feature-branch', 'develop'],
      status: {
        current: 'main',
        tracking: 'origin/main',
        ahead: 0,
        behind: 0,
        staged: [],
        modified: [],
        untracked: [],
        conflicted: []
      },
      remoteUrl: 'https://github.com/test-user/test-repo.git',
      lastCommit: {
        hash: 'abc123',
        message: 'Initial commit',
        author: 'Test User <test@example.com>',
        date: '2025-01-01T00:00:00Z'
      },
      commits: [
        {
          hash: 'abc123',
          message: 'Initial commit',
          author: 'Test User <test@example.com>',
          date: '2025-01-01T00:00:00Z'
        }
      ]
    };

    // Git操作のモック関数
    this.getCurrentBranch = jest.fn().mockResolvedValue(this.mockState.currentBranch);
    this.getBranches = jest.fn().mockResolvedValue(this.mockState.branches);
    this.getLocalBranches = jest.fn().mockResolvedValue(this.mockState.branches);
    this.hasLocalBranch = jest.fn().mockImplementation((branchName) => {
      return Promise.resolve(this.mockState.branches.includes(branchName));
    });
    this.getStatus = jest.fn().mockResolvedValue(this.mockState.status);
    this.getRemoteUrl = jest.fn().mockResolvedValue(this.mockState.remoteUrl);
    this.getLastCommit = jest.fn().mockResolvedValue(this.mockState.lastCommit);
    this.getCommits = jest.fn().mockResolvedValue(this.mockState.commits);
    
    // 追加: 未コミット変更を取得するメソッド
    this.getUncommittedChanges = jest.fn().mockImplementation(() => {
      return Promise.resolve({
        modified: this.mockState.status.modified,
        staged: this.mockState.status.staged,
        untracked: this.mockState.status.untracked
      });
    });

    // 追加: 最後のプッシュ以降のコミットを取得するメソッド
    this.getCommitsSinceLastPush = jest.fn().mockImplementation(() => {
      return Promise.resolve([]);
    });

    // 書き込み操作
    this.checkoutBranch = jest.fn().mockImplementation((branch) => {
      if (this.mockState.branches.includes(branch)) {
        this.mockState.currentBranch = branch;
        this.mockState.status.current = branch;
        return Promise.resolve();
      } else {
        return Promise.reject(new Error(`Branch '${branch}' not found`));
      }
    });

    this.createBranch = jest.fn().mockImplementation((branch) => {
      if (!this.mockState.branches.includes(branch)) {
        this.mockState.branches.push(branch);
        return Promise.resolve();
      } else {
        return Promise.reject(new Error(`Branch '${branch}' already exists`));
      }
    });

    this.createAndSwitchBranch = jest.fn().mockImplementation((branch) => {
      if (!this.mockState.branches.includes(branch)) {
        this.mockState.branches.push(branch);
        this.mockState.currentBranch = branch;
        this.mockState.status.current = branch;
        return Promise.resolve();
      } else {
        return Promise.reject(new Error(`Branch '${branch}' already exists`));
      }
    });

    this.addFiles = jest.fn().mockImplementation((files) => {
      files.forEach(file => {
        if (!this.mockState.status.staged.includes(file)) {
          this.mockState.status.staged.push(file);
        }
        // modifiedから削除
        this.mockState.status.modified = this.mockState.status.modified.filter(f => f !== file);
      });
      return Promise.resolve();
    });

    this.commit = jest.fn().mockImplementation((message) => {
      const newCommit = {
        hash: this.generateCommitHash(),
        message: message,
        author: 'Test User <test@example.com>',
        date: new Date().toISOString()
      };
      this.mockState.commits.unshift(newCommit);
      this.mockState.lastCommit = newCommit;
      this.mockState.status.staged = []; // ステージングをクリア
      return Promise.resolve(newCommit);
    });

    this.push = jest.fn().mockResolvedValue();
    this.pull = jest.fn().mockResolvedValue();
    this.fetch = jest.fn().mockResolvedValue();

    this.merge = jest.fn().mockImplementation((branch) => {
      // 通常は成功させる
      if (branch === 'conflict-branch') {
        const error = new Error('Merge conflict in file.txt');
        error.conflicted = ['file.txt'];
        return Promise.reject(error);
      }
      return Promise.resolve();
    });

    this.rebase = jest.fn().mockResolvedValue();
    this.reset = jest.fn().mockImplementation((options) => {
      if (options && options.hard) {
        this.mockState.status.modified = [];
        this.mockState.status.staged = [];
      }
      return Promise.resolve();
    });

    this.stash = jest.fn().mockResolvedValue();
    this.stashPop = jest.fn().mockResolvedValue();

    // ユーティリティ関数
    this.isRepository = jest.fn().mockResolvedValue(true);
    this.isClean = jest.fn().mockImplementation(() => {
      return Promise.resolve(
        this.mockState.status.modified.length === 0 &&
        this.mockState.status.staged.length === 0 &&
        this.mockState.status.untracked.length === 0
      );
    });

    this.isWorkingDirectoryClean = jest.fn().mockImplementation(() => {
      return Promise.resolve(
        this.mockState.status.modified.length === 0 &&
        this.mockState.status.staged.length === 0 &&
        this.mockState.status.untracked.length === 0
      );
    });

    this.hasRemote = jest.fn().mockResolvedValue(true);
    this.hasUpstream = jest.fn().mockImplementation((branch = this.mockState.currentBranch) => {
      return Promise.resolve(branch === 'main' || branch === 'develop');
    });
  }

  // コミットハッシュを生成
  generateCommitHash() {
    return Math.random().toString(36).substring(2, 8);
  }

  // ファイル状態を模擬
  mockFileChanges(modified = [], staged = [], untracked = []) {
    this.mockState.status.modified = modified;
    this.mockState.status.staged = staged;
    this.mockState.status.untracked = untracked;
  }

  // マージコンフリクトを模擬
  mockMergeConflict(files = ['file.txt']) {
    this.mockState.status.conflicted = files;
    this.merge.mockImplementation(() => {
      const error = new Error(`Merge conflict in ${files.join(', ')}`);
      error.conflicted = files;
      return Promise.reject(error);
    });
  }

  // Gitエラーを模擬
  mockGitError(method, message) {
    if (this[method] && jest.isMockFunction(this[method])) {
      this[method].mockRejectedValueOnce(new Error(message));
    }
  }

  // 権限エラーを模擬
  mockPermissionError(method) {
    this.mockGitError(method, 'Permission denied');
  }

  // ネットワークエラーを模擬
  mockNetworkError(method) {
    this.mockGitError(method, 'Could not resolve hostname github.com');
  }

  // リポジトリ状態をリセット
  resetState() {
    this.mockState = {
      currentBranch: 'main',
      branches: ['main', 'feature-branch', 'develop'],
      status: {
        current: 'main',
        tracking: 'origin/main',
        ahead: 0,
        behind: 0,
        staged: [],
        modified: [],
        untracked: [],
        conflicted: []
      },
      remoteUrl: 'https://github.com/test-user/test-repo.git',
      lastCommit: {
        hash: 'abc123',
        message: 'Initial commit',
        author: 'Test User <test@example.com>',
        date: '2025-01-01T00:00:00Z'
      },
      commits: []
    };
  }

  // モック関数をクリア
  clearMocks() {
    Object.getOwnPropertyNames(this).forEach(prop => {
      if (jest.isMockFunction(this[prop])) {
        this[prop].mockClear();
      }
    });
  }

  // カスタム状態を設定
  setState(state) {
    this.mockState = { ...this.mockState, ...state };
  }

  // 特定のブランチを現在のブランチに設定
  setCurrentBranch(branch) {
    this.mockState.currentBranch = branch;
    this.mockState.status.current = branch;
    this.getCurrentBranch.mockResolvedValue(branch);
  }

  // リモートURLを設定
  setRemoteUrl(url) {
    this.mockState.remoteUrl = url;
    this.getRemoteUrl.mockResolvedValue(url);
  }
}

module.exports = MockGit;