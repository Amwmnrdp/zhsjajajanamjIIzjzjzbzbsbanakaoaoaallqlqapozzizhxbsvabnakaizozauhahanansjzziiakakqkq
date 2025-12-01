const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/languages');
const { allowedServers } = require('../../utils/permissions');

let suggestedEmojis = [];

async function execute(interaction, langCode, client) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
        const embed = new EmbedBuilder().setDescription('❌ ' + await t('Need Manage Emojis permission!', langCode)).setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    let emojis = [];
    client.guilds.cache.forEach(guild => {
        if (allowedServers.get(guild.id) === true) {
            guild.emojis.cache.forEach(emoji => {
                const isDuplicate = emojis.find(e => e.id === emoji.id);
                const alreadyInServer = interaction.guild.emojis.cache.find(e => e.name === emoji.name);
                if (!isDuplicate && !alreadyInServer) {
                    emojis.push(emoji);
                }
            });
        }
    });

    if (emojis.length === 0) {
        const embed = new EmbedBuilder().setTitle('❌ ' + await t('No Emojis Available', langCode)).setDescription(await t('No emojis available.', langCode)).setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    emojis = emojis.sort(() => Math.random() - 0.5).slice(0, 5);
    suggestedEmojis = emojis;
    
    const embed = new EmbedBuilder()
        .setTitle('💡 ' + await t('Suggested Emojis', langCode))
        .setDescription(await t('Here are 5 suggestions:', langCode) + '\n' + emojis.map(e => e.toString()).join(' '))
        .setColor('#00FFFF')
        .setFooter({ text: await t('React with checkmark to add or X to cancel.', langCode) + ` • ${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });

    const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
    try {
        await msg.react('✅');
        await msg.react('❌');
    } catch (error) {
        console.error('⚠️ Warning: Could not add reactions:', error.message);
    }

    const storedLangCode = langCode;
    const filter = (reaction, user) => ['✅', '❌'].includes(reaction.emoji.name) && user.id === interaction.user.id;
    msg.awaitReactions({ filter, max: 1, time: 60000, errors: ['time'] })
        .then(async collected => {
            const reaction = collected.first();
            if (reaction.emoji.name === '✅') {
                for (const emoji of emojis) {
                    if (!interaction.guild.emojis.cache.find(e => e.name === emoji.name)) {
                        try {
                            await interaction.guild.emojis.create({ attachment: emoji.url, name: emoji.name });
                        } catch (error) {
                            console.error(`⚠️ Warning: Could not add emoji ${emoji.name}:`, error.message);
                        }
                    }
                }
                await interaction.followUp('✅ ' + await t('Emojis added!', storedLangCode));
            } else {
                await interaction.followUp('❌ ' + await t('Cancelled.', storedLangCode));
            }
        })
        .catch(async () => interaction.followUp('⏳ ' + await t('Timeout.', storedLangCode)));
}

module.exports = { execute, getSuggestedEmojis: () => suggestedEmojis, setSuggestedEmojis: (v) => { suggestedEmojis = v; } };
