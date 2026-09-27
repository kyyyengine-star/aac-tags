const {
  REST,
  Routes,
  SlashCommandBuilder,
  ChannelType
} = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('prefix-add-roles')
    .setDescription('Menambahkan tag nickname untuk sebuah role')
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('Pilih role yang ingin diberi tag')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('nama')
        .setDescription('Masukkan tag nickname, contoh: [ʟɢᴅ]')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('prefix-set-log')
    .setDescription('Mengatur channel log nickname')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('Pilih channel untuk log')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('clear-tags')
    .setDescription('Menghapus semua tag AAC Tags dari nickname member')
].map(command => command.toJSON());

const rest = new REST({ version: '10' })
  .setToken('process.env.DISCORD_TOKEN');

(async () => {
  try {
    console.log('Mendaftarkan slash command global...');

    await rest.put(
      Routes.applicationCommands('1553780484549513278'),
      { body: commands }
    );

    console.log('Slash command global berhasil didaftarkan.');
  } catch (error) {
    console.error(error);
  }
})();
