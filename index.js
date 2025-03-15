const express = require('express');
const app = express();
const { Client, Intents, MessageEmbed, MessageActionRow, MessageButton, Permissions, MessageSelectMenu } = require('discord.js');
const Discord = require('discord.js');

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
        Intents.FLAGS.GUILD_INTEGRATIONS,
        Intents.FLAGS.GUILD_WEBHOOKS,
        Intents.FLAGS.GUILD_INVITES,
        Intents.FLAGS.GUILD_VOICE_STATES,
        Intents.FLAGS.GUILD_PRESENCES,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_MESSAGE_TYPING,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
        Intents.FLAGS.DIRECT_MESSAGE_TYPING
    ],
    partials: [
        'MESSAGE',
        'CHANNEL',
        'GUILD_MEMBER',
        'REACTION',
        'USER'
    ],
});

const allowedServers = new Map();
const serverLanguages = new Map();

client.on('guildCreate', guild => {
    allowedServers.set(guild.id, true);
    serverLanguages.set(guild.id, 'english');
});

client.on('guildDelete', guild => {
    allowedServers.delete(guild.id);
    serverLanguages.delete(guild.id);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const language = serverLanguages.get(interaction.guild.id) || 'english';

    if (interaction.commandName === 'note') {
        if (interaction.member.id !== interaction.guild.ownerId) {
            const embed = new MessageEmbed()
                .setDescription(
                    language === 'english'
                        ? 'This command can only be used by the server owner!'
                        : 'يمكن استخدام هذا الأمر من قبل مالك السيرفر فقط!'
                )
                .setColor('#FF0000');
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        const textChannels = interaction.guild.channels.cache.filter(channel => channel.isText());
        const channelOptions = textChannels.map(channel => ({
            label: channel.name,
            value: channel.id,
        }));

        const row = new MessageActionRow().addComponents(
            new MessageSelectMenu()
                .setCustomId('select_channel')
                .setPlaceholder(language === 'english' ? 'Select a channel' : 'اختر قناة')
                .addOptions(channelOptions)
        );

        const embed = new MessageEmbed()
            .setTitle(language === 'english' ? 'Select Channel' : 'اختر القناة')
            .setDescription(
                language === 'english'
                    ? 'Please select the text channel where you want to send the message.'
                    : 'الرجاء اختيار القناة النصية التي تريد إرسال الرسالة إليها.'
            )
            .setColor('#00FFFF');

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

        const filter = i => i.customId === 'select_channel' && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            await i.deferUpdate(); // تأجيل التفاعل

            const selectedChannelId = i.values[0];
            const targetChannel = interaction.guild.channels.cache.get(selectedChannelId);

            const buttonRow = new MessageActionRow().addComponents(
                new MessageButton()
                    .setCustomId('allow')
                    .setLabel(language === 'english' ? 'Allow' : 'السماح')
                    .setStyle('SUCCESS'),
                new MessageButton()
                    .setCustomId('refuse')
                    .setLabel(language === 'english' ? 'Refuse' : 'رفض')
                    .setStyle('DANGER')
            );

            const embed = new MessageEmbed()
                .setTitle(language === 'english' ? 'Note' : 'ملاحظة')
                .setDescription(
                    language === 'english'
                        ? 'Do you want to allow the bot to suggest emojis from this server to other servers?'
                        : 'هل تريد السماح للبوت باقتراح الإيموجيات من هذا السيرفر إلى سيرفرات أخرى؟'
                )
                .setColor('#00FFFF');

            const sentMessage = await targetChannel.send({ embeds: [embed], components: [buttonRow] });

            const confirmationEmbed = new MessageEmbed()
                .setTitle(language === 'english' ? 'Message Sent' : 'تم إرسال الرسالة')
                .setDescription(
                    language === 'english'
                        ? `The message has been sent to ${targetChannel}.`
                        : `تم إرسال الرسالة إلى ${targetChannel}.`
                )
                .setColor('#00FF00');

            await i.followUp({ embeds: [confirmationEmbed], components: [], ephemeral: true });

            const buttonFilter = b => b.customId === 'allow' || b.customId === 'refuse';
            const buttonCollector = sentMessage.createMessageComponentCollector({ buttonFilter, time: 60000 });

            buttonCollector.on('collect', async b => {
                await b.deferUpdate(); // تأجيل التفاعل

                if (b.customId === 'allow') {
                    allowedServers.set(interaction.guild.id, true);
                    const allowEmbed = new MessageEmbed()
                        .setTitle(language === 'english' ? '✔️ Permission Granted' : '✔️ تم منح الإذن')
                        .setDescription(
                            language === 'english'
                                ? 'You have allowed the bot to suggest emojis from this server to other servers.'
                                : 'لقد سمحت للبوت باقتراح الإيموجيات من هذا السيرفر إلى سيرفرات أخرى.'
                        )
                        .setColor('#00FF00');
                    await b.followUp({ embeds: [allowEmbed], components: [], ephemeral: true });
                } else if (b.customId === 'refuse') {
                    allowedServers.set(interaction.guild.id, false);
                    const refuseEmbed = new MessageEmbed()
                        .setTitle(language === 'english' ? '❌ Permission Denied' : '❌ تم رفض الإذن')
                        .setDescription(
                            language === 'english'
                                ? 'You have refused to allow the bot to suggest emojis from this server to other servers.'
                                : 'لقد رفضت السماح للبوت باقتراح الإيموجيات من هذا السيرفر إلى سيرفرات أخرى.'
                        )
                        .setColor('#FF0000');
                    await b.followUp({ embeds: [refuseEmbed], components: [], ephemeral: true });
                }

                buttonCollector.stop();
            });

            buttonCollector.on('end', collected => {
                if (collected.size === 0) {
                    const timeoutEmbed = new MessageEmbed()
                        .setTitle(language === 'english' ? '⏳ Time Out' : '⏳ انتهى الوقت')
                        .setDescription(
                            language === 'english'
                                ? 'You did not respond in time.'
                                : 'لم تقم بالرد في الوقت المحدد.'
                        )
                        .setColor('#FFFF00');
                    targetChannel.send({ embeds: [timeoutEmbed] });
                }
            });
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                const timeoutEmbed = new MessageEmbed()
                    .setTitle(language === 'english' ? '⏳ Time Out' : '⏳ انتهى الوقت')
                    .setDescription(
                        language === 'english'
                            ? 'You did not select a channel in time.'
                            : 'لم تقم باختيار قناة في الوقت المحدد.'
                    )
                    .setColor('#FFFF00');
                interaction.followUp({ embeds: [timeoutEmbed], ephemeral: true });
            }
        });
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const language = serverLanguages.get(interaction.guild.id) || 'english';

    if (interaction.commandName === 'suggestemojis') {
        if (!interaction.member.permissions.has(Permissions.FLAGS.MANAGE_EMOJIS_AND_STICKERS)) {
            const embed = new MessageEmbed()
                .setDescription(
                    language === 'english'
                        ? 'You do not have the required permission `MANAGE_EMOJIS_AND_STICKERS`. You need this permission to use this command👀'
                        : 'ليس لديك صلاحية `MANAGE_EMOJIS_AND_STICKERS` تحتاج هذه الصلاحية حتى تستخدم الامر👀'
                )
                .setColor("#FF0000");
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        let emojis = [];
        client.guilds.cache.forEach(guild => {
            if (allowedServers.get(guild.id) === true) {
                guild.emojis.cache.forEach(emoji => {
                    if (!emojis.includes(emoji) && 
                        !interaction.guild.emojis.cache.find(e => e.name === emoji.name)) {
                        emojis.push(emoji);
                    }
                });
            }
        });

        if (emojis.length === 0) {
            const embed = new MessageEmbed()
                .setTitle(language === 'english' ? 'No Emojis Available' : 'لا توجد ايموجيات متاحة')
                .setDescription(
                    language === 'english'
                        ? 'No emojis are available to suggest from other servers.'
                        : 'لا توجد ايموجيات متاحة للاقتراح من سيرفرات أخرى.'
                )
                .setColor("#FF0000");
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        emojis = emojis.sort(() => Math.random() - 0.5).slice(0, 5);
        const embed = new MessageEmbed()
            .setTitle(language === 'english' ? 'Suggested Emojis' : 'الإيموجيات المقترحة')
            .setDescription(
                language === 'english'
                    ? 'Here are 5 suggested emojis from other servers:\n' + emojis.map(e => e.toString()).join(' ')
                    : 'هذه 5 اقتراحات الايموجيات من سيرفرات أخرى:\n' + emojis.map(e => e.toString()).join(' ')
            )
            .setColor("#00FFFF")
            .setFooter(
                language === 'english'
                    ? 'React with ✅ to add them or ❌ to cancel.'
                    : 'اضغط على ✅ لإضافتها أو ❌ لإلغاء الأمر.'
            );

        const sentMessage = await interaction.reply({ embeds: [embed], fetchReply: true });

        const filter = (reaction, user) => {
            return ['✅', '❌'].includes(reaction.emoji.name) && user.id === interaction.user.id;
        };

        await sentMessage.react('✅');
        await sentMessage.react('❌');

        sentMessage.awaitReactions({ filter, max: 1, time: 60000, errors: ['time'] })
            .then(collected => {
                const reaction = collected.first();
                if (reaction.emoji.name === '✅') {
                    emojis.forEach(emoji => {
                        if (!interaction.guild.emojis.cache.find(e => e.name === emoji.name)) {
                            interaction.guild.emojis.create(emoji.url, emoji.name);
                        }
                    });
                    interaction.followUp(
                        language === 'english'
                            ? 'The suggested emojis have been added successfully✅'
                            : 'تمت إضافة الايموجيات المقترحة بنجاح✅'
                    );
                } else {
                    interaction.followUp(
                        language === 'english'
                            ? 'The suggested emojis were not added❎'
                            : 'لم يتم إضافة الايموجيات المقترحة❎'
                    );
                }
            })
            .catch(() => {
                interaction.followUp(
                    language === 'english'
                        ? 'You did not respond in time.'
                        : 'لم تقم بالرد في الوقت المحدد.'
                );
            });
    }
});




  



client.on('messageCreate', message => {
 if (!message.guild) return;
  language = serverLanguages.get(message.guild.id) || 'english';
});

app.get('/', (req, res) => {
  res.send('EMOJI');
});

const prefix = '+';

client.on('ready', async () => {
  console.log(`"${client.user.username}" is ready`);

  const addEmojiCommand = {
    name: 'addemoji',
    description: 'Add an emoji to the server',
    options: [
      {
        name: 'emoji',
        type: 3, // 3 represents 
        description: 'The emoji to add',
        required: true
      },
      {
        name: 'name',
        type: 3, // 3 represents 
        description: 'The name for the emoji',
        required: false
      }
    ]
  };

  await client.application.commands.create(addEmojiCommand);

  client.user.setActivity('+help');
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  if (interaction.commandName === 'addemoji') {
    if (!interaction.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_EMOJIS_AND_STICKERS)) {
      const language = serverLanguages.get(interaction.guild.id) || 'english';
      const embed = new MessageEmbed()
        .setDescription(language === 'english' ? `You do not have the required permission \`MANAGE_EMOJIS_AND_STICKERS\`. You need this permission to use this command👀` : `ليس لديك صلاحية \`MANAGE_EMOJIS_AND_STICKERS\` تحتاج هذه الصلاحية حتى تستخدم الامر👀`)
        .setColor("#FF0000")
      interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }
    const emoji = interaction.options.getString('emoji');
    const name = interaction.options.getString('name');
    let info = Discord.Util.parseEmoji(emoji);
    if (!info.id) {
      const embed = new MessageEmbed()
        .setTitle(language === 'english' ? `Add Emoji` : `إضافة ايموجي`)
        .setDescription(language === 'english' ? `**I can't find an emoji to add🤔**` : `**لا يمكنني العثور على ايموجي لإضافته🤔**`)
        .setColor("#00FFFF")
      interaction.reply({ embeds: [embed] });
      return;
    }
    if (interaction.guild.emojis.cache.find(e => e.name === info.name)) {
      const embed = new MessageEmbed()
        .setTitle(language === 'english' ? `Add Emoji` : `إضافة ايموجي`)
        .setDescription(language === 'english' ? `The emoji ${emoji} is already added to the server❎` : `الايموجي ${emoji} مضاف بالفعل إلى السيرفر❎`)
        .setColor("#FF0000")
      interaction.reply({ embeds: [embed] });
      return;
    }
    let type = info.animated ? '.gif' : '.png';
    let url = `https://cdn.discordapp.com/emojis/${info.id + type}`;
    var emj = await interaction.guild.emojis.create(url, name || info.name, {
      reason: `emoji created by ${client.user.tag}`
    });
    const embed = new MessageEmbed()
      .setTitle(language === 'english' ? `Add Emoji` : `إضافة ايموجي`)
      .setDescription(language === 'english' ? `**Emoji has been added successfully✅ ${emj}**` : `**تمت إضافة الايموجي بنجاح ${emj}✅**`)
      .setColor("#00FFFF")
    interaction.reply({ embeds: [embed] });
  }
});


