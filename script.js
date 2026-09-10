let cart = [];
let bucketMode = 1;
let selectedFlavors = [];
let currentQtd = 1;
let deliveryMode = "delivery";
let finalCalculatedTotal = 0;
let paymentCheckInterval = null;

const FLAVORS = [
  { id: "bueno", label: "Bueno" },
  { id: "ninho", label: "Ninho" },
  { id: "chocolate", label: "Chocolate" },
  { id: "wafer", label: "Wafer Branco" },
  { id: "nutella", label: "Nutella" },
];

document.addEventListener("DOMContentLoaded", () => renderFlavors());

function setBucketMode(mode) {
  bucketMode = mode === 2 ? 2 : 1;
  selectedFlavors = [];
  document.getElementById("btn-mode-1").classList.toggle("active", bucketMode === 1);
  document.getElementById("btn-mode-2").classList.toggle("active", bucketMode === 2);
  renderFlavors();
  updatePrice();
}

function renderFlavors() {
  const container = document.getElementById("flavors-container");
  container.innerHTML = "";

  FLAVORS.forEach((flavor) => {
    let btn = document.createElement("button");
    btn.className = "flavor-btn";
    btn.innerText = bucketMode === 2 ? `1/2 ${flavor.label}` : flavor.label;
    if (selectedFlavors.includes(flavor.id)) btn.classList.add("active");
    btn.onclick = () => toggleFlavor(flavor.id);
    container.appendChild(btn);
  });
}

function toggleFlavor(flavorId) {
  if (bucketMode === 1) {
    selectedFlavors = [flavorId];
  } else {
    if (selectedFlavors.includes(flavorId)) {
      selectedFlavors = selectedFlavors.filter((id) => id !== flavorId);
    } else if (selectedFlavors.length < 2) {
      selectedFlavors.push(flavorId);
    }
  }
  renderFlavors();
  updatePrice();
}

function updatePrice() {
  let price = selectedFlavors.includes("nutella") ? 30 : 25;
  document.getElementById("display-price").innerText =
    `R$ ${price.toFixed(2).replace(".", ",")}`;
}

function changeBucketQtd(amount) {
  let step = Math.floor(Number(amount)) || 0;
  currentQtd = Math.max(1, (Math.floor(Number(currentQtd)) || 1) + step);
  document.getElementById("display-qtd").innerText = currentQtd;
}

function addBucketToCart() {
  let btnAdd = document.getElementById("btn-add-bucket");

  if (
    (bucketMode === 1 && selectedFlavors.length !== 1) ||
    (bucketMode === 2 && selectedFlavors.length !== 2)
  ) {
    let originalText = btnAdd.innerText;
    btnAdd.classList.add("btn-error");
    btnAdd.innerText =
      bucketMode === 1 ? "Selecione 1 sabor!" : "Selecione 2 sabores!";
    setTimeout(() => {
      btnAdd.classList.remove("btn-error");
      btnAdd.innerText = originalText;
    }, 2000);
    return;
  }

  let price = selectedFlavors.includes("nutella") ? 30 : 25;
  let flavorNames = selectedFlavors.map(
    (id) => FLAVORS.find((f) => f.id === id).label
  );
  let itemName =
    bucketMode === 1
      ? `Balde - ${flavorNames[0]}`
      : `Balde - 1/2 ${flavorNames[0]} e 1/2 ${flavorNames[1]}`;
  let cartItemId = "balde-" + selectedFlavors.sort().join("-");

  let safeQtd = Math.max(1, Math.floor(Number(currentQtd)) || 1);

  let existingItem = cart.find((item) => item.id === cartItemId);
  if (existingItem) {
    existingItem.qtd += safeQtd;
  } else {
    cart.push({
      id: cartItemId,
      name: itemName,
      price: price,
      qtd: safeQtd,
    });
  }

  selectedFlavors = [];
  currentQtd = 1;
  document.getElementById("display-qtd").innerText = 1;
  renderFlavors();
  updatePrice();
  updateCartCount();

  btnAdd.innerText = "Adicionado!";
  btnAdd.style.backgroundColor = "var(--success)";
  setTimeout(() => {
    btnAdd.innerText = "Adicionar";
    btnAdd.style.backgroundColor = "var(--primary)";
  }, 1000);
}

function updateCartCount() {
  let totalItems = cart.reduce((sum, item) => sum + (Math.max(0, Math.floor(Number(item.qtd))) || 0), 0);
  document.getElementById("cart-count").innerText = totalItems;
}

function toggleCart() {
  let modal = document.getElementById("cart-modal");
  modal.classList.toggle("hidden");
  if (!modal.classList.contains("hidden")) {
    showStep("step-cart");
    renderCartItems();
  }
}

function setDeliveryMode(mode) {
  deliveryMode = mode === "pickup" ? "pickup" : "delivery";
  document
    .getElementById("btn-delivery")
    .classList.toggle("active", deliveryMode === "delivery");
  document
    .getElementById("btn-pickup")
    .classList.toggle("active", deliveryMode === "pickup");

  if (deliveryMode === "pickup") {
    document.getElementById("pickup-address").classList.remove("hidden");
    document.getElementById("customer-address").classList.add("hidden");
  } else {
    document.getElementById("pickup-address").classList.add("hidden");
    document.getElementById("customer-address").classList.remove("hidden");
  }
  renderCartItems();
}

