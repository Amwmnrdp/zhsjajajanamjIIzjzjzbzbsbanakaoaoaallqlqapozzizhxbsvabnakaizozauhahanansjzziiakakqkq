const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    const stickers = Array.from(interaction.guild.stickers.cache.values());
    if (stickers.length === 0) {
        const embed = new EmbedBuilder().setDescription('❌ ' + await t('No stickers.', langCode)).setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    let page = 0;
    const pageText = await t('Page', langCode);
    const stickersTitle = await t('Stickers', langCode);

    const createEmbed = async (pageNum) => {
        const sticker = stickers[pageNum];
        const embed = new EmbedBuilder()
            .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
            .setTitle(`📌 ${stickersTitle}`)
            .setColor('#FFA500')
            .setDescription(`**${await t('Name:', langCode)}** ${sticker.name}\n**${await t('ID:', langCode)}** ${sticker.id}`)
            .setImage(sticker.url)
            .setFooter({ text: `${pageText} ${pageNum + 1}/${stickers.length}`, iconURL: interaction.user.displayAvatarURL() });
        return embed;
    };

    const embed = await createEmbed(page);
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('next').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled(stickers.length <= 1)
    );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

    const filter = i => (i.customId === 'next' || i.customId === 'prev') && i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 300000 });

    collector.on('collect', async i => {
        if (i.customId === 'next') { 
            page++; 
            if (page >= stickers.length) page = 0; 
        } else { 
            page--; 
            if (page < 0) page = stickers.length - 1; 
        }

        const updatedEmbed = await createEmbed(page);
        const prevButton = new ButtonBuilder().setCustomId('prev').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(page === 0 && stickers.length > 1 ? false : page === 0 && stickers.length === 1);
        const nextButton = new ButtonBuilder().setCustomId('next').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled(page === stickers.length - 1 && stickers.length > 1 ? false : page === stickers.length - 1 && stickers.length === 1);
        const newRow = new ActionRowBuilder().addComponents(prevButton, nextButton);

        await i.update({ embeds: [updatedEmbed], components: [newRow] });
    });
}

module.exports = { execute };
