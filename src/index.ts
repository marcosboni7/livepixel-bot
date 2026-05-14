// src/index.ts

import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  Events,
  type RESTPostAPIChatInputApplicationCommandsJSONBody
} from 'discord.js';

import * as consultarCommand from './commands/consultar.js';
import { prisma } from './database/prisma.js';
import { startPriceMonitor } from './services/priceMonitor.js';

// CONFIG
const CLIENT_ID = '1504479793276784702';
const GUILD_ID = '804798915139731496';
const CHANNEL_ID = '1504186411471999227';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// COMANDOS
const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

if (consultarCommand.data) {
  commands.push(consultarCommand.data.toJSON());
}

// BOT ONLINE
client.once(Events.ClientReady, async (c) => {
  console.log(`🤖 LivePixel-Bot online como ${c.user.tag}`);

  // INICIA MONITOR
  startPriceMonitor(client);

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

  try {
    console.log('⌛ Registrando comandos no servidor específico...');

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log(`✅ Comandos sincronizados no servidor ${GUILD_ID}!`);

    // MENSAGEM DE BOOT
    const channel = await client.channels.fetch(CHANNEL_ID);

    if (channel?.isTextBased()) {
      await channel.send(
        '🚀 **LivePixel-Bot Conectado ao Mainframe!**\nUse `/consultar` para ver valores do catálogo.'
      );
    }

  } catch (error) {
    console.error('❌ Erro ao registrar comandos:', error);
  }
});

// SLASH COMMANDS
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'consultar') {
    try {
      await consultarCommand.execute(interaction);
    } catch (error) {
      console.error('Erro na execução do comando:', error);

      if (!interaction.replied) {
        await interaction.reply({
          content: 'Houve um erro ao consultar o banco!',
          ephemeral: true
        });
      }
    }
  }
});

// CONEXÃO BANCO
console.log('📦 Conectando ao banco livedb_164b...');

prisma.$connect()
  .then(async () => {
    console.log('✅ Banco de dados conectado com sucesso!');

    await client.login(process.env.DISCORD_TOKEN);
  })
  .catch((err) => {
    console.error('❌ Falha crítica ao conectar no banco:', err);
    process.exit(1);
  });