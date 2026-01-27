/**
 * Clawdbot Knowledge Base
 *
 * This file contains verified, accurate information about Clawdbot
 * gathered from official documentation and authoritative sources.
 *
 * Sources:
 * - https://docs.clawd.bot/
 * - https://github.com/clawdbot/clawdbot
 * - https://dev.to/ajeetraina/getting-started-with-clawdbot-the-complete-step-by-step-guide-2ffj
 * - https://medium.com/modelmind/how-to-set-up-clawdbot-step-by-step-guide-to-setup-a-personal-bot-3e7957ed2975
 * - https://peerlist.io/tanayvasishtha/articles/clawdbot-the-complete-guide-to-everything-you-can-do-withit
 * - https://www.macstories.net/stories/clawdbot-showed-me-what-the-future-of-personal-ai-assistants-looks-like/
 * - https://socradar.io/blog/clawdbot-is-it-safe/
 * - https://threadingontheedge.substack.com/p/heres-the-15min-setup-guide-to-how
 * - https://mlearning.substack.com/p/clawdbot-survival-guide
 * - https://help.apiyi.com/en/clawdbot-beginner-guide-personal-ai-assistant-2026-en.html
 * - https://www.surfercloud.com/blog/install-clawdbot-on-ubuntu-22-04-vps-step-by-step
 * - https://velvetshark.com/clawdbot-the-self-hosted-ai-that-siri-should-have-been
 */

