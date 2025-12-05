# Overview

This is a Discord bot application built with Node.js and Discord.js v14 that provides emoji and sticker management functionality. The bot allows server administrators to manage emojis and stickers through slash commands, including converting between formats, translating content, and managing permissions. It features a PostgreSQL database for persistent storage and a web dashboard with Discord OAuth2 authentication.

# User Preferences

Preferred communication style: Simple, everyday language.
Token environment variable: Uses `token` secret (not DISCORD_BOT_TOKEN)

# System Architecture

## Core Application Structure

**Problem**: Need a reliable Discord bot that can run continuously with a web dashboard, health checks, and persistent data storage.

**Solution**: Combined Discord.js client with Express web server (serving HTML dashboard), PostgreSQL database for persistence, organized into separate utility modules for maintainability.

**Key Features**:
- Express server provides HTTP endpoints for web dashboard and API
- Discord.js client handles all bot functionality with required gateway intents
- Web dashboard (HTML/CSS/JS) displays bot status, features, suggestions, and reports
- PostgreSQL database for persistent storage of servers, admins, suggestions, reports, likes, and comments
- Discord OAuth2 integration for user verification
- Modular architecture separates concerns for easy debugging and maintenance

**Key Intents**:
- Guilds, GuildMembers, GuildEmojisAndStickers for emoji/sticker management
- GuildMessages and MessageContent for command processing
- GuildMessageReactions for interactive features

## Modular Code Organization

**Directory Structure**:
```
src/
├── utils/
│   ├── constants.js           # Supported languages, command definitions (underscore naming)
│   ├── database.js            # PostgreSQL database operations (CRUD for all tables)
│   ├── languages.js           # Translation and language management
│   ├── permissions.js         # Server permission handling
│   └── helpers.js             # Utility functions (emoji parsing)
├── commands/
│   ├── emoji/
│   │   ├── addemoji.js        # /add_emoji command
│   │   ├── listemoji.js       # /list_emojis command
│   │   ├── deletemoji.js      # /delete_emoji command
│   │   ├── renameemoji.js     # /rename_emoji command
│   │   ├── emojisearch.js     # /emoji_search command
│   │   ├── imagetoemoji.js    # /image_to_emoji command
│   │   ├── emojiTosticker.js  # /emoji_to_sticker command
│   │   └── suggestemojis.js   # /suggest_emojis command
│   ├── sticker/
│   │   ├── deletesticker.js   # /delete_sticker command
│   │   ├── renamesticker.js   # /rename_sticker command
│   │   ├── stickertoemi.js    # /sticker_to_emoji command
│   │   ├── imagetosticker.js  # /image_to_sticker command
│   │   └── liststicker.js     # /list_stickers command
│   └── storage/
│       ├── ping.js            # /ping command (everyone)
│       ├── help.js            # /help command (everyone)
│       ├── permission.js      # /permission command (owner-only)
│       └── language.js        # /language command (owner-only)
public/
├── index.html                 # Dark-themed dashboard with hamburger menu
├── admin.html                 # Admin panel for owner/admin management
├── style.css                  # Dark theme CSS with animations
└── script.js                  # Menu logic, modals, API interactions
index.js                       # Main bot entry point, event handlers, Express server
```

## Command System

**Problem**: Need flexible command handling for Discord interactions with proper permission checks.

**Solution**: Slash command system with underscore naming convention and tiered permissions.

**Command Naming Convention**: All commands use underscores (e.g., `/add_emoji`, `/suggest_emojis`, `/image_to_emoji`)

**Permission Tiers**:
1. **Everyone**: `/ping`, `/help`
2. **Manage Emoji/Sticker Permission**: All emoji and sticker management commands
3. **Server Owner Only**: `/language`, `/permission`

**Design Pattern**:
- All commands defined in `constants.js` with underscore naming
- Command handlers in `index.js` interaction event
- Permission checks before command execution
- Session-based operations for multi-step workflows

## Database Architecture

**Technology**: PostgreSQL (Neon-backed)

**Tables**:
- `servers`: Allowed server configurations (name, allowed status)
- `admins`: Website administrators with owner flag (discord_id, username, avatar, is_owner)
- `suggestions`: User-submitted feature suggestions (title, description, user info)
- `issue_reports`: Bug reports with image support (title, description, image_url, user info)
- `likes`: Like/dislike tracking for suggestions and reports (user, target, type, is_like)
- `comments`: Comments on suggestions and reports (user, target, content)

**Module**: `src/utils/database.js` provides all CRUD operations

## Web Dashboard

**Features**:
- Bot status display (online/offline)
- Feature showcase with animations
- Suggestions section with likes, dislikes, and comments
- Issue reports section with image uploads
- Admin panel for owner/admin management
- Discord OAuth2 verification

**Admin System**:
- First verified user can claim owner status
- Owner can add/remove administrators by Discord ID
- Admins can view and moderate submissions

## Translation System

**Supported Languages (12)**:
Chinese (zh), English (en), Arabic (ar), Spanish (es), Russian (ru), Turkish (tr), French (fr), German (de), Italian (it), Japanese (ja), Korean (ko), Portuguese (pt)

**Implementation**: Google Translate API with in-memory caching

## Authentication

**OAuth2 Flow**:
1. User clicks "Verify with Discord"
2. Redirects to Discord authorization
3. Callback exchanges code for token
4. Fetches user profile (id, username, avatar)
5. Stores verification in session

# External Dependencies

## Discord API
- **Library**: discord.js v14.18.0
- **Features**: Slash commands, embeds, buttons, select menus, emoji/sticker management

## Database
- **Technology**: PostgreSQL via `pg` package
- **Connection**: Uses DATABASE_URL environment variable

## Translation API
- **Library**: google-translate-api-x v10.7.2

## Web Server
- **Framework**: Express v4.21.2
- **Port**: 5000

## Image Validation
- **Library**: is-image-url v1.1.8

# Recent Changes

- Integrated PostgreSQL database replacing JSON file storage
- Renamed all commands with underscores (e.g., addemoji → add_emoji)
- Added permission checks: Manage Emoji/Sticker for most commands, owner-only for language/permission
- Created admin panel with owner controls and admin assignment
- Redesigned suggestions section with user profiles, likes/dislikes, comments
- Redesigned issue reports section with image uploads and social features
- Fixed menu scroll position preservation
- Updated token variable to use `token` secret
