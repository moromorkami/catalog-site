type OrderTelegramPayload = {
  orderId: string;
  productId: string;
  productTitle: string;
  qty: number;
  customerName: string;
  contact: string;
  note: string | null;
  createdAtIso: string;
};

function readTelegramConfig() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!botToken || !chatId) {
    return null;
  }

  return { botToken, chatId };
}

function buildMessage(payload: OrderTelegramPayload) {
  const lines = [
    "New order request",
    `Order ID: ${payload.orderId}`,
    `Product: ${payload.productTitle}`,
    `Product ID: ${payload.productId}`,
    `Qty: ${payload.qty}`,
    `Name: ${payload.customerName}`,
    `Phone/Telegram: ${payload.contact}`,
    `Created: ${payload.createdAtIso}`,
  ];

  if (payload.note) {
    lines.push(`Note: ${payload.note}`);
  }

  return lines.join("\n");
}

export async function sendTelegramOrderNotification(payload: OrderTelegramPayload) {
  const config = readTelegramConfig();
  if (!config) {
    return { sent: false as const, reason: "not-configured" as const };
  }

  const endpoint = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: config.chatId,
      text: buildMessage(payload),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Telegram notification failed with status ${response.status}: ${body || "no response body"}`,
    );
  }

  return { sent: true as const };
}
