const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// >>> Login dos funcionários (página da cozinha) <<<
const USUARIO_FUNC = 'admin';
const SENHA_FUNC = 'CozinhaAcesso';

// >>> Ajuste aqui com os dados do seu MySQL <<<
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'M3l@@qui15#*;',
  database: 'cantina',
  waitForConnections: true,
  connectionLimit: 10
});

const CATEGORIAS = ['Salgados', 'Bebidas', 'Doces'];

function erroValidacao(msg) {
  const e = new Error(msg);
  e.validacao = true;
  return e;
}

// ---------- Login e proteção das rotas de funcionário ----------
const sessoes = new Set(); // tokens de quem fez login (somem quando o servidor reinicia)

function autenticar(req, res, next) {
  const cab = req.headers.authorization || '';
  const token = cab.startsWith('Bearer ') ? cab.slice(7) : '';
  if (token && sessoes.has(token)) {
    req.token = token;
    return next();
  }
  res.status(401).json({ erro: 'Acesso restrito aos funcionários.' });
}

app.post('/api/login', (req, res) => {
  const { usuario, senha } = req.body || {};
  if (usuario === USUARIO_FUNC && senha === SENHA_FUNC) {
    const token = crypto.randomBytes(24).toString('hex');
    sessoes.add(token);
    return res.json({ token });
  }
  res.status(401).json({ erro: 'Usuário ou senha incorretos.' });
});

app.post('/api/logout', autenticar, (req, res) => {
  sessoes.delete(req.token);
  res.json({ ok: true });
});

// ---------- Upload de fotos (public/uploads) ----------
const pastaUploads = path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(pastaUploads, { recursive: true });
const extensoes = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const upload = multer({
  storage: multer.diskStorage({
    destination: pastaUploads,
    filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1e6) + extensoes[file.mimetype])
  }),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (extensoes[file.mimetype]) cb(null, true);
    else cb(new Error('Envie uma imagem JPG, PNG ou WEBP.'));
  }
});

function apagarFoto(caminho) {
  if (caminho) fs.unlink(path.join(pastaUploads, path.basename(caminho)), () => {});
}

// ---------- Produtos ----------
// "reservado" = unidades que estão em pedidos ainda não entregues (e ainda no caixa aberto)
const SQL_PRODUTOS = `
  SELECT p.id, p.nome, p.categoria, p.descricao, p.foto, p.preco, p.estoque,
         COALESCE(r.reservado, 0) AS reservado
  FROM produtos p
  LEFT JOIN (
    SELECT i.produto_id, SUM(i.quantidade) AS reservado
    FROM itens_pedido i
    JOIN pedidos pe ON pe.id = i.pedido_id
    WHERE pe.status <> 'entregue' AND pe.fechado = 0
    GROUP BY i.produto_id
  ) r ON r.produto_id = p.id
  WHERE p.ativo = 1
  ORDER BY p.nome
`;

function formatarProduto(r) {
  const estoque = r.estoque === null ? null : Number(r.estoque);
  const reservado = Number(r.reservado);
  return {
    id: r.id, nome: r.nome, categoria: r.categoria, descricao: r.descricao, foto: r.foto,
    preco: Number(r.preco), estoque, reservado,
    disponivel: estoque === null ? null : Math.max(estoque - reservado, 0)
  };
}

// Lê e valida os campos do formulário de produto
function lerCamposProduto(body) {
  const nome = String(body.nome || '').trim().slice(0, 80);
  const descricao = String(body.descricao || '').trim().slice(0, 255);
  const categoria = CATEGORIAS.includes(body.categoria) ? body.categoria : null;
  const preco = parseFloat(String(body.preco || '').replace(',', '.'));
  const valido = !!nome && !!categoria && !isNaN(preco) && preco >= 0 && preco <= 9999.99;
  return { nome, descricao, categoria, preco, valido };
}

