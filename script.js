let cart = [];

function changeQtd(button, amount) {
  let spanQtd = button.parentElement.querySelector(".qtd-value");
  let currentQtd = parseInt(spanQtd.innerText);

  let newQtd = currentQtd + amount;
  if (newQtd >= 1) {
    spanQtd.innerText = newQtd;
  }
}

function addToCart(button) {
  let card = button.closest(".card");
  let id = card.getAttribute("data-id");
  let name = card.getAttribute("data-name");
  let price = parseFloat(card.getAttribute("data-price"));
  let qtd = parseInt(card.querySelector(".qtd-value").innerText);

  let existingItem = cart.find((item) => item.id === id);

  if (existingItem) {
    existingItem.qtd += qtd;
  } else {
    cart.push({ id, name, price, qtd });
  }

  card.querySelector(".qtd-value").innerText = 1;
  updateCartCount();

  let originalText = button.innerText;
  button.innerText = "Adicionado!";
  button.style.backgroundColor = "#27ae60";
  setTimeout(() => {
    button.innerText = originalText;
    button.style.backgroundColor = "var(--primary)";
  }, 1000);
}

function updateCartCount() {
  let totalItems = cart.reduce((sum, item) => sum + item.qtd, 0);
  document.getElementById("cart-count").innerText = totalItems;
}

function toggleCart() {
  let modal = document.getElementById("cart-modal");
  modal.classList.toggle("hidden");

  if (!modal.classList.contains("hidden")) {
    renderCartItems();
  }
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
                    <button class="cart-item-delete" onclick="removeCartItem('${item.id}')"><img src="icones/lata_de_lixo.png" alt="Excluir item"></button>
                </div>
            </div>
            <div class="cart-item-price">
                R$ ${itemTotal.toFixed(2).replace(".", ",")}
            </div>
        `;
    container.appendChild(itemDiv);
  });

  totalElement.innerText = `R$ ${totalAmount.toFixed(2).replace(".", ",")}`;
}

function updateCartItemQtd(id, amount) {
  let item = cart.find((i) => i.id === id);
  if (item) {
    item.qtd += amount;

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

function checkout() {
  let checkoutBtn = document.querySelector(".checkout-btn");

  // Validação de carrinho vazio com feedback visual
  if (cart.length === 0) {
    checkoutBtn.classList.add("btn-error");

    setTimeout(() => {
      checkoutBtn.classList.remove("btn-error");
    }, 600);

    return;
  }

  let nameInput = document.getElementById("customer-name");
  let customerName = nameInput.value.trim();

  // Validação do nome do cliente com borda vermelha e tremor no botão
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
  let greeting = "Boa noite";
  if (hour >= 5 && hour < 12) greeting = "Bom dia";
  else if (hour >= 12 && hour < 18) greeting = "Boa tarde";

  let message = `${greeting} Victor Hugo!\n`;
  message += `Meu nome é ${customerName}\n`;
  message += `Segue o pedido que fiz pelo site:\n`;

  let total = 0;

  cart.forEach((item) => {
    let itemTotal = item.price * item.qtd;
    total += itemTotal;

    message += `----------------\n`;
    message += `${item.name} x${item.qtd}\n`;
    message += `quant: ${item.qtd}x de R$ ${item.price.toFixed(2).replace(".", ",")}\n`;
  });

  message += `----------------\n`;
  message += `Valor Total: R$ ${total.toFixed(2).replace(".", ",")}`;

  let encodedMessage = encodeURIComponent(message);
  let phone = "5511949497778";
  let whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
  window.open(whatsappUrl, "_blank");
}