client.on('messageCreate', senko => {
  if (senko.content.startsWith(prefix + 'help')) {
    senko.channel.send(language === 'english' ? '**Check your DM**' : '**شوف خاصك**').then(messages => {
      messages.delete({ timeout: 5000 });
      let embed = new MessageEmbed()
       .setDescription(
          language === 'english'
            ? `**Welcome, this is my help menu **
⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

The prefix of the bot is **[ + ]**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

If you do not have Nitro you can write this command **+suggestemojis** so that the bot will suggest emojis to you from different servers that the bot has

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

You can use this slash command  
**/image_to_emoji** to convert the image into an emoji and save it on your server

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

You can add an emoji using this command **+addemoji** and you will be able to add an emoji but with the original name of the emoji

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

You can add an emoji but change the name of the emoji using this Slash Command 
**/addemoji** 

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

If you want to rename of the emoji you can use this slash command **/rename_emoji** and the name of the emoji will be renamed

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

You can change the bot's language using this Slash Command command **/language**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

**I hope you like the bot and enjoy using it 😉**

`
            : `** مرحبًا، هذه هي قائمة المساعدة الخاصة بي **
⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

  بادئة البوت هي **[ + ]** 
  
⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

 اذا كنت لا تملك نيترو تستطيع كتابة هذا الامر حتى يقترح لك البوت ايموجيات من سيرفرات مختلفة داخلها البوت **suggestemojis+**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

 يمكنك استخدام امر سلاش كوماند **image_to_emoji/** حتى يتم تحويل الصوره الى ايموجي و يحفظها في سيرفرك 

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

 يمكنك اضافة ايموجي باستخدام هذا الامر **addemoji+** و سوف تستطيع اضافة ايموجي ولكن مع اسم الايموجي الاصلي

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

 يمكنك اضافة ايموجي ولكن مع تغيير الاسم بأستخدام سلاش كوماند **addemoji/** 

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

اذا كنت تريد تغيير اسم الايموجي يمكنك استخدام امر السلاش كوماند هذا **rename_emoji/** و سوف يتم تغيير اسم الايموجي 

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

تستطيع تغيير لغة البوت باستخدام هذا السلاش كوماند **language/** 

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

**اتمنى ان يعجبك البوت و تستمتع باستخدامه😉**
`
        )
        .setFooter({ text: `ProEmoji` })
        .setColor(`#00FFFF`)
        .setTimestamp();
      senko.author.send({ embeds: [embed] }).catch(error => senko.reply(language === 'english' ? '**Please open your DM**' : '**رجاء فتح خاصك**'));
    });
  }
});
client.on("messageCreate", async message => {
  if (message.content.startsWith(prefix + "addemoji")) {
    if (!message.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_EMOJIS_AND_STICKERS)) {
      const language = serverLanguages.get(message.guild.id) || 'english';
      const embed = new MessageEmbed()
        .setDescription(language === 'english' ? `You do not have the required permission \`MANAGE_EMOJIS_AND_STICKERS\`. You need this permission to use this command👀` : `ليس لديك صلاحية \`MANAGE_EMOJIS_AND_STICKERS\` تحتاج هذه الصلاحية حتى تستخدم الامر👀`)
        .setColor("#FF0000")
      message.channel.send({ embeds: [embed] }).then(msg => {
        setTimeout(() => msg.delete(), 5000);
      });
      return;
    }
    let args = message.content.split(" ").slice(1)
    const emojis = args
    if (!emojis.length) {
      const embed = new MessageEmbed()
        .setTitle(language === 'english' ? `Add Emoji` : `إضافة ايموجي`)
        .setDescription(language === 'english' ? `**Please choose the emoji you want to add🤔**` : `**يرجى اختيار الايموجي الذي تريد إضافته🤔**`)
        .setColor("#00FFFF")
      message.channel.send({ embeds: [embed] });
      return;
    }
    let names = []
    for (let i = 0; i < emojis.length; i++) {
      const emoji = emojis[i];
      let info = Discord.Util.parseEmoji(emoji)
      if (!info.id) {
        continue;
      }
      if (message.guild.emojis.cache.find(e => e.name === info.name && e.id === info.id)) {
        const embed = new MessageEmbed()
          .setTitle(language === 'english' ? `Add Emoji` : `إضافة ايموجي`)
          .setDescription(language === 'english' ? `The emoji ${emojis[i]} is already added to the server` : `الايموجي ${emojis[i]} مضاف بالفعل إلى السيرفر`)
          .setColor("#FF0000")
        message.channel.send({ embeds: [embed] });
        continue;
      }
      let type = info.animated ? ".gif" : ".png"
      let url = `https://cdn.discordapp.com/emojis/${info.id + type}`
      var emj = await message.guild.emojis.create(url, info.name, {
        reason: `emoji created by ${client.user.tag}`
      })
      names.push(emj)
      if (i === emojis.length - 1 && !names.length) {
        const embed = new MessageEmbed()
          .setTitle(language === 'english' ? `Add Emoji` : `إضافة ايموجي`)
          .setDescription(language === 'english' ? "**I can't find an emoji to add🤔**" : "**لا يمكنني العثور على ايموجي لإضافته🤔**")
          .setColor("#00FFFF")
        message.channel.send({ embeds: [embed] });
        return;
      }
    }
    if (names.length) {
      const embed = new MessageEmbed()
        .setTitle(language === 'english' ? `Add Emoji` : `إضافة ايموجي`)
        .setDescription(language === 'english' ? `**Emoji has been added successfully✅ ${names.join("/")}**` : `**تمت إضافة الايموجي بنجاح ${names.join("/")}✅**`)
        .setColor("#00FFFF")
        
      message.channel.send({ embeds: [embed] });
    }
  }
});



