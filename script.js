// Array que vai guardar os produtos selecionados
let cart = [];

// Função para mudar a quantidade no próprio Card (antes de adicionar)
function changeQtd(button, amount) {
  let spanQtd = button.parentElement.querySelector(".qtd-value");
  let currentQtd = parseInt(spanQtd.innerText);

  let newQtd = currentQtd + amount;
  if (newQtd >= 1) {
    // Não deixa a quantidade ser menor que 1
    spanQtd.innerText = newQtd;
  }
}

// Função para adicionar o produto ao carrinho
function addToCart(button) {
  // Busca o Card pai para pegar as informações
  let card = button.closest(".card");
  let id = card.getAttribute("data-id");
  let name = card.getAttribute("data-name");
  let price = parseFloat(card.getAttribute("data-price"));
  let qtd = parseInt(card.querySelector(".qtd-value").innerText);

  // Verifica se o produto já está no carrinho
  let existingItem = cart.find((item) => item.id === id);

  if (existingItem) {
    existingItem.qtd += qtd; // Se já tem, só soma a quantidade
  } else {
    cart.push({ id, name, price, qtd }); // Se não tem, adiciona na lista
  }

  // Reseta a quantidade no card para 1 após adicionar
  card.querySelector(".qtd-value").innerText = 1;

  updateCartCount();

  // Pequeno feedback visual no botão
  let originalText = button.innerText;
  button.innerText = "Adicionado!";
  button.style.backgroundColor = "#27ae60";
  setTimeout(() => {
    button.innerText = originalText;
    button.style.backgroundColor = "#d32f2f";
  }, 1000);
}

// Atualiza o numerozinho vermelho em cima do carrinho
function updateCartCount() {
  let totalItems = cart.reduce((sum, item) => sum + item.qtd, 0);
  document.getElementById("cart-count").innerText = totalItems;
}

// Abre e fecha a janela do carrinho
function toggleCart() {
  let modal = document.getElementById("cart-modal");
  modal.classList.toggle("hidden");

  // Se o modal foi aberto (não tem a classe hidden), renderiza os itens
  if (!modal.classList.contains("hidden")) {
    renderCartItems();
  }
}

// Constroi os itens no carrinho gerando a animação de "Salto"
function renderCartItems() {
  let container = document.getElementById("cart-items-container");
  let totalElement = document.getElementById("cart-total");

  container.innerHTML = ""; // Limpa os itens anteriores
  let totalAmount = 0;

  if (cart.length === 0) {
    container.innerHTML =
      '<p style="text-align:center; color:#999; margin-top:20px;">Seu carrinho está vazio.</p>';
    totalElement.innerText = "R$ 0,00";
    return;
  }

  cart.forEach((item, index) => {
    let itemTotal = item.price * item.qtd;
    totalAmount += itemTotal;

    let itemDiv = document.createElement("div");
    itemDiv.className = "cart-item";
    // Delay na animação cria o efeito de pularem um depois do outro!
    itemDiv.style.animationDelay = `${index * 0.1}s`;

    itemDiv.innerHTML = `
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>Quant: ${item.qtd}x de R$ ${item.price.toFixed(2).replace(".", ",")}</p>
            </div>
            <div class="cart-item-price">
                R$ ${itemTotal.toFixed(2).replace(".", ",")}
            </div>
        `;
    container.appendChild(itemDiv);
  });

  totalElement.innerText = `R$ ${totalAmount.toFixed(2).replace(".", ",")}`;
}

// Envia o pedido para o WhatsApp
function checkout() {
  if (cart.length === 0) {
    alert("Seu carrinho está vazio!");
    return;
  }

  let customerName = document.getElementById("customer-name").value.trim();
  if (!customerName) {
    alert("Por favor, digite seu nome antes de finalizar o pedido.");
    return;
  }

  // Descobre o horário para a saudação correta
  let hour = new Date().getHours();
  let greeting = "Boa noite";
  if (hour >= 5 && hour < 12) greeting = "Bom dia";
  else if (hour >= 12 && hour < 18) greeting = "Boa tarde";

  // Monta o cabeçalho da mensagem
  let message = `${greeting} Victor Hugo!\n`;
  message += `Meu nome é ${customerName}\n`;
  message += `Segue o pedido que fiz pelo site:\n`;

  let total = 0;

  // Roda todos os itens do carrinho para montar a lista
  cart.forEach((item) => {
    let itemTotal = item.price * item.qtd;
    total += itemTotal;

    message += `----------------\n`;
    message += `${item.name} x${item.qtd}\n`;
    message += `quant: ${item.qtd}x de R$ ${item.price.toFixed(2).replace(".", ",")}\n`;
  });

  // Finaliza com o total
  message += `----------------\n`;
  message += `Valor Total: R$ ${total.toFixed(2).replace(".", ",")}`;

  // Codifica a mensagem para formato de link de internet
  let encodedMessage = encodeURIComponent(message);

  // Seu número com código do país (55) e DDD (11)
  let phone = "5511949497778";

  // Cria o link do WhatsApp e abre em uma nova aba/janela
  let whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
  window.open(whatsappUrl, "_blank");
}
