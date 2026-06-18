import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { brl, registrarVenda, useDB, type MetodoPagamento } from "@/lib/store";

export const Route = createFileRoute("/pdv")({
  head: () => ({ meta: [{ title: "Vender — Mercadinho do Ricardo" }] }),
  component: PDV,
});

type CartItem = { id_produto: number; quantidade: number };

function PDV() {
  const db = useDB();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [busca, setBusca] = useState("");
  const [carrinho, setCarrinho] = useState<CartItem[]>([]);
  const [metodo, setMetodo] = useState<MetodoPagamento>("Dinheiro");
  const [idCliente, setIdCliente] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [valorRecebido, setValorRecebido] = useState("");

  const produtosFiltrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return db.produtos;
    return db.produtos.filter(
      (p) => p.nome_produto.toLowerCase().includes(t) || p.codigo_barras.includes(t),
    );
  }, [db.produtos, busca]);

  const total = carrinho.reduce((s, it) => {
    const p = db.produtos.find((x) => x.id_produto === it.id_produto);
    return s + (p?.preco_venda ?? 0) * it.quantidade;
  }, 0);

  function addAoCarrinho(id_produto: number) {
    setCarrinho((prev) => {
      setMsg(null);
      const found = prev.find((i) => i.id_produto === id_produto);
      if (found) return prev.map((i) => (i.id_produto === id_produto ? { ...i, quantidade: i.quantidade + 1 } : i));
      return [...prev, { id_produto, quantidade: 1 }];
    });
  }
  function mudarQtd(id_produto: number, delta: number) {
    setMsg(null);
    setCarrinho((prev) =>
      prev
        .map((i) => (i.id_produto === id_produto ? { ...i, quantidade: i.quantidade + delta } : i))
        .filter((i) => i.quantidade > 0),
    );
  }
  function remover(id_produto: number) {
    setMsg(null);
    setCarrinho((prev) => prev.filter((i) => i.id_produto !== id_produto));
  }

  function abrirConfirmacao() {
    setMsg(null);
    if (carrinho.length === 0) return;
    if (metodo === "Fiado" && !idCliente) {
      setMsg({ tipo: "erro", texto: "Escolha o cliente do fiado antes de continuar." });
      return;
    }
    setValorRecebido("");
    setConfirmando(true);
  }

  function confirmarVenda() {
    setMsg(null);
    const r = registrarVenda({
      itens: carrinho.map((c) => ({ id_produto: c.id_produto, quantidade: c.quantidade })),
      metodo_pagamento: metodo,
      id_cliente: metodo === "Fiado" ? idCliente : null,
    });
    if (!r.ok) {
      setConfirmando(false);
      setMsg({ tipo: "erro", texto: r.erro });
      return;
    }
    setMsg({ tipo: "ok", texto: `Venda registrada! Total: ${brl(r.venda.valor_total)}` });
    setCarrinho([]);
    setIdCliente(null);
    setMetodo("Dinheiro");
    setConfirmando(false);
  }

  if (!mounted) return <div className="min-h-[60vh]" />;

  const troco =
    metodo === "Dinheiro" && valorRecebido ? Math.max(0, Number(valorRecebido) - total) : 0;
  const clienteSel = idCliente ? db.clientes.find((c) => c.id_cliente === idCliente) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6">
      <section aria-labelledby="produtos-titulo" className="space-y-4">
        <h1 id="produtos-titulo">Produtos</h1>
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou código de barras..."
          className="w-full px-4 py-4 text-xl rounded-lg border-2 border-input bg-card"
          aria-label="Buscar produto"
        />
        <ul className="space-y-2">
          {produtosFiltrados.map((p) => (
            <li
              key={p.id_produto}
              className="flex items-center justify-between gap-3 p-4 rounded-lg bg-card border-2 border-border"
            >
              <div>
                <div className="text-xl font-semibold">{p.nome_produto}</div>
                <div className="text-muted-foreground">
                  {brl(p.preco_venda)} • Estoque: {p.estoque_atual}
                </div>
              </div>
              <button
                onClick={() => addAoCarrinho(p.id_produto)}
                disabled={p.estoque_atual <= 0}
                className="bg-primary text-primary-foreground px-5 py-3 rounded-lg text-lg font-bold disabled:opacity-40"
              >
                ➕ Adicionar
              </button>
            </li>
          ))}
          {produtosFiltrados.length === 0 && <p>Nenhum produto encontrado.</p>}
        </ul>
      </section>

      <aside className="space-y-4 lg:sticky lg:top-24 self-start">
        <h2>🛒 Carrinho</h2>
        <div className="rounded-xl bg-card border-2 border-border p-4 space-y-3">
          {carrinho.length === 0 ? (
            <p className="text-muted-foreground">Nenhum item adicionado.</p>
          ) : (
            <ul className="space-y-2">
              {carrinho.map((it) => {
                const p = db.produtos.find((x) => x.id_produto === it.id_produto)!;
                return (
                  <li key={it.id_produto} className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-semibold">{p.nome_produto}</div>
                      <div className="text-muted-foreground">
                        {brl(p.preco_venda)} × {it.quantidade} = {brl(p.preco_venda * it.quantidade)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        aria-label="Diminuir"
                        onClick={() => mudarQtd(it.id_produto, -1)}
                        className="w-10 h-10 rounded-lg bg-secondary text-2xl font-bold"
                      >
                        −
                      </button>
                      <span className="w-10 text-center text-xl">{it.quantidade}</span>
                      <button
                        aria-label="Aumentar"
                        onClick={() => mudarQtd(it.id_produto, +1)}
                        className="w-10 h-10 rounded-lg bg-secondary text-2xl font-bold"
                        disabled={it.quantidade >= p.estoque_atual}
                      >
                        +
                      </button>
                      <button
                        aria-label="Remover"
                        onClick={() => remover(it.id_produto)}
                        className="ml-1 w-10 h-10 rounded-lg bg-destructive text-destructive-foreground text-xl"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="border-t-2 border-border pt-3 flex justify-between text-2xl font-bold">
            <span>Total</span>
            <span>{brl(total)}</span>
          </div>
        </div>

        <div className="rounded-xl bg-card border-2 border-border p-4 space-y-3">
          <h3>Forma de Pagamento</h3>
          <div className="grid grid-cols-2 gap-2">
            {(["Dinheiro", "PIX", "Cartão", "Fiado"] as MetodoPagamento[]).map((m) => (
              <button
                key={m}
                onClick={() => setMetodo(m)}
                className={`py-4 rounded-lg text-lg font-bold border-2 ${
                  metodo === m ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border"
                }`}
              >
                {m === "Dinheiro" ? "💵" : m === "PIX" ? "📱" : m === "Cartão" ? "💳" : "📒"} {m}
              </button>
            ))}
          </div>
          {metodo === "Fiado" && (
            <div className="space-y-1">
              <label className="font-semibold" htmlFor="cliente">Cliente:</label>
              <select
                id="cliente"
                value={idCliente ?? ""}
                onChange={(e) => setIdCliente(e.target.value ? Number(e.target.value) : null)}
                className="w-full p-3 rounded-lg border-2 border-input bg-card text-lg"
              >
                <option value="">— escolha —</option>
                {db.clientes.map((c) => (
                  <option key={c.id_cliente} value={c.id_cliente}>
                    {c.nome} (disp.: {brl(c.limite_fiado - c.saldo_devedor)})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {msg && (
          <div
            role="status"
            className={`p-4 rounded-lg text-lg font-semibold ${
              msg.tipo === "ok"
                ? "bg-primary text-primary-foreground"
                : "bg-destructive text-destructive-foreground"
            }`}
          >
            {msg.texto}
          </div>
        )}

        <button
          onClick={abrirConfirmacao}
          disabled={carrinho.length === 0}
          className="w-full bg-primary text-primary-foreground py-5 rounded-xl text-2xl font-bold disabled:opacity-40"
        >
          Finalizar Venda
        </button>
      </aside>

      {confirmando && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="conf-title"
          className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmando(false); }}
        >
          <div className="bg-card border-2 border-border rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div>
              <div className="text-sm uppercase tracking-widest text-muted-foreground font-semibold">
                Confirme antes de cobrar
              </div>
              <h2 id="conf-title" className="mt-1">Conferir Venda</h2>
            </div>

            <ul className="space-y-1 max-h-56 overflow-auto border-y border-border py-3">
              {carrinho.map((it) => {
                const p = db.produtos.find((x) => x.id_produto === it.id_produto)!;
                return (
                  <li key={it.id_produto} className="flex justify-between text-lg">
                    <span>{it.quantidade}× {p.nome_produto}</span>
                    <span className="tabular-nums font-semibold">{brl(p.preco_venda * it.quantidade)}</span>
                  </li>
                );
              })}
            </ul>

            <div className="flex justify-between items-center text-2xl font-bold">
              <span>Total a cobrar</span>
              <span className="tabular-nums">{brl(total)}</span>
            </div>

            <div className="rounded-lg bg-secondary px-4 py-3 text-lg">
              Forma: <strong>{metodo}</strong>
              {metodo === "Fiado" && clienteSel && <> — <strong>{clienteSel.nome}</strong></>}
            </div>

            {metodo === "Dinheiro" && (
              <div className="space-y-2">
                <label className="font-semibold text-lg">Valor recebido (opcional)</label>
                <input
                  type="number" step="0.01" min="0"
                  value={valorRecebido}
                  onChange={(e) => setValorRecebido(e.target.value)}
                  placeholder="Para calcular o troco"
                  className="w-full px-4 py-3 text-xl rounded-lg border-2 border-input bg-background"
                />
                {Number(valorRecebido) > 0 && (
                  <div className={`text-lg font-semibold ${Number(valorRecebido) < total ? "text-destructive" : "text-success"}`}>
                    {Number(valorRecebido) < total
                      ? `Faltam ${brl(total - Number(valorRecebido))}`
                      : `Troco: ${brl(troco)}`}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setConfirmando(false)}
                className="py-4 rounded-xl text-xl font-bold bg-secondary border-2 border-border"
              >
                ← Voltar e ajustar
              </button>
              <button
                onClick={confirmarVenda}
                className="py-4 rounded-xl text-xl font-bold bg-primary text-primary-foreground"
              >
                ✅ Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}