// Cardápio (público): mostra só quantas unidades ainda podem ser pedidas
app.get('/api/produtos', async (req, res) => {
  try {
    const [rows] = await pool.query(SQL_PRODUTOS);
    res.json(rows.map(formatarProduto).map(p => ({
      id: p.id, nome: p.nome, categoria: p.categoria, descricao: p.descricao,
      foto: p.foto, preco: p.preco, disponivel: p.disponivel
    })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao buscar produtos.' });
  }
});

// Lista completa para a cozinha (com estoque e reservado)
app.get('/api/gestao/produtos', autenticar, async (req, res) => {
  try {
    const [rows] = await pool.query(SQL_PRODUTOS);
    res.json(rows.map(formatarProduto));
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao buscar produtos.' });
  }
});

// Cadastrar produto
app.post('/api/produtos', autenticar, (req, res) => {
  upload.single('foto')(req, res, async (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'A foto deve ter no máximo 3 MB.' : err.message;
      return res.status(400).json({ erro: msg });
    }
    const campos = lerCamposProduto(req.body);
    const foto = req.file ? '/uploads/' + req.file.filename : null;

    let estoque = null; // vazio = sem controle de estoque
    const bruto = String(req.body.estoque ?? '').trim();
    if (bruto !== '') {
      estoque = parseInt(bruto, 10);
      if (isNaN(estoque) || estoque < 0 || estoque > 1000000) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(400).json({ erro: 'Estoque inicial inválido.' });
      }
    }

    if (!campos.valido) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ erro: 'Informe nome, categoria e um preço válido.' });
    }
    try {
      const [r] = await pool.query(
        'INSERT INTO produtos (nome, categoria, descricao, foto, preco, estoque) VALUES (?, ?, ?, ?, ?, ?)',
        [campos.nome, campos.categoria, campos.descricao || null, foto, campos.preco, estoque]
      );
      res.status(201).json({ id: r.insertId });
    } catch (e) {
      console.error(e);
      res.status(500).json({ erro: 'Erro ao salvar o produto.' });
    }
  });
});

// Editar produto (a foto só muda se enviar outra ou marcar "remover")
app.put('/api/produtos/:id', autenticar, (req, res) => {
  upload.single('foto')(req, res, async (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'A foto deve ter no máximo 3 MB.' : err.message;
      return res.status(400).json({ erro: msg });
    }
    const descartarUpload = () => { if (req.file) fs.unlink(req.file.path, () => {}); };
    const campos = lerCamposProduto(req.body);
    if (!campos.valido) {
      descartarUpload();
      return res.status(400).json({ erro: 'Informe nome, categoria e um preço válido.' });
    }
    try {
      const [[atual]] = await pool.query('SELECT foto FROM produtos WHERE id = ? AND ativo = 1', [req.params.id]);
      if (!atual) {
        descartarUpload();
        return res.status(404).json({ erro: 'Produto não encontrado.' });
      }
      let foto = atual.foto;
      if (req.file) foto = '/uploads/' + req.file.filename;
      else if (req.body.remover_foto === '1') foto = null;

      await pool.query(
        'UPDATE produtos SET nome = ?, categoria = ?, descricao = ?, foto = ?, preco = ? WHERE id = ?',
        [campos.nome, campos.categoria, campos.descricao || null, foto, campos.preco, req.params.id]
      );
      if (atual.foto && foto !== atual.foto) apagarFoto(atual.foto);
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      descartarUpload();
      res.status(500).json({ erro: 'Erro ao atualizar o produto.' });
    }
  });
});

// Excluir produto. Fica "inativo" para não quebrar o histórico de pedidos.
app.delete('/api/produtos/:id', autenticar, async (req, res) => {
  try {
    await pool.query('UPDATE produtos SET ativo = 0 WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao excluir o produto.' });
  }
});

