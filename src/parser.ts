import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LogEntry, UserThread, DailyStats, PricingRates } from './types';

const PRICING_RATES: PricingRates = {
  input: 3.00 / 1000000,         // $3.00 per 1M tokens
  output: 15.00 / 1000000,       // $15.00 per 1M tokens
  cacheCreation: 3.75 / 1000000, // $3.75 per 1M tokens
  cacheRead: 0.30 / 1000000      // $0.30 per 1M tokens
};

export class LogParser {
  private claudeDir: string;

  constructor() {
    this.claudeDir = path.join(os.homedir(), '.claude');
  }

  /**
   * 本日のログエントリを取得
   */
  public getTodayEntries(): LogEntry[] {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const projectsDir = path.join(this.claudeDir, 'projects');
    
    if (!fs.existsSync(projectsDir)) {
      throw new Error('Claude projects directory not found');
    }

    const allEntries: LogEntry[] = [];
    const projectDirs = fs.readdirSync(projectsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const projectDir of projectDirs) {
      const projectPath = path.join(projectsDir, projectDir);
      const logFiles = fs.readdirSync(projectPath)
        .filter(file => file.endsWith('.jsonl'));

      for (const logFile of logFiles) {
        const logPath = path.join(projectPath, logFile);
        const entries = this.parseLogFile(logPath, today);
        allEntries.push(...entries);
      }
    }

    return allEntries.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  /**
   * ログファイルを解析して指定日のエントリを抽出
   */
  private parseLogFile(filePath: string, targetDate: string): LogEntry[] {
    const entries: LogEntry[] = [];
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.trim().split('\n');

      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as LogEntry;
          if (entry.timestamp && entry.timestamp.startsWith(targetDate)) {
            entries.push(entry);
          }
        } catch (error) {
          // 無効なJSON行をスキップ
          continue;
        }
      }
    } catch (error) {
      // ファイル読み込みエラーをスキップ
      console.warn(`Warning: Could not read log file ${filePath}`);
    }

    return entries;
  }

  /**
   * ユーザメッセージを会話スレッドに変換
   */
  public buildUserThreads(entries: LogEntry[]): UserThread[] {
    const userMessages = entries.filter(entry => 
      entry.type === 'user' && 
      entry.message.role === 'user' &&
      typeof entry.message.content === 'string'
    );

    const threads: UserThread[] = [];

    for (const userMsg of userMessages) {
      const thread = this.buildThread(userMsg, entries);
      threads.push(thread);
    }

    return threads;
  }

  /**
   * 単一のユーザメッセージから会話スレッドを構築
   */
  private buildThread(userMsg: LogEntry, allEntries: LogEntry[]): UserThread {
    const thread: UserThread = {
      user: userMsg,
      responses: [],
      tools: 0,
      totalTokens: {
        input: 0,
        output: 0,
        cacheCreation: 0,
        cacheRead: 0
      },
      cost: 0,
      startTime: new Date(userMsg.timestamp),
      endTime: new Date(userMsg.timestamp)
    };

    // 会話スレッドを追跡
    const visited = new Set<string>();
    let currentUuid = userMsg.uuid;

    while (currentUuid && !visited.has(currentUuid)) {
      visited.add(currentUuid);
      const responses = allEntries.filter(entry => entry.parentUuid === currentUuid);

      for (const response of responses) {
        if (response.type === 'assistant' && 'usage' in response.message) {
          thread.responses.push(response);
          
          // トークン使用量を集計
          const usage = (response.message as any).usage;
          thread.totalTokens.input += usage.input_tokens || 0;
          thread.totalTokens.output += usage.output_tokens || 0;
          thread.totalTokens.cacheCreation += usage.cache_creation_input_tokens || 0;
          thread.totalTokens.cacheRead += usage.cache_read_input_tokens || 0;

          // ツール使用回数をカウント
          if ('content' in response.message && response.message.content && Array.isArray(response.message.content)) {
            thread.tools += response.message.content.filter(c => c.type === 'tool_use').length;
          }

          // 終了時刻を更新
          const responseTime = new Date(response.timestamp);
          if (responseTime > thread.endTime) {
            thread.endTime = responseTime;
          }
        }
        
        currentUuid = response.uuid;
      }
    }

    // コストを計算
    thread.cost = this.calculateCost(thread.totalTokens);

    return thread;
  }

  /**
   * コスト計算
   */
  private calculateCost(tokens: UserThread['totalTokens']): number {
    return (
      tokens.input * PRICING_RATES.input +
      tokens.output * PRICING_RATES.output +
      tokens.cacheCreation * PRICING_RATES.cacheCreation +
      tokens.cacheRead * PRICING_RATES.cacheRead
    );
  }

  /**
   * 日次統計を計算
   */
  public calculateDailyStats(threads: UserThread[]): DailyStats {
    const stats: DailyStats = {
      userMessages: threads.length,
      totalExchanges: 0,
      toolsUsed: 0,
      totalTokens: {
        input: 0,
        output: 0,
        cacheCreation: 0,
        cacheRead: 0
      },
      totalCost: 0,
      startTime: new Date(),
      endTime: new Date(0)
    };

    if (threads.length === 0) return stats;

    for (const thread of threads) {
      stats.totalExchanges += thread.responses.length;
      stats.toolsUsed += thread.tools;
      stats.totalTokens.input += thread.totalTokens.input;
      stats.totalTokens.output += thread.totalTokens.output;
      stats.totalTokens.cacheCreation += thread.totalTokens.cacheCreation;
      stats.totalTokens.cacheRead += thread.totalTokens.cacheRead;
      stats.totalCost += thread.cost;

      if (thread.startTime < stats.startTime) {
        stats.startTime = thread.startTime;
      }
      if (thread.endTime > stats.endTime) {
        stats.endTime = thread.endTime;
      }
    }

    return stats;
  }

  /**
   * プロジェクト名を取得
   */
  public getProjectName(cwd: string): string {
    const parts = cwd.split('/');
    return parts[parts.length - 1] || 'unknown';
  }
}