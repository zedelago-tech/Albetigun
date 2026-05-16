# Plano de Migração para Backend e Melhorias de Segurança

Este documento descreve os pontos fracos da arquitetura atual (que serve muito bem como um protótipo/MVP) e fornece o esquema de banco de dados SQL necessário para tornar o sistema pronto para produção real.

## ⚠️ Problemas Atuais de Segurança e Estabilidade (MVP)

Atualmente, o aplicativo funciona perfeitamente como um protótipo visual, mas possui as seguintes limitações técnicas que precisam ser resolvidas antes do lançamento real:

1. **Armazenamento Local (LocalStorage):**
   - **O problema:** Os dados (pedidos, produtos) estão sendo salvos no navegador do usuário (`localStorage`). Isso significa que se um cliente fizer um pedido no celular dele, o pedido não vai aparecer no computador do administrador ou da cozinha automaticamente.
   - **A solução:** Criar um backend (API) e um banco de dados real na nuvem para manter os dados sincronizados em tempo real entre todos os dispositivos.

2. **Senhas no Código Fonte (Hardcoded):**
   - **O problema:** As senhas do painel `/admin` e `/cozinha` estão escritas diretamente no código do frontend (ex: `admin123`). Qualquer pessoa com conhecimento básico de programação pode inspecionar a página e descobrir a senha.
   - **A solução:** Implementar um sistema de autenticação real (Login/Senha com hash, tokens JWT ou sessões criptografadas).

3. **Facilidade de Fraude nos Preços:**
   - **O problema:** No modelo atual, o preço do produto vem do frontend. Um usuário mal intencionado poderia manipular os dados no navegador dele e enviar um pedido de uma "Taça de Sorvete" no valor de R$ 0,01.
   - **A solução:** O backend deve sempre validar o preço dos itens consultando o banco de dados seguro antes de fechar o valor do pedido.

---

## 🗄️ Tabelas SQL Necessárias (Estrutura Relacional)

Quando formos migrar o sistema para um banco de dados real (como PostgreSQL ou MySQL), a seguinte estrutura atenderá perfeitamente aos requisitos do nosso cardápio atual (com opções de tamanhos, extras, congelamento e ocultação).

### 1. `users` (Autenticação)
Para gerenciar o acesso ao painel de admin e cozinha.
- `id` (UUID/Int, PK)
- `email` (String, Unique)
- `password_hash` (String)
- `role` (Enum: 'ADMIN', 'COZINHA')
- `created_at` (Timestamp)

### 2. `categories` (Categorias do Cardápio)
Para não deixar categorias soltas em texto.
- `id` (Int, PK)
- `name` (String) - Ex: 'Sorvetes', 'Açaí', 'Lanches'
- `order` (Int) - Para ordenação no cardápio

### 3. `products` (Produtos Principais)
- `id` (Int, PK)
- `name` (String)
- `description` (Text)
- `image_url` (String)
- `base_price` (Decimal 10,2) - Para produtos sem tamanhos fixos
- `category_id` (Int, FK -> categories.id)
- `is_available` (Boolean, default true) - Congelar / Pausar
- `is_hidden` (Boolean, default false) - Esconder do cardápio

### 4. `product_sizes` (Tamanhos e Variações)
Alguns produtos, como Açaí, têm tamanhos (300ml, 500ml) com preços diferentes.
- `id` (Int, PK)
- `product_id` (Int, FK -> products.id)
- `name` (String) - Ex: '300ml', '500ml'
- `price` (Decimal 10,2)

### 5. `product_extras` (Adicionais)
Para gerenciar acompanhamentos (Leite condensado, Nutella, etc).
- `id` (Int, PK)
- `product_id` (Int, FK -> products.id)
- `name` (String)
- `price` (Decimal 10,2)

### 6. `orders` (Pedidos Realizados)
- `id` (String/UUID, PK) - Ex: "ORD.1001"
- `customer_name` (String)
- `customer_phone` (String, opcional)
- `status` (Enum: 'NOVO', 'PREPARANDO', 'PRONTO', 'ENTREGUE', 'CANCELADO')
- `payment_method` (Enum: 'DINHEIRO', 'CARTAO', 'PIX')
- `delivery_type` (Enum: 'MESA', 'BALCAO', 'ENTREGA')
- `table_number` (String, opcional)
- `total_amount` (Decimal 10,2)
- `created_at` (Timestamp)

### 7. `order_items` (Itens do Pedido)
- `id` (Int, PK)
- `order_id` (String, FK -> orders.id)
- `product_id` (Int, FK -> products.id)
- `size_id` (Int, FK -> product_sizes.id, opcional)
- `quantity` (Int)
- `unit_price` (Decimal 10,2) - Preço na hora da compra
- `obs` (Text, opcional)

### 8. `order_item_extras` (Extras Escolhidos em um Item)
Um item pode ter vários extras.
- `id` (Int, PK)
- `order_item_id` (Int, FK -> order_items.id)
- `extra_id` (Int, FK -> product_extras.id)
- `price` (Decimal 10,2) - Preço do extra na hora da compra

---

## Próximos Passos (Quando formos implementar)
1. Escolher um banco de dados e ORM (ex: PostgreSQL + Prisma ORM) ou plataforma Serverless (Firebase/Supabase).
2. Criar as rotas de API no Next.js (`/app/api/...`) para interagir com o banco de dados.
3. Substituir as funções do Frontend que usam `localStorage` por requisições `fetch` para as novas APIs.
4. Implementar sistema de Autenticação real (ex: NextAuth.js) para as rotas `/admin` e `/cozinha`.