// Controle de estoque: { adicionar: n } soma (n pode ser negativo para corrigir),
// { definir: n } define o total e { definir: null } tira o controle de estoque.
app.patch('/api/produtos/:id/estoque', autenticar, async (req, res) => {
  const { adicionar, definir } = req.body || {};
  try {
    if (definir === null) {
      await pool.query('UPDATE produtos SET estoque = NULL WHERE id = ? AND ativo = 1', [req.params.id]);
    } else if (definir !== undefined) {
      const n = Number(definir);
      if (definir === '' || !Number.isInteger(n) || n < 0 || n > 1000000) {
        return res.status(400).json({ erro: 'Quantidade inválida.' });
      }
      await pool.query('UPDATE produtos SET estoque = ? WHERE id = ? AND ativo = 1', [n, req.params.id]);
    } else if (adicionar !== undefined) {
      const n = Number(adicionar);
      if (adicionar === '' || !Number.isInteger(n) || Math.abs(n) > 1000000) {
        return res.status(400).json({ erro: 'Quantidade inválida.' });
      }
      await pool.query(
        'UPDATE produtos SET estoque = GREATEST(COALESCE(estoque, 0) + ?, 0) WHERE id = ? AND ativo = 1',
        [n, req.params.id]
      );
    } else {
      return res.status(400).json({ erro: 'Informe a quantidade.' });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao atualizar o estoque.' });
  }
});

// ---------- Pedidos ----------
const SQL_PEDIDOS = `
  SELECT p.id, p.aluno, p.turma, p.status, p.criado_em,
         pr.nome, i.quantidade, i.preco_unitario
  FROM pedidos p
  JOIN itens_pedido i ON i.pedido_id = p.id
  JOIN produtos pr ON pr.id = i.produto_id
`;

function agrupar(rows) {
  const mapa = new Map();
  for (const r of rows) {
    if (!mapa.has(r.id)) {
      mapa.set(r.id, {
        id: r.id, aluno: r.aluno, turma: r.turma, status: r.status,
        criado_em: r.criado_em, total: 0, itens: []
      });
    }
    const p = mapa.get(r.id);
    const preco = Number(r.preco_unitario);
    p.itens.push({ nome: r.nome, quantidade: r.quantidade, preco });
    p.total = Math.round((p.total + preco * r.quantidade) * 100) / 100;
  }
  return [...mapa.values()];
}

// Criar pedido (aluno). O preço vem do banco e o estoque é conferido aqui.
app.post('/api/pedidos', async (req, res) => {
  const aluno = String(req.body.aluno || '').trim().slice(0, 80);
  const turma = String(req.body.turma || '').trim().slice(0, 40);
  const itens = req.body.itens;
  if (!aluno || !turma || !Array.isArray(itens) || itens.length === 0 || itens.length > 40) {
    return res.status(400).json({ erro: 'Informe nome, turma e ao menos um item.' });
  }

  // Ordem fixa por produto evita travamento entre pedidos feitos ao mesmo tempo
  const ordenados = itens
    .map(i => ({ produto_id: Number(i.produto_id), quantidade: parseInt(i.quantidade, 10) }))
    .sort((a, b) => a.produto_id - b.produto_id);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const codigo = crypto.randomBytes(8).toString('hex');
    const [pedido] = await conn.query(
      'INSERT INTO pedidos (codigo, aluno, turma) VALUES (?, ?, ?)',
      [codigo, aluno, turma]
    );

    for (const item of ordenados) {
      const qtd = item.quantidade;
      if (!qtd || qtd < 1 || qtd > 50) throw erroValidacao('Quantidade inválida.');

      const [prod] = await conn.query(
        'SELECT nome, preco, estoque FROM produtos WHERE id = ? AND ativo = 1 FOR UPDATE',
        [item.produto_id]
      );
      if (prod.length === 0) {
        throw erroValidacao('Um dos produtos não está mais disponível. Atualize o menu e tente de novo.');
      }

      if (prod[0].estoque !== null) {
        const [[linha]] = await conn.query(
          `SELECT COALESCE(SUM(i.quantidade), 0) AS reservado
           FROM itens_pedido i
           JOIN pedidos pe ON pe.id = i.pedido_id
           WHERE i.produto_id = ? AND pe.status <> 'entregue' AND pe.fechado = 0`,
          [item.produto_id]
        );
        const restam = Math.max(prod[0].estoque - Number(linha.reservado), 0);
        if (qtd > restam) {
          throw erroValidacao(
            restam === 0
              ? `"${prod[0].nome}" está esgotado.`
              : `Estoque insuficiente de "${prod[0].nome}": restam ${restam}.`
          );
        }
      }

      await conn.query(
        'INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)',
        [pedido.insertId, item.produto_id, qtd, prod[0].preco]
      );
    }

    await conn.commit();
    res.status(201).json({ id: pedido.insertId, codigo });
  } catch (e) {
    await conn.rollback();
    if (!e.validacao) console.error(e);
    res.status(400).json({ erro: e.validacao ? e.message : 'Erro ao salvar o pedido.' });
  } finally {
    conn.release();
  }
});

