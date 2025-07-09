#!/usr/bin/env node

import { LogParser } from './parser';
import { UI } from './ui';

async function main() {
  const args = process.argv.slice(2);
  
  // ヘルプオプション
  if (args.includes('--help') || args.includes('-h')) {
    const ui = new UI();
    ui.showHelp();
    process.exit(0);
  }

  try {
    const parser = new LogParser();
    const ui = new UI();

    // 本日のログエントリを取得
    const entries = parser.getTodayEntries();
    
    if (entries.length === 0) {
      console.log('No log entries found for today.');
      console.log('Please use Claude Code first, then try again.');
      process.exit(0);
    }

    // ユーザスレッドを構築
    const threads = parser.buildUserThreads(entries);
    
    if (threads.length === 0) {
      console.log('No user messages found for today.');
      process.exit(0);
    }

    // 日次統計を計算
    const stats = parser.calculateDailyStats(threads);

    // メインメニューを表示
    await ui.showMainMenu(threads, stats);

  } catch (error) {
    console.error('An error occurred:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  console.log('\n\nExiting program.');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nExiting program.');
  process.exit(0);
});

// メイン実行
main().catch(error => {
  console.error('Unexpected error occurred:', error);
  process.exit(1);
});