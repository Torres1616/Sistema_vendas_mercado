import { useSyncExternalStore } from "react";

export type Produto = {
  id_produto: number;
  codigo_barras: string;
  nome_produto: string;
  preco_venda: number;
  estoque_atual: number;
};

export type Lote = {
  id_lote: number;
  id_produto: number;
  quantidade_lote: number;
  data_validade: string; // YYYY-MM-DD
};

export type Cliente = {
  id_cliente: number;
  nome: string;
  telefone: string;
  limite_fiado: number;
  saldo_devedor: number;
};

export type MetodoPagamento = "Dinheiro" | "PIX" | "Cartão" | "Fiado";

export type ItemVenda = {
  id_item: number;
  id_produto: number;
  nome_produto: string;
  quantidade: number;
  preco_unitario_venda: number;
};

export type Venda = {
  id_venda: number;
  id_cliente: number | null;
  metodo_pagamento: MetodoPagamento;
  data_venda: string; // ISO
  valor_total: number;
  itens: ItemVenda[];
};

export type PagamentoFiado = {
  id_pagamento: number;
  id_cliente: number;
  data_pagamento: string;
  valor_pago: number;
};

export type DB = {
  produtos: Produto[];
  lotes: Lote[];
  clientes: Cliente[];
  vendas: Venda[];
  pagamentos_fiado: PagamentoFiado[];
  seq: { produto: number; lote: number; cliente: number; venda: number; item: number; pagamento: number };
};

const KEY = "mercadinho_ricardo_db_v1";

function today(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function seed(): DB {
  return {
    produtos: [
      { id_produto: 1, codigo_barras: "7891000100103", nome_produto: "Leite Integral 1L", preco_venda: 5.49, estoque_atual: 24 },
      { id_produto: 2, codigo_barras: "7891910000197", nome_produto: "Arroz Branco 5kg", preco_venda: 28.9, estoque_atual: 12 },
      { id_produto: 3, codigo_barras: "7891150034303", nome_produto: "Feijão Carioca 1kg", preco_venda: 9.5, estoque_atual: 18 },
      { id_produto: 4, codigo_barras: "7894900011517", nome_produto: "Coca-Cola 2L", preco_venda: 10.0, estoque_atual: 30 },
      { id_produto: 5, codigo_barras: "7891008100013", nome_produto: "Café Pó 500g", preco_venda: 17.9, estoque_atual: 9 },
      { id_produto: 6, codigo_barras: "7896005800019", nome_produto: "Pão de Forma", preco_venda: 8.5, estoque_atual: 15 },
      { id_produto: 7, codigo_barras: "7896036090244", nome_produto: "Açúcar Refinado 1kg", preco_venda: 4.8, estoque_atual: 22 },
      { id_produto: 8, codigo_barras: "7891962047003", nome_produto: "Óleo de Soja 900ml", preco_venda: 7.2, estoque_atual: 16 },
    ],
    lotes: [
      { id_lote: 1, id_produto: 1, quantidade_lote: 12, data_validade: today(5) },
      { id_lote: 2, id_produto: 1, quantidade_lote: 12, data_validade: today(40) },
      { id_lote: 3, id_produto: 6, quantidade_lote: 15, data_validade: today(2) },
      { id_lote: 4, id_produto: 5, quantidade_lote: 9, data_validade: today(60) },
      { id_lote: 5, id_produto: 4, quantidade_lote: 30, data_validade: today(-3) },
      { id_lote: 6, id_produto: 3, quantidade_lote: 18, data_validade: today(120) },
    ],
    clientes: [
      { id_cliente: 1, nome: "Dona Maria", telefone: "(11) 91234-5678", limite_fiado: 200, saldo_devedor: 45.5 },
      { id_cliente: 2, nome: "Seu João", telefone: "(11) 99876-5432", limite_fiado: 300, saldo_devedor: 0 },
      { id_cliente: 3, nome: "Ana Souza", telefone: "(11) 98765-1111", limite_fiado: 200, saldo_devedor: 180 },
    ],
    vendas: [],
    pagamentos_fiado: [],
    seq: { produto: 8, lote: 6, cliente: 3, venda: 0, item: 0, pagamento: 0 },
  };
}

let state: DB = load();
const listeners = new Set<() => void>();

function load(): DB {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as DB;
  } catch {
    return seed();
  }
}

