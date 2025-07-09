# Claude Code History Viewer

An interactive CLI tool to view and analyze your Claude Code usage history with detailed insights.

## Features

- 📅 Display today's user messages in chronological order
- 🔍 Interactive message selection with detailed view
- 🤖 Assistant response history and tool usage tracking
- 📊 Token usage and cost analysis
- 💰 Estimated pricing calculations
- 🌐 International support (English interface)

## Installation

```bash
npm install -g @spyder1211/cc-history
```

Or using npx (no installation required):

```bash
npx @spyder1211/cc-history
```

## Usage

```bash
# Show today's message history
cc-history

# Show help
cc-history --help
```

## What You'll See

### Main View
- List of all user messages from today
- Number of exchanges per question
- Tools used count
- Cost breakdown per message
- Daily statistics summary

### Message Details
- Full user message content
- Complete assistant response history
- Tool usage breakdown (WebFetch, TodoWrite, Bash, etc.)
- Token consumption per exchange
- Processing time analysis

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build the project
npm run build

# Run the built version
npm start
```

## Requirements

- Node.js 18 or higher
- Claude Code must be installed and used
- Log files must exist in `~/.claude/projects/`

## How It Works

The tool reads Claude Code's internal log files (JSONL format) from `~/.claude/projects/` and analyzes:

- User messages and timestamps
- Assistant responses and tool usage
- Token consumption (input, output, cache)
- Cost calculations based on Sonnet 4 pricing

## Pricing Model

Based on Claude Sonnet 4 rates:
- Input tokens: $3.00 per 1M tokens
- Output tokens: $15.00 per 1M tokens  
- Cache creation: $3.75 per 1M tokens
- Cache read: $0.30 per 1M tokens

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT