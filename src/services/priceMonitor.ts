// src/services/priceMonitor.ts

import {
  EmbedBuilder,
  type TextChannel,
  type Client
} from 'discord.js';

import { prisma } from '../database/prisma.js';

let lastCheckedUpdatedAt: number | null = null;

export async function startPriceMonitor(client: Client) {

  const CHANNEL_ID = '1504186411471999227';

  console.log('👀 [MONITOR] Iniciando serviço de vigilância...');

  setInterval(async () => {

    try {

      console.log('🔍 [MONITOR] Verificando novos preços...');

      const latestPrice = await prisma.price.findFirst({
        orderBy: {
          updatedAt: 'desc'
        },
        include: {
          Item: true
        }
      });

      // SEM RESULTADO
      if (!latestPrice) {
        console.log('⚠️ [MONITOR] Nenhum preço encontrado.');
        return;
      }

      // SEM ITEM
      if (!latestPrice.Item) {
        console.log('⚠️ [MONITOR] Item relacionado não encontrado.');
        return;
      }

      const currentUpdatedAt = latestPrice.updatedAt.getTime();

      // PRIMEIRA EXECUÇÃO
      if (lastCheckedUpdatedAt === null) {

        lastCheckedUpdatedAt = currentUpdatedAt;

        console.log(
          `✅ [MONITOR] Sincronizado no item: ${latestPrice.Item.name}`
        );

        return;
      }

      console.log(
        `📊 Banco: ${currentUpdatedAt} | Cache: ${lastCheckedUpdatedAt}`
      );

      // NOVA ALTERAÇÃO
      if (currentUpdatedAt !== lastCheckedUpdatedAt) {

        console.log(
          `🚀 [MONITOR] Novo valor detectado: ${latestPrice.Item.name}`
        );

        lastCheckedUpdatedAt = currentUpdatedAt;

        // CANAL
        const channel = await client.channels.fetch(CHANNEL_ID) as TextChannel;

        if (!channel) {
          console.log('❌ [MONITOR] Canal não encontrado.');
          return;
        }

        // IMAGEM DO ITEM
        const furniClass = latestPrice.Item.code.trim();

        const isExternalUrl =
          latestPrice.Item.imageUrl &&
          latestPrice.Item.imageUrl.startsWith('http');

        const imageUrl = isExternalUrl
          ? latestPrice.Item.imageUrl
          : `https://www.habbo.com/habbo-imaging/furni?type=furni&class=${furniClass}`;

        console.log(`🖼️ [MONITOR] Imagem usada: ${imageUrl}`);

        // EMBED
        const embed = new EmbedBuilder()
          .setAuthor({
            name: 'LivePixel Tracker',
            iconURL:
              'https://www.habbo.com/habbo-imaging/avatarimage?figure=hr-100.hd-180-1.ch-210-66.lg-270-82&size=s'
          })
          .setTitle('🆕 Novo Valor Detectado!')
          .setDescription(
            `O item **${latestPrice.Item.name}** foi atualizado no catálogo do LivePixel.`
          )
          .setColor('#f1c40f')

          // IMAGEM GRANDE
          .setImage(imageUrl)

          // MINIATURA
          .setThumbnail(imageUrl)

          .addFields(
            {
              name: '💰 Valor',
              value: `**${Number(latestPrice.value).toLocaleString('pt-BR')} Pixels**`,
              inline: true
            },
            {
              name: '📦 Código',
              value: latestPrice.Item.code,
              inline: true
            },
            {
              name: '📂 Categoria',
              value: latestPrice.Item.category,
              inline: true
            },
            {
              name: '🆔 Item ID',
              value: latestPrice.Item.id,
              inline: false
            },
            {
              name: '🔗 Site',
              value: '[Abrir LiveInfo](https://liveinfo.online)',
              inline: false
            }
          )
          .setFooter({
            text: 'LivePixel Mainframe • Monitor de Catálogo'
          })
          .setTimestamp();

        // ENVIA
        await channel.send({
          embeds: [embed]
        });

        console.log('📢 [MONITOR] Embed enviado com sucesso!');
      } else {

        console.log('😴 [MONITOR] Nenhuma alteração detectada.');
      }

    } catch (error) {

      console.error(
        '❌ [MONITOR] Erro durante monitoramento:',
        error
      );
    }

  }, 15000);
}