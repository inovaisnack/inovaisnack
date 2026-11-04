// Estruturas de dados no localStorage
let produtos = JSON.parse(localStorage.getItem('produtos_inovaisnack')) || [
    { id: 1, nome: 'Lanche Exemplo', preco: 7.50, desc: 'Salgado assado, sucos e lanches naturais fresquinhos.' }
];

let carrinho = [];
let pedidos = JSON.parse(localStorage.getItem('pedidos_inovaisnack')) || [];

// Ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    renderizarMenu();
    renderizarEstoque();
    renderizarPedidos();
});

// Função para alternar entre as telas principais (Menu do Topo)
function mostrarTela(nomeTela, event) {
    const secoes = document.querySelectorAll('.section-page');
    secoes.forEach(secao => secao.classList.add('hidden'));

    const botoes = document.querySelectorAll('.nav-btn');
    botoes.forEach(btn => btn.classList.remove('active'));

    const telaAlvo = document.getElementById(`tela-${nomeTela}`);
    if (telaAlvo) {
        telaAlvo.classList.remove('hidden');
    }

    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}

// Função para simular o login de funcionários
function realizarLogin(event) {
    if (event) event.preventDefault();
    document.getElementById('tela-login-func').classList.add('hidden');
    document.getElementById('tela-painel-func').classList.remove('hidden');
    renderizarPedidos();
}

// Função para navegar nas abas da área do funcionário (Estoque, Pedidos, Extrato)
function mostrarSubTela(nomeSubTela, event) {
    const subSecoes = document.querySelectorAll('.subsection-page');
    subSecoes.forEach(sub => sub.classList.add('hidden'));

    const subBotoes = document.querySelectorAll('.subnav-btn');
    subBotoes.forEach(btn => btn.classList.remove('active'));

    const subAlvo = document.getElementById(`subtela-${nomeSubTela}`);
    if (subAlvo) {
        subAlvo.classList.remove('hidden');
    }

    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}

// --- GESTÃO DE ESTOQUE / CADASTRO DE PRODUTOS ---

function renderizarMenu() {
    const container = document.getElementById('lista-menu-produtos');
    if (!container) return;

    container.innerHTML = '';

    if (produtos.length === 0) {
        container.innerHTML = '<p>Nenhum produto cadastrado no momento.</p>';
        return;
    }

    produtos.forEach(p => {
        container.innerHTML += `
            <div class="menu-card" style="margin-bottom: 15px;">
                <div class="item-img-placeholder">ITEM</div>
                <div class="item-info">
                    <h3>${p.nome}</h3>
                    <p class="item-desc">${p.desc || ''}</p>
                    <span class="item-price">R$ ${p.preco.toFixed(2)}</span>
                    <button class="btn-primary" onclick="adicionarAoCarrinho('${p.nome}', ${p.preco})">Adicionar ao Pedido</button>
                </div>
            </div>
        `;
    });
}

