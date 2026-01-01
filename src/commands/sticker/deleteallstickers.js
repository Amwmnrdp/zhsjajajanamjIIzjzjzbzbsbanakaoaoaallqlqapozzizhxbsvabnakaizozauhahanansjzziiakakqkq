const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('Only administrators can use this command.', langCode))
            .setColor('#FF0000');
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        const stickers = await interaction.guild.stickers.fetch();
        if (stickers.size === 0) {
            const embed = new EmbedBuilder()
                .setDescription('ℹ️ ' + await t('No stickers found to delete.', langCode))
                .setColor('#0000FF');
            return await interaction.editReply({ embeds: [embed] });
        }

        let count = 0;
        for (const sticker of stickers.values()) {
            await sticker.delete();
            count++;
        }

        const embed = new EmbedBuilder()
            .setDescription('✅ ' + (await t('Successfully deleted all stickers!', langCode)).replace('{count}', count))
            .setColor('#ADD8E6');
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('Error:', langCode) + ' ' + error.message)
            .setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
    }
}

module.exports = { execute };
