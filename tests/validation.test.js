const Validation = require('../src/utils/validation');

describe('Validation', () => {
  describe('validateBranchName', () => {
    test('有効なブランチ名を受け入れる', () => {
      const result = Validation.validateBranchName('feature/new-function');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('feature/new-function');
    });

    test('無効なブランチ名を拒否する', () => {
      const result = Validation.validateBranchName('feature with spaces');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('空のブランチ名を拒否する', () => {
      const result = Validation.validateBranchName('');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateCommitMessage', () => {
    test('有効なコミットメッセージを受け入れる', () => {
      const result = Validation.validateCommitMessage('機能追加: 新しいログイン機能');
      expect(result.valid).toBe(true);
    });

    test('短すぎるコミットメッセージを拒否する', () => {
      const result = Validation.validateCommitMessage('fix');
      expect(result.valid).toBe(false);
    });

    test('空のコミットメッセージを拒否する', () => {
      const result = Validation.validateCommitMessage('');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateUrl', () => {
    test('有効なHTTPS URLを受け入れる', () => {
      const result = Validation.validateUrl('https://example.com');
      expect(result.valid).toBe(true);
    });

    test('無効なURLを拒否する', () => {
      const result = Validation.validateUrl('not-a-url');
      expect(result.valid).toBe(false);
    });
  });
});