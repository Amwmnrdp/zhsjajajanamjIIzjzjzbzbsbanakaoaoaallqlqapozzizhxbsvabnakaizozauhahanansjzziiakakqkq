const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { t } = require('../../utils/languages');
const { SUPPORTED_LANGUAGES } = require('../../utils/constants');

async function execute(interaction, langCode) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const embed = new EmbedBuilder().setDescription(await t('Need ADMINISTRATOR permission!', langCode)).setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    const currentLang = SUPPORTED_LANGUAGES[langCode] || SUPPORTED_LANGUAGES['en'];
    const embed = new EmbedBuilder()
        .setTitle('🌐 ' + await t('Choose Language', langCode))
        .setColor('#00FFFF')
        .setDescription(await t('Select your preferred language from the dropdown menu below:', langCode) + `\n\n**${await t('Current', langCode)}:** ${currentLang.flag} ${currentLang.native}`);

    const options = Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => ({
        label: `${info.name} - ${info.native}`,
        description: info.name,
        value: code,
        emoji: info.flag.startsWith('<') ? { id: '1443915175379079208', name: 'Syria' } : info.flag,
        default: code === langCode
    }));

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('language_select')
        .setPlaceholder(await t('Choose a language...', langCode))
        .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);
    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
    
    const filter = i => i.customId === 'language_select' && i.user.id === interaction.user.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 60000 });
    
    collector.on('end', async collected => {
        if (collected.size === 0) {
            const disabledSelectMenu = new StringSelectMenuBuilder()
                .setCustomId('language_select')
                .setPlaceholder(await t('Choose a language...', langCode))
                .setDisabled(true)
                .addOptions(options);
            const disabledRow = new ActionRowBuilder().addComponents(disabledSelectMenu);
            msg.edit({ components: [disabledRow] }).catch(() => {});
        }
    });
}

module.exports = { execute };
