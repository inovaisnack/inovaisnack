CREATE DATABASE IF NOT EXISTS cantina CHARACTER SET utf8mb4;
USE cantina;

CREATE TABLE IF NOT EXISTS produtos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(80) NOT NULL,
  preco DECIMAL(6,2) NOT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente VARCHAR(80) NOT NULL,
  status ENUM('novo','preparando','pronto','entregue') NOT NULL DEFAULT 'novo',
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS itens_pedido (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  produto_id INT NOT NULL,
  quantidade INT NOT NULL,
  preco_unitario DECIMAL(6,2) NOT NULL,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

INSERT INTO produtos (nome, preco) VALUES
  ('Coxinha', 6.00),
  ('Pão de queijo', 4.50),
  ('Misto quente', 7.00),
  ('Pastel de forno', 6.50),
  ('Suco natural', 5.00),
  ('Refrigerante lata', 5.50),
  ('Água', 3.00),
  ('Bolo (fatia)', 5.00);
