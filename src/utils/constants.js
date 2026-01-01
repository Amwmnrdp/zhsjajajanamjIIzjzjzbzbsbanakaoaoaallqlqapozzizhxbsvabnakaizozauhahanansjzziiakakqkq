const SUPPORTED_LANGUAGES = {
    'en': { name: 'English', flag: '🇺🇸', native: 'English', translateCode: 'en' },
    'ar': { name: 'Arabic', flag: '<:Syria:1443915175379079208>', native: 'العربية', translateCode: 'ar' },
    'zh': { name: 'Chinese', flag: '🇨🇳', native: '中文', translateCode: 'zh-CN' },
    'es': { name: 'Spanish', flag: '🇪🇸', native: 'Español', translateCode: 'es' },
    'ru': { name: 'Russian', flag: '🇷🇺', native: 'Русский', translateCode: 'ru' },
    'tr': { name: 'Turkish', flag: '🇹🇷', native: 'Türkçe', translateCode: 'tr' },
    'fr': { name: 'French', flag: '🇫🇷', native: 'Français', translateCode: 'fr' },
    'de': { name: 'German', flag: '🇩🇪', native: 'Deutsch', translateCode: 'de' },
    'it': { name: 'Italian', flag: '🇮🇹', native: 'Italiano', translateCode: 'it' },
    'ja': { name: 'Japanese', flag: '🇯🇵', native: '日本語', translateCode: 'ja' },
    'ko': { name: 'Korean', flag: '🇰🇷', native: '한국어', translateCode: 'ko' },
    'pt': { name: 'Portuguese', flag: '🇵🇹', native: 'Português', translateCode: 'pt' }
};

const LEGACY_LANGUAGE_MAP = {
    'english': 'en',
    'arabic': 'ar',
    'chinese': 'zh',
    'spanish': 'es',
    'russian': 'ru',
    'turkish': 'tr',
    'french': 'fr',
    'german': 'de',
    'italian': 'it',
    'japanese': 'ja',
    'korean': 'ko',
    'portuguese': 'pt'
};

const COMMAND_DEFINITIONS = [
    {
        name: 'help',
        description: 'Get help about all ProEmoji commands'
    },
    {
        name: 'permission',
        description: 'Set permissions for emoji suggestions (Owner only)'
    },
    {
        name: 'suggest_emojis',
        description: 'Get 5 emoji suggestions'
    },
    {
        name: 'emoji_search',
        description: 'Search for emojis by name',
        options: [
            {
                name: 'search',
                type: 3,
                description: 'Emoji name to search for',
                required: true
            }
        ]
    },
    {
        name: 'add_emoji',
        description: 'Add an emoji to server',
        options: [
            {
                name: 'emoji',
                type: 3,
                description: 'The emoji to add',
                required: true
            },
            {
                name: 'name',
                type: 3,
                description: 'Custom name (optional)',
                required: false
            }
        ]
    },
    {
        name: 'image_to_emoji',
        description: 'Convert image to emoji',
        options: [
            {
                name: 'name',
                type: 3,
                description: 'Emoji name',
                required: true
            },
            {
                name: 'attachment',
                type: 11,
                description: 'Upload an image',
                required: true
            },
            {
                name: 'url',
                type: 3,
                description: 'Image URL',
                required: false
            }
        ]
    },
    {
        name: 'image_to_sticker',
        description: 'Convert image to sticker',
        options: [
            {
                name: 'name',
                type: 3,
                description: 'Sticker name',
                required: true
            },
            {
                name: 'attachment',
                type: 11,
                description: 'Upload an image',
                required: true
            },
            {
                name: 'url',
                type: 3,
                description: 'Image URL',
                required: false
            }
        ]
    },
    {
        name: 'emoji_to_image',
        description: 'Convert an emoji to an image',
        options: [
            {
                name: 'emoji',
                type: 3,
                description: 'The emoji to convert',
                required: true
            }
        ]
    },
    {
        name: 'sticker_to_image',
        description: 'Convert a sticker to an image',
        options: [
            {
                name: 'sticker',
                type: 3,
                description: 'The sticker to convert (ID or name)',
                required: true
            }
        ]
    },
    {
        name: 'enhance_emoji',
        description: 'Improve an emoji\'s quality and add it to the server',
        options: [
            {
                name: 'emoji',
                type: 3,
                description: 'The emoji to enhance',
                required: true
            }
        ]
    },
    {
        name: 'enhance_sticker',
        description: 'Improve a sticker\'s quality and save it to the server'
    },
    {
        name: 'list_emojis',
        description: 'List all server emojis'
    },
    {
        name: 'language',
        description: 'Change bot language (Owner only)'
    },
    {
        name: 'delete_emoji',
        description: 'Delete an emoji',
        options: [
            {
                name: 'emoji',
                type: 3,
                description: 'Emoji to delete',
                required: true
            }
        ]
    },
    {
        name: 'rename_emoji',
        description: 'Rename an emoji',
        options: [
            {
                name: 'emoji',
                type: 3,
                description: 'Emoji to rename',
                required: true
            },
            {
                name: 'name',
                type: 3,
                description: 'New name',
                required: true
            }
        ]
    },
    {
        name: 'delete_sticker',
        description: 'Delete a sticker'
    },
    {
        name: 'rename_sticker',
        description: 'Rename a sticker',
        options: [
            {
                name: 'name',
                type: 3,
                description: 'New sticker name',
                required: true
            }
        ]
    },
    {
        name: 'sticker_to_emoji',
        description: 'Convert sticker to emoji',
        options: [
            {
                name: 'name',
                type: 3,
                description: 'Emoji name',
                required: true
            }
        ]
    },
    {
        name: 'list_stickers',
        description: 'List all server stickers'
    },
    {
        name: 'add_sticker',
        description: 'Add a sticker to server',
        options: [
            {
                name: 'name',
                type: 3,
                description: 'Custom sticker name (optional)',
                required: false
            }
        ]
    },
    {
        name: 'ping',
        description: 'Check bot response speed'
    }
];

const OWNER_ONLY_COMMANDS = ['language', 'permission'];
const PUBLIC_COMMANDS = ['ping', 'help'];
const EMOJI_PERMISSION_COMMANDS = [
    'add_emoji', 'delete_emoji', 'rename_emoji', 'image_to_emoji', 
    'emoji_to_sticker', 'sticker_to_emoji', 'emoji_search', 'suggest_emojis',
    'list_emojis', 'delete_sticker', 'rename_sticker', 'image_to_sticker', 'list_stickers', 'add_sticker',
    'emoji_to_image', 'sticker_to_image', 'enhance_emoji', 'enhance_sticker'
];

module.exports = {
    SUPPORTED_LANGUAGES,
    LEGACY_LANGUAGE_MAP,
    COMMAND_DEFINITIONS,
    OWNER_ONLY_COMMANDS,
    PUBLIC_COMMANDS,
    EMOJI_PERMISSION_COMMANDS
};
