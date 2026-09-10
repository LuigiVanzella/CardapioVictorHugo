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

app.post('/api/create-pix', async (req, res) => {
  try {
    const { cartItems, deliveryMode, customerName } = req.body;

    // ALTERAÇÃO 1: Impede requisições com carrinho vazio ou em formato inválido
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ error: 'O carrinho está vazio ou em formato inválido.' });
    }

    let serverCalculatedTotal = 0;

    // ALTERAÇÃO 2: Sanitização estrita de quantidade e ID contra injeções
    cartItems.forEach(item => {
      // Força a quantidade a ser estritamente um inteiro maior ou igual a 1
      const safeQtd = Math.max(1, Math.floor(Number(item.qtd)) || 1);
      
      // Valida o ID para evitar erros de tipo
      const itemId = typeof item.id === 'string' ? item.id : '';
      const isPremium = itemId.includes('nutella');
      const itemPrice = isPremium ? PRICING.premium : PRICING.base;

      serverCalculatedTotal += (itemPrice * safeQtd);
    });

    if (deliveryMode === 'delivery') {
      serverCalculatedTotal += PRICING.deliveryFee;
    }

    const response = await payment.create({
      body: {
        transaction_amount: serverCalculatedTotal, 
        description: 'Pedido - Cardápio do Vitinho',
        payment_method_id: 'pix',
        payer: {
          email: 'cliente@email.com',
          first_name: customerName || 'Cliente'
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

module.exports = app;
