-- ATENÇÃO: este script APAGA e recria o banco "cantina" (use só para recomeçar do zero).
DROP DATABASE IF EXISTS cantina;
CREATE DATABASE cantina CHARACTER SET utf8mb4;
USE cantina;

CREATE TABLE produtos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(80) NOT NULL,
  categoria ENUM('Salgados','Bebidas','Doces') NOT NULL DEFAULT 'Salgados',
  descricao VARCHAR(255) NULL,
  foto VARCHAR(255) NULL,
  preco DECIMAL(6,2) NOT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo CHAR(16) NOT NULL UNIQUE,          -- código secreto que fica só no navegador do aluno
  aluno VARCHAR(80) NOT NULL,
  turma VARCHAR(40) NOT NULL,
  status ENUM('novo','preparando','pronto','entregue') NOT NULL DEFAULT 'novo',
  fechado TINYINT(1) NOT NULL DEFAULT 0,    -- 1 = já entrou num fechamento de caixa
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE itens_pedido (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  produto_id INT NOT NULL,
  quantidade INT NOT NULL,
  preco_unitario DECIMAL(6,2) NOT NULL,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

INSERT INTO produtos (nome, categoria, descricao, preco) VALUES
  ('Coxinha', 'Salgados', 'Coxinha de frango frita na hora', 6.00),
  ('Pão de queijo', 'Salgados', 'Quentinho, direto do forno', 4.50),
  ('Misto quente', 'Salgados', 'Pão, presunto e queijo', 7.00),
  ('Suco natural', 'Bebidas', 'Suco de fruta da estação', 5.00),
  ('Refrigerante lata', 'Bebidas', NULL, 5.50),
  ('Água', 'Bebidas', NULL, 3.00),
  ('Bolo (fatia)', 'Doces', 'Bolo caseiro', 5.00);
