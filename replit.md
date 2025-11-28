# Overview

This is a Discord bot application built with Node.js and Discord.js v14 that provides emoji and sticker management functionality. The bot allows server administrators to manage emojis and stickers through commands, including converting between formats, translating content, and managing allowed servers. It features a prefix-based command system (using '+' as the prefix) and maintains persistent storage for server configurations and language preferences.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Core Application Structure

**Problem**: Need a reliable Discord bot that can run continuously and provide web health checks.

**Solution**: Combined Discord.js client with Express web server in a single application.

**Rationale**: 
- Express server provides HTTP endpoint for health monitoring and uptime tracking
- Discord.js client handles all bot functionality with required gateway intents
- Single process simplifies deployment and management

**Key Intents**:
- Guilds, GuildMembers, GuildEmojisAndStickers for emoji/sticker management
- GuildMessages and MessageContent for command processing
- GuildMessageReactions for interactive features

## Command System

**Problem**: Need flexible command handling for Discord interactions.

**Solution**: Prefix-based command system ('+' prefix) with in-memory state management.

**Design Pattern**:
- Commands parsed from message content with prefix detection
- State stored in JavaScript Maps for runtime performance
- Session-based operations for multi-step workflows (deletion, conversion)

**State Management**:
- `allowedServers`: Map of authorized server configurations
- `serverLanguages`: Map of language preferences per server
- `stickerDeletionSessions`: Temporary session data for sticker deletion workflows
- `stickerToEmojiSessions`: Session data for sticker-to-emoji conversions
- `convertedEmojisToStickers`: Track emoji-to-sticker conversion history
- `convertedImagesToStickers`: Track image-to-sticker conversion history
- `convertedStickersToEmojis`: Track sticker-to-emoji conversion history
- `usedUrls`: Track URLs to prevent duplicates
- `translationCache`: Cache translation results for performance

## Data Persistence

**Problem**: Need to persist server configurations and language settings across bot restarts.

**Solution**: JSON file-based storage for simple, human-readable persistence.

**Implementation**:
- `servers.json`: Stores list of allowed server names/IDs
- `languages.json`: Stores language preference mappings per server

**Trade-offs**:
- Pros: Simple, no external database required, easy to debug and modify
- Cons: Limited scalability, file I/O blocking, no concurrent write protection
- Suitable for: Small to medium bot deployments with limited write operations

## Translation System

**Problem**: Support multiple languages for bot responses and content.

**Solution**: Google Translate API integration with caching layer and dynamic on-the-fly translation.

**Architecture**:
- `google-translate-api-x` library for translation requests
- In-memory Map for translation caching to reduce API calls
- Dynamic translation helper `t(text, langCode)` for all bot messages
- Pre-defined supported languages with metadata (ISO code, name, flag emoji, native name)
- Legacy language code migration on startup (e.g., 'english' → 'en')

**Supported Languages (12)**:
- Chinese (zh) - 🇨🇳
- English (en) - 🇺🇸
- Arabic (ar) - Syria flag (custom emoji)
- Spanish (es) - 🇪🇸
- Russian (ru) - 🇷🇺
- Turkish (tr) - 🇹🇷
- French (fr) - 🇫🇷
- German (de) - 🇩🇪
- Italian (it) - 🇮🇹
- Japanese (ja) - 🇯🇵
- Korean (ko) - 🇰🇷
- Portuguese (pt) - 🇧🇷

**Language Selection**: `/language` slash command with dropdown menu displaying all 12 languages with flags

**Caching Strategy**: Translation results cached in-memory using `translationCache` Map with composite keys (`langCode:text`) to optimize API usage and response time.

## Interactive UI Components

**Problem**: Need rich interactive experiences for multi-step operations.

**Solution**: Discord.js UI builders for embeds, buttons, and select menus.

**Components Used**:
- `EmbedBuilder`: Rich message formatting for command responses
- `ButtonBuilder` with `ActionRowBuilder`: Interactive buttons for confirmations and actions
- `StringSelectMenuBuilder`: Dropdown menus for selections (likely sticker/emoji picking)

**Use Cases**:
- Sticker deletion workflows with confirmation dialogs
- Sticker-to-emoji and emoji-to-sticker conversion interfaces
- Server configuration interfaces

## Validation and Utilities

**Problem**: Need to validate image URLs before processing.

**Solution**: `is-image-url` library for URL validation.

**Purpose**: Ensures only valid image URLs are processed for sticker/emoji creation, preventing errors and improving user experience.

## Permission System

**Problem**: Restrict bot commands to authorized servers and users.

**Solution**: Two-tier authorization system.

**Implementation**:
- Server-level: `allowedServers` Map controls which servers can use the bot
- User-level: `PermissionsBitField` integration for role-based command access

**Pattern**: Whitelist approach for server access, leveraging Discord's native permission system for user access control.

# External Dependencies

## Discord API
- **Library**: discord.js v14.18.0
- **Purpose**: Complete Discord bot functionality including gateway connections, command handling, and UI components
- **Key Features Used**: Intents system, slash commands, embeds, buttons, select menus, emoji/sticker management

## Translation API
- **Library**: google-translate-api-x v10.7.2
- **Purpose**: Automatic translation of bot responses and content
- **Implementation**: Unofficial Google Translate API wrapper with caching

## Web Server
- **Framework**: Express v4.21.2
- **Purpose**: HTTP server for health checks and uptime monitoring
- **Usage**: Minimal implementation for bot availability verification

## Image Validation
- **Library**: is-image-url v1.1.8
- **Purpose**: Validate image URLs before processing for emoji/sticker operations
- **Use Case**: Prevent invalid URL submissions and improve error handling

## File System Storage
- **Technology**: Node.js native `fs` module
- **Purpose**: Read/write JSON configuration files
- **Files**: 
  - `servers.json`: Allowed server list
  - `languages.json`: Language preference mappings
- **Pattern**: Synchronous or asynchronous file operations for simple persistence

## Node.js Runtime
- **Version**: Requires Node.js 16.11.0+ (per Discord.js requirements)
- **TypeScript Support**: @types/node v18.0.6 for type definitions