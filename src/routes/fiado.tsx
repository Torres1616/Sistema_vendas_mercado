import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { brl, pagarFiado, useDB } from "@/lib/store";

export const Route = createFileRoute("/fiado")({
  head: () => ({ meta: [{ title: "Fiado — Mercadinho do Ricardo" }] }),
  component: Fiado,
});

function Fiado() {
  const db = useDB();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [idCliente, setIdCliente] = useState<number | "">("");
  const [valor, setValor] = useState("");
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const devedores = db.clientes.filter((c) => c.saldo_devedor > 0);

  function registrar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!idCliente) return setMsg({ tipo: "erro", texto: "Escolha um cliente." });
    const r = pagarFiado(Number(idCliente), Number(valor));
    if (!r.ok) return setMsg({ tipo: "erro", texto: r.erro });
    setMsg({ tipo: "ok", texto: "Pagamento registrado!" });
    setValor("");
  }

  if (!mounted) return <div className="min-h-[60vh]" />;

  return (
    <div className="space-y-8">
      <h1>📒 Caderneta de Fiado</h1>

      <section className="bg-card border-2 border-border rounded-xl p-5">
        <h2 className="mb-3">Registrar Pagamento</h2>
        <form onSubmit={registrar} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="font-semibold">Cliente</span>
            <select
              className="campo"
              value={idCliente}
              onChange={(e) => setIdCliente(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">— escolha —</option>
              {db.clientes.map((c) => (
                <option key={c.id_cliente} value={c.id_cliente}>
                  {c.nome} — devendo {brl(c.saldo_devedor)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-semibold">Valor pago (R$)</span>
            <input
              type="number" step="0.01" min="0.01" required
              className="campo" value={valor} onChange={(e) => setValor(e.target.value)}
            />
          </label>
          <button className="bg-primary text-primary-foreground py-4 px-5 rounded-lg text-lg font-bold">
            ✅ Receber
          </button>
        </form>
        {msg && (
          <div className={`mt-3 p-3 rounded-lg font-semibold ${
            msg.tipo === "ok" ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"
          }`}>
            {msg.texto}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3">Clientes com Saldo Devedor</h2>
        {devedores.length === 0 ? (
          <p className="p-4 bg-secondary rounded-lg text-lg">Nenhum cliente devendo. 🎉</p>
        ) : (
          <ul className="space-y-2">
            {devedores.map((c) => (
              <li key={c.id_cliente} className="bg-card border-2 border-border rounded-xl p-4 flex justify-between items-center">
                <div>
                  <div className="text-xl font-semibold">{c.nome}</div>
                  <div className="text-muted-foreground">{c.telefone}</div>
                </div>
                <div className="text-2xl font-bold text-destructive">{brl(c.saldo_devedor)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3">Últimos Pagamentos</h2>
        {db.pagamentos_fiado.length === 0 ? (
          <p className="text-muted-foreground">Nenhum pagamento registrado ainda.</p>
        ) : (
          <ul className="space-y-2">
            {[...db.pagamentos_fiado].reverse().slice(0, 20).map((p) => {
              const c = db.clientes.find((x) => x.id_cliente === p.id_cliente);
              return (
                <li key={p.id_pagamento} className="bg-card border-2 border-border rounded-lg p-3 flex justify-between">
                  <span>{c?.nome ?? "Cliente"}</span>
                  <span>{new Date(p.data_pagamento).toLocaleString("pt-BR")}</span>
                  <span className="font-bold text-primary">{brl(p.valor_pago)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <style>{`.campo{padding:.65rem .75rem;border:2px solid var(--input);border-radius:.6rem;background:var(--card);font-size:1.05rem;}`}</style>
    </div>
  );
}