function renderizarEstoque() {
    const container = document.getElementById('lista-estoque-funcionario');
    if (!container) return;

    container.innerHTML = '';

    produtos.forEach(p => {
        container.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding: 8px 0; border-bottom: 1px solid #eee;">
                <span><strong>${p.nome}</strong> - R$ ${p.preco.toFixed(2)}</span>
                <button onclick="removerProduto(${p.id})" style="background-color:#cc0000; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Excluir</button>
            </div>
        `;
    });
}

function cadastrarProduto(event) {
    if (event) event.preventDefault();

    const nome = document.getElementById('nome-prod').value;
    const preco = parseFloat(document.getElementById('preco-prod').value);
    const desc = document.getElementById('desc-prod').value;

    const novoProd = { id: Date.now(), nome, preco, desc };
    produtos.push(novoProd);

    localStorage.setItem('produtos_inovaisnack', JSON.stringify(produtos));
    document.getElementById('form-cadastro-produto').reset();

    renderizarMenu();
    renderizarEstoque();
}

function removerProduto(id) {
    produtos = produtos.filter(p => p.id !== id);
    localStorage.setItem('produtos_inovaisnack', JSON.stringify(produtos));

    renderizarMenu();
    renderizarEstoque();
}

// --- CARRINHO DE COMPRAS DO ALUNO ---

function adicionarAoCarrinho(nomeItem, preco) {
    const itemExistente = carrinho.find(i => i.nome === nomeItem);

    if (itemExistente) {
        itemExistente.qtd += 1;
    } else {
        carrinho.push({ nome: nomeItem, preco: preco, qtd: 1 });
    }

    atualizarContadorCarrinho();
    alert(`"${nomeItem}" adicionado ao pedido!`);
}

function atualizarContadorCarrinho() {
    const totalItens = carrinho.reduce((acc, i) => acc + i.qtd, 0);
    const counter = document.getElementById('cart-counter');
    if (counter) counter.innerText = totalItens;
}

function abrirCarrinho() {
    const modal = document.getElementById('modal-carrinho');
    const containerLista = document.getElementById('itens-carrinho-lista');
    const totalSpan = document.getElementById('total-carrinho');

    if (!modal) return;
    containerLista.innerHTML = '';

    if (carrinho.length === 0) {
        containerLista.innerHTML = '<p>Seu carrinho está vazio.</p>';
        totalSpan.innerText = '0.00';
    } else {
        let valorTotal = 0;
        carrinho.forEach((item, index) => {
            const subtotal = item.preco * item.qtd;
            valorTotal += subtotal;

            containerLista.innerHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
                    <span>${item.nome} (x${item.qtd})</span>
                    <span>R$ ${subtotal.toFixed(2)} <button onclick="removerItemCarrinho(${index})" style="background:none; border:none; color:red; cursor:pointer;">❌</button></span>
                </div>
            `;
        });
        totalSpan.innerText = valorTotal.toFixed(2);
    }

    modal.classList.remove('hidden');
}

function fecharCarrinho() {
    const modal = document.getElementById('modal-carrinho');
    if (modal) modal.classList.add('hidden');
}

function removerItemCarrinho(index) {
    carrinho.splice(index, 1);
    atualizarContadorCarrinho();
    abrirCarrinho();
}

function finalizarPedido(event) {
    if (event) event.preventDefault();

    if (carrinho.length === 0) {
        alert('Adicione ao menos um item ao seu pedido.');
        return;
    }

    const nome = document.getElementById('nome-aluno').value;
    const turma = document.getElementById('turma-aluno').value;
    const total = carrinho.reduce((acc, i) => acc + (i.preco * i.qtd), 0);

    const novoPedido = {
        id: Date.now(),
        aluno: nome,
        turma: turma,
        itens: [...carrinho],
        total: total
    };

    pedidos.push(novoPedido);
    localStorage.setItem('pedidos_inovaisnack', JSON.stringify(pedidos));

    carrinho = [];
    atualizarContadorCarrinho();
    document.getElementById('form-finalizar-pedido').reset();
    fecharCarrinho();

    alert('Pedido enviado à cantina com sucesso!');
    renderizarPedidos();
}

// --- PAINEL DO FUNCIONÁRIO (PEDIDOS & EXTRATO) ---

function renderizarPedidos() {
    const container = document.getElementById('lista-pedidos-recebidos');
    const extrato = document.getElementById('total-vendas-extrato');
    if (!container) return;

    container.innerHTML = '';

    if (pedidos.length === 0) {
        container.innerHTML = '<p>Nenhum pedido recebido até o momento.</p>';
        if (extrato) extrato.innerText = 'Total de vendas hoje: R$ 0,00';
        return;
    }

    let faturamento = 0;

    pedidos.forEach(p => {
        faturamento += p.total;
        const descricaoItens = p.itens.map(i => `${i.qtd}x ${i.nome}`).join(', ');

        container.innerHTML += `
            <div style="background-color: #f9f9f9; padding: 10px; border-left: 4px solid #0b1e4f; margin-bottom: 10px; border-radius: 4px;">
                <p><strong>Aluno:</strong> ${p.aluno} (${p.turma})</p>
                <p><strong>Itens:</strong> ${descricaoItens}</p>
                <p><strong>Total:</strong> R$ ${p.total.toFixed(2)}</p>
            </div>
        `;
    });

    if (extrato) {
        extrato.innerText = `Total de vendas hoje: R$ ${faturamento.toFixed(2)}`;
    }
}