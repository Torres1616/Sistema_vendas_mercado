import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addLote,
  addProduto,
  brl,
  removeLote,
  removeProduto,
  statusValidade,
  updateProduto,
  useDB,
} from "@/lib/store";

export const Route = createFileRoute("/produtos")({
  head: () => ({ meta: [{ title: "Produtos — Mercadinho do Ricardo" }] }),
  component: Produtos,
});

function Produtos() {
  const db = useDB();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Formulário unificado: cadastra produto + lote de uma vez.
  // Ao bipar o código (ou digitar), se o produto já existir, autopreenche
  // nome, preço e a última data de validade conhecida.
  const [form, setForm] = useState({
    codigo_barras: "",
    nome_produto: "",
    preco_venda: "",
    quantidade: "",
    data_validade: "",
    reusar_validade: true,
  });
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro" | "info"; texto: string } | null>(null);
  const [busca, setBusca] = useState("");
  const codigoRef = useRef<HTMLInputElement>(null);

  const produtoExistente = useMemo(() => {
    const cod = form.codigo_barras.trim();
    if (!cod) return null;
    return db.produtos.find((p) => p.codigo_barras === cod) ?? null;
  }, [form.codigo_barras, db.produtos]);

  const ultimoLote = useMemo(() => {
    if (!produtoExistente) return null;
    const lotes = db.lotes.filter((l) => l.id_produto === produtoExistente.id_produto);
    if (lotes.length === 0) return null;
    return [...lotes].sort((a, b) => b.data_validade.localeCompare(a.data_validade))[0];
  }, [produtoExistente, db.lotes]);

  // Autopreencher quando código bate com produto existente
  useEffect(() => {
    if (!produtoExistente) return;
    setForm((f) => ({
      ...f,
      nome_produto: f.nome_produto || produtoExistente.nome_produto,
      preco_venda: f.preco_venda || String(produtoExistente.preco_venda),
      data_validade:
        f.data_validade || (f.reusar_validade && ultimoLote ? ultimoLote.data_validade : f.data_validade),
    }));
    setAviso({
      tipo: "info",
      texto: ultimoLote
        ? `Produto reconhecido: ${produtoExistente.nome_produto}. Validade do último lote reaproveitada.`
        : `Produto reconhecido: ${produtoExistente.nome_produto}. Informe a validade deste lote.`,
    });
  }, [produtoExistente, ultimoLote]);

  function limpar() {
    setForm({ codigo_barras: "", nome_produto: "", preco_venda: "", quantidade: "", data_validade: "", reusar_validade: true });
    setAviso(null);
    codigoRef.current?.focus();
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setAviso(null);
    const qtd = Number(form.quantidade || 0);
    const preco = Number(form.preco_venda || 0);
    if (!form.nome_produto.trim()) return setAviso({ tipo: "erro", texto: "Informe o nome do produto." });
    if (preco <= 0) return setAviso({ tipo: "erro", texto: "Preço deve ser maior que zero." });
    if (qtd <= 0) return setAviso({ tipo: "erro", texto: "Informe a quantidade que está entrando." });

    let id = produtoExistente?.id_produto;
    if (produtoExistente) {
      updateProduto(produtoExistente.id_produto, {
        nome_produto: form.nome_produto,
        preco_venda: preco,
        estoque_atual: produtoExistente.estoque_atual + qtd,
      });
    } else {
      id = addProduto({
        codigo_barras: form.codigo_barras.trim(),
        nome_produto: form.nome_produto.trim(),
        preco_venda: preco,
        estoque_atual: qtd,
      });
    }
    if (form.data_validade && id) {
      addLote({ id_produto: id, quantidade_lote: qtd, data_validade: form.data_validade });
    }
    setAviso({ tipo: "ok", texto: `Entrada registrada: ${qtd}× ${form.nome_produto}.` });
    limpar();
  }

  if (!mounted) return <div className="min-h-[60vh]" />;

  const termo = busca.trim().toLowerCase();
  const listaProdutos = termo
    ? db.produtos.filter(
        (p) => p.nome_produto.toLowerCase().includes(termo) || p.codigo_barras.includes(termo),
      )
    : db.produtos;

  return (
    <div className="space-y-8">
      <h1>📦 Produtos e Estoque</h1>

      <section className="bg-card border-2 border-border rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm uppercase tracking-widest text-muted-foreground font-semibold">Entrada de mercadoria</div>
            <h2 className="mt-1">Bipar / Cadastrar Produto</h2>
            <p className="text-muted-foreground text-base mt-1">
              Passe o código de barras. Se o produto já existir, o sistema preenche tudo sozinho — você só confirma a quantidade.
            </p>
          </div>
          {produtoExistente && (
            <span className="inline-flex items-center gap-2 bg-success/15 text-success px-3 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide">
              ● Produto reconhecido
            </span>
          )}
        </div>

        <form onSubmit={salvar} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5">
            <label className="font-semibold block mb-1">📷 Código de barras</label>
            <input
              ref={codigoRef}
              autoFocus
              className="campo w-full text-xl tracking-widest"
              placeholder="Bipe ou digite e tecle Enter"
              value={form.codigo_barras}
              onChange={(e) => setForm({ ...form, codigo_barras: e.target.value })}
            />
          </div>
          <div className="md:col-span-4">
            <label className="font-semibold block mb-1">Nome do produto *</label>
            <input
              className="campo w-full"
              required
              value={form.nome_produto}
              onChange={(e) => setForm({ ...form, nome_produto: e.target.value })}
              disabled={!!produtoExistente}
            />
          </div>
          <div className="md:col-span-3">
            <label className="font-semibold block mb-1">Preço (R$) *</label>
            <input
              type="number" step="0.01" min="0" required
              className="campo w-full"
              value={form.preco_venda}
              onChange={(e) => setForm({ ...form, preco_venda: e.target.value })}
            />
          </div>

          <div className="md:col-span-3">
            <label className="font-semibold block mb-1">Quantidade entrando *</label>
            <input
              type="number" min="1" required
              className="campo w-full"
              value={form.quantidade}
              onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
            />
          </div>
          <div className="md:col-span-4">
            <label className="font-semibold block mb-1">
              Data de validade {ultimoLote && form.reusar_validade ? "(reaproveitada)" : ""}
            </label>
            <input
              type="date"
              className="campo w-full"
              value={form.data_validade}
              onChange={(e) => setForm({ ...form, data_validade: e.target.value, reusar_validade: false })}
            />
            {ultimoLote && (
              <label className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={form.reusar_validade}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      reusar_validade: e.target.checked,
                      data_validade: e.target.checked ? ultimoLote.data_validade : "",
                    }))
                  }
                />
                Reutilizar validade do último lote
              </label>
            )}
          </div>
          <div className="md:col-span-5 flex gap-2">
            <button type="submit" className="flex-1 bg-primary text-primary-foreground py-4 px-5 rounded-xl text-lg font-bold">
              ➕ Adicionar ao estoque
            </button>
            <button type="button" onClick={limpar} className="bg-secondary border-2 border-border px-5 rounded-xl text-lg font-bold">
              Limpar
            </button>
          </div>
        </form>

        {aviso && (
          <div className={`p-3 rounded-lg font-semibold ${
            aviso.tipo === "ok" ? "bg-success/15 text-success"
            : aviso.tipo === "erro" ? "bg-destructive text-destructive-foreground"
            : "bg-primary/10 text-primary"
          }`}>
            {aviso.texto}
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-wrap justify-between items-end gap-3 mb-3">
          <h2>Lista de Produtos</h2>
          <input
            type="search"
            placeholder="🔍 Buscar por nome ou código..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="campo w-full sm:w-80"
          />
        </div>
        <ul className="space-y-2">
          {listaProdutos.map((p) => (
            <li key={p.id_produto} className="bg-card border-2 border-border rounded-xl p-4 flex flex-wrap items-center gap-3 justify-between">
              <div>
                <div className="text-xl font-semibold">{p.nome_produto}</div>
                <div className="text-muted-foreground">Cód.: {p.codigo_barras || "—"}</div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  Preço:
                  <input
                    type="number" step="0.01" defaultValue={p.preco_venda}
                    onBlur={(e) => updateProduto(p.id_produto, { preco_venda: Number(e.target.value) })}
                    className="campo w-28"
                  />
                </label>
                <label className="flex items-center gap-2">
                  Estoque:
                  <input
                    type="number" defaultValue={p.estoque_atual}
                    onBlur={(e) => updateProduto(p.id_produto, { estoque_atual: Number(e.target.value) })}
                    className="campo w-20"
                  />
                </label>
                <span className="font-bold text-lg">{brl(p.preco_venda)}</span>
                <button
                  onClick={() => confirm(`Excluir ${p.nome_produto}?`) && removeProduto(p.id_produto)}
                  className="bg-destructive text-destructive-foreground px-4 py-2 rounded-lg font-bold"
                >
                  🗑 Excluir
                </button>
              </div>
            </li>
          ))}
          {listaProdutos.length === 0 && <p className="text-muted-foreground">Nenhum produto encontrado.</p>}
        </ul>
      </section>

      <section>
        <h2 className="mb-3">Lotes Cadastrados (Validade)</h2>
        <ul className="space-y-2">
          {db.lotes.map((l) => {
            const p = db.produtos.find((x) => x.id_produto === l.id_produto);
            const st = statusValidade(l.data_validade);
            const cor =
              st === "Vencido" ? "bg-destructive text-destructive-foreground"
              : st === "Alerta" ? "bg-[oklch(0.92_0.12_75)] text-[oklch(0.25_0.05_75)]"
              : "bg-secondary";
            return (
              <li key={l.id_lote} className={`p-3 rounded-lg flex flex-wrap justify-between gap-2 items-center ${cor}`}>
                <span className="font-semibold">{p?.nome_produto}</span>
                <span>Qtd: {l.quantidade_lote}</span>
                <span>Vence: {new Date(l.data_validade + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                <span className="font-bold uppercase">{st}</span>
                <button onClick={() => removeLote(l.id_lote)} className="underline">remover</button>
              </li>
            );
          })}
          {db.lotes.length === 0 && <p className="text-muted-foreground">Nenhum lote cadastrado.</p>}
        </ul>
      </section>

      <style>{`.campo{padding:.65rem .75rem;border:2px solid var(--input);border-radius:.6rem;background:var(--card);font-size:1.05rem;}`}</style>
    </div>
  );
}