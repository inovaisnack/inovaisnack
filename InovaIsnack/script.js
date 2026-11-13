// Estruturas de dados no localStorage
let produtos = JSON.parse(localStorage.getItem('produtos_inovaisnack')) || [
    { id: 1, nome: 'Lanche Exemplo', preco: 7.50, desc: 'Salgado assado, sucos e lanches naturais fresquinhos.', categoria: 'Salgados', imagem: '' }
];

let carrinho = [];
let pedidos = JSON.parse(localStorage.getItem('pedidos_inovaisnack')) || [];
let categoriaAtual = 'todos';

// Ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    renderizarMenu();
    renderizarEstoque();
    renderizarPedidos();
    renderizarMeusPedidos();
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

    if (nomeTela === 'perfil') {
        renderizarMeusPedidos();
    }
}

// Função de Validação Real de Login
function realizarLogin(event) {
    if (event) event.preventDefault();
    const usuarioDigitado = document.getElementById('usuario').value;
    const senhaDigitada = document.getElementById('senha').value;

    if (usuarioDigitado === 'admin' && senhaDigitada === '123') {
        document.getElementById('tela-login-func').classList.add('hidden');
        document.getElementById('tela-painel-func').classList.remove('hidden');
        renderizarPedidos();
    } else {
        alert('Usuário ou senha incorretos! (Use admin / 123)');
    }
}

// Função para navegar nas abas da área do funcionário
function mostrarSubTela(nomeSubTela, event) {
    const subSecoes = document.querySelectorAll('.subsection-page');
    subSecoes.forEach(sub => sub.classList.add('hidden'));

    const subBotoes = document.querySelectorAll('.subnav-func .subnav-btn');
    subBotoes.forEach(btn => btn.classList.remove('active'));

    const subAlvo = document.getElementById(`subtela-${nomeSubTela}`);
    if (subAlvo) {
        subAlvo.classList.remove('hidden');
    }

    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    if (nomeSubTela === 'estoque') {
        alternarVisaoEstoque('lista');
    }
}

// Alterna entre a lista de produtos e o formulário de cadastro dentro da aba Estoque
function alternarVisaoEstoque(visao) {
    const divLista = document.getElementById('estoque-visao-lista');
    const divCadastro = document.getElementById('estoque-visao-cadastro');

    if (visao === 'cadastro') {
        divLista.classList.add('hidden');
        divCadastro.classList.remove('hidden');
    } else {
        divCadastro.classList.add('hidden');
        divLista.classList.remove('hidden');
    }
}

// --- GESTÃO DE ESTOQUE / CADASTRO DE PRODUTOS ---

function filtrarMenu(categoria, event) {
    categoriaAtual = categoria;

    const botoesCat = document.querySelectorAll('#tela-menu .subnav-btn');
    botoesCat.forEach(btn => {
        btn.classList.remove('active');
        btn.style.backgroundColor = '#64748b';
    });

    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
        event.currentTarget.style.backgroundColor = '#0b1e4f';
    }

    renderizarMenu();
}

