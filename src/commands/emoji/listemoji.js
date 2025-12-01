const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    const emojis = Array.from(interaction.guild.emojis.cache.values());
    if (emojis.length === 0) {
        const embed = new EmbedBuilder().setDescription('❌ ' + await t('No emojis.', langCode)).setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    let pages = [];
    let chunk = 50;
    for (let i = 0; i < emojis.length; i += chunk) {
        pages.push(emojis.slice(i, i + chunk).map(e => e.toString()).join(' '));
    }

    let page = 0;
    const pageText = await t('Page', langCode);
    const emojisTitle = await t('Emojis', langCode);
    const embed = new EmbedBuilder()
        .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTitle(`📋 ${emojisTitle}`)
        .setColor('#00FFFF')
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
        const emojisTitleUpdate = await t('Emojis', storedLangCode);
        const e = new EmbedBuilder()
            .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
            .setTitle(`📋 ${emojisTitleUpdate}`)
            .setColor('#00FFFF')
            .setDescription(pages[page])
            .setFooter({ text: `${pageTextUpdate} ${page + 1}/${pages.length}`, iconURL: interaction.user.displayAvatarURL() });

        const prevButton = new ButtonBuilder().setCustomId('prev').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(page === 0);
        const nextButton = new ButtonBuilder().setCustomId('next').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled(page === pages.length - 1);
        const newRow = new ActionRowBuilder().addComponents(prevButton, nextButton);

        await i.update({ embeds: [e], components: [newRow] });
    });
}

module.exports = { execute };