function renderCartItems() {
  let container = document.getElementById("cart-items-container");
  let totalElement = document.getElementById("cart-total");
  container.innerHTML = "";
  let totalAmount = 0;

  if (cart.length === 0) {
    container.innerHTML =
      '<p style="text-align:center; color:#999; margin-top:20px;">Seu carrinho está vazio.</p>';
    totalElement.innerText = "R$ 0,00";
    finalCalculatedTotal = 0;
    return;
  }

  cart.forEach((item) => {
    let safeQtd = Math.max(1, Math.floor(Number(item.qtd)) || 1);
    let itemTotal = item.price * safeQtd;
    totalAmount += itemTotal;
    container.innerHTML += `
      <div class="cart-item">
          <div class="cart-item-info" style="flex: 1;">
              <h4>${item.name}</h4>
              <p style="color: var(--text-light); font-size: 0.85rem;">R$ ${item.price.toFixed(2).replace(".", ",")} cada</p>
              <div class="cart-item-controls">
                  <button class="cart-item-btn" onclick="updateCartItemQtd('${item.id}', -1)">-</button>
                  <span>${safeQtd}</span>
                  <button class="cart-item-btn" onclick="updateCartItemQtd('${item.id}', 1)">+</button>
                  <button class="cart-item-delete" onclick="removeCartItem('${item.id}')">🗑️</button>
              </div>
          </div>
          <div class="cart-item-price">R$ ${itemTotal.toFixed(2).replace(".", ",")}</div>
      </div>`;
  });

  if (deliveryMode === "delivery") totalAmount += 10;
  finalCalculatedTotal = totalAmount;
  totalElement.innerText = `R$ ${totalAmount.toFixed(2).replace(".", ",")}`;
}

function updateCartItemQtd(id, amount) {
  let item = cart.find((i) => i.id === id);
  if (item) {
    let step = Math.floor(Number(amount)) || 0;
    item.qtd = (Math.floor(Number(item.qtd)) || 0) + step;
    if (item.qtd <= 0) {
      removeCartItem(id);
    } else {
      renderCartItems();
      updateCartCount();
    }
  }
}

function removeCartItem(id) {
  cart = cart.filter((item) => item.id !== id);
  renderCartItems();
  updateCartCount();
}

function showStep(stepId) {
  document.getElementById("step-cart").classList.add("hidden");
  document.getElementById("step-payment").classList.add("hidden");
  document.getElementById("step-success").classList.add("hidden");

  document.getElementById(stepId).classList.remove("hidden");
}

/* FLUXO DO PIX E PAGAMENTO */
async function goToPaymentStep() {
  let checkoutBtn = document.querySelector("#step-cart .checkout-btn");
  if (cart.length === 0) {
    checkoutBtn.classList.add("btn-error");
    setTimeout(() => checkoutBtn.classList.remove("btn-error"), 2000);
    return;
  }

  let nameInput = document.getElementById("customer-name");
  let addressInput = document.getElementById("customer-address");
  let customerName = nameInput.value.trim();
  let customerAddress = addressInput.value.trim();

  if (!customerName || (deliveryMode === "delivery" && !customerAddress)) {
    if (!customerName) nameInput.classList.add("input-error");
    if (deliveryMode === "delivery" && !customerAddress)
      addressInput.classList.add("input-error");
    checkoutBtn.classList.add("btn-error");

    setTimeout(() => {
      nameInput.classList.remove("input-error");
      addressInput.classList.remove("input-error");
      checkoutBtn.classList.remove("btn-error");
    }, 2000);
    return;
  }

  checkoutBtn.innerText = "Gerando Pix...";
  checkoutBtn.disabled = true;

  try {
    const response = await fetch("/api/create-pix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cartItems: cart,
        deliveryMode: deliveryMode,
        customerName: customerName,
        customerAddress: customerAddress,
      }),
    });

    const data = await response.json();

    if (data.paymentId) {
      document.getElementById("pix-qr-code").src =
        `data:image/png;base64,${data.qrCodeBase64}`;
      document.getElementById("pix-key-input").value = data.qrCodeCopyPaste;

      finalCalculatedTotal = Number(data.safeTotal) || finalCalculatedTotal;
      document.getElementById("pix-display-total").innerText =
        `R$ ${finalCalculatedTotal.toFixed(2).replace(".", ",")}`;

      showStep("step-payment");
      startPaymentCheck(data.paymentId);
    } else {
      alert("Erro ao gerar Pix. Tente novamente.");
    }
  } catch (error) {
    alert("Não foi possível conectar ao servidor de pagamento.");
  } finally {
    checkoutBtn.innerText = "Ir para Pagamento (Pix)";
    checkoutBtn.disabled = false;
  }
}

function startPaymentCheck(paymentId) {
  if (paymentCheckInterval) clearInterval(paymentCheckInterval);

  paymentCheckInterval = setInterval(async () => {
    try {
      const response = await fetch(`/api/check-payment/${paymentId}`);
      const data = await response.json();

      if (data.status === "approved") {
        clearInterval(paymentCheckInterval);
        confirmPaymentAndFinish();
      }
    } catch (error) {
      console.error("Erro ao verificar status do pagamento:", error);
    }
  }, 3000);
}

function copyPixKey() {
  let input = document.getElementById("pix-key-input");
  input.select();
  document.execCommand("copy");
  alert("Chave Pix copiada!");
}

function confirmPaymentAndFinish() {
  if (deliveryMode === "delivery") {
    document.getElementById("delivery-time-info").classList.remove("hidden");
    document.getElementById("pickup-info").classList.add("hidden");
  } else {
    document.getElementById("delivery-time-info").classList.add("hidden");
    document.getElementById("pickup-info").classList.remove("hidden");
  }

  showStep("step-success");
}

function resetCartAndClose() {
  cart = [];
  updateCartCount();
  document.getElementById("customer-name").value = "";
  document.getElementById("customer-address").value = "";
  toggleCart();
}
