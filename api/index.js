const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Payment } = require('mercadopago');

const app = express();
app.use(cors());
app.use(express.json());

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN 
});
const payment = new Payment(client);

// Tabela de preços blindada no servidor
const PRICING = {
  base: 25.00,
  premium: 30.00,
  deliveryFee: 10.00
};

// ROTA 1: Criar Cobrança Pix
app.post('/api/create-pix', async (req, res) => {
  try {
    const { cartItems, deliveryMode, customerName, customerAddress } = req.body;

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ error: 'O carrinho está vazio ou em formato inválido.' });
    }

    let serverCalculatedTotal = 0;
    let itemsDescription = [];

    cartItems.forEach(item => {
      const safeQtd = Math.max(1, Math.floor(Number(item.qtd)) || 1);
      const itemId = typeof item.id === 'string' ? item.id : '';
      const isPremium = itemId.includes('nutella');
      const itemPrice = isPremium ? PRICING.premium : PRICING.base;

      serverCalculatedTotal += (itemPrice * safeQtd);
      itemsDescription.push(`${safeQtd}x ${item.name || 'Balde'}`);
    });

    if (deliveryMode === 'delivery') {
      serverCalculatedTotal += PRICING.deliveryFee;
    }

    // Salva os dados do pedido dentro dos metadados do pagamento do Mercado Pago
    const response = await payment.create({
      body: {
        transaction_amount: serverCalculatedTotal, 
        description: 'Pedido - Cardápio do Vitinho',
        payment_method_id: 'pix',
        payer: {
          email: 'cliente@email.com',
          first_name: customerName || 'Cliente'
        },
        metadata: {
          customer_name: customerName || 'Cliente',
          customer_address: customerAddress || 'Não informado / Retirada',
          delivery_mode: deliveryMode,
          order_items: itemsDescription.join('\n')
        }
      }
    });

    const pixData = response.point_of_interaction.transaction_data;

    res.json({
      paymentId: response.id,
      qrCodeBase64: pixData.qr_code_base64,
      qrCodeCopyPaste: pixData.qr_code,
      safeTotal: serverCalculatedTotal 
    });
  } catch (error) {
    console.error('Erro ao gerar Pix:', error);
    res.status(500).json({ error: 'Falha ao gerar cobrança Pix' });
  }
});

// ROTA 2: Checagem manual de status
app.get('/api/check-payment/:id', async (req, res) => {
  try {
    const paymentId = req.params.id;
    const response = await payment.get({ id: paymentId });

    res.json({ status: response.status });
  } catch (error) {
    console.error('Erro ao verificar pagamento:', error);
    res.status(500).json({ error: 'Erro ao consultar status' });
  }
});

// ROTA 3: Webhook + Disparo automático para o Telegram
app.post('/api/webhook', async (req, res) => {
  try {
    const paymentId = req.body?.data?.id || req.query['data.id'];
    const type = req.body?.type || req.query?.type;

    if (paymentId && (type === 'payment' || req.body?.action === 'payment.updated')) {
      const paymentData = await payment.get({ id: paymentId });
      const status = paymentData.status;

      console.log(`[WEBHOOK] Pagamento ID ${paymentId} atualizado para: ${status}`);

      if (status === 'approved') {
        const metadata = paymentData.metadata || {};
        const customerName = metadata.customer_name || 'Cliente';
        const customerAddress = metadata.customer_address || 'Não informado';
        const deliveryMode = metadata.delivery_mode === 'delivery' ? 'Entrega Padrão (+ R$ 10,00)' : 'Retirada no Local';
        const orderItems = metadata.order_items || 'Itens não especificados';
        const totalAmount = paymentData.transaction_amount || 0;

        // Monta a mensagem formatada para o Telegram
        const telegramMessage = 
          `🚨 *NOVO PEDIDO CONFIRMADO (PIX)* 🚨\n\n` +
          `👤 *Cliente:* ${customerName}\n` +
          `🛵 *Modo:* ${deliveryMode}\n` +
          (metadata.delivery_mode === 'delivery' ? `📍 *Endereço:* ${customerAddress}\n` : '') +
          `\n📦 *ITENS DO PEDIDO:*\n${orderItems}\n\n` +
          `💰 *VALOR PAGO:* R$ ${totalAmount.toFixed(2).replace('.', ',')}\n` +
          `🆔 *ID Pagamento:* \`${paymentId}\``;

        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        if (botToken && chatId) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: telegramMessage,
              parse_mode: 'Markdown'
            })
          });
          console.log('[TELEGRAM] Notificação enviada com sucesso!');
        }
      }
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('Erro ao processar Webhook:', error);
    return res.status(200).send('OK');
  }
});

module.exports = app;
