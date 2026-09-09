let cart = [];
let bucketMode = 1;
let selectedFlavors = [];
let currentQtd = 1;

const FLAVORS = [
  { id: "bueno", label: "Bueno" },
  { id: "ninho", label: "Ninho" },
  { id: "chocolate", label: "Chocolate" },
  { id: "wafer", label: "Wafer Branco" },
  { id: "nutella", label: "Nutella" },
];

document.addEventListener("DOMContentLoaded", () => renderFlavors());

function setBucketMode(mode) {
  bucketMode = mode;
  selectedFlavors = [];

  document.getElementById("btn-mode-1").classList.toggle("active", mode === 1);
  document.getElementById("btn-mode-2").classList.toggle("active", mode === 2);

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

    if (selectedFlavors.includes(flavor.id)) {
      btn.classList.add("active");
    }

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
  currentQtd += amount;
  if (currentQtd < 1) currentQtd = 1;
  document.getElementById("display-qtd").innerText = currentQtd;
}

function addBucketToCart() {
  let btnAdd = document.getElementById("btn-add-bucket");

  // Validação: Exige 1 sabor no modo 1, e 2 sabores no modo 2
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
    (id) => FLAVORS.find((f) => f.id === id).label,
  );

  let itemName =
    bucketMode === 1
      ? `Balde - ${flavorNames[0]}`
      : `Balde - 1/2 ${flavorNames[0]} e 1/2 ${flavorNames[1]}`;

  // ID único para empilhar itens idênticos no carrinho
  let cartItemId = "balde-" + selectedFlavors.sort().join("-");

  let existingItem = cart.find((item) => item.id === cartItemId);
  if (existingItem) {
    existingItem.qtd += currentQtd;
  } else {
    cart.push({
      id: cartItemId,
      name: itemName,
      price: price,
      qtd: currentQtd,
    });
  }

  // Reset da tela após adicionar
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
  let totalItems = cart.reduce((sum, item) => sum + item.qtd, 0);
  document.getElementById("cart-count").innerText = totalItems;
}

function toggleCart() {
  let modal = document.getElementById("cart-modal");
  modal.classList.toggle("hidden");
  if (!modal.classList.contains("hidden")) renderCartItems();
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
    return;
  }

  cart.forEach((item) => {
    let itemTotal = item.price * item.qtd;
    totalAmount += itemTotal;

    let itemDiv = document.createElement("div");
    itemDiv.className = "cart-item";
    itemDiv.innerHTML = `
      <div class="cart-item-info" style="flex: 1;">
          <h4>${item.name}</h4>
          <p style="color: var(--text-light); font-size: 0.85rem;">R$ ${item.price.toFixed(2).replace(".", ",")} cada</p>
          <div class="cart-item-controls">
              <button class="cart-item-btn" onclick="updateCartItemQtd('${item.id}', -1)">-</button>
              <span>${item.qtd}</span>
              <button class="cart-item-btn" onclick="updateCartItemQtd('${item.id}', 1)">+</button>
              <button class="cart-item-delete" onclick="removeCartItem('${item.id}')">
                <img src="icones/lata_de_lixo.png" alt="Excluir item">
              </button>
          </div>
      </div>
      <div class="cart-item-price">R$ ${itemTotal.toFixed(2).replace(".", ",")}</div>
    `;
    container.appendChild(itemDiv);
  });

  totalElement.innerText = `R$ ${totalAmount.toFixed(2).replace(".", ",")}`;
}

function updateCartItemQtd(id, amount) {
  let item = cart.find((i) => i.id === id);
  if (item) {
    item.qtd += amount;
    if (item.qtd <= 0) removeCartItem(id);
    else {
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

function checkout() {
  let checkoutBtn = document.querySelector(".checkout-btn");

  if (cart.length === 0) {
    checkoutBtn.classList.add("btn-error");
    setTimeout(() => checkoutBtn.classList.remove("btn-error"), 2000);
    return;
  }

  let nameInput = document.getElementById("customer-name");
  let customerName = nameInput.value.trim();

  if (!customerName) {
    nameInput.focus();
    nameInput.classList.add("input-error");
    checkoutBtn.classList.add("btn-error");
    setTimeout(() => {
      nameInput.classList.remove("input-error");
      checkoutBtn.classList.remove("btn-error");
    }, 2000);
    return;
  }

  let hour = new Date().getHours();
  let greeting =
    hour >= 5 && hour < 12
      ? "Bom dia"
      : hour >= 12 && hour < 18
        ? "Boa tarde"
        : "Boa noite";

  let message = `${greeting} Victor Hugo!\nMeu nome é ${customerName}\nSegue o pedido que fiz pelo site:\n`;
  let total = 0;

  cart.forEach((item) => {
    let itemTotal = item.price * item.qtd;
    total += itemTotal;
    message += `----------------\n${item.name} x${item.qtd}\nquant: ${item.qtd}x de R$ ${item.price.toFixed(2).replace(".", ",")}\n`;
  });

  message += `----------------\nValor Total: R$ ${total.toFixed(2).replace(".", ",")}`;

  let encodedMessage = encodeURIComponent(message);
  window.open(`https://wa.me/5511949497778?text=${encodedMessage}`, "_blank");
}
