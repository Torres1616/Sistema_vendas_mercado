import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { addCliente, brl, removeCliente, updateCliente, useDB, type Cliente } from "@/lib/store";

export const Route = createFileRoute("/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Mercadinho do Ricardo" }] }),
  component: Clientes,
});

function Clientes() {
  const db = useDB();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [form, setForm] = useState({ nome: "", telefone: "", limite_fiado: "200" });

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome) return;
    addCliente({
      nome: form.nome,
      telefone: form.telefone,
      limite_fiado: Number(form.limite_fiado || 200),
    });
    setForm({ nome: "", telefone: "", limite_fiado: "200" });
  }

  if (!mounted) return <div className="min-h-[60vh]" />;

  const devendo = db.clientes.filter((c) => c.saldo_devedor > 0);
  const emDia = db.clientes.filter((c) => c.saldo_devedor <= 0);

  return (
    <div className="space-y-8">
      <h1>👥 Clientes</h1>

      <section className="bg-card border-2 border-border rounded-xl p-5">
        <h2 className="mb-3">Cadastrar Cliente</h2>
        <form onSubmit={salvar} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <label className="flex flex-col gap-1">
            <span className="font-semibold">Nome *</span>
            <input className="campo" required value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-semibold">Telefone</span>
            <input className="campo" value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-semibold">Limite de Fiado (R$)</span>
            <input type="number" step="0.01" className="campo" value={form.limite_fiado}
              onChange={(e) => setForm({ ...form, limite_fiado: e.target.value })} />
          </label>
          <button className="bg-primary text-primary-foreground py-3 px-5 rounded-lg text-lg font-bold">
            ➕ Salvar
          </button>
        </form>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2><span className="text-destructive">●</span> Devendo <span className="text-muted-foreground text-base font-normal">({devendo.length})</span></h2>
        </div>
        {devendo.length === 0 ? (
          <p className="p-4 bg-secondary rounded-lg text-lg">Ninguém devendo no momento. 🎉</p>
        ) : (
          <ul className="space-y-2">
            {devendo.map((c) => <ClienteRow key={c.id_cliente} c={c} />)}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2><span className="text-success">●</span> Em dia <span className="text-muted-foreground text-base font-normal">({emDia.length})</span></h2>
        </div>
        {emDia.length === 0 ? (
          <p className="text-muted-foreground">Nenhum cliente em dia ainda.</p>
        ) : (
          <ul className="space-y-2">
            {emDia.map((c) => <ClienteRow key={c.id_cliente} c={c} />)}
          </ul>
        )}
      </section>

      <style>{`.campo{padding:.65rem .75rem;border:2px solid var(--input);border-radius:.6rem;background:var(--card);font-size:1.05rem;}`}</style>
    </div>
  );
}

function ClienteRow({ c }: { c: Cliente }) {
  const db = useDB();
  const [aberto, setAberto] = useState(false);
  const disp = c.limite_fiado - c.saldo_devedor;
  const devendo = c.saldo_devedor > 0;

  const agenda = useMemo(() => {
    const vendas = db.vendas.filter((v) => v.id_cliente === c.id_cliente && v.metodo_pagamento === "Fiado");
    const pagamentos = db.pagamentos_fiado.filter((p) => p.id_cliente === c.id_cliente);
    const meses = new Map<string, { compras: number; pagamentos: number; itens: number }>();
    const get = (k: string) => {
      let m = meses.get(k);
      if (!m) { m = { compras: 0, pagamentos: 0, itens: 0 }; meses.set(k, m); }
      return m;
    };
    for (const v of vendas) {
      const k = v.data_venda.slice(0, 7);
      const m = get(k);
      m.compras += v.valor_total;
      m.itens += v.itens.reduce((s, i) => s + i.quantidade, 0);
    }
    for (const p of pagamentos) {
      const k = p.data_pagamento.slice(0, 7);
      get(k).pagamentos += p.valor_pago;
    }
    return [...meses.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [db.vendas, db.pagamentos_fiado, c.id_cliente]);

  function nomeMes(ym: string) {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }

  return (
    <li className={`bg-card border-2 rounded-2xl overflow-hidden ${devendo ? "border-destructive/30" : "border-border"}`}>
      <button
        onClick={() => setAberto((a) => !a)}
        className="w-full text-left p-4 flex flex-wrap justify-between items-center gap-3 hover:bg-secondary/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          {aberto ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          <div>
            <div className="text-xl font-semibold">{c.nome}</div>
            <div className="text-muted-foreground">{c.telefone || "—"}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-base">
          <span>Limite: <strong className="tabular-nums">{brl(c.limite_fiado)}</strong></span>
          <span className={devendo ? "text-destructive font-bold tabular-nums" : "tabular-nums"}>
            Devendo: {brl(c.saldo_devedor)}
          </span>
          <span>Disp.: <strong className="tabular-nums">{brl(disp)}</strong></span>
        </div>
      </button>

      {aberto && (
        <div className="border-t border-border p-5 space-y-4 bg-background/40">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-base">
              Novo limite:
              <input
                type="number" step="0.01" defaultValue={c.limite_fiado}
                onBlur={(e) => updateCliente(c.id_cliente, { limite_fiado: Number(e.target.value) })}
                className="campo w-32"
              />
            </label>
            <button
              onClick={() => confirm(`Excluir ${c.nome}?`) && removeCliente(c.id_cliente)}
              className="ml-auto bg-destructive text-destructive-foreground px-4 py-2 rounded-lg font-bold"
            >
              🗑 Excluir cliente
            </button>
          </div>

          <div>
            <h3 className="mb-2">📅 Agenda — resumo por mês</h3>
            {agenda.length === 0 ? (
              <p className="text-muted-foreground">Sem movimentação registrada ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-base border-separate border-spacing-y-1">
                  <thead>
                    <tr className="text-left text-muted-foreground text-sm uppercase tracking-wide">
                      <th className="py-1">Mês</th>
                      <th>Itens</th>
                      <th>Comprou (fiado)</th>
                      <th>Pagou</th>
                      <th>Saldo do mês</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agenda.map(([ym, m]) => {
                      const saldoMes = m.compras - m.pagamentos;
                      return (
                        <tr key={ym} className="bg-card">
                          <td className="py-2 px-3 capitalize rounded-l-lg font-semibold">{nomeMes(ym)}</td>
                          <td className="py-2 px-3 tabular-nums">{m.itens}</td>
                          <td className="py-2 px-3 tabular-nums">{brl(m.compras)}</td>
                          <td className="py-2 px-3 tabular-nums text-success">{brl(m.pagamentos)}</td>
                          <td className={`py-2 px-3 tabular-nums font-bold rounded-r-lg ${saldoMes > 0 ? "text-destructive" : "text-success"}`}>
                            {brl(saldoMes)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </li>
  );
}