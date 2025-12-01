const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    const stickers = Array.from(interaction.guild.stickers.cache.values());
    if (stickers.length === 0) {
        const embed = new EmbedBuilder().setDescription('❌ ' + await t('No stickers.', langCode)).setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    let pages = [];
    let chunk = 20;
    for (let i = 0; i < stickers.length; i += chunk) {
        const pageStickers = stickers.slice(i, i + chunk);
        let content = '';
        pageStickers.forEach((s, idx) => {
            content += `${idx + 1}. **${s.name}** (ID: ${s.id})\n`;
        });
        pages.push(content);
    }

    let page = 0;
    const pageText = await t('Page', langCode);
    const stickersTitle = await t('Stickers', langCode);
    const embed = new EmbedBuilder()
        .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTitle(`📌 ${stickersTitle}`)
        .setColor('#FFA500')
        .setDescription(pages[page])
        .setFooter({ text: `${pageText} ${page + 1}/${pages.length}`, iconURL: interaction.user.displayAvatarURL() });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('next').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled(pages.length <= 1)
    );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

    const storedLangCode = langCode;
    const filter = i => (i.customId === 'next' || i.customId === 'prev') && i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 300000 });

    collector.on('collect', async i => {
        if (i.customId === 'next') { page++; if (page >= pages.length) page = 0; }
        else { page--; if (page < 0) page = pages.length - 1; }

        const pageTextUpdate = await t('Page', storedLangCode);
        const stickersTitleUpdate = await t('Stickers', storedLangCode);
        const e = new EmbedBuilder()
            .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
            .setTitle(`📌 ${stickersTitleUpdate}`)
            .setColor('#FFA500')
            .setDescription(pages[page])
            .setFooter({ text: `${pageTextUpdate} ${page + 1}/${pages.length}`, iconURL: interaction.user.displayAvatarURL() });

        const prevButton = new ButtonBuilder().setCustomId('prev').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(page === 0);
        const nextButton = new ButtonBuilder().setCustomId('next').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled(page === pages.length - 1);
        const newRow = new ActionRowBuilder().addComponents(prevButton, nextButton);

        await i.update({ embeds: [e], components: [newRow] });
    });
}

module.exports = { execute };
