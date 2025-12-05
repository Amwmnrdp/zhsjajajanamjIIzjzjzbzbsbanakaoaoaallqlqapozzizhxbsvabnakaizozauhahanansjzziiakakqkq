const { EmbedBuilder } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    const WEBSITE_URL = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'http://localhost:3000';

    const helpContent = `**${await t('Welcome, this is my help menu', langCode)}**
⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('If you do not have Nitro you can write this command', langCode)} **/suggestemojis** ${await t('so that the bot will suggest emojis to you from different servers', langCode)}

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('You can use this slash command', langCode)} **/image_to_emoji** ${await t('to convert an image URL into an emoji and save it on your server', langCode)}

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('You can add an emoji and change its name using this Slash Command', langCode)} **/addemoji**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('If you want to rename an emoji you can use this slash command', langCode)} **/rename_emoji** ${await t('and the emoji name will be changed', langCode)}

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('You can convert an emoji to a sticker using this slash command', langCode)} **/emoji_to_sticker** ${await t('and the emoji will be turned into a beautiful sticker!', langCode)}

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('You can convert an image to a sticker using this slash command', langCode)} **/image_to_sticker** ${await t('and the image will be turned into a beautiful sticker!', langCode)}

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('You can delete a sticker using this slash command', langCode)} **/delete_sticker** ${await t('and then reply with the sticker you want to delete!', langCode)}

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('You can convert a sticker to an emoji using this slash command', langCode)} **/sticker_to_emoji** ${await t('and then reply with the sticker you want to convert!', langCode)}

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

🔗 [ProEmoji dashboard](${WEBSITE_URL})`;

    const embed = new EmbedBuilder()
        .setTitle('📖 ' + await t('ProEmoji Help', langCode))
        .setDescription(helpContent)
        .setColor('#0099ff');

    await interaction.reply({ embeds: [embed] });
}

module.exports = { execute };
