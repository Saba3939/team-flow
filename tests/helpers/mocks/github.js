/**
 * GitHub API モック
 */

class MockOctokit {
  constructor() {
    this.mockData = {
      user: {
        login: 'test-user',
        name: 'Test User',
        email: 'test@example.com',
        avatar_url: 'https://github.com/images/test-avatar.png',
        plan: { name: 'free' }
      },
      repository: {
        full_name: 'test-user/test-repo',
        name: 'test-repo',
        owner: { login: 'test-user' },
        private: false,
        fork: false
      },
      issues: [
        {
          number: 1,
          title: 'Test Issue 1',
          body: 'Test issue description',
          state: 'open',
          labels: [{ name: 'bug' }],
          assignees: [],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          html_url: 'https://github.com/test-user/test-repo/issues/1'
        }
      ],
      pullRequests: [
        {
          number: 1,
          title: 'Test PR 1',
          body: 'Test PR description',
          state: 'open',
          head: { ref: 'feature-branch' },
          base: { ref: 'main' },
          user: { login: 'test-user', avatar_url: 'https://github.com/images/test-avatar.png' },
          draft: false,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          html_url: 'https://github.com/test-user/test-repo/pull/1'
        }
      ],
      branches: [
        {
          name: 'main',
          commit: { sha: 'abc123', url: 'https://github.com/test-user/test-repo/commit/abc123' },
          protected: true
        },
        {
          name: 'feature-branch',
          commit: { sha: 'def456', url: 'https://github.com/test-user/test-repo/commit/def456' },
          protected: false
        }
      ],
      contributors: [
        {
          login: 'test-user',
          avatar_url: 'https://github.com/images/test-avatar.png',
          contributions: 10
        },
        {
          login: 'collaborator',
          avatar_url: 'https://github.com/images/collaborator-avatar.png',
          contributions: 5
        }
      ],
      rateLimit: {
        rate: {
          limit: 5000,
          remaining: 4950,
          reset: Math.floor(Date.now() / 1000) + 3600,
          used: 50
        }
      }
    };

    this.rest = {
      users: {
        getAuthenticated: jest.fn().mockResolvedValue({ data: this.mockData.user })
      },
      rateLimit: {
        get: jest.fn().mockResolvedValue({ data: this.mockData.rateLimit })
      },
      repos: {
        get: jest.fn().mockResolvedValue({ data: this.mockData.repository }),
        listBranches: jest.fn().mockResolvedValue({ data: this.mockData.branches }),
        listContributors: jest.fn().mockResolvedValue({ data: this.mockData.contributors }),
        listCommits: jest.fn().mockResolvedValue({ data: [] }),
        getCollaboratorPermissionLevel: jest.fn().mockResolvedValue({
          data: { permission: 'admin' }
        })
      },
      issues: {
        listForRepo: jest.fn().mockResolvedValue({ data: this.mockData.issues }),
        get: jest.fn().mockResolvedValue({ data: this.mockData.issues[0] }),
        create: jest.fn().mockImplementation((params) => {
          const newIssue = {
            number: this.mockData.issues.length + 1,
            title: params.title,
            body: params.body,
            labels: params.labels?.map(label => ({ name: label })) || [],
            assignees: params.assignees?.map(user => ({ login: user })) || [],
            state: 'open',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            html_url: `https://github.com/test-user/test-repo/issues/${this.mockData.issues.length + 1}`
          };
          this.mockData.issues.push(newIssue);
          return Promise.resolve({ data: newIssue });
        }),
        createComment: jest.fn().mockImplementation((params) => {
          return Promise.resolve({
            data: {
              id: Date.now(),
              body: params.body,
              created_at: new Date().toISOString(),
              html_url: `https://github.com/test-user/test-repo/issues/${params.issue_number}#issuecomment-${Date.now()}`
            }
          });
        })
      },
      pulls: {
        list: jest.fn().mockResolvedValue({ data: this.mockData.pullRequests }),
        create: jest.fn().mockImplementation((params) => {
          const newPR = {
            number: this.mockData.pullRequests.length + 1,
            title: params.title,
            body: params.body,
            head: { ref: params.head },
            base: { ref: params.base },
            user: this.mockData.user,
            draft: params.draft || false,
            state: 'open',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            html_url: `https://github.com/test-user/test-repo/pull/${this.mockData.pullRequests.length + 1}`
          };
          this.mockData.pullRequests.push(newPR);
          return Promise.resolve({ data: newPR });
        }),
        listReviews: jest.fn().mockResolvedValue({ data: [] })
      }
    };
  }

  // APIエラーを模擬
  mockApiError(method, statusCode, message) {
    const error = new Error(message);
    error.status = statusCode;

    // ドット記法で対象メソッドを見つけて置き換え
    const [service, methodName] = method.split('.');
    if (this.rest[service] && this.rest[service][methodName]) {
      this.rest[service][methodName].mockRejectedValueOnce(error);
    }
  }

  // レート制限エラーを模擬
  mockRateLimitError(method) {
    this.mockApiError(method, 403, 'API rate limit exceeded');
  }

  // 認証エラーを模擬
  mockAuthError(method) {
    this.mockApiError(method, 401, 'Bad credentials');
  }

  // 404エラーを模擬
  mockNotFoundError(method) {
    this.mockApiError(method, 404, 'Not Found');
  }

  // ネットワークエラーを模擬
  mockNetworkError(method) {
    const error = new Error('Network Error: Request failed');
    error.code = 'NETWORK_ERROR';

    const [service, methodName] = method.split('.');
    if (this.rest[service] && this.rest[service][methodName]) {
      this.rest[service][methodName].mockRejectedValueOnce(error);
    }
  }

  // モックデータをリセット
  resetMockData() {
    this.mockData.issues = [];
    this.mockData.pullRequests = [];
  }

  // カスタムレスポンスを設定
  setMockData(key, data) {
    this.mockData[key] = data;
  }

  // モック関数をクリア
  clearMocks() {
    Object.values(this.rest).forEach(service => {
      Object.values(service).forEach(method => {
        if (jest.isMockFunction(method)) {
          method.mockClear();
        }
      });
    });
  }
}

module.exports = MockOctokit;