const isImageUrl = require('is-image-url');

const words = {
  emoji: 'image_to_emoji',
  added: {
    ar: 'تمت إضافته بنجاح',
    en: 'added successfully'
  },
  error: {
    ar: 'عذرا، حدث خطأ',
    en: 'Sorry, something went wrong'
  },
  invalid_url: {
    ar: 'عذرًا، يجب إدخال رابط صحيح لصورة في خيار **"url"**',
    en: 'Sorry, you must enter a valid image URL in the **"url"** option'
  },
  none: 'There are no emojis in this server'
};

const usedUrls = {};

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  const commands = await client.application.commands.fetch();
  const emojiCommand = commands.find(command => command.name === words.emoji);
  if (emojiCommand) {
    await emojiCommand.delete();
  }
  await client.application.commands.create({
    name: words.emoji,
    description: `Convert the image to emoji`,
    options: [
      {
        name: 'name',
        description: `The name of the ${words.emoji}`,
        type: 3, // 3 represents STRING
        required: true
      },
      {
        name: 'url',
        description: `The URL of the image`,
        type: 3, // 3 represents STRING
        required: true
      }
    ]
  });
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const commandName = interaction.commandName;
  const nameOption = interaction.options.getString('name');
  const urlOption = interaction.options.getString('url');

  if (commandName === words.emoji) {
    const language = serverLanguages.get(interaction.guild.id) || 'english';
    if (!interaction.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_EMOJIS_AND_STICKERS)) {
      const embed = new MessageEmbed()
        .setDescription(language === 'english' ? `You do not have the required permission \`MANAGE_EMOJIS_AND_STICKERS\`. You need this permission to use this command👀` : `ليس لديك صلاحية \`MANAGE_EMOJIS_AND_STICKERS\` تحتاج هذه الصلاحية حتى تستخدم الامر👀`)
        .setColor("#FF0000")
      interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }
    if (nameOption && urlOption) {
      if (!isImageUrl(urlOption)) {
        await interaction.reply(language === "english" ? words.invalid_url.en : words.invalid_url.ar);
      } else {
        try {
          if (usedUrls[urlOption] && usedUrls[urlOption].includes(interaction.guild.id)) {
            await interaction.reply(language === "english" ? `This image has already been used as an emoji in this server.` : `تم استخدام هذه الصورة بالفعل كـ ايموجي في هذا االسيرفر`);
          } else {
            const emoji = await interaction.guild.emojis.create(urlOption, nameOption);
            //see
            usedUrls[urlOption] = usedUrls[urlOption] || [];
            usedUrls[urlOption].push(interaction.guild.id);
          }
        } catch (error) {
          await interaction.reply(`${language === "english" ? words.error.en : words.error.ar}. ${error.message}`);
        }
      }
    } else {
      await interaction.reply(language === "english" ? `Please provide both a name and a URL for the emoji you want to add.` : `يرجى تقديم كل من اسم و رابط للايموجي الذي ترغب في إضافته.`);
    }
  }
});



        
client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  const commands = await client.application.commands.fetch();
  const listEmojisCommand = commands.find(command => command.name === 'list_emojis');
  if (!listEmojisCommand) {
    await client.application.commands.create({
      name: 'list_emojis',
      description: `List all emojis in the server`,
    });
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'list_emojis') {
    const emojis = Array.from(interaction.guild.emojis.cache.values());
    if (emojis.length === 0) {
      await interaction.reply({ content: 'There are no emojis in this server', ephemeral: true });
    } else {
      let pages = [];
      let i,j,temparray,chunk = 50;
      for (i=0,j=emojis.length; i<j; i+=chunk) {
        temparray = emojis.slice(i,i+chunk);
        pages.push(temparray.map(emoji => emoji.toString()).join(' '));
      }

      let page = 1;
      const embed = new MessageEmbed()
        .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTitle('Emojis')
        .setColor('#00FFFF')
        .setDescription(pages[page-1] || 'No emojis to display') 
        .setFooter({ text: `${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

      const row = new MessageActionRow()
        .addComponents(
          new MessageButton()
            .setCustomId('previous')
            .setLabel('Previous')
            .setStyle('SECONDARY'),
          new MessageButton()
            .setCustomId('next')
            .setLabel('Next')
            .setStyle('SECONDARY'),
        );

      await interaction.deferReply({ ephemeral: true });
      await interaction.editReply({ embeds: [embed], components: [row] });

      const filter = i => i.customId === 'next' || i.customId === 'previous';
      const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

      collector.on('collect', async i => {
        if (i.customId === 'next') {
          page++;
          if(page > pages.length) page = 1;
        } else if (i.customId === 'previous') {
          page--;
          if(page < 1) page = pages.length;
        }

        const embed = new MessageEmbed()
          .setAuthor(interaction.guild.name, interaction.guild.iconURL())
          .setTitle('Emojis')
          .setColor('#00FFFF')
          .setDescription(pages[page-1])
          .setFooter(` ${interaction.user.tag}`, interaction.user.displayAvatarURL());

        await i.update({ embeds: [embed] });
      });
    }
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'language') {
    const language = serverLanguages.get(interaction.guild.id) || 'english';

    if (!interaction.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
      const embed = new MessageEmbed()
        .setDescription(
          language === 'english'
            ? `You do not have the required permission \`ADMINISTRATOR\`. You need this permission to use this command👀`
            : `ليس لديك صلاحية \`ADMINISTRATOR\` تحتاج هذه الصلاحية حتى تستخدم الامر👀`
        )
        .setColor('#FF0000');
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const embed = new MessageEmbed()
      .setTitle('اختار اللغة - Choose the language')
      .setColor('#00FFFF')
      .setDescription('اختار اللغة التي تريد استخدامها - Choose the language you want to use')
      .addFields(
        { name: 'عربي', value: 'اضغط على 🇦 للاختيار', inline: true },
        { name: 'English', value: 'Click on 🇺🇸 to select', inline: true }
      );

    await interaction.reply({ embeds: [embed] }).then(async () => {
      const sentMessage = await interaction.fetchReply();
      await sentMessage.react('🇦');
      await sentMessage.react('🇺🇸');

      const filter = (reaction, user) => {
        return ['🇦', '🇺🇸'].includes(reaction.emoji.name) && user.id === interaction.user.id;
      };

      sentMessage.awaitReactions({ filter, max: 1, time: 60000, errors: ['time'] })
        .then(collected => {
          const reaction = collected.first();
          if (reaction.emoji.name === '🇦') {
            serverLanguages.set(interaction.guild.id, 'arabic');
            interaction.followUp('لقد اخترت اللغة العربية');
          } else {
            serverLanguages.set(interaction.guild.id, 'english');
            interaction.followUp('You have chosen English');
          }
        })
        .catch(() => {
          interaction.followUp(
            language === 'english'
              ? 'You did not choose a language in the allotted time'
              : 'لم تقم باختيار اللغة في الوقت المحدد'
          );
        });
    });
  }
});



