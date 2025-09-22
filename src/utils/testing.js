const { spawn } = require('child_process');
const fs = require('fs').promises;
// const path = require('path'); // 将来的に使用予定
const chalk = require('chalk');
const ora = require('ora');

/**
 * テスト実行ユーティリティ
 */
class TestRunner {
  /**
   * テスト設定の存在をチェック
   */
  static async hasTestConfiguration() {
    try {
      // package.jsonのテストスクリプト確認
      const packageJson = await this.getPackageJson();
      if (packageJson && packageJson.scripts && packageJson.scripts.test) {
        return true;
      }

      // 各種テスト設定ファイルの確認
      const testConfigFiles = [
        'jest.config.js',
        'jest.config.json',
        'vitest.config.js',
        'vitest.config.ts',
        'karma.conf.js',
        'mocha.opts',
        '.mocharc.json',
        'cypress.config.js',
        'playwright.config.js'
      ];

      for (const configFile of testConfigFiles) {
        if (await this.fileExists(configFile)) {
          return true;
        }
      }

      // テストディレクトリの確認
      const testDirs = ['test', 'tests', '__tests__', 'spec'];
      for (const testDir of testDirs) {
        if (await this.directoryExists(testDir)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * テストを実行
   */
  static async runTests() {
    const packageJson = await this.getPackageJson();

    // npm test が利用可能な場合
    if (packageJson && packageJson.scripts && packageJson.scripts.test) {
      return await this.runNpmTest();
    }

    // 各テストフレームワークを試行
    const testRunners = [
      { command: 'jest', args: [] },
      { command: 'vitest', args: ['run'] },
      { command: 'mocha', args: [] },
      { command: 'npm', args: ['test'] }
    ];

    for (const runner of testRunners) {
      try {
        return await this.executeTestCommand(runner.command, runner.args);
      } catch (error) {
        // 次のランナーを試行
        continue;
      }
    }

    throw new Error('利用可能なテストランナーが見つかりません');
  }

  /**
   * npm test を実行
   */
  static async runNpmTest() {
    const spinner = ora('npm test を実行中...').start();

    try {
      const result = await this.executeCommand('npm', ['test']);
      spinner.stop();

      if (result.code === 0) {
        console.log(chalk.green('✅ すべてのテストが通過しました'));
        return result;
      } else {
        throw new Error('テストが失敗しました\n' + result.stderr);
      }
    } catch (error) {
      spinner.stop();
      throw error;
    }
  }

  /**
   * リントとタイプチェックを実行
   */
  static async runLintAndTypeCheck() {
    const packageJson = await this.getPackageJson();
    const results = [];

    if (packageJson && packageJson.scripts) {
      // ESLint
      if (packageJson.scripts.lint) {
        try {
          const spinner = ora('ESLint を実行中...').start();
          await this.executeCommand('npm', ['run', 'lint']);
          spinner.stop();
          console.log(chalk.green('✅ ESLint チェック完了'));
          results.push({ tool: 'ESLint', status: 'passed' });
        } catch (error) {
          console.log(chalk.red('❌ ESLint エラー'));
          results.push({ tool: 'ESLint', status: 'failed', error: error.message });
        }
      }

      // TypeScript
      if (packageJson.scripts.typecheck || await this.fileExists('tsconfig.json')) {
        try {
          const spinner = ora('TypeScript チェック中...').start();
          const command = packageJson.scripts.typecheck ?
            ['npm', ['run', 'typecheck']] :
            ['npx', ['tsc', '--noEmit']];

          await this.executeCommand(command[0], command[1]);
          spinner.stop();
          console.log(chalk.green('✅ TypeScript チェック完了'));
          results.push({ tool: 'TypeScript', status: 'passed' });
        } catch (error) {
          console.log(chalk.red('❌ TypeScript エラー'));
          results.push({ tool: 'TypeScript', status: 'failed', error: error.message });
        }
      }

      // Prettier
      if (packageJson.scripts['format:check']) {
        try {
          const spinner = ora('Prettier チェック中...').start();
          await this.executeCommand('npm', ['run', 'format:check']);
          spinner.stop();
          console.log(chalk.green('✅ Prettier チェック完了'));
          results.push({ tool: 'Prettier', status: 'passed' });
        } catch (error) {
          console.log(chalk.red('❌ Prettier エラー'));
          results.push({ tool: 'Prettier', status: 'failed', error: error.message });
        }
      }
    }

    return results;
  }

  /**
   * テストカバレッジを取得
   */
  static async getTestCoverage() {
    const packageJson = await this.getPackageJson();

    if (packageJson && packageJson.scripts && packageJson.scripts['test:coverage']) {
      try {
        const spinner = ora('テストカバレッジを取得中...').start();
        const result = await this.executeCommand('npm', ['run', 'test:coverage']);
        spinner.stop();

        // カバレッジ結果の解析（簡易版）
        const coverageMatch = result.stdout.match(/Statements\s+:\s+(\d+\.?\d*)%/);
        if (coverageMatch) {
          const coverage = parseFloat(coverageMatch[1]);
          console.log(chalk.blue(`📊 テストカバレッジ: ${coverage}%`));
          return coverage;
        }
      } catch (error) {
        console.log(chalk.yellow('⚠️  カバレッジ取得に失敗しました'));
      }
    }

    return null;
  }

  /**
   * 特定のテストファイルのみ実行
   */
  static async runSpecificTests(pattern) {
    const spinner = ora(`テスト実行中: ${pattern}`).start();

    try {
      // Jest の場合
      if (await this.hasJest()) {
        const result = await this.executeCommand('npx', ['jest', pattern]);
        spinner.stop();
        return result;
      }

      // Mocha の場合
      if (await this.hasMocha()) {
        const result = await this.executeCommand('npx', ['mocha', pattern]);
        spinner.stop();
        return result;
      }

      // Vitest の場合
      if (await this.hasVitest()) {
        const result = await this.executeCommand('npx', ['vitest', 'run', pattern]);
        spinner.stop();
        return result;
      }

      throw new Error('対応するテストランナーが見つかりません');
    } catch (error) {
      spinner.stop();
      throw error;
    }
  }

  /**
   * テスト結果のサマリー表示
   */
  static displayTestSummary(results) {
    console.log(chalk.bold('\n📊 テスト結果サマリー:'));

    let totalPassed = 0;
    let totalFailed = 0;

    results.forEach(result => {
      const icon = result.status === 'passed' ? '✅' : '❌';
      const color = result.status === 'passed' ? chalk.green : chalk.red;

      console.log(`${icon} ${color(result.tool)}`);

      if (result.status === 'passed') {
        totalPassed++;
      } else {
        totalFailed++;
        if (result.error) {
          console.log(chalk.gray(`   ${result.error.split('\n')[0]}`));
        }
      }
    });

    console.log(chalk.bold(`\n合計: ${chalk.green(totalPassed)}件成功, ${chalk.red(totalFailed)}件失敗`));
  }

  // ヘルパーメソッド

  static async executeCommand(command, args) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: process.cwd(),
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ code, stdout, stderr });
        } else {
          reject(new Error(stderr || stdout));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  static async executeTestCommand(command, args) {
    return this.executeCommand(command, args);
  }

  static async getPackageJson() {
    try {
      const content = await fs.readFile('package.json', 'utf8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  static async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  static async directoryExists(dirPath) {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch (error) {
      return false;
    }
  }

  static async hasJest() {
    return await this.fileExists('jest.config.js') ||
           await this.fileExists('jest.config.json') ||
           (await this.getPackageJson())?.dependencies?.jest ||
           (await this.getPackageJson())?.devDependencies?.jest;
  }

  static async hasMocha() {
    return await this.fileExists('.mocharc.json') ||
           await this.fileExists('mocha.opts') ||
           (await this.getPackageJson())?.dependencies?.mocha ||
           (await this.getPackageJson())?.devDependencies?.mocha;
  }

  static async hasVitest() {
    return await this.fileExists('vitest.config.js') ||
           await this.fileExists('vitest.config.ts') ||
           (await this.getPackageJson())?.dependencies?.vitest ||
           (await this.getPackageJson())?.devDependencies?.vitest;
  }
}

module.exports = TestRunner;