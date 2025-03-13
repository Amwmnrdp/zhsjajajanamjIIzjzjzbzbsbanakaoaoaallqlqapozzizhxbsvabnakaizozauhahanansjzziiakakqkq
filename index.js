const express = require('express');
const app = express();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Discord = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping
    ],
    partials: [
        Discord.Partials.Message,
        Discord.Partials.Channel,
        Discord.Partials.GuildMember,
        Discord.Partials.Reaction,
        Discord.Partials.User
    ],
});




const usedServers = [];
client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  
  const note = {
    name: 'note',
    description: 'Send a note to a specific channel',
    options: [
      {
        type: 3, 
        name: 'channel',
        description: 'The channel to send the note to',
        required: true,
      }
    ],
  }

  
  // إنشاء سلاش كوماند جديد
   await client.application.commands.create(note);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  // التحقق من أن الأمر هو /note
  if (interaction.commandName === 'note') {
    // التحقق مما إذا كان العضو هو مالك السيرفر
    if (interaction.member.id !== interaction.guild.ownerId) {
      // إذا لم يكن العضو مالك السيرفر، أرسل رسالة خطأ
      const embed = new MessageEmbed()
        .setTitle(language === 'english' ? `Note` : `ملاحظة`)
        .setDescription('This command can only be used by the server owner!')
        .setColor("#00FFFF")
      await interaction.reply({ embeds: [embed] });
      return;
    }

    // التحقق مما إذا كان الأمر قد تم استخدامه في هذا السيرفر من قبل
    if (usedServers.includes(interaction.guildId)) {
      // إذا تم استخدام الأمر من قبل، أرسل رسالة خطأ
      const embed = new MessageEmbed()
        .setTitle(language === 'english' ? `Note` : `ملاحظة`)
        .setDescription('This command can only be used once per server!')
        .setColor("#00FFFF")
      await interaction.reply({ embeds: [embed] });
      return;
    }

    // إضافة السيرفر إلى قائمة السيرفرات التي تم استخدام الأمر فيها
    usedServers.push(interaction.guildId);

    // احصل على القناة المحددة من خيارات الأمر
    const channel = interaction.options.getChannel('channel');
    // إذا تم تحديد قناة، أرسل الرسالة المحددة فيها
    if (channel) {
      const embed = new MessageEmbed()
        .setTitle(language === 'english' ? `Note` : `ملاحظة`)
        .setDescription('Note: The bot may suggest emojis from this server Nothing harmful will happen Do not worry                       \nملاحظة: قد يقترح البوت ايموجيات من هذا السيرفر ولكن لن يحدث شيء ضار لا داعي للقلق')
        .setColor("#00FFFF")
      channel.send({ embeds: [embed] });
      await interaction.reply('Note sent successfully!');
    } else {
      const embed = new MessageEmbed()
        .setTitle(language === 'english' ? `Note` : `ملاحظة`)
        .setDescription('An error occurred while sending the note. Please try again.')
        .setColor("#FF0000")
      await interaction.reply({ embeds: [embed] });
    }
  }
});

  


const serverLanguages = new Map();
let language = 'english';

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


client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'language') {
    if (!interaction.member.permissions.has(Discord.Permissions.FLAGS.ADMINISTRATOR)) {
      const language = serverLanguages.get(interaction.guild.id) || 'english';
      const embed = new MessageEmbed()
        .setDescription(language === 'english' ? `You do not have the required permission \`ADMINISTRATOR\`. You need this permission to use this command👀` : `ليس لديك صلاحية \`ADMINISTRATOR\` تحتاج هذه الصلاحية حتى تستخدم الامر👀`)
        .setColor("#FF0000")
      interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }
    const embed = new MessageEmbed()
      .setTitle('اختار اللغة-Choose the language ')
      .setColor('#00FFFF')
      .setDescription('اختار اللغة التي تريد استخدامها------Choose the language you want to use ')
      .addFields(
        { name: 'عربي', value: 'اضغط على 🇦 للاختيار', inline: true },
        { name: 'English', value: 'Click on 🇺🇸 to select', inline: true }
      );
    interaction.reply({ embeds: [embed] }).then(async () => {
      const sentMessage = await interaction.fetchReply();
      sentMessage.react('🇦');
      sentMessage.react('🇺🇸');
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
        .catch(collected => {
          const language = serverLanguages.get(interaction.guild.id) || 'english';
          interaction.followUp(language === 'english' ? 'You did not choose a language in the allotted time' : 'لم تقم باختيار اللغة في الوقت المحدد');
        });
    });
  }
});


let suggestedEmojis = [];

client.on('messageCreate', message => {
  if (message.content === prefix + 'suggestemojis') {
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
    message.channel.send(reply);
  } else if (message.content === 'نعم' || message.content.toLowerCase() === 'yes') {
    if (suggestedEmojis.length > 0) {
      suggestedEmojis.forEach(emoji => {
        if (!message.guild.emojis.cache.find(e => e.name === emoji.name)) {
          message.guild.emojis.create(emoji.url, emoji.name);
        }
      });
      const language = serverLanguages.get(message.guild.id) || 'english';
      message.channel.send(language === 'english' ? 'The suggested emojis have been added successfully✅' : 'تمت إضافة الايموجيات المقترحة بنجاح✅');
      suggestedEmojis = [];
    }
  } else if (message.content === 'لا' || message.content.toLowerCase() === 'no') {
    if (suggestedEmojis.length > 0) {
      const language = serverLanguages.get(message.guild.id) || 'english';
      message.channel.send(language === 'english' ? 'The suggested emojis were not added❎' : 'لم يتم إضافة الايموجيات المقترحة❎');
      suggestedEmojis = [];
    }
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'suggestemojis') {
    if (!interaction.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_EMOJIS_AND_STICKERS)) {
      interaction.reply({ content: "❌", ephemeral: true });
      return;
    }
    let emojis = [];
    client.guilds.cache.forEach(guild => {
      guild.emojis.cache.forEach(emoji => {
        if (!emojis.includes(emoji) && !interaction.guild.emojis.cache.find(e => e.name === emoji.name)) {
          emojis.push(emoji);
        }
      });
    });
    emojis = emojis.sort(() => Math.random() - 0.5).slice(0, 5);
    suggestedEmojis = emojis;
    const language = serverLanguages.get(interaction.guild.id) || 'english';
    let reply = language === 'english' ? 'Here are 5 suggested emojis from different servers: ' : 'هذه 5 اقتراحات الايموجيات من سيرفرات مختلفة: ';
    emojis.forEach(emoji => {
      reply += `${emoji} `;
    });
    reply += language === 'english' ? '\nDo you want to add these emojis?' : '\nهل ترغب في إضافة هذه الايموجيات؟';
    interaction.reply(reply);
  }
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



client.login(process.env.token);