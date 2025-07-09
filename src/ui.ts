import inquirer from 'inquirer';
import chalk from 'chalk';
import Table from 'cli-table3';
import { UserThread, DailyStats, LogEntry, MessageContent } from './types';

export class UI {
  /**
   * メインメニューを表示
   */
  public async showMainMenu(threads: UserThread[], stats: DailyStats): Promise<void> {
    while (true) {
      console.clear();
      this.showHeader();
      this.showMessageList(threads);
      this.showStats(stats);

      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'Select an option:',
          choices: [
            ...threads.map((thread, index) => ({
              name: this.formatMessageChoice(thread, index + 1),
              value: `message_${index}`
            })),
            new inquirer.Separator(),
            { name: 'Exit', value: 'quit' }
          ],
          pageSize: 15
        }
      ]);

      if (action === 'quit') {
        break;
      }

      if (action.startsWith('message_')) {
        const index = parseInt(action.split('_')[1]);
        await this.showMessageDetail(threads[index]);
      }
    }
  }

  /**
   * ヘッダーを表示
   */
  private showHeader(): void {
    const today = new Date().toISOString().split('T')[0];
    console.log(chalk.cyan('┌─────────────────────────────────────────────────────────────────────────────────┐'));
    console.log(chalk.cyan(`│                    Claude Code Message History - ${today}                     │`));
    console.log(chalk.cyan('└─────────────────────────────────────────────────────────────────────────────────┘'));
    console.log('');
  }

  /**
   * メッセージ一覧を表示
   */
  private showMessageList(threads: UserThread[]): void {
    if (threads.length === 0) {
      console.log(chalk.yellow('No messages found for today.'));
      return;
    }

    threads.forEach((thread, index) => {
      const time = thread.startTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false
      });
      
      const projectName = this.getProjectName(thread.user.cwd);
      const content = this.truncateMessage(thread.user.message.content as string, 60);
      
      console.log(`${chalk.gray(`${index + 1}.`)} ${chalk.blue(time)} ${chalk.green(`[${projectName}]`)}`);
      console.log(`   ${chalk.white('💬')} ${content}`);
      console.log(`   ${chalk.cyan('🔄')} ${thread.responses.length} exchanges | ${chalk.magenta('🛠️')} ${thread.tools} tools | ${chalk.yellow('💰')} $${thread.cost.toFixed(6)}`);
      console.log('');
    });
  }

  /**
   * 統計情報を表示
   */
  private showStats(stats: DailyStats): void {
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log('');
    console.log(chalk.bold('📈 Today\'s Statistics:'));
    console.log(`   ${chalk.blue('👤')} User messages: ${stats.userMessages}`);
    console.log(`   ${chalk.cyan('🔄')} Total exchanges: ${stats.totalExchanges} (avg ${(stats.totalExchanges / Math.max(stats.userMessages, 1)).toFixed(1)}/question)`);
    console.log(`   ${chalk.magenta('🛠️')} Tools used: ${stats.toolsUsed}`);
    console.log(`   ${chalk.white('🔢')} Total tokens: input ${stats.totalTokens.input} | output ${stats.totalTokens.output} | cache ${stats.totalTokens.cacheCreation + stats.totalTokens.cacheRead}`);
    console.log(`   ${chalk.yellow('💰')} Estimated cost: $${stats.totalCost.toFixed(5)}`);
    
    if (stats.userMessages > 0) {
      const startTime = stats.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      const endTime = stats.endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      console.log(`   ${chalk.gray('⏰')} Active time: ${startTime} - ${endTime}`);
    }
    
    console.log('');
  }

  /**
   * メッセージ詳細を表示
   */
  private async showMessageDetail(thread: UserThread): Promise<void> {
    while (true) {
      console.clear();
      this.showDetailHeader(thread);
      this.showUserMessage(thread);
      this.showAssistantResponses(thread);
      this.showThreadStats(thread);

      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'Select an option:',
          choices: [
            { name: 'Back', value: 'back' },
            { name: 'Exit', value: 'quit' }
          ]
        }
      ]);

      if (action === 'back') {
        break;
      }

      if (action === 'quit') {
        process.exit(0);
      }
    }
  }

  /**
   * 詳細ヘッダーを表示
   */
  private showDetailHeader(thread: UserThread): void {
    const time = thread.startTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false
    });
    const date = thread.startTime.toISOString().split('T')[0];
    
    console.log(chalk.cyan('┌─────────────────────────────────────────────────────────────────────────────────┐'));
    console.log(chalk.cyan(`│                   Message Details - ${date} ${time}                        │`));
    console.log(chalk.cyan('└─────────────────────────────────────────────────────────────────────────────────┘'));
    console.log('');
  }

  /**
   * ユーザメッセージを表示
   */
  private showUserMessage(thread: UserThread): void {
    const projectName = this.getProjectName(thread.user.cwd);
    console.log(chalk.bold(`📝 User Message [${projectName}]:`));
    console.log(chalk.white(thread.user.message.content as string));
    console.log('');
  }

  /**
   * アシスタントの応答を表示
   */
  private showAssistantResponses(thread: UserThread): void {
    console.log(chalk.bold(`🤖 Assistant Response History (${thread.responses.length} exchanges):`));
    console.log('');

    thread.responses.forEach((response, index) => {
      const time = new Date(response.timestamp).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false
      });

      const usage = (response.message as any).usage;
      const cost = (
        (usage.input_tokens || 0) * (3.00 / 1000000) +
        (usage.output_tokens || 0) * (15.00 / 1000000) +
        ((usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0)) * (3.75 / 1000000)
      );

      console.log(`${chalk.gray(`${index + 1}.`)} ${chalk.blue(time)} ${this.getResponseTypeIcon((response.message as any).content)}`);
      
      // 応答内容を表示
      this.showResponseContent((response.message as any).content);
      
      console.log(`   ${chalk.gray('📊')} Input: ${usage.input_tokens || 0} | Output: ${usage.output_tokens || 0} | Cache: ${(usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0)} | ${chalk.yellow('💰')} $${cost.toFixed(6)}`);
      console.log('');
    });
  }

  /**
   * 応答内容を表示
   */
  private showResponseContent(content: MessageContent[]): void {
    for (const item of content) {
      if (item.type === 'text') {
        console.log(`   ${chalk.white('💬')} ${this.truncateMessage(item.text || '', 100)}`);
      } else if (item.type === 'tool_use') {
        console.log(`   ${chalk.magenta('🛠️')} ${item.name}${item.input ? ` - ${this.formatToolInput(item.input)}` : ''}`);
      }
    }
  }

  /**
   * スレッド統計を表示
   */
  private showThreadStats(thread: UserThread): void {
    const duration = Math.round((thread.endTime.getTime() - thread.startTime.getTime()) / 1000);
    const toolBreakdown = this.getToolBreakdown(thread.responses);

    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log('');
    console.log(chalk.bold('📈 Question Statistics:'));
    console.log(`   ${chalk.cyan('🔄')} Total exchanges: ${thread.responses.length}`);
    console.log(`   ${chalk.magenta('🛠️')} Tools used: ${thread.tools}${toolBreakdown}`);
    console.log(`   ${chalk.white('🔢')} Total tokens: input ${thread.totalTokens.input} | output ${thread.totalTokens.output} | cache ${thread.totalTokens.cacheCreation + thread.totalTokens.cacheRead}`);
    console.log(`   ${chalk.yellow('💰')} Estimated cost: $${thread.cost.toFixed(6)}`);
    console.log(`   ${chalk.gray('⏰')} Processing time: ${duration}s`);
    console.log('');
  }

  /**
   * ヘルプを表示
   */
  public showHelp(): void {
    console.log(chalk.bold('Claude Code History Viewer'));
    console.log('');
    console.log('Usage:');
    console.log('  cc-history          Show today\'s message history');
    console.log('  cc-history --help   Show this help');
    console.log('');
    console.log('Features:');
    console.log('  • Display today\'s user messages list');
    console.log('  • Show detailed view by selecting a message');
    console.log('  • Assistant response history and tool usage');
    console.log('  • Token usage and cost analysis');
    console.log('');
  }

  // ユーティリティメソッド
  private formatMessageChoice(thread: UserThread, index: number): string {
    const time = thread.startTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
    const projectName = this.getProjectName(thread.user.cwd);
    const content = this.truncateMessage(thread.user.message.content as string, 50);
    return `${index}. ${time} [${projectName}] ${content}`;
  }

  private getProjectName(cwd: string): string {
    const parts = cwd.split('/');
    return parts[parts.length - 1] || 'unknown';
  }

  private truncateMessage(message: string, maxLength: number): string {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  }

  private getResponseTypeIcon(content: MessageContent[]): string {
    const hasText = content.some(c => c.type === 'text');
    const hasTools = content.some(c => c.type === 'tool_use');
    
    if (hasText && hasTools) return '[💬+🛠️]';
    if (hasTools) return '[🛠️]';
    return '[💬]';
  }

  private formatToolInput(input: any): string {
    if (typeof input === 'string') {
      return this.truncateMessage(input, 50);
    }
    return this.truncateMessage(JSON.stringify(input), 50);
  }

  private getToolBreakdown(responses: LogEntry[]): string {
    const tools: Record<string, number> = {};
    
    for (const response of responses) {
      const content = (response.message as any).content;
      if (content && Array.isArray(content)) {
        for (const item of content) {
          if (item.type === 'tool_use' && item.name) {
            tools[item.name] = (tools[item.name] || 0) + 1;
          }
        }
      }
    }

    const toolList = Object.entries(tools)
      .map(([name, count]) => `${name}: ${count}x`)
      .join(', ');

    return toolList ? ` (${toolList})` : '';
  }
}