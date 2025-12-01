const { EmbedBuilder } = require('discord.js');

async function execute(interaction) {
    const startTime = Date.now();
    const gatewayLatency = Math.round(interaction.client.ws.ping);
    
    const embed = new EmbedBuilder()
        .setTitle('🏓 Pong!')
        .setDescription(
            'Gateway latency: ' + gatewayLatency + 'ms\n' +
            'Response time: ' + (Date.now() - startTime) + 'ms'
        )
        .setColor('#00FFFF');
    await interaction.reply({ embeds: [embed] });
}

module.exports = { execute };
