#!/usr/bin/env python3
"""
Genera el informe mensual de calibración en formato Markdown.
Entrada : response.json (salida del endpoint /api/bot/monthly-report)
Salida  : reports/YYYY-MM.md  +  reports/latest.md
"""

import json
import sys
import os
from datetime import datetime

def stars(value, max_val=5):
    """Convierte un ratio a una escala visual de estrellas."""
    filled = min(round(value), max_val)
    return "★" * filled + "☆" * (max_val - filled)

def trend(value, good_above=0):
    return "🟢" if value > good_above else ("🔴" if value < good_above else "🟡")

def fmt_pct(v):
    return f"{'+' if v >= 0 else ''}{v:.2f}%"

def fmt_usd(v):
    return f"{'+'if v >= 0 else ''}${v:.2f}"

def main():
    if len(sys.argv) < 3:
        print("Usage: generate_monthly_report.py response.json output.md")
        sys.exit(1)

    with open(sys.argv[1]) as f:
        data = json.load(f)

    if not data.get("success"):
        print(f"ERROR: {data.get('error')}")
        sys.exit(1)

    r = data["report"]
    month = r["month"]
    dt = datetime.strptime(month + "-01", "%Y-%m-%d")
    month_label = dt.strftime("%B %Y").capitalize()

    pf = r["profit_factor"]
    pf_stars = stars(min(pf / 0.5, 5))  # 2.5 = 5 estrellas
    sharpe = r.get("sharpe_ratio")
    win_rate = r["win_rate"]

    by_s = r.get("by_strategy", {})

    def strat_row(key, label):
        s = by_s.get(key, {})
        if not s or s.get("trades", 0) == 0:
            return f"| {label} | — | — | — | — | — |"
        return (
            f"| {label} | {s['trades']} | {s['win_rate']:.0f}% | "
            f"{fmt_usd(s['pnl'])} | {s['profit_factor']:.2f} | "
            f"{fmt_usd(s['avg_win'])} / {fmt_usd(s['avg_loss'])} |"
        )

    params = r.get("params_snapshot", {})

    lines = [
        f"# 📊 Cava Trader — Informe Mensual {month_label}",
        f"",
        f"> Generado automáticamente el 1 de {dt.strftime('%B %Y')}. ",
        f"> Datos reales de paper trading · Sistema de Especulación de José Luis Cava · SP500 intradía.",
        f"",
        f"---",
        f"",
        f"## 💰 Resumen de Capital",
        f"",
        f"| Métrica | Valor |",
        f"|---------|-------|",
        f"| Capital inicio de mes | ${r['capital_start']:.2f} |",
        f"| Capital fin de mes | ${r['capital_end']:.2f} |",
        f"| P&L del mes | {fmt_usd(r['pnl_month'])} ({fmt_pct(r['pnl_month_pct'])}) |",
        f"",
        f"---",
        f"",
        f"## 📈 Métricas de Rendimiento",
        f"",
        f"| Métrica | Valor | Evaluación |",
        f"|---------|-------|------------|",
        f"| **Win Rate** | {win_rate:.1f}% | {trend(win_rate, 50)} {'Bueno (>50%)' if win_rate >= 50 else 'Por debajo del 50%'} |",
        f"| **Profit Factor** | {pf:.2f} | {pf_stars} {'Excelente' if pf >= 2 else 'Bueno' if pf >= 1.5 else 'Aceptable' if pf >= 1 else '⚠️ Por debajo de 1'} |",
        f"| **Expectancy** | {fmt_usd(r['expectancy'])} por trade | {trend(r['expectancy'])} |",
        f"| **Sharpe Ratio** | {f'{sharpe:.2f}' if sharpe is not None else 'Insuf. datos'} | {f'{trend(sharpe, 1)} {\"Bueno (>1)\" if sharpe and sharpe >= 1 else \"Por debajo de 1\"}' if sharpe is not None else '—'} |",
        f"| **Max Drawdown mes** | {fmt_usd(r['max_drawdown_month'])} | {trend(-r['max_drawdown_month'], -50)} |",
        f"",
        f"---",
        f"",
        f"## 🔢 Actividad",
        f"",
        f"| Métrica | Valor |",
        f"|---------|-------|",
        f"| Días con trading | {r['trading_days']} |",
        f"| Trades ejecutados | {r['total_trades']} |",
        f"| Señales descartadas | {r['signals_skipped']} (max trades/día, pausas) |",
        f"| TP alcanzados ✅ | {r['closed_tp']} |",
        f"| SL alcanzados ❌ | {r['closed_sl']} |",
        f"| Cerrados al EOD ⏱ | {r['closed_eod']} |",
        f"| Mejor trade | {fmt_usd(r['best_trade'])} |",
        f"| Peor trade | {fmt_usd(r['worst_trade'])} |",
        f"| Ganancia media | {fmt_usd(r['avg_win'])} |",
        f"| Pérdida media | {fmt_usd(r['avg_loss'])} |",
        f"",
        f"---",
        f"",
        f"## 🎯 Rendimiento por Estrategia",
        f"",
        f"| Estrategia | Trades | Win Rate | P&L | Profit Factor | Avg Win / Avg Loss |",
        f"|-----------|--------|----------|-----|---------------|-------------------|",
        strat_row("european_close",     "European Close (17h SHORT)"),
        strat_row("institutional_push", "Institutional Push (21h LONG)"),
        strat_row("mean_reversion",     "Mean Reversion (apertura)"),
        f"",
        f"---",
        f"",
        f"## ⚙️ Parámetros Vigentes Este Mes",
        f"",
        f"| Parámetro | Valor |",
        f"|-----------|-------|",
        f"| Stop Loss | {params.get('stop_loss_pct', '—')}% |",
        f"| Take Profit | {params.get('take_profit_pct', '—')}% |",
        f"| Max trades/día | {params.get('max_trades_day', '—')} |",
        f"| Umbral señal EC | {params.get('ec_threshold_pct', '—')}% de subida desde apertura |",
        f"| Filtro SMA50 (IP) | {'Activo' if params.get('ip_filter_sma50') else 'Inactivo'} |",
        f"",
        f"---",
        f"",
        f"## 📝 Notas de Calibración",
        f"",
        f"*Pendiente de revisión mensual con el sistema de IA.*",
        f"",
        f"---",
        f"",
        f"*Fuente: [cava-trader.vercel.app](https://cava-trader.vercel.app) · "
        f"Datos en Supabase tabla `cava_monthly_report` · Mes: `{month}`*",
    ]

    content = "\n".join(lines) + "\n"

    output_path = sys.argv[2]
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        f.write(content)

    # Sobreescribir latest.md
    latest_path = os.path.join(os.path.dirname(output_path), "latest.md")
    with open(latest_path, "w") as f:
        f.write(content)

    print(f"✅ Report generated: {output_path}")
    print(f"✅ Latest updated:   {latest_path}")

if __name__ == "__main__":
    main()
