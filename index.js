const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits
} = require('discord.js');

const fs = require('fs');

const OWNER_ID = '1510265566332452937';
const CONFIG_FILE = './tags.json';

// TAG STAFF YANG DIKUNCI
const LOCKED_STAFF_TAGS = {
  '1540309874603331624': '[ғᴀ]',
  '1540310498506047510': '[ᴍᴀ]',
  '1544640103186563082': '[ғᴅ]',
  '1535994489200451695': '[ᴄғ]',
  '1538789070082408448': '[ᴍᴏ]',
  '1535110644699762720': '[ᴍᴅ]'
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, '{}');
  }

  return JSON.parse(
    fs.readFileSync(CONFIG_FILE, 'utf8')
  );
}

function saveConfig(config) {
  fs.writeFileSync(
    CONFIG_FILE,
    JSON.stringify(config, null, 2)
  );
}

function getGuildConfig(config, guildId) {
  if (!config[guildId]) {
    config[guildId] = {
      tags: {},
      logChannelId: null
    };
  }

  return config[guildId];
}

function removeAllTags(name, guildConfig) {
  let cleanName = name;

  for (const roleId of Object.keys(guildConfig.tags)) {
    const tag = guildConfig.tags[roleId].tag;

    while (cleanName.startsWith(`${tag} `)) {
      cleanName = cleanName.slice(
        `${tag} `.length
      );
    }
  }

  return cleanName;
}

function getMemberTagRole(member, guildConfig) {
  const roles = Object.keys(guildConfig.tags);

  const activeRoles = roles
    .filter(roleId =>
      member.roles.cache.has(roleId)
    )
    .map(roleId =>
      member.guild.roles.cache.get(roleId)
    )
    .filter(Boolean)
    .sort((a, b) => b.position - a.position);

  if (activeRoles.length === 0) {
    return null;
  }

  return activeRoles[0].id;
}

async function updateMemberTag(member, guildConfig) {
  if (member.user.bot) return;

  const roleId =
    getMemberTagRole(member, guildConfig);

  const baseName = removeAllTags(
    member.nickname || member.user.username,
    guildConfig
  );

  let newName = baseName;

  if (roleId) {
    const tag =
      guildConfig.tags[roleId].tag;

    newName = `${tag} ${baseName}`;
  }

  if (member.nickname === newName) return;

  try {
    await member.setNickname(newName);
  } catch (error) {
    console.log(
      `Gagal mengubah nickname ${member.user.username}`
    );
  }
}

client.once('ready', () => {
  console.log(
    `AAC Tags aktif sebagai ${client.user.tag}`
  );
});

client.on(
  'interactionCreate',
  async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.guild) return;

    const config = loadConfig();

    const guildConfig =
      getGuildConfig(
        config,
        interaction.guild.id
      );

    // PREFIX ADD ROLES
    if (
      interaction.commandName ===
      'prefix-add-roles'
    ) {
      if (
        !interaction.memberPermissions.has(
          PermissionFlagsBits.ManageGuild
        )
      ) {
        return interaction.reply({
          content:
            'Lu nggak punya izin buat mengatur tag role.',
          ephemeral: true
        });
      }

      const role =
        interaction.options.getRole('role');

      const nama =
        interaction.options.getString('nama');

      // TAG STAFF TERKUNCI
      if (
        LOCKED_STAFF_TAGS[role.id] &&
        interaction.user.id !== OWNER_ID
      ) {
        return interaction.reply({
          content:
            `Tag role **${role.name}** dikunci dan cuma bisa diubah Owner AAC.`,
          ephemeral: true
        });
      }

      const lockedTag =
        LOCKED_STAFF_TAGS[role.id];

      guildConfig.tags[role.id] = {
        tag: lockedTag || nama
      };

      saveConfig(config);

      await interaction.deferReply();

      await interaction.guild.members.fetch();

      let updated = 0;

      for (
        const member
        of interaction.guild.members.cache.values()
      ) {
        if (member.user.bot) continue;

        if (
          member.roles.cache.has(role.id)
        ) {
          await updateMemberTag(
            member,
            guildConfig
          );

          updated++;
        }
      }

      return interaction.editReply(
        `Tag **${lockedTag || nama}** berhasil dipasang ke role **${role.name}**.\n\n` +
        `Member yang diproses: **${updated}**`
      );
    }

    // SET LOG
    if (
      interaction.commandName ===
      'prefix-set-log'
    ) {
      if (
        !interaction.memberPermissions.has(
          PermissionFlagsBits.ManageGuild
        )
      ) {
        return interaction.reply({
          content:
            'Lu nggak punya izin buat mengatur log.',
          ephemeral: true
        });
      }

      const channel =
        interaction.options.getChannel('channel');

      guildConfig.logChannelId =
        channel.id;

      saveConfig(config);

      return interaction.reply(
        `Channel log berhasil diatur ke ${channel}.`
      );
    }

    // CLEAR TAGS
    if (
      interaction.commandName ===
      'clear-tags'
    ) {
      if (
        !interaction.memberPermissions.has(
          PermissionFlagsBits.ManageGuild
        )
      ) {
        return interaction.reply({
          content:
            'Lu nggak punya izin buat menghapus tag.',
          ephemeral: true
        });
      }

      const configuredRoles =
        Object.keys(guildConfig.tags);

      if (
        configuredRoles.length === 0
      ) {
        return interaction.reply(
          'Belum ada role/tag yang terdaftar.'
        );
      }

      await interaction.deferReply({
        ephemeral: true
      });

      await interaction.guild.members.fetch();

      let roleRemoved = 0;
      let nicknameCleared = 0;

      for (
        const member
        of interaction.guild.members.cache.values()
      ) {
        if (member.user.bot) continue;

        for (
          const roleId
          of configuredRoles
        ) {
          if (
            member.roles.cache.has(roleId)
          ) {
            try {
              await member.roles.remove(
                roleId
              );

              roleRemoved++;
            } catch {}
          }
        }

        const cleanName =
          removeAllTags(
            member.nickname ||
            member.user.username,
            guildConfig
          );

        if (
          member.nickname &&
          cleanName !== member.nickname
        ) {
          try {
            await member.setNickname(
              cleanName
            );

            nicknameCleared++;
          } catch {}
        }
      }

      return interaction.editReply(
        `Selesai.\n\n` +
        `Role dihapus: **${roleRemoved}**\n` +
        `Nickname dibersihkan: **${nicknameCleared}**`
      );
    }
  }
);