export const CLAWDBOT_KNOWLEDGE = {
  // Core product information
  product: {
    name: 'Clawdbot',
    type: 'Open-source, self-hosted personal AI assistant',
    description: 'An AI Gateway that connects chat applications with Large Language Model APIs like Claude, enabling persistent memory, proactive automation, and full computer access.',
    tagline: 'The AI assistant that actually messages you first',
    github: 'https://github.com/clawdbot/clawdbot',
    docs: 'https://docs.clawd.bot/',
    website: 'https://clawd.bot',
    creator: 'Peter Steinberger',
  },

  // System requirements (verified)
  requirements: {
    nodejs: {
      minimum: '22',
      recommended: '22+',
      checkCommand: 'node --version',
      installCommand: 'curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs',
    },
    os: {
      supported: ['macOS', 'Linux', 'Windows (via WSL2)'],
      notSupported: ['Native Windows'],
      recommendedLinux: 'Ubuntu 22.04 LTS',
    },
    memory: '2GB RAM minimum (4GB+ recommended for browser automation)',
    storage: '500MB for installation',
    hardware: [
      'Modern laptop',
      'Mac Mini M4 (recommended for 24/7 operation, ~6-7W idle)',
      'Raspberry Pi 4/5 (low-cost always-on option)',
      'VPS ($5/month minimum, Hetzner CPX11 recommended)',
    ],
    optional: [
      'Brave Search API Key (for web search)',
      'Anthropic API Key (recommended, Claude Opus 4.5)',
      'OpenAI API Key (alternative)',
      'OpenAI Whisper (for voice transcription)',
    ],
  },

  // Installation commands (verified)
  installation: {
    quickInstall: {
      description: 'One-liner installer that detects OS and installs dependencies',
      command: 'curl -fsSL https://clawd.bot/install.sh | bash',
      alternative: 'npm install -g ClawdBot@latest',
      sudo: 'sudo npm install -g clawdbot@latest',
    },
    onboarding: {
      description: 'Interactive setup wizard',
      command: 'clawdbot onboard',
      withDaemon: 'clawdbot onboard --install-daemon',
      prompts: [
        'Gateway location (local or remote)',
        'AI provider authentication (API keys or OAuth)',
        'Model selection (Claude Opus 4.5 recommended)',
        'Messaging providers (Telegram, WhatsApp, Discord)',
        'Daemon installation (for 24/7 operation)',
      ],
    },
    gateway: {
      description: 'Start the Gateway server',
      command: 'clawdbot gateway --port 18789 --verbose',
      dashboard: 'http://127.0.0.1:18789/',
      restart: 'clawdbot gateway restart',
      status: 'clawdbot gateway status',
    },
    health: {
      description: 'Verify installation',
      command: 'clawdbot health',
    },
    doctor: {
      description: 'Check configuration and security',
      command: 'clawdbot doctor',
    },
    version: {
      description: 'Check installed version',
      command: 'clawdbot --version',
    },
    status: {
      description: 'Check running status',
      command: 'clawdbot status',
    },
    update: {
      description: 'Update to latest version',
      command: 'sudo npm install -g clawdbot@latest && clawdbot gateway restart',
    },
    cron: {
      description: 'Manage scheduled tasks',
      list: 'clawdbot cron list',
    },
  },

  // Architecture (verified)
  architecture: {
    gateway: {
      name: 'Gateway',
      description: 'Central hub that connects messaging platforms and orchestrates interactions. Acts as a switchboard channeling messages to the AI.',
      role: 'Message routing, AI inference calls, credential management, tool execution',
      port: 18789,
    },
    agent: {
      name: 'Agent',
      description: 'The "brain" powered by LLMs like Claude or GPT. Responsible for context, memory, and reasoning. Operates in RPC mode.',
      supportedModels: [
        'Claude Opus 4.5 (anthropic/claude-opus-4-5, recommended for complex tasks)',
        'Claude Sonnet 4.5 (anthropic/claude-3-sonnet, for daily tasks)',
        'Claude Haiku (anthropic/claude-3-haiku-20240307, fast/cheap)',
        'GPT-4',
        'Gemini',
        'Grok',
        'Local Ollama models (for offline use)',
      ],
      modelSelection: {
        envVar: 'ANTHROPIC_MODEL=<alias|name>',
        cli: 'claude --model <alias|name>',
        session: '/model <alias|name>',
        aliases: {
          opus: 'Claude Opus 4.5',
          sonnet: 'Claude Sonnet 4.5',
        },
      },
    },
    skills: {
      name: 'Skills',
      description: 'Optional extensions providing capabilities beyond basic chat. Defined in markdown files (~/clawd/skills/my-skill/SKILL.md).',
      examples: [
        'Web research',
        'Browser automation',
        'Email access (Gmail API)',
        'Calendar management',
        'Code review',
        'File operations',
        'Home automation',
        'Developer workflows',
      ],
      community: 'ClawdHub for community-built skills',
      skillConvention: 'Follows Anthropic Agent Skill convention',
    },
    memory: {
      name: 'Memory',
      description: 'Persistent, file-based system storing conversations, preferences, and context as actual files.',
      features: [
        'Cross-session persistence',
        'User preference storage',
        'Workflow context',
        'Can be version-controlled',
        'Inspectable files',
      ],
    },
  },

  // Messaging platform setup (verified)
  channels: {
    telegram: {
      name: 'Telegram',
      difficulty: 'Easy (recommended for beginners)',
      steps: [
        'Open Telegram and search for @BotFather',
        'Start a chat and run /newbot command',
        'Follow prompts to name your bot (must end in "bot")',
        'Copy the bot token provided by BotFather',
        'Get your user ID from @useridbot (for allowFrom restriction)',
        'Configure in Clawdbot: TELEGRAM_BOT_TOKEN environment variable or channels.telegram.botToken in config',
      ],
      optionalCommands: ['/setjoingroups', '/setprivacy'],
      envVar: 'TELEGRAM_BOT_TOKEN',
      configPath: 'channels.telegram.botToken',
    },
    whatsapp: {
      name: 'WhatsApp',
      difficulty: 'Medium',
      steps: [
        'Run: pnpm clawdbot login',
        'A QR code will appear in terminal',
        'Open WhatsApp on your phone',
        'Go to Settings → Linked Devices',
        'Scan the QR code to link',
      ],
      note: 'Uses WhatsApp Web protocol',
    },
    discord: {
      name: 'Discord',
      difficulty: 'Medium',
      steps: [
        'Go to Discord Developer Portal: https://discord.com/developers/applications',
        'Create a new application',
        'Navigate to "Bot" section and click "Add Bot"',
        'Click "Reset Token" to get your bot token',
        'Enable required intents: Message Content Intent',
        'Go to OAuth2 → URL Generator',
        'Select scopes: bot, applications.commands',
        'Select permissions: Send Messages, Read Message History, Embed Links',
        'Use generated URL to invite bot to your server',
        'Configure: clawdbot configure --section channels.discord',
      ],
      envVar: 'DISCORD_BOT_TOKEN',
      configPath: 'discord.token',
    },
    slack: {
      name: 'Slack',
      difficulty: 'Medium',
      steps: [
        'Create a Slack App at api.slack.com/apps',
        'Configure OAuth scopes',
        'Install to workspace',
        'Get Bot User OAuth Token',
        'Configure in Clawdbot',
      ],
    },
    signal: {
      name: 'Signal',
      difficulty: 'Advanced',
      note: 'Requires signal-cli setup',
    },
    imessage: {
      name: 'iMessage',
      difficulty: 'Advanced',
      note: 'macOS only',
      requirements: [
        'macOS machine (Mac Mini recommended)',
        'Messages app signed in with Apple ID',
        'Install imsg: brew install steipete/tap/imsg',
        'Configure cliPath (/usr/local/bin/imsg) and dbPath in Clawdbot',
        'Grant Automation and Full Disk Access permissions',
      ],
      dedicatedBot: 'Can use separate Apple ID and macOS user account for isolation',
    },
  },

  // Key features (verified)
  features: {
    persistentMemory: {
      name: 'Persistent Memory',
      description: 'Remembers past conversations, user preferences, and workflows across sessions. Stores as local markdown files.',
    },
    proactiveAutomation: {
      name: 'Proactive Automation',
      description: 'Can send reminders, briefings, alerts without explicit prompts. Supports cron jobs and background tasks.',
      examples: [
        'Morning briefings (calendar, weather, emails, news)',
        'Task reminders before deadlines',
        'Website monitoring alerts',
        'Crypto price alerts',
        'Portfolio rebalancing (with approval)',
      ],
      cronSetup: 'Schedule a cron job at 8:00 AM: Give me today\'s weather and calendar summary',
    },
    fullComputerAccess: {
      name: 'Full Computer Access',
      description: 'Can read/write files, execute shell commands, run scripts, control browsers.',
      capabilities: [
        'File system access (read/write/delete)',
        'Shell command execution',
        'Script execution',
        'Browser automation (dedicated "clawd" profile)',
        'Screenshot and snapshot capture',
      ],
    },
    extensibleSkills: {
      name: 'Extensible Skills',
      description: 'Plugin system for adding new capabilities. Can build its own skills.',
      location: '~/clawd/skills/',
    },
    selfHosted: {
      name: 'Self-Hosted Control',
      description: 'All data stays on user device. Full control over configuration and privacy.',
    },
    messagingIntegration: {
      name: 'Messaging Integration',
      description: 'Works through existing chat apps like WhatsApp, Telegram, Discord, Slack, Signal, iMessage.',
    },
    voiceNotes: {
      name: 'Voice Notes',
      description: 'Transcribe voice notes using OpenAI Whisper or other CLI transcribers.',
      config: 'routing.transcribeAudio.command in clawdbot.json',
      maxSize: '5 MB for inbound, 16 MB for outbound',
      supported: ['OpenAI Whisper (cloud)', 'whisper.cpp (local)', 'Vosk', 'Deepgram'],
    },
    browserAutomation: {
      name: 'Browser Automation',
      description: 'Dedicated isolated browser profile for web automation.',
      actions: ['Click', 'Type', 'Drag', 'Select', 'Screenshot', 'Page snapshots'],
      webScraping: 'Supports Bright Data API integration for advanced scraping',
    },
  },

  // Personality customization (verified)
  personality: {
    soulFile: 'SOUL.md',
    description: 'Define the agent identity, personality, boundaries, and core truths',
    location: '~/clawd/SOUL.md or ~/.clawdbot/SOUL.md',
    customization: [
      'Agent name and tone',
      'Operational philosophy (e.g., "Be resourceful before asking")',
      'Communication style',
      'Boundaries and restrictions',
    ],
    example: '"Be the assistant you\'d actually want to talk to. Concise when needed, thorough when it matters."',
    note: 'Separate customizations from version-controlled files to prevent update issues',
  },

  // Security considerations (verified from socradar.io)
  security: {
    risks: [
      'Deep system access (file read/write, shell execution)',
      'Expanded attack surface when connecting LLMs to messaging',
      'Credential management (API keys, OAuth secrets)',
      'No "perfectly secure" setup possible',
      'Reverse proxy trust issues (localhost connections treated as trusted)',
      'Potential for prompt injection attacks',
    ],
    bestPractices: [
      'Bind gateway.bind to "loopback" to prevent external exposure',
      'Use "pairing" mode for DM policy to manually approve devices',
      'Configure gateway.auth.password for authentication',
      'Configure gateway.trustedProxies for reverse proxy setups',
      'Sandbox tools for group chats',
      'Use Tailscale or Cloudflare Tunnel for remote access (never expose ports directly)',
      'Never share API keys carelessly',
      'Run in isolated environment for sensitive use cases',
      'Read security documentation thoroughly before connecting to personal accounts',
      'Start with sandboxed environment and principle of least privilege',
    ],
    recommendations: [
      'Use dedicated email account, not personal/work',
      'Consider reformatted hard drive for maximum isolation',
      'Use fresh OS installation for sensitive deployments',
      'Run clawdbot doctor to check security configuration',
      'Keep separate CLI tool on host for troubleshooting Docker issues',
    ],
    pairingSystem: 'Internal security measure to ensure DM safety and prevent unwanted message processing',
  },

  // Common use cases (verified)
  useCases: [
    'Email management and automation (Gmail API integration)',
    'Calendar scheduling and reminders (Google Calendar)',
    'Smart home control (Philips Hue, Sonos, thermostat)',
    'Code review and development assistance',
    'Web research and information gathering',
    'Content generation (images, videos, text)',
    'DevOps monitoring (Sentry, GitHub, CI/CD pipelines)',
    'Customer support automation',
    'Meeting notes and transcription',
    'Crypto market monitoring and price alerts',
    'Morning briefings and daily digests',
    'Browser automation and web scraping',
    'PDF summarization and file organization',
    'Pull request creation and test running',
  ],

  // Deployment options (verified)
  deployment: {
    local: {
      name: 'Local Machine',
      description: 'Run on your laptop or desktop',
      pros: ['Easy setup', 'Direct access'],
      cons: ['Not 24/7 unless always on'],
    },
    macMini: {
      name: 'Mac Mini M4',
      description: 'Recommended for 24/7 home operation',
      powerConsumption: '~6-7W at idle, <1W in sleep',
      pros: ['Always on', 'Low power', 'Great performance', 'Supports iMessage'],
      cons: ['Hardware cost (~$599+)'],
      tips: [
        'Can run in separate macOS user account',
        'For true 24/7, consider VPS Gateway with Mac Mini as client',
      ],
    },
    raspberryPi: {
      name: 'Raspberry Pi 4/5',
      description: 'Low-cost always-on option',
      pros: ['Very low cost (~$35-80)', 'Low power', 'Always on'],
      cons: ['Limited performance', 'No true sleep state'],
      powerOptimization: [
        'Use passive cooling (heatsink)',
        'Disable HDMI: sudo tvservice -o',
        'Disable LEDs via /boot/config.txt',
      ],
    },
    vps: {
      name: 'VPS/Cloud',
      description: 'Cloud deployment on providers like Hetzner, DigitalOcean, AWS',
      pros: ['24/7 availability', 'Reliable', 'Remote access'],
      cons: ['Monthly cost ($5+)', 'Requires cloud knowledge'],
      recommendedOS: 'Ubuntu 22.04 LTS',
      recommendedSpecs: '2GB RAM, 40GB NVMe, CPX11 on Hetzner',
      awsFreeTier: 't2.micro or t3.micro eligible',
      steps: [
        'Create VPS with Ubuntu 22.04 LTS',
        'SSH into server: ssh ubuntu@YOUR_SERVER_IP',
        'Update system: sudo apt update && sudo apt -y upgrade',
        'Install tools: sudo apt -y install git curl build-essential jq ca-certificates openssl ufw htop',
        'Install Node.js 22: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs',
        'Create swap file (2GB for 2GB RAM VPS)',
        'Install Clawdbot: sudo npm install -g clawdbot@latest',
        'Run onboarding: clawdbot onboard --install-daemon',
        'Enable lingering: sudo loginctl enable-linger "$USER"',
        'Enable service: systemctl --user enable --now clawdbot-gateway.service',
        'Configure UFW firewall: sudo ufw allow OpenSSH && sudo ufw enable',
      ],
      swapSetup: `sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab`,
    },
    docker: {
      name: 'Docker',
      description: 'Containerized deployment (recommended for self-hosting)',
      pros: ['Isolated', 'Portable', 'Easy updates'],
      cons: ['Docker knowledge required'],
      steps: [
        'Clone repo: git clone https://github.com/clawdbot/clawdbot.git',
        'cd clawdbot',
        'Run setup script: ./docker-setup.sh (or manual docker compose)',
        'Manual: docker compose build',
        'Manual: docker compose run --rm clawdbot-cli onboard',
        'Manual: docker compose up -d clawdbot-gateway',
      ],
      configDir: '~/clawdbot-docker/config',
      workspaceDir: '~/clawdbot-docker/workspace',
      notes: [
        'Must manually create .env file',
        'Install separate CLI on host for troubleshooting',
        'Never expose gateway port to public internet',
      ],
    },
  },

  // Configuration files (verified)
  configuration: {
    envFile: '.env',
    configFile: 'clawdbot.json',
    backupFile: 'clawdbot.json.bak',
    soulFile: 'SOUL.md',
    workspaceDir: '~/.clawdbot/',
    dockerConfigDir: '~/clawdbot-docker/config',
    skillsDir: '~/clawd/skills/',
    envVars: [
      'ANTHROPIC_API_KEY',
      'OPENAI_API_KEY',
      'TELEGRAM_BOT_TOKEN',
      'DISCORD_BOT_TOKEN',
      'BRAVE_SEARCH_API_KEY',
      'ANTHROPIC_MODEL',
    ],
    configOptions: {
      'gateway.bind': 'Set to "loopback" to prevent external exposure',
      'gateway.auth.password': 'Set password for dashboard authentication',
      'gateway.trustedProxies': 'Configure trusted proxy IPs',
      'channels.telegram.botToken': 'Telegram bot token',
      'channels.telegram.allowFrom': 'Whitelist user IDs',
      'routing.transcribeAudio.command': 'CLI command for voice transcription',
      'llm.provider': 'Set to "anthropic" for Claude',
      'llm.apiKey': 'API key for the LLM provider',
    },
  },

  // Troubleshooting (common issues)
  troubleshooting: {
    nodeVersion: {
      issue: 'Node.js version too old',
      solution: 'Upgrade to Node.js 22+: nvm install 22 && nvm use 22',
    },
    permissionDenied: {
      issue: 'Permission denied during installation',
      solution: 'Use sudo for global install or fix npm permissions',
    },
    gatewayNotStarting: {
      issue: 'Gateway fails to start',
      solution: 'Check port 18789 availability, verify API keys are set',
    },
    qrCodeNotShowing: {
      issue: 'WhatsApp QR code not appearing',
      solution: 'Ensure terminal supports QR rendering, try different terminal',
    },
    botTokenInvalid: {
      issue: 'Telegram/Discord bot token invalid',
      solution: 'Regenerate token from BotFather or Discord Developer Portal',
    },
    authBypass: {
      issue: 'Authentication bypass with reverse proxy',
      solution: 'Configure gateway.auth.password and gateway.trustedProxies',
    },
    outOfMemory: {
      issue: 'Out of memory on VPS',
      solution: 'Create 2GB swap file (see VPS deployment steps)',
    },
    serviceNotPersisting: {
      issue: 'Service stops after logout',
      solution: 'Run: sudo loginctl enable-linger "$USER"',
    },
    configCorrupted: {
      issue: 'Configuration file corrupted',
      solution: 'Restore from clawdbot.json.bak backup',
    },
  },

  // Remote access options (verified)
  remoteAccess: {
    tailscale: {
      name: 'Tailscale',
      description: 'Peer-to-peer mesh VPN with end-to-end encryption',
      pros: ['Private by default', 'Low latency', 'Easy setup', 'Free tier available'],
      cons: ['Requires Tailscale client on all devices'],
    },
    cloudflare: {
      name: 'Cloudflare Tunnel',
      description: 'Routes traffic through Cloudflare network as reverse proxy',
      pros: ['No port exposure', 'DDoS protection', 'Access policies'],
      cons: ['Requires explicit Access policy configuration', 'Traffic routes through Cloudflare'],
    },
    recommendation: 'Never expose Clawdbot gateway port directly to the public internet',
  },

  // API and Model Configuration (verified)
  apiConfiguration: {
    anthropic: {
      name: 'Anthropic Claude',
      recommended: true,
      models: [
        { name: 'Claude Opus 4.5', id: 'anthropic/claude-opus-4-5', use: 'Complex reasoning' },
        { name: 'Claude Sonnet 4.5', id: 'anthropic/claude-3-sonnet', use: 'Daily coding' },
        { name: 'Claude Haiku', id: 'anthropic/claude-3-haiku-20240307', use: 'Fast/cheap tasks' },
      ],
      envVar: 'ANTHROPIC_API_KEY',
      console: 'https://console.anthropic.com/',
      pricing: 'Pay-as-you-go with initial free credits',
      oauth: 'Supports Claude Pro/Max subscription via Claude Code OAuth',
    },
    openai: {
      name: 'OpenAI',
      models: ['GPT-4', 'GPT-4 Turbo'],
      envVar: 'OPENAI_API_KEY',
    },
    local: {
      name: 'Local Models',
      description: 'Run offline with Ollama',
      setup: 'Configure for offline use without API costs',
    },
  },
};

