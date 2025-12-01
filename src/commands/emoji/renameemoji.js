const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
        const embed = new EmbedBuilder().setDescription('❌ ' + await t('Need permission!', langCode)).setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    const emojiInput = interaction.options.getString('emoji');
    const newName = interaction.options.getString('name');
    const match = emojiInput.match(/<(a)?:\w+:(\d+)>/);

    if (!match) {
        const embed = new EmbedBuilder().setDescription('❌ ' + await t('Invalid emoji!', langCode)).setColor('#FF0000').setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.reply({ embeds: [embed] });
        return;
    }

    const emojiId = match[2];
    const emj = interaction.guild.emojis.cache.get(emojiId);

    if (!emj) {
        const embed = new EmbedBuilder().setDescription('❌ ' + emojiInput + ' ' + await t('not found!', langCode)).setColor('#FF0000').setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.reply({ embeds: [embed] });
        return;
    }

    try {
        await emj.edit({ name: newName });
        const embed = new EmbedBuilder().setDescription('✅ ' + await t('Renamed to', langCode) + ' ' + newName + '! ' + emj).setColor('#00FF00').setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        const errorMsg = error.code === 50013 ?
            await t('Missing permissions to rename emoji', langCode) :
            error.code === 50035 ?
            await t('Invalid emoji name', langCode) :
            await t('Error:', langCode) + ' ' + error.message;
        const embed = new EmbedBuilder().setDescription(`❌ ${errorMsg}`).setColor('#FF0000').setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.reply({ embeds: [embed] });
        console.error(`⚠️ Discord Error in rename_emoji:`, error.code, error.message);
    }
}

module.exports = { execute };
