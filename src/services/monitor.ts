import { EmbedBuilder, type TextChannel, type Client } from 'discord.js';
import { prisma } from '../database/prisma.js';

let lastCheckedId: number | null = null;

export async function startPriceMonitor(client: Client) {
    const CHANNEL_ID = '1502045076598292543';

    console.log('👀 [MONITOR] Iniciando serviço de vigilância...');

    setInterval(async () => {
        try {
            // Log para confirmar que o setInterval está batendo no banco
            console.log('🔍 [MONITOR] Verificando novos preços no banco livedb_164b...');

            const latestPrice = await prisma.Price.findFirst({
                orderBy: { createdAt: 'desc' },
                include: { item: true }
            });

            if (!latestPrice) {
                console.log('⚠️ [MONITOR] Nenhum registro encontrado na tabela Price.');
                return;
            }

            if (!latestPrice.item) {
                console.log(`⚠️ [MONITOR] Preço ID ${latestPrice.id} encontrado, mas sem item relacionado.`);
                return;
            }

            // Sincronização inicial
            if (lastCheckedId === null) {
                lastCheckedId = latestPrice.id;
                console.log(`✅ [MONITOR] Sincronizado! Começando a vigiar a partir do ID: ${lastCheckedId} (${latestPrice.item.name})`);
                return;
            }

            // Verificação de mudança
            console.log(`📊 [MONITOR] Último ID no Banco: ${latestPrice.id} | Cache Local: ${lastCheckedId}`);

            if (latestPrice.id !== lastCheckedId) {
                console.log(`🚀 [MONITOR] NOVO POST DETECTADO: ${latestPrice.item.name} (ID: ${latestPrice.id})`);
                
                lastCheckedId = latestPrice.id;

                const channel = await client.channels.fetch(CHANNEL_ID) as TextChannel;
                if (!channel) {
                    console.error('❌ [MONITOR] Erro crítico: Canal de texto não encontrado.');
                    return;
                }

                // Tratamento de Imagem
                const isExternalUrl = latestPrice.item.imageUrl && latestPrice.item.imageUrl.startsWith('http');
                const thumbUrl = isExternalUrl 
                    ? latestPrice.item.imageUrl 
                    : `https://www.habbo.com.br/habbo-imaging/furni?type=furni&class=${latestPrice.item.code}`;

                const embed = new EmbedBuilder()
                    .setTitle('🆕 Novo Valor Detectado!')
                    .setDescription(`O item **${latestPrice.item.name}** foi atualizado no catálogo.`)
                    .setColor('#f1c40f')
                    .setThumbnail(thumbUrl)
                    .addFields(
                        { name: '💰 Valor', value: `**${Number(latestPrice.value).toLocaleString('pt-BR')} Pixels**`, inline: true },
                        { name: '🔗 Link', value: '[Ver no Site](https://liveinfo.online)', inline: true }
                    )
                    .setFooter({ text: 'LivePixel Mainframe' })
                    .setTimestamp();

                await channel.send({ embeds: [embed] });
                console.log(`📢 [MONITOR] Embed enviado com sucesso para o canal ${CHANNEL_ID}`);
            } else {
                console.log('😴 [MONITOR] Nenhuma alteração detectada desde a última checagem.');
            }
        } catch (error) {
            console.error('❌ [MONITOR] Erro durante a execução do loop:', error);
        }
    }, 15000); // Checagem a cada 15 segundos
}