// Article writing style guidelines based on successful articles
export const WRITING_STYLE = {
  hook: {
    description: 'Start with a compelling personal story or bold claim',
    examples: [
      'I never thought I\'d have a personal AI assistant that actually understands me—until I discovered Clawdbot.',
      'What if I told you that you could have an AI assistant running 24/7 on your own hardware, completely free?',
      'After testing dozens of AI tools, Clawdbot changed everything about how I work.',
      'Here\'s the 15-minute setup guide to building your own AI intern at $0.',
      'ClawdBot is the most powerful AI tool I\'ve ever used in my life.',
      'Clawdbot showed me what the future of personal AI assistants looks like.',
    ],
  },

  structure: {
    sections: [
      'Hook/Introduction (personal story or bold claim)',
      'What is Clawdbot? (clear explanation)',
      'Prerequisites (specific requirements with versions)',
      'Step-by-step installation (numbered steps with commands)',
      'Configuration (with code examples)',
      'Connecting messaging apps (platform-specific guides)',
      'Verification (how to confirm it works)',
      'Troubleshooting (common issues and solutions)',
      'Use cases / What you can do next',
      'Conclusion with call-to-action',
    ],
  },

  codeBlocks: {
    requirements: [
      'Always include the full command',
      'Show expected output where helpful',
      'Add comments for complex commands',
      'Specify the shell/environment (bash, PowerShell, etc.)',
    ],
    format: 'Use ```bash for shell commands, ```yaml for config, ```json for configuration files',
  },

  tone: {
    description: 'Friendly, knowledgeable, practical',
    guidelines: [
      'Write as if explaining to a smart friend',
      'Use "you" and "your" frequently',
      'Include personal insights and tips',
      'Acknowledge potential difficulties honestly',
      'Celebrate wins ("Congratulations! You now have...")',
      'Be concise when needed, thorough when it matters',
    ],
  },

  warnings: {
    description: 'Always warn about security and risks',
    mustInclude: [
      'Security implications of full system access',
      'API key protection',
      'Not recommended for production without security review',
      'Backup recommendations',
      'Never expose gateway port to public internet',
    ],
  },

  timeEstimates: {
    description: 'Include realistic time estimates',
    examples: [
      'Step 1: Launch a free server (5-10 min)',
      'Step 2: Connect to the instance (1-2 min)',
      'Step 3: Install Clawdbot (2 min)',
      'Step 4: Run the setup wizard (10 min)',
    ],
  },
};