client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'delete_emoji') {
    if (!interaction.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_EMOJIS_AND_STICKERS)) {
      const embed = new MessageEmbed()
        .setTitle(language === 'english' ? `Delete Emoji` : `حذف ايموجي`)
        .setDescription(language === 'english' ? `You do not have the required permission \`MANAGE_EMOJIS_AND_STICKERS\`. You need this permission to use this command👀` : `ليس لديك صلاحية \`MANAGE_EMOJIS_AND_STICKERS\` تحتاج هذه الصلاحية حتى تستخدم الامر👀`)
        .setColor("#FF0000")
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const emoji = interaction.options.getString('emoji');
    let info = Discord.Util.parseEmoji(emoji);
    if (!info.id) {
      const embed = new MessageEmbed()
        .setTitle(language === 'english' ? `Delete Emoji` : `حذف ايموجي`)
        .setDescription(language === 'english' ? `**I can't find an emoji to delete🤔**` : `**لا يمكنني العثور على ايموجي لحذفه🤔**`)
        .setColor("#00FFFF")
      await interaction.reply({ embeds: [embed] });
      return;
    }

    let emj = interaction.guild.emojis.cache.find(e => e.name === info.name);
    if (!emj) {
      const embed = new MessageEmbed()
        .setTitle(language === 'english' ? `Delete Emoji` : `حذف ايموجي`)
        .setDescription(language === 'english' ? `The emoji ${emoji} is not found in the server❎` : `الايموجي ${emoji} غير موجود في السيرفر❎`)
        .setColor("#FF0000")
      await interaction.reply({ embeds: [embed] });
      return;
    }

    await emj.delete();
    const embed = new MessageEmbed()
      .setTitle(language === 'english' ? `Delete Emoji` : `حذف ايموجي`)
      .setDescription(language === 'english' ? `**Emoji has been deleted successfully✅ ${emj}**` : `**تم حذف الايموجي بنجاح ${emj}✅**`)
      .setColor("#00FFFF")
    await interaction.reply({ embeds: [embed] });
  }
});
  