// "Meus pedidos": o aluno só vê os pedidos cujos códigos secretos o navegador dele guardou
app.get('/api/meus-pedidos', async (req, res) => {
  const codigos = String(req.query.codigos || '')
    .split(',')
    .filter(c => /^[0-9a-f]{16}$/.test(c))
    .slice(0, 30);
  if (codigos.length === 0) return res.json([]);
  try {
    const [rows] = await pool.query(
      SQL_PEDIDOS + ' WHERE p.codigo IN (?) ORDER BY p.criado_em DESC, p.id DESC, i.id',
      [codigos]
    );
    res.json(agrupar(rows));
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao buscar seus pedidos.' });
  }
});

// Todos os pedidos do dia (só funcionário): alimenta a cozinha e o extrato
app.get('/api/pedidos', autenticar, async (req, res) => {
  try {
    const [rows] = await pool.query(SQL_PEDIDOS + ' WHERE p.fechado = 0 ORDER BY p.criado_em, p.id, i.id');
    res.json(agrupar(rows));
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao buscar pedidos.' });
  }
});

// Mudar o status de um pedido. Ao virar "entregue", baixa o estoque (uma única vez).
app.patch('/api/pedidos/:id/status', autenticar, async (req, res) => {
  const validos = ['novo', 'preparando', 'pronto', 'entregue'];
  const { status } = req.body || {};
  if (!validos.includes(status)) return res.status(400).json({ erro: 'Status inválido.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[pedido]] = await conn.query('SELECT status FROM pedidos WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!pedido) throw erroValidacao('Pedido não encontrado.');
    if (pedido.status === 'entregue' && status !== 'entregue') {
      throw erroValidacao('Este pedido já foi entregue.');
    }

    if (pedido.status !== 'entregue' && status === 'entregue') {
      const [itens] = await conn.query(
        'SELECT produto_id, quantidade FROM itens_pedido WHERE pedido_id = ? ORDER BY produto_id',
        [req.params.id]
      );
      for (const it of itens) {
        await conn.query(
          'UPDATE produtos SET estoque = GREATEST(estoque - ?, 0) WHERE id = ? AND estoque IS NOT NULL',
          [it.quantidade, it.produto_id]
        );
      }
    }

    await conn.query('UPDATE pedidos SET status = ? WHERE id = ?', [status, req.params.id]);
    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    if (!e.validacao) console.error(e);
    res.status(e.validacao ? 400 : 500).json({ erro: e.validacao ? e.message : 'Erro ao atualizar o pedido.' });
  } finally {
    conn.release();
  }
});

// Fechar o caixa: os pedidos atuais saem do extrato, mas continuam guardados no banco
app.post('/api/fechar-caixa', autenticar, async (req, res) => {
  try {
    await pool.query('UPDATE pedidos SET fechado = 1 WHERE fechado = 0');
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao fechar o caixa.' });
  }
});

const PORTA = 3000;
app.listen(PORTA, () => console.log(`Inova Isnack rodando em http://localhost:${PORTA}`));