// ROLE DITAMBAH / DIHAPUS
client.on(
  'guildMemberUpdate',
  async (oldMember, newMember) => {
    try {
      const config = loadConfig();

      const guildConfig =
        config[newMember.guild.id];

      if (!guildConfig) return;

      const configuredRoles =
        Object.keys(guildConfig.tags);

      if (
        configuredRoles.length === 0
      ) {
        return;
      }

      const addedRoles =
        configuredRoles.filter(roleId =>
          !oldMember.roles.cache.has(roleId) &&
          newMember.roles.cache.has(roleId)
        );

      const removedRoles =
        configuredRoles.filter(roleId =>
          oldMember.roles.cache.has(roleId) &&
          !newMember.roles.cache.has(roleId)
        );

      if (
        addedRoles.length === 0 &&
        removedRoles.length === 0
      ) {
        return;
      }

      let activeRoleId =
        getMemberTagRole(
          newMember,
          guildConfig
        );

      if (activeRoleId) {
        for (
          const roleId
          of configuredRoles
        ) {
          if (
            roleId === activeRoleId
          ) {
            continue;
          }

          if (
            newMember.roles.cache.has(roleId)
          ) {
            try {
              await newMember.roles.remove(
                roleId
              );
            } catch {}
          }
        }
      }

      activeRoleId =
        getMemberTagRole(
          newMember,
          guildConfig
        );

      await updateMemberTag(
        newMember,
        guildConfig
      );

      const logChannelId =
        guildConfig.logChannelId;

      if (!logChannelId) return;

      const logChannel =
        newMember.guild.channels.cache.get(
          logChannelId
        );

      if (!logChannel?.isTextBased()) return;

      // ACHIEVEMENT
      if (addedRoles.length > 0) {
        const achievementRoleId =
          addedRoles[0];

        const role =
          newMember.guild.roles.cache.get(
            achievementRoleId
          );

        const tag =
          guildConfig.tags[
            achievementRoleId
          ]?.tag;

        if (role && tag) {
          await logChannel.send(
            `🏆 **AAC ACHIEVEMENT**\n` +
            `**${newMember.user.username}** baru saja mendapatkan role **${role.name}**!\n\n` +
            `✦ Tag baru: \`${tag}\`\n` +
            `✦ Selamat atas pencapaiannya!\n\n` +
            `**Anime Arcadia Community**`
          );
        }

        return;
      }

      // ROLE DIHAPUS
      if (removedRoles.length > 0) {
        if (activeRoleId) {
          const role =
            newMember.guild.roles.cache.get(
              activeRoleId
            );

          const tag =
            guildConfig.tags[
              activeRoleId
            ]?.tag;

          if (role && tag) {
            await logChannel.send(
              `**AAC Tags Log**\n` +
              `Member: ${newMember}\n` +
              `Role aktif: **${role.name}**\n` +
              `Tag: **${tag}**`
            );
          }
        } else {
          await logChannel.send(
            `**AAC Tags Log**\n` +
            `Member: ${newMember}\n` +
            `Semua role tag dihapus.\n` +
            `Tag nickname ikut dihapus.`
          );
        }
      }

    } catch (error) {
      console.error(
        'Gagal memproses perubahan role:',
        error
      );
    }
  }
);

client.login(
   'process.env.DISCORD_TOKEN'

);