client.on('messageCreate', async message => {
  if (message.content.startsWith(prefix + 'suggestemojis')) {
    if (!message.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_EMOJIS_AND_STICKERS)) {
      const embed = new MessageEmbed()
        .setDescription(language === 'english' ? `You do not have the required permission \`MANAGE_EMOJIS_AND_STICKERS\`. You need this permission to use this command👀` : `ليس لديك صلاحية \`MANAGE_EMOJIS_AND_STICKERS\` تحتاج هذه الصلاحية حتى تستخدم الامر👀`)
        .setColor("#FF0000")
      await message.reply({ embeds: [embed] });
      return;
    }

    let emojis = [];
    client.guilds.cache.forEach(guild => {
      guild.emojis.cache.forEach(emoji => {
        if (!emojis.includes(emoji) && !message.guild.emojis.cache.find(e => e.name === emoji.name)) {
          emojis.push(emoji);
        }
      });
    });

    emojis = emojis.sort(() => Math.random() - 0.5).slice(0, 5);
    suggestedEmojis = emojis;

    const language = serverLanguages.get(message.guild.id) || 'english';
    let reply = language === 'english' ? 'Here are 5 suggested emojis from different servers: ' : 'هذه 5 اقتراحات الايموجيات من سيرفرات مختلفة: ';
    emojis.forEach(emoji => {
      reply += `${emoji} `;
    });
    reply += language === 'english' ? '\nDo you want to add these emojis?' : '\nهل ترغب في إضافة هذه الايموجيات؟';

    // الرد الأولي
    await message.reply(reply);

    // تفاعل المستخدم مع الرد
    const filter = response => {
      return (response.content.toLowerCase() === 'yes' || response.content === 'نعم' || response.content.toLowerCase() === 'no' || response.content === 'لا') && response.author.id === message.author.id;
    };

    try {
      const collected = await message.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
      const response = collected.first();
      if (response.content.toLowerCase() === 'yes' || response.content === 'نعم') {
        suggestedEmojis.forEach(emoji => {
          if (!message.guild.emojis.cache.find(e => e.name === emoji.name)) {
            message.guild.emojis.create(emoji.url, emoji.name);
          }
        });
        await message.reply(language === 'english' ? 'The suggested emojis have been added successfully✅' : 'تمت إضافة الايموجيات المقترحة بنجاح✅');
      } else {
        await message.reply(language === 'english' ? 'The suggested emojis were not added❎' : 'لم يتم إضافة الايموجيات المقترحة❎');
      }
    } catch (error) {
      await message.reply(language === 'english' ? 'You did not respond in time.' : 'لم تقم بالرد في الوقت المحدد.');
    }
  }
});