function persist() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export function useDB(): DB {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

export function resetDB() {
  state = seed();
  persist();
}

// --- Status validade ---
export type StatusValidade = "Regular" | "Alerta" | "Vencido";
export function statusValidade(data: string): StatusValidade {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const d = new Date(data + "T00:00:00");
  const diff = Math.ceil((d.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "Vencido";
  if (diff <= 15) return "Alerta";
  return "Regular";
}

// --- Produtos ---
export function addProduto(p: Omit<Produto, "id_produto">): number {
  state.seq.produto += 1;
  const id = state.seq.produto;
  state.produtos.push({ ...p, id_produto: id });
  persist();
  return id;
}
export function updateProduto(id: number, patch: Partial<Produto>) {
  state.produtos = state.produtos.map((p) => (p.id_produto === id ? { ...p, ...patch } : p));
  persist();
}
export function removeProduto(id: number) {
  state.produtos = state.produtos.filter((p) => p.id_produto !== id);
  state.lotes = state.lotes.filter((l) => l.id_produto !== id);
  persist();
}

// --- Lotes ---
export function addLote(l: Omit<Lote, "id_lote">) {
  state.seq.lote += 1;
  state.lotes.push({ ...l, id_lote: state.seq.lote });
  persist();
}
export function removeLote(id: number) {
  state.lotes = state.lotes.filter((l) => l.id_lote !== id);
  persist();
}

// --- Clientes ---
export function addCliente(c: Omit<Cliente, "id_cliente" | "saldo_devedor">) {
  state.seq.cliente += 1;
  state.clientes.push({ ...c, id_cliente: state.seq.cliente, saldo_devedor: 0 });
  persist();
}
export function updateCliente(id: number, patch: Partial<Cliente>) {
  state.clientes = state.clientes.map((c) => (c.id_cliente === id ? { ...c, ...patch } : c));
  persist();
}
export function removeCliente(id: number) {
  state.clientes = state.clientes.filter((c) => c.id_cliente !== id);
  persist();
}

// --- Vendas ---
export function registrarVenda(input: {
  itens: { id_produto: number; quantidade: number }[];
  metodo_pagamento: MetodoPagamento;
  id_cliente: number | null;
}): { ok: true; venda: Venda } | { ok: false; erro: string } {
  if (input.itens.length === 0) return { ok: false, erro: "Carrinho vazio." };

  const itensVenda: ItemVenda[] = [];
  let total = 0;
  for (const it of input.itens) {
    const p = state.produtos.find((x) => x.id_produto === it.id_produto);
    if (!p) return { ok: false, erro: "Produto não encontrado." };
    if (p.estoque_atual < it.quantidade) return { ok: false, erro: `Estoque insuficiente para ${p.nome_produto}.` };

    // bloqueia venda se TODO o estoque do produto está em lotes vencidos
    const lotes = state.lotes.filter((l) => l.id_produto === p.id_produto);
    const totalLotes = lotes.reduce((a, b) => a + b.quantidade_lote, 0);
    const vencidos = lotes.filter((l) => statusValidade(l.data_validade) === "Vencido").reduce((a, b) => a + b.quantidade_lote, 0);
    if (totalLotes > 0 && vencidos === totalLotes) {
      return { ok: false, erro: `${p.nome_produto} está VENCIDO. Venda bloqueada.` };
    }

    state.seq.item += 1;
    itensVenda.push({
      id_item: state.seq.item,
      id_produto: p.id_produto,
      nome_produto: p.nome_produto,
      quantidade: it.quantidade,
      preco_unitario_venda: p.preco_venda,
    });
    total += p.preco_venda * it.quantidade;
  }

  if (input.metodo_pagamento === "Fiado") {
    if (!input.id_cliente) return { ok: false, erro: "Selecione o cliente do fiado." };
    const cli = state.clientes.find((c) => c.id_cliente === input.id_cliente);
    if (!cli) return { ok: false, erro: "Cliente não encontrado." };
    const disponivel = cli.limite_fiado - cli.saldo_devedor;
    if (total > disponivel) {
      return { ok: false, erro: `Limite de fiado insuficiente. Disponível: R$ ${disponivel.toFixed(2)}` };
    }
    cli.saldo_devedor = +(cli.saldo_devedor + total).toFixed(2);
  }

  // baixa de estoque
  for (const it of itensVenda) {
    const p = state.produtos.find((x) => x.id_produto === it.id_produto)!;
    p.estoque_atual -= it.quantidade;
  }

  state.seq.venda += 1;
  const venda: Venda = {
    id_venda: state.seq.venda,
    id_cliente: input.metodo_pagamento === "Fiado" ? input.id_cliente : null,
    metodo_pagamento: input.metodo_pagamento,
    data_venda: new Date().toISOString(),
    valor_total: +total.toFixed(2),
    itens: itensVenda,
  };
  state.vendas.push(venda);
  persist();
  return { ok: true, venda };
}

export function pagarFiado(id_cliente: number, valor: number): { ok: true } | { ok: false; erro: string } {
  const cli = state.clientes.find((c) => c.id_cliente === id_cliente);
  if (!cli) return { ok: false, erro: "Cliente não encontrado." };
  if (valor <= 0) return { ok: false, erro: "Valor deve ser maior que zero." };
  if (valor > cli.saldo_devedor) return { ok: false, erro: "Valor maior que o saldo devedor." };
  cli.saldo_devedor = +(cli.saldo_devedor - valor).toFixed(2);
  state.seq.pagamento += 1;
  state.pagamentos_fiado.push({
    id_pagamento: state.seq.pagamento,
    id_cliente,
    data_pagamento: new Date().toISOString(),
    valor_pago: valor,
  });
  persist();
  return { ok: true };
}

export function brl(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}