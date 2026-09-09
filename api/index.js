const express = require("express");
const cors = require("cors");
const { MercadoPagoConfig, Payment } = require("mercadopago");

const app = express();
app.use(cors());
app.use(express.json());

// Token puxado de forma segura das variáveis de ambiente do Vercel
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});
const payment = new Payment(client);

// ROTA 1: Gerar Cobrança Pix
app.post("/api/create-pix", async (req, res) => {
  try {
    const { amount, customerName } = req.body;

    const response = await payment.create({
      body: {
        transaction_amount: Number(amount),
        description: "Pedido - Cardápio do Vitinho",
        payment_method_id: "pix",
        payer: {
          email: "cliente@email.com",
          first_name: customerName || "Cliente",
        },
      },
    });

    const pixData = response.point_of_interaction.transaction_data;

    res.json({
      paymentId: response.id,
      qrCodeBase64: pixData.qr_code_base64,
      qrCodeCopyPaste: pixData.qr_code,
    });
  } catch (error) {
    console.error("Erro ao gerar Pix:", error);
    res.status(500).json({ error: "Falha ao gerar cobrança Pix" });
  }
});

// ROTA 2: Verificar Status do Pagamento
app.get("/api/check-payment/:id", async (req, res) => {
  try {
    const paymentId = req.params.id;
    const response = await payment.get({ id: paymentId });

    res.json({ status: response.status });
  } catch (error) {
    console.error("Erro ao verificar pagamento:", error);
    res.status(500).json({ error: "Erro ao consultar status" });
  }
});

// Exporta o app para o Vercel transformar em Serverless Function
module.exports = app;