function renderizarMenu() {
    const container = document.getElementById('lista-menu-produtos');
    if (!container) return;

    container.innerHTML = '';

    let produtosFiltrados = produtos;
    if (categoriaAtual !== 'todos') {
        produtosFiltrados = produtos.filter(p => p.categoria === categoriaAtual);
    }

    if (produtosFiltrados.length === 0) {
        container.innerHTML = '<p>Nenhum produto encontrado nesta categoria.</p>';
        return;
    }

    produtosFiltrados.forEach(p => {
        let blocoImagem = p.imagem
            ? `<div class="item-img-container"><img src="${p.imagem}" alt="${p.nome}" class="item-img-real"></div>`
            : `<div class="item-img-placeholder">ITEM</div>`;

        container.innerHTML += `
            <div class="menu-card" style="margin-bottom: 15px;">
                ${blocoImagem}
                <div class="item-info">
                    <h3>${p.nome}</h3>
                    <p style="font-size: 12px; color: #64748b; margin-bottom: 2px;">Categoria: <strong>${p.categoria || 'Salgados'}</strong></p>
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

    if (produtos.length === 0) {
        container.innerHTML = '<p style="color: #64748b;">Nenhum produto cadastrado no estoque.</p>';
        return;
    }

    produtos.forEach(p => {
        let miniatura = p.imagem
            ? `<div class="estoque-img-mini"><img src="${p.imagem}" alt=""></div>`
            : '';

        container.innerHTML += `
            <div class="estoque-item-card">
                <div style="display: flex; align-items: center;">
                    ${miniatura}
                    <div>
                        <h4 style="color: #0b1e4f; font-size: 16px; margin-bottom: 2px;">${p.nome}</h4>
                        <p style="font-size: 13px; color: #64748b;">Categoria: <strong>${p.categoria || 'Salgados'}</strong> | Preço: <strong>R$ ${p.preco.toFixed(2)}</strong></p>
                        ${p.desc ? `<p style="font-size: 12px; color: #94a3b8; margin-top: 4px;">${p.desc}</p>` : ''}
                    </div>
                </div>
                <button onclick="removerProduto(${p.id})" class="btn-danger-custom" style="padding: 6px 12px; font-size: 13px;">Excluir</button>
            </div>
        `;
    });
}

// Redimensiona e converte o arquivo de imagem para caber com segurança no localStorage
function processarImagem(arquivo) {
    return new Promise((resolve) => {
        if (!arquivo) {
            resolve('');
            return;
        }
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement('canvas');
                const maxWidth = 300;
                const scale = maxWidth / img.width;
                canvas.width = maxWidth;
                canvas.height = img.height * scale;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(arquivo);
    });
}

async function cadastrarProduto(event) {
    if (event) event.preventDefault();

    const nome = document.getElementById('nome-prod').value;
    const categoria = document.getElementById('cat-prod').value;
    const preco = parseFloat(document.getElementById('preco-prod').value);
    const desc = document.getElementById('desc-prod').value;
    const arquivoImagem = document.getElementById('img-prod').files[0];

    const imagemBase64 = await processarImagem(arquivoImagem);

    const novoProd = { id: Date.now(), nome, categoria, preco, desc, imagem: imagemBase64 };
    produtos.push(novoProd);

    try {
        localStorage.setItem('produtos_inovaisnack', JSON.stringify(produtos));
    } catch (erro) {
        alert('Limite de armazenamento atingido. Tente cadastrar sem imagem ou excluir itens antigos.');
        produtos.pop();
        return;
    }

    document.getElementById('form-cadastro-produto').reset();

    renderizarMenu();
    renderizarEstoque();
    alert('Produto cadastrado com sucesso!');

    alternarVisaoEstoque('lista');
}

function removerProduto(id) {
    if (confirm('Deseja realmente excluir este produto?')) {
        produtos = produtos.filter(p => p.id !== id);
        localStorage.setItem('produtos_inovaisnack', JSON.stringify(produtos));

        renderizarMenu();
        renderizarEstoque();
    }
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
        containerLista.innerHTML = '<p style="color: #64748b; text-align: center; padding: 20px 0;">Seu carrinho está vazio.</p>';
        totalSpan.innerText = '0.00';
    } else {
        let valorTotal = 0;
        carrinho.forEach((item, index) => {
            const subtotal = item.preco * item.qtd;
            valorTotal += subtotal;

            containerLista.innerHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9;">
                    <span>${item.nome} (<strong>x${item.qtd}</strong>)</span>
                    <span style="font-weight: bold; color: #0b1e4f;">R$ ${subtotal.toFixed(2)} <button onclick="removerItemCarrinho(${index})" style="background:none; border:none; color:#ef4444; cursor:pointer; margin-left:8px; font-weight:bold;">✕</button></span>
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

function esvaziarCarrinho() {
    if (carrinho.length === 0) return;
    if (confirm('Tem certeza que deseja limpar todos os itens do carrinho?')) {
        carrinho = [];
        atualizarContadorCarrinho();
        abrirCarrinho();
    }
}

function finalizarPedido(event) {
    if (event) event.preventDefault();

    if (carrinho.length === 0) {
        alert('Adicione ao menos um item ao seu pedido.');
        return;
    }

    const nome = document.getElementById('nome-aluno').value;
    const turma = document.getElementById('turma-aluno').value;
    const formaPagamento = document.getElementById('forma-pagamento').value;
    const total = carrinho.reduce((acc, i) => acc + (i.preco * i.qtd), 0);

    const novoPedido = {
        id: Date.now(),
        aluno: nome,
        turma: turma,
        pagamento: formaPagamento,
        pago: false, // O funcionário poderá marcar como pago depois
        itens: [...carrinho],
        total: total,
        status: 'Pendente'
    };

    pedidos.push(novoPedido);
    localStorage.setItem('pedidos_inovaisnack', JSON.stringify(pedidos));

    carrinho = [];
    atualizarContadorCarrinho();
    document.getElementById('form-finalizar-pedido').reset();
    fecharCarrinho();

    alert('Pedido enviado à cantina com sucesso!');
    renderizarPedidos();
    renderizarMeusPedidos();
}

// --- PERFIL DO ALUNO (MEUS PEDIDOS) ---

function renderizarMeusPedidos() {
    const container = document.getElementById('lista-meus-pedidos');
    if (!container) return;

    container.innerHTML = '';

    if (pedidos.length === 0) {
        container.innerHTML = '<p style="color: #64748b;">Nenhum pedido encontrado. Faça um pedido pelo Menu!</p>';
        return;
    }

    pedidos.forEach(p => {
        const descricaoItens = p.itens.map(i => `${i.qtd}x ${i.nome}`).join(', ');
        const isPronto = p.status === 'Pronto para Retirada';
        const statusBg = isPronto ? '#dcfce7' : '#fef3c7';
        const statusColor = isPronto ? '#166534' : '#92400e';

        const pagoBadge = p.pago
            ? '<span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-left: 5px;">Pago</span>'
            : '<span style="background-color: #fee2e2; color: #991b1b; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-left: 5px;">Pendente de Pagamento</span>';

        container.innerHTML += `
            <div style="background-color: #ffffff; padding: 16px; border: 1px solid #e2e8f0; margin-bottom: 12px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div>
                        <h4 style="color: #0b1e4f; font-size: 16px;">${p.aluno} <span style="font-weight: normal; color: #64748b; font-size: 13px;">(${p.turma})</span></h4>
                    </div>
                    <span style="background-color: ${statusBg}; color: ${statusColor}; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">${p.status}</span>
                </div>
                <p style="font-size: 14px; color: #333; margin-bottom: 6px;"><strong>Itens:</strong> ${descricaoItens}</p>
                <p style="font-size: 14px; color: #333; margin-bottom: 6px;"><strong>Pagamento:</strong> ${p.pagamento || 'PIX'} ${pagoBadge}</p>
                <p style="font-size: 14px; color: #0b1e4f; font-weight: bold;">Total: R$ ${p.total.toFixed(2)}</p>
            </div>
        `;
    });
}

// --- PAINEL DO FUNCIONÁRIO (PEDIDOS & EXTRATO) ---

function alterarStatusPedido(idPedido) {
    const ped = pedidos.find(p => p.id === idPedido);
    if (ped) {
        ped.status = 'Pronto para Retirada';
        localStorage.setItem('pedidos_inovaisnack', JSON.stringify(pedidos));
        renderizarPedidos();
        renderizarMeusPedidos();
    }
}

function alternarPagamentoPedido(idPedido) {
    const ped = pedidos.find(p => p.id === idPedido);
    if (ped) {
        ped.pago = !ped.pago;
        localStorage.setItem('pedidos_inovaisnack', JSON.stringify(pedidos));
        renderizarPedidos();
        renderizarMeusPedidos();
    }
}

function fecharCaixa() {
    if (pedidos.length === 0) {
        alert('Não há vendas registradas para fechar o caixa.');
        return;
    }
    if (confirm('Deseja encerrar o expediente e zerar os pedidos do dia?')) {
        pedidos = [];
        localStorage.removeItem('pedidos_inovaisnack');
        renderizarPedidos();
        renderizarMeusPedidos();
        renderizarExtratoTransacoes();
        alert('Caixa encerrado com sucesso!');
    }
}

function renderizarPedidos() {
    const container = document.getElementById('lista-pedidos-recebidos');
    if (!container) return;

    container.innerHTML = '';

    if (pedidos.length === 0) {
        container.innerHTML = '<p style="color: #64748b;">Nenhum pedido recebido até o momento.</p>';
        renderizarExtratoTransacoes();
        return;
    }

    pedidos.forEach(p => {
        const descricaoItens = p.itens.map(i => `${i.qtd}x ${i.nome}`).join(', ');
        const isPronto = p.status === 'Pronto para Retirada';
        const statusBg = isPronto ? '#dcfce7' : '#fef3c7';
        const statusColor = isPronto ? '#166534' : '#92400e';

        const pagoTexto = p.pago ? '✓ Pago' : 'Marcar como Pago';
        const pagoBtnBg = p.pago ? '#166534' : '#eab308';

        container.innerHTML += `
            <div style="background-color: #ffffff; padding: 18px; border: 1px solid #e2e8f0; margin-bottom: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.03);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <div>
                        <h4 style="color: #0b1e4f; font-size: 17px; margin-bottom: 2px;">${p.aluno}</h4>
                        <span style="font-size: 13px; color: #64748b; font-weight: 600;">Turma: ${p.turma}</span>
                    </div>
                    <span style="background-color: ${statusBg}; color: ${statusColor}; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">${p.status}</span>
                </div>
                <p style="font-size: 14px; color: #333; margin-bottom: 4px;"><strong>Itens do Pedido:</strong> ${descricaoItens}</p>
                <p style="font-size: 14px; color: #333; margin-bottom: 10px;"><strong>Forma de Pagamento:</strong> ${p.pagamento || 'PIX'}</p>
                
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 10px; flex-wrap: wrap; gap: 10px;">
                    <span style="font-size: 15px; font-weight: bold; color: #0b1e4f;">Total: R$ ${p.total.toFixed(2)}</span>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="alternarPagamentoPedido(${p.id})" style="background-color: ${pagoBtnBg}; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600;">${pagoTexto}</button>
                        ${p.status === 'Pendente' ? `<button onclick="alterarStatusPedido(${p.id})" class="btn-primary" style="padding: 6px 14px; font-size: 13px; margin-top:0;">Marcar como Pronto</button>` : '<span style="font-size: 13px; color: #166534; font-weight: 600; align-self: center;">✓ Pronto</span>'}
                    </div>
                </div>
            </div>
        `;
    });

    renderizarExtratoTransacoes();
}

function renderizarExtratoTransacoes() {
    const extrato = document.getElementById('total-vendas-extrato');
    const transacoesContainer = document.getElementById('lista-transacoes-extrato');

    let faturamento = 0;
    pedidos.forEach(p => { faturamento += p.total; });

    if (extrato) {
        extrato.innerText = `R$ ${faturamento.toFixed(2)}`;
    }

    if (!transacoesContainer) return;
    transacoesContainer.innerHTML = '';

    if (pedidos.length === 0) {
        transacoesContainer.innerHTML = '<p style="color: #64748b; font-size: 14px;">Nenhuma transação registrada no momento.</p>';
        return;
    }

    pedidos.forEach(p => {
        const descricaoItens = p.itens.map(i => `${i.qtd}x ${i.nome}`).join(', ');
        const pagoLabel = p.pago ? '<span style="color: #166534; font-weight: bold;">(Pago)</span>' : '<span style="color: #991b1b; font-weight: bold;">(Não Pago)</span>';

        transacoesContainer.innerHTML += `
            <div style="background-color: #ffffff; padding: 12px 16px; border: 1px solid #e2e8f0; margin-bottom: 8px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="color: #0b1e4f; font-size: 14px;">${p.aluno}</strong> <span style="font-size: 12px; color: #64748b;">(${p.turma})</span> ${pagoLabel}
                    <p style="font-size: 13px; color: #64748b; margin-top: 2px;">${descricaoItens} - <em>${p.pagamento || 'PIX'}</em></p>
                </div>
                <span style="font-weight: bold; color: #166534; font-size: 15px;">+ R$ ${p.total.toFixed(2)}</span>
            </div>
        `;
    });
}