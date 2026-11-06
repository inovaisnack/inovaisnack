const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
app.use(express.json());

// >>> Login da cozinha: troque a senha! <<<
const USUARIO_COZINHA = 'cozinha';
const SENHA_COZINHA = 'CozinhaAcesso';

function autenticar(req, res, next) {
  const cab = req.headers.authorization || '';
  const [tipo, codigo] = cab.split(' ');
  if (tipo === 'Basic' && codigo) {
    const [usuario, ...resto] = Buffer.from(codigo, 'base64').toString().split(':');
    if (usuario === USUARIO_COZINHA && resto.join(':') === SENHA_COZINHA) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="Cozinha"');
  res.status(401).send('Acesso restrito à cozinha.');
}

// A página da cozinha precisa de senha (tem que vir antes do express.static)
app.use('/cozinha.html', autenticar);
app.use(express.static(path.join(__dirname, 'public')));

// Upload de fotos dos produtos (salvas em public/uploads)
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

// >>> Ajuste aqui com os dados do seu MySQL <<<
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'M3l@@qui15#*;',
  database: 'cantina',
  waitForConnections: true,
  connectionLimit: 10
});

// Lista de produtos do cardápio
app.get('/api/produtos', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, nome, descricao, foto, preco FROM produtos WHERE ativo = 1 ORDER BY nome');
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao buscar produtos' });
  }
});

// Cadastra um produto novo (só a cozinha)
app.post('/api/produtos', autenticar, (req, res) => {
  upload.single('foto')(req, res, async (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'A foto deve ter no máximo 3 MB.' : err.message;
      return res.status(400).json({ erro: msg });
    }
    const nome = (req.body.nome || '').trim();
    const descricao = (req.body.descricao || '').trim();
    const preco = parseFloat(String(req.body.preco || '').replace(',', '.'));
    const foto = req.file ? '/uploads/' + req.file.filename : null;

    if (!nome || isNaN(preco) || preco < 0) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ erro: 'Informe o nome e um preço válido.' });
    }
    try {
      const [r] = await pool.query(
        'INSERT INTO produtos (nome, descricao, foto, preco) VALUES (?, ?, ?, ?)',
        [nome, descricao || null, foto, preco]
      );
      res.status(201).json({ id: r.insertId });
    } catch (e) {
      console.error(e);
      res.status(500).json({ erro: 'Erro ao salvar o produto.' });
    }
  });
});

// Cria um pedido (o preço vem do banco, não do navegador)
app.post('/api/pedidos', async (req, res) => {
  const { cliente, itens } = req.body;
  if (!cliente || !cliente.trim() || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ erro: 'Informe o nome e ao menos um item.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [pedido] = await conn.query('INSERT INTO pedidos (cliente) VALUES (?)', [cliente.trim()]);

    for (const item of itens) {
      const qtd = parseInt(item.quantidade, 10);
      if (!qtd || qtd < 1) throw new Error('Quantidade inválida.');
      const [prod] = await conn.query('SELECT preco FROM produtos WHERE id = ? AND ativo = 1', [item.produto_id]);
      if (prod.length === 0) throw new Error('Produto inválido.');
      await conn.query(
        'INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)',
        [pedido.insertId, item.produto_id, qtd, prod[0].preco]
      );
    }

    await conn.commit();
    res.status(201).json({ id: pedido.insertId });
  } catch (e) {
    await conn.rollback();
    res.status(400).json({ erro: e.message });
  } finally {
    conn.release();
  }
});

// Pedidos em andamento (para a cozinha)
app.get('/api/pedidos', autenticar, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.id, p.cliente, p.status, p.criado_em, pr.nome, i.quantidade
      FROM pedidos p
      JOIN itens_pedido i ON i.pedido_id = p.id
      JOIN produtos pr ON pr.id = i.produto_id
      WHERE p.status IN ('novo','preparando','pronto')
      ORDER BY p.criado_em, p.id
    `);

    const mapa = new Map();
    for (const r of rows) {
      if (!mapa.has(r.id)) {
        mapa.set(r.id, { id: r.id, cliente: r.cliente, status: r.status, criado_em: r.criado_em, itens: [] });
      }
      mapa.get(r.id).itens.push({ nome: r.nome, quantidade: r.quantidade });
    }
    res.json([...mapa.values()]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao buscar pedidos' });
  }
});

// Atualiza o status de um pedido
app.patch('/api/pedidos/:id/status', autenticar, async (req, res) => {
  const validos = ['novo', 'preparando', 'pronto', 'entregue'];
  const { status } = req.body;
  if (!validos.includes(status)) return res.status(400).json({ erro: 'Status inválido' });
  try {
    await pool.query('UPDATE pedidos SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao atualizar' });
  }
});

const PORTA = 3000;
app.listen(PORTA, () => console.log(`Cantina rodando em http://localhost:${PORTA}`));