// Template for different article categories
export const ARTICLE_TEMPLATES = {
  tutorial: {
    requiredSections: [
      '## What You\'ll Learn',
      '## Prerequisites',
      '## Step 1: [First Step]',
      '## Verification',
      '## Troubleshooting',
      '## Next Steps',
    ],
  },
  guide: {
    requiredSections: [
      '## Overview',
      '## Key Concepts',
      '## Getting Started',
      '## Best Practices',
      '## Common Pitfalls',
      '## Conclusion',
    ],
  },
  comparison: {
    requiredSections: [
      '## Overview',
      '## Feature Comparison',
      '## [Product A] Strengths',
      '## [Product B] Strengths',
      '## When to Choose Each',
      '## Verdict',
    ],
  },
  'best-practices': {
    requiredSections: [
      '## Why This Matters',
      '## The Practices',
      '## Implementation Examples',
      '## Common Mistakes',
      '## Summary',
    ],
  },
  advanced: {
    requiredSections: [
      '## Prerequisites',
      '## Architecture Overview',
      '## Implementation',
      '## Testing',
      '## Production Considerations',
      '## Conclusion',
    ],
  },
  news: {
    requiredSections: [
      '## Summary',
      '## What\'s New',
      '## Impact',
      '## How to Get Started',
      '## What\'s Next',
    ],
  },
};

// Verified CLI commands for validation
export const VERIFIED_COMMANDS = {
  clawdbot: [
    'onboard',
    'gateway',
    'health',
    'doctor',
    'status',
    'configure',
    'login',
    'cron',
    '--version',
    '-v',
  ],
  gatewaySubcommands: ['restart', 'status'],
  cronSubcommands: ['list'],
};