client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  // تسجيل أمر suggestemojis
  const suggestEmojisCommand = {
    name: 'suggestemojis',
    description: 'Suggest emojis from other servers',
  };

  // تسجيل الأمر الجديد
  await client.application.commands.create(suggestEmojisCommand);

  console.log('Command /suggestemojis has been registered.');
});




// تأكد من أن الدالة التي تستخدم فيها 'await' هي دالة غير متزامنة
client.on('ready', async () => {
  const renameEmojiCommand = {
    name: 'rename_emoji',
    description: 'Rename an emoji in the server',
    options: [
      {
        name: 'emoji',
        type: 3,
        description: 'Choose the emoji you want to rename',
        required: true
      },
      {
        name: 'name',
        type: 3,
        description: 'The new name for the emoji',
        required: true
      }
    ]
  };

  // الآن يمكن استخدام 'await' بأمان داخل هذه الدالة
  await client.application.commands.create(renameEmojiCommand);

  client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    if (interaction.commandName === 'rename_emoji') {
      if (!interaction.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_EMOJIS_AND_STICKERS)) {
        const embed = new MessageEmbed()
          .setTitle(language === 'english' ? `Rename Emoji` : `تغيير اسم الايموجي`)
          .setDescription(language === 'english' ? `You do not have the required permission \`MANAGE_EMOJIS_AND_STICKERS\`. You need this permission to use this command👀` : `ليس لديك صلاحية \`MANAGE_EMOJIS_AND_STICKERS\` تحتاج هذه الصلاحية حتى تستخدم الامر👀`)
          .setColor("#FF0000")
        interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }
      const emoji = interaction.options.getString('emoji');
      const newName = interaction.options.getString('name');
      let info = Discord.Util.parseEmoji(emoji);
      if (!info.id) {
        const embed = new MessageEmbed()
          .setTitle(language === 'english' ? `Rename Emoji` : `تغيير اسم الايموجي`)
          .setDescription(language === 'english' ? `**I can't find an emoji to rename🤔**` : `**لا يمكنني العثور على الإيموجي لتغيير اسمه🤔**`)
          .setColor("#00FFFF")
        interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }
      let emj = interaction.guild.emojis.cache.find(e => e.name === info.name);
      if (!emj) {
        const embed = new MessageEmbed()
          .setTitle(language === 'english' ? `Rename Emoji` : `تغيير اسم الايموجي `)
          .setDescription(language === 'english' ? `**The emoji ${emoji} is not found in the server❎**` : `**الإيموجي ${emoji} غير موجود في الخادم❎**`)
          .setColor("#FF0000")
        interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }
      await emj.edit({ name: newName });
      const embed = new MessageEmbed()
        .setTitle(language === 'english' ? `Rename Emoji` : `تغيير اسم  الايموجي `)
        .setDescription(language === 'english' ? `**Emoji has been renamed successfully ${emj} ✅**` : `**تم تغيير اسم الإيموجي بنجاح ${emj} ✅**`)
        .setColor("#00FFFF")
      interaction.reply({ embeds: [embed] });
    }
  });
});



client.login(process.env.token)