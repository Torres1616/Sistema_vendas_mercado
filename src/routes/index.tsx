import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Banknote, Smartphone, CreditCard, BookText, ShoppingCart, AlertTriangle, ArrowRight, Plus } from "lucide-react";
import { useDB, statusValidade, brl } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Início — Mercadinho do Ricardo" },
      { name: "description", content: "Painel diário com vendas, alertas de validade e fiado." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const db = useDB();
  const [mounted, setMounted] = useState(false);
  const [dataHoje, setDataHoje] = useState("");
  useEffect(() => {
    setMounted(true);
    setDataHoje(
      new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }),
    );
  }, []);
  if (!mounted) return <div className="min-h-[60vh]" />;
  const hoje = new Date().toISOString().slice(0, 10);
  const vendasHoje = db.vendas.filter((v) => v.data_venda.slice(0, 10) === hoje);

  const totaisPorMetodo = {
    Dinheiro: 0,
    PIX: 0,
    Cartão: 0,
    Fiado: 0,
  } as Record<string, number>;
  for (const v of vendasHoje) totaisPorMetodo[v.metodo_pagamento] += v.valor_total;
  const totalDia = vendasHoje.reduce((s, v) => s + v.valor_total, 0);

  const lotesAlerta = db.lotes
    .map((l) => ({ ...l, status: statusValidade(l.data_validade) }))
    .filter((l) => l.status !== "Regular")
    .sort((a, b) => a.data_validade.localeCompare(b.data_validade));

  const totalFiado = db.clientes.reduce((s, c) => s + c.saldo_devedor, 0);

  return (
    <div className="space-y-10">
      {/* Saudação + CTA */}
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm uppercase tracking-widest text-muted-foreground font-semibold">Painel do dia</p>
          <h1 className="mt-1">Bom dia, Seu Ricardo</h1>
          <p className="text-muted-foreground text-lg mt-2 capitalize" suppressHydrationWarning>
            {dataHoje || "\u00a0"}
          </p>
        </div>
        <Link
          to="/pdv"
          className="group inline-flex items-center gap-3 bg-accent text-accent-foreground px-7 py-4 rounded-xl text-xl font-bold shadow-sm hover:shadow-md hover:translate-y-[-1px] transition-all"
        >
          <span className="w-9 h-9 rounded-lg bg-white/15 grid place-items-center">
            <Plus className="w-5 h-5" strokeWidth={3} />
          </span>
          Nova Venda
        </Link>
      </header>

      {/* Fechamento de caixa */}
      <section aria-labelledby="caixa">
        <SectionTitle id="caixa">Fechamento de Caixa — Hoje</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
          {/* KPI principal */}
          <div className="rounded-2xl bg-primary text-primary-foreground p-7 shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                 style={{backgroundImage:"radial-gradient(circle at 90% 10%, white 1px, transparent 1px)", backgroundSize:"24px 24px"}} />
            <div className="relative">
              <div className="flex items-center gap-2 text-primary-foreground/80 text-sm uppercase tracking-widest font-semibold">
                <ShoppingCart className="w-4 h-4" /> Total do dia
              </div>
              <div className="font-display font-bold text-5xl sm:text-6xl mt-3 tabular-nums">{brl(totalDia)}</div>
              <div className="mt-3 text-primary-foreground/80 text-base">
                {vendasHoje.length} venda{vendasHoje.length === 1 ? "" : "s"} registrada{vendasHoje.length === 1 ? "" : "s"}.
              </div>
            </div>
          </div>

          {/* Métodos */}
          <div className="grid grid-cols-2 gap-3">
            <MetricCard icon={<Banknote className="w-5 h-5"/>} label="Dinheiro" valor={brl(totaisPorMetodo.Dinheiro)} />
            <MetricCard icon={<Smartphone className="w-5 h-5"/>} label="PIX" valor={brl(totaisPorMetodo.PIX)} />
            <MetricCard icon={<CreditCard className="w-5 h-5"/>} label="Cartão" valor={brl(totaisPorMetodo.Cartão)} />
            <MetricCard icon={<BookText className="w-5 h-5"/>} label="Fiado" valor={brl(totaisPorMetodo.Fiado)} />
          </div>
        </div>
      </section>

      {/* Validade + Fiado */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        <section aria-labelledby="validade">
          <SectionTitle id="validade" icon={<AlertTriangle className="w-5 h-5 text-accent" />}>
            Alertas de Validade
          </SectionTitle>
          {lotesAlerta.length === 0 ? (
            <div className="p-6 rounded-2xl bg-card border border-border text-lg">
              Nenhum lote vencido ou perto de vencer. Tudo certo!
            </div>
          ) : (
            <ul className="rounded-2xl bg-card border border-border overflow-hidden divide-y divide-border">
              {lotesAlerta.map((l) => {
                const prod = db.produtos.find((p) => p.id_produto === l.id_produto);
                const isVenc = l.status === "Vencido";
                const badge = isVenc
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-warning text-warning-foreground";
                const bar = isVenc ? "bg-destructive" : "bg-warning";
                return (
                  <li key={l.id_lote} className="flex items-stretch gap-4 p-4">
                    <div className={`w-1.5 rounded-full ${bar}`} aria-hidden />
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1.4fr_auto_auto_auto] gap-x-4 gap-y-1 items-center">
                      <div className="text-lg font-semibold">{prod?.nome_produto}</div>
                      <div className="text-muted-foreground">Qtd <span className="text-foreground font-semibold">{l.quantidade_lote}</span></div>
                      <div className="text-muted-foreground">
                        Vence <span className="text-foreground font-semibold tabular-nums">
                          {new Date(l.data_validade + "T00:00:00").toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <span className={`justify-self-start sm:justify-self-end px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wide ${badge}`}>
                        {l.status}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="fiado">
          <SectionTitle id="fiado" icon={<BookText className="w-5 h-5 text-primary" />}>
            Fiado em Aberto
          </SectionTitle>
          <div className="rounded-2xl bg-card border border-border p-6 space-y-5">
            <div>
              <div className="text-sm uppercase tracking-widest text-muted-foreground font-semibold">Total devedor</div>
              <div className="font-display font-bold text-4xl mt-1 tabular-nums text-foreground">{brl(totalFiado)}</div>
            </div>
            <div className="flex items-center justify-between text-base">
              <span className="text-muted-foreground">Clientes com saldo</span>
              <span className="font-semibold text-xl">{db.clientes.filter((c) => c.saldo_devedor > 0).length}</span>
            </div>
            <Link
              to="/fiado"
              className="flex items-center justify-between w-full bg-primary text-primary-foreground px-5 py-4 rounded-xl text-lg font-bold hover:opacity-95 transition-opacity"
            >
              Receber Pagamento
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionTitle({ id, children, icon }: { id?: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <h2 id={id} className="text-foreground">{children}</h2>
    </div>
  );
}

function MetricCard({ icon, label, valor }: { icon: React.ReactNode; label: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-5 hover:border-primary/40 transition-colors">
      <div className="flex items-center gap-2 text-muted-foreground text-sm uppercase tracking-widest font-semibold">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className="font-display font-bold text-2xl sm:text-3xl mt-2 tabular-nums">{valor}</div>
    </div>
  );
}
