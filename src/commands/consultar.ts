import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { prisma } from '../database/prisma.js';

export const data = new SlashCommandBuilder()
  .setName('consultar')
  .setDescription('Consulta o valor de um raro no Mainframe')
  .addStringOption(option =>
    option.setName('nome')
      .setDescription('Nome do raro que você deseja consultar')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const nomeItem = interaction.options.getString('nome') || '';

  try {
    // Busca no banco de dados do Render (livedb_164b)
    const item = await prisma.item.findFirst({
      where: {
        name: { 
          contains: nomeItem, 
          mode: 'insensitive' 
        }
      },
      include: {
        Price: { 
          orderBy: { 
            updatedAt: 'desc' 
          }, 
          take: 1 
        }
      }
    });

    // Caso o item não exista no banco
    if (!item) {
      return interaction.reply({ 
        content: `❌ O item **${nomeItem}** não foi encontrado no LivePixel.`, 
        flags: [MessageFlags.Ephemeral] 
      });
    }

    // Extrai o valor do array Price (pega o primeiro ou define como 0)
    const precoAtual = item.Price && item.Price.length > 0 
      ? item.Price[0].value 
      : 0;

    /**
     * TRATAMENTO DE IMAGEM (Anti-Base64)
     * O Discord não aceita Base64 no .setThumbnail(). 
     * Se a imagem no banco começar com "data:", usamos a URL oficial do Habbo.
     */
    const isExternalUrl = item.imageUrl && item.imageUrl.startsWith('http');
    
    const thumbUrl = isExternalUrl 
      ? item.imageUrl 
      : `https://www.habbo.com.br/habbo-imaging/furni?type=furni&class=${item.code}`;

    const embed = new EmbedBuilder()
      .setTitle(`💎 ${item.name}`)
      .setColor('#2b8cff')
      .setThumbnail(thumbUrl)
      .addFields(
        { 
          name: '💰 Valor Atual', 
          value: `**${Number(precoAtual).toLocaleString('pt-BR')} Pixels**`, 
          inline: true 
        },
        { 
          name: '📝 Classname', 
          value: `\`${item.code}\``, 
          inline: true 
        }
      )
      .setFooter({ text: 'LivePixel — Sincronizado com o Mainframe' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

  } catch (error) {
    console.error('Erro ao consultar item:', error);
    await interaction.reply({ 
      content: '❌ Ocorreu um erro ao acessar o banco de dados do Mainframe.', 
      flags: [MessageFlags.Ephemeral] 
    });
  }
}