// Função para alternar entre as telas principais (Menu do Topo)
function mostrarTela(nomeTela) {
    // Esconde todas as seções
    const secoes = document.querySelectorAll('.section-page');
    secoes.forEach(secao => secao.classList.add('hidden'));

    // Remove destaque de todos os botões do topo
    const botoes = document.querySelectorAll('.nav-btn');
    botoes.forEach(btn => btn.classList.remove('active'));

    // Mostra a tela selecionada
    const telaAlvo = document.getElementById(`tela-${nomeTela}`);
    if (telaAlvo) {
        telaAlvo.classList.remove('hidden');
    }

    // Ativa o botão selecionado
    event.currentTarget.classList.add('active');
}

// Função para simular o login de funcionários
function realizarLogin(event) {
    event.preventDefault();

    // Esconde a tela de login e mostra o painel restrito
    document.getElementById('tela-login-func').classList.add('hidden');
    document.getElementById('tela-painel-func').classList.remove('hidden');
}

// Função para navegar nas abas da área do funcionário (Estoque, Pedidos, Extrato)
function mostrarSubTela(nomeSubTela) {
    const subSecoes = document.querySelectorAll('.subsection-page');
    subSecoes.forEach(sub => sub.classList.add('hidden'));

    const subBotoes = document.querySelectorAll('.subnav-btn');
    subBotoes.forEach(btn => btn.classList.remove('active'));

    const subAlvo = document.getElementById(`subtela-${nomeSubTela}`);
    if (subAlvo) {
        subAlvo.classList.remove('hidden');
    }

    event.currentTarget.classList.add('active');
}

// Estrutura pronta para a futura lógica do carrinho/pedidos
function adicionarAoCarrinho(nomeItem, preco) {
    alert(`Item "${nomeItem}" adicionado! (Em breve integraremos ao carrinho)`);
}