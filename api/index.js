const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const { MercadoPagoConfig, Payment } = require("mercadopago");

const app = express();
const corsOptions = {
  origin: "https://cardapio-victor-hugo.vercel.app",
  methods: ["GET", "POST"],
};

app.use(cors(corsOptions));
app.use(express.json());

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});
const payment = new Payment(client);

// Limita quantas vezes um mesmo IP pode gerar cobranças Pix
const createPixLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // janela de 10 minutos
  max: 10, // no máximo 10 pedidos de Pix por IP nesse período
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.",
  },
});

// Limita consultas de status de pagamento (o polling do front-end já chama isso a cada 3s)
const checkPaymentLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // janela de 1 minuto
  max: 30, // até 30 checagens por minuto por IP (dá folga pro polling normal)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas verificações de pagamento. Aguarde um momento." },
});

// Tabela de preços blindada no servidor
const PRICING = {
  base: 25.0,
  premium: 30.0,
  deliveryFee: 10.0,
};

// Guarda os IDs de pagamento já notificados nesta execução
const processedPayments = new Set();

// Valida se a notificação realmente veio do Mercado Pago
function isValidMPSignature(req) {
  const signatureHeader = req.headers["x-signature"];
  const requestId = req.headers["x-request-id"];
  const secret = process.env.MP_WEBHOOK_SECRET;

  if (!signatureHeader || !requestId || !secret) {
    return false;
  }

  // x-signature vem no formato: "ts=1704908010,v1=618c8534..."
  const parts = signatureHeader.split(",").reduce((acc, part) => {
    const [key, value] = part.split("=");
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
  }, {});

  const ts = parts["ts"];
  const receivedHash = parts["v1"];

  if (!ts || !receivedHash) return false;

  // O dataId precisa vir da query string (?data.id=XXXX), como o MP envia
  const dataId = (req.query["data.id"] || "").toLowerCase();

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;

  const computedHash = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  // Comparação segura contra timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(computedHash, "hex"),
    Buffer.from(receivedHash, "hex"),
  );
}

// Escapa caracteres especiais do Markdown (legado) do Telegram
function escapeTelegramMarkdown(text) {
  if (typeof text !== "string") return text;
  return text.replace(/([_*`\[])/g, "\\$1");
}

// ROTA 1: Criar Cobrança Pix
app.post("/api/create-pix", createPixLimiter, async (req, res) => {
  try {
    const { cartItems, deliveryMode, customerName, customerAddress } = req.body;

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res
        .status(400)
        .json({ error: "O carrinho está vazio ou em formato inválido." });
    }

    let serverCalculatedTotal = 0;
    let itemsDescription = [];

    cartItems.forEach((item) => {
      const safeQtd = Math.max(1, Math.floor(Number(item.qtd)) || 1);
      const itemId = typeof item.id === "string" ? item.id : "";
      const isPremium = itemId.includes("nutella");
      const itemPrice = isPremium ? PRICING.premium : PRICING.base;

      serverCalculatedTotal += itemPrice * safeQtd;
      itemsDescription.push(`${safeQtd}x ${item.name || "Balde"}`);
    });

    if (deliveryMode === "delivery") {
      serverCalculatedTotal += PRICING.deliveryFee;
    }

    // Salva os dados do pedido nos metadados do Mercado Pago
    const response = await payment.create({
      body: {
        transaction_amount: serverCalculatedTotal,
        description: "Pedido - Cardápio do Vitinho",
        payment_method_id: "pix",
        payer: {
          email: "cliente@email.com",
          first_name: customerName || "Cliente",
        },
        metadata: {
          customer_name: customerName || "Cliente",
          customer_address: customerAddress || "Não informado / Retirada",
          delivery_mode: deliveryMode,
          order_items: itemsDescription.join("\n"),
        },
      },
    });

    const pixData = response.point_of_interaction.transaction_data;

    res.json({
      paymentId: response.id,
      qrCodeBase64: pixData.qr_code_base64,
      qrCodeCopyPaste: pixData.qr_code,
      safeTotal: serverCalculatedTotal,
    });
  } catch (error) {
    console.error("Erro ao gerar Pix:", error);
    res.status(500).json({ error: "Falha ao gerar cobrança Pix" });
  }
});

// ROTA 2: Checagem de status
app.get("/api/check-payment/:id", checkPaymentLimiter, async (req, res) => {
  try {
    const paymentId = req.params.id;
    const response = await payment.get({ id: paymentId });

    res.json({ status: response.status });
  } catch (error) {
    console.error("Erro ao verificar pagamento:", error);
    res.status(500).json({ error: "Erro ao consultar status" });
  }
});

// ROTA 3: Webhook + Notificação do Telegram
app.post("/api/webhook", async (req, res) => {
  try {
    // 1) Valida a assinatura antes de confiar em qualquer coisa do corpo
    if (!isValidMPSignature(req)) {
      console.warn(
        "[WEBHOOK] Assinatura inválida ou ausente. Requisição ignorada.",
      );
      return res.status(401).send("Assinatura inválida");
    }

    const paymentId = req.body?.data?.id || req.query["data.id"];
    const type = req.body?.type || req.query?.type;

    if (
      paymentId &&
      (type === "payment" || req.body?.action === "payment.updated")
    ) {
      // 2) Evita processar o mesmo pagamento duas vezes
      if (processedPayments.has(paymentId)) {
        console.log(
          `[WEBHOOK] Pagamento ID ${paymentId} já processado anteriormente. Ignorando.`,
        );
        return res.status(200).send("OK");
      }

      const paymentData = await payment.get({ id: paymentId });
      const status = paymentData.status;

      console.log(
        `[WEBHOOK] Pagamento ID ${paymentId} atualizado para: ${status}`,
      );

      if (status === "approved") {
        processedPayments.add(paymentId); // marca como processado

        const metadata = paymentData.metadata || {};
        const customerName = escapeTelegramMarkdown(
          metadata.customer_name || "Cliente",
        );
        const customerAddress = escapeTelegramMarkdown(
          metadata.customer_address || "Não informado",
        );
        const deliveryMode =
          metadata.delivery_mode === "delivery"
            ? "Entrega Padrão (+ R$ 10,00)"
            : "Retirada no Local";
        const orderItems = escapeTelegramMarkdown(
          metadata.order_items || "Itens não especificados",
        );
        const totalAmount = paymentData.transaction_amount || 0;
        const telegramMessage =
          `🚨 *NOVO PEDIDO CONFIRMADO (PIX)* 🚨\n\n` +
          `👤 *Cliente:* ${customerName}\n` +
          `🛵 *Modo:* ${deliveryMode}\n` +
          (metadata.delivery_mode === "delivery"
            ? `📍 *Endereço:* ${customerAddress}\n`
            : "") +
          `\n📦 *ITENS DO PEDIDO:*\n${orderItems}\n\n` +
          `💰 *VALOR PAGO:* R$ ${totalAmount.toFixed(2).replace(".", ",")}\n` +
          `🆔 *ID Pagamento:* \`${paymentId}\``;

        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        if (botToken && chatId) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: telegramMessage,
              parse_mode: "Markdown",
            }),
          });
          console.log("[TELEGRAM] Notificação enviada com sucesso!");
        }
      }
    }

    return res.status(200).send("OK");
  } catch (error) {
    console.error("Erro ao processar Webhook:", error);
    return res.status(200).send("OK");
  }
});

// O module.exports precisa estar na última linha
module.exports = app;
