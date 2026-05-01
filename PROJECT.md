# CAVA TRADER — Paper Trading Bot basado en el Sistema de Especulación de Cava

## Resumen del proyecto

Bot de paper trading (dinero simulado, precios reales) que opera el SP500 intradía siguiendo las pautas horarias y el sistema técnico de José Luis Cava. Incluye dashboard web para visualizar operaciones, rendimiento y estadísticas.

**Objetivo**: Validar si las pautas horarias de Cava generan alfa de forma sistemática, sin arriesgar capital real durante al menos 12 meses.

---

## Origen de la idea

José Luis Cava, analista técnico español, reveló en un vídeo (1 mayo 2026) las pautas horarias que sigue el SP500 durante la sesión americana. Combinadas con su sistema técnico (documentado en su libro "Sistema de Especulación"), estas pautas forman la base de una estrategia intradía algorítmica.

---

## Las pautas horarias de Cava (hora española, UTC+2)

| Hora (España) | Comportamiento del SP500 | Quién opera | Implicación trading |
|---------------|--------------------------|-------------|---------------------|
| 15:30-17:00 | Apertura. 70% lateral, 30% tendencial | Retail ("dinero no listo") — órdenes a mercado | NO operar en base a la dirección de apertura |
| 17:00-18:00 | Tiende a CAER | Cierre bolsas europeas, deshacen posiciones | Oportunidad de corto / cierre de largos |
| 18:00-20:00 | Zona muerta — sin movimientos | Bajo volumen | No operar |
| 20:00-21:00 | Volumen aumenta | Algoritmos comienzan | Prepararse para siguiente movimiento |
| 21:00-22:00 | **HORA MÁS IMPORTANTE** | Dinero institucional cierra en nivel deseado | Oportunidad de largo hacia el cierre |

---

## Filosofía de riesgo (core del sistema)

Cava demuestra que el perfil ganador NO es el que más acierta, sino el que mejor gestiona el riesgo:

| Perfil | Acierto | Resultado |
|--------|---------|-----------|
| Analista fundamental | Alto | Pierde — no corta pérdidas |
| Trader técnico | 60% | Pierde — no dimensiona posiciones |
| **Gestor de riesgo** | **20%** | **GANA** — pierde poco en 80%, gana mucho en 20% |

**Reglas de riesgo para el bot:**
- Stop loss fijo: 0.3-0.5% por operación
- Take profit: 1.0-1.5% (ratio mínimo 1:3)
- Máximo 2 operaciones por día
- Máximo 1 posición abierta simultánea
- Si acumula 3 stops seguidos → pausa 1 día (evitar drawdown en racha perdedora)

---

## Estrategias a implementar (por fases)

### Estrategia 1: "European Close" (17:00)
- **Señal de entrada**: Si SP500 sube >0.2% desde apertura (15:30) hasta 17:00 → abrir CORTO
- **Lógica**: El cierre europeo provoca presión vendedora
- **Stop**: +0.3% desde entrada
- **Take profit**: -0.5% desde entrada (o cierre a las 18:00, lo que llegue primero)
- **Filtro**: Solo operar si la tendencia semanal es lateral o bajista (no ir contra tendencia fuerte)

### Estrategia 2: "Institutional Push" (21:00)
- **Señal de entrada**: Si SP500 está por encima de la media de la sesión a las 21:00 → abrir LARGO
- **Lógica**: El dinero institucional empuja el cierre al alza
- **Stop**: -0.3% desde entrada
- **Take profit**: +0.5% desde entrada (o cierre a las 22:00)
- **Filtro**: Solo operar si el precio está por encima de la SMA50 diaria

### Estrategia 3: "Mean Reversion Opening" (16:00)
- **Señal de entrada**: Si SP500 cae >0.5% en los primeros 30min (15:30-16:00) → abrir LARGO
- **Lógica**: El 70% de las veces la apertura no es tendencial, revierte
- **Stop**: -0.5% desde entrada
- **Take profit**: +0.8% o cierre a las 17:00

### Estrategia futura: Señales técnicas (Fibonacci + divergencias)
- Integrar indicadores técnicos del sistema de Cava (RSI, MACD, Fibonacci)
- Buscar divergencias alcistas/bajistas en timeframes de 5-15 min en las horas clave
- Esta fase requiere más datos y backtesting

---

## Tech Stack

| Componente | Tecnología | Justificación |
|-----------|------------|---------------|
| Frontend / Dashboard | **Next.js 14+ (App Router)** | SSR, Vercel native, ya dominado |
| Hosting | **Vercel** (plan free) | Sin coste, despliegue automático |
| Base de datos | **Supabase** (PostgreSQL) | Free tier generoso, ya usado en CongressFlows |
| Datos de mercado | **Twelve Data** o **Alpha Vantage** | Free tier con datos intradía 1min/5min del SP500 |
| Cron / Scheduler | **Vercel Cron Jobs** | Ejecutar bot a las horas clave (17:00, 21:00 CET) |
| Gráficos | **Recharts** o **Lightweight Charts (TradingView)** | Visualización de trades en chart |
| Estilos | **Tailwind CSS** | Consistente con CongressFlows |
| Lenguaje | **TypeScript** | Todo el stack |

---

## API de datos de mercado

### Opción principal: Twelve Data
- Free tier: 800 req/día, 8 req/min
- Endpoint intradía: `GET /time_series?symbol=SPX&interval=5min`
- Precio real-time con 15min delay en free (suficiente para paper trading)
- Alternativa real-time: WebSocket ($0)

### Opción alternativa: Alpha Vantage
- Free tier: 25 req/día (muy limitado)
- `GET /query?function=TIME_SERIES_INTRADAY&symbol=SPY&interval=5min`

### Opción premium futura: Polygon.io
- Free tier: 5 req/min, datos con delay
- Mejor calidad, pero más restrictivo en free

**Decisión**: Empezar con **Twelve Data** (800 req/día es más que suficiente para 5-10 consultas diarias del bot + dashboard).

---

## Arquitectura

```
┌─────────────────────────────────────────────┐
│                  VERCEL                      │
│                                              │
│  ┌──────────┐    ┌──────────────────────┐   │
│  │ Next.js  │    │   API Routes         │   │
│  │Dashboard │◄───│  /api/bot/execute     │   │
│  │(SSR/CSR) │    │  /api/bot/status      │   │
│  └──────────┘    │  /api/trades          │   │
│                  │  /api/portfolio        │   │
│                  └──────────┬───────────┘   │
│                             │                │
│  ┌──────────────────────────┴──────────┐    │
│  │         Vercel Cron Jobs            │    │
│  │  - 17:00 CET → check_european_close │    │
│  │  - 21:00 CET → check_institutional  │    │
│  │  - 22:00 CET → close_all_positions  │    │
│  │  - 08:00 CET → daily_summary        │    │
│  └──────────────────────────┬──────────┘    │
│                             │                │
└─────────────────────────────┼────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
        ┌─────▼─────┐  ┌─────▼─────┐         │
        │ Twelve    │  │ Supabase  │         │
        │ Data API  │  │ (Postgres)│         │
        │ (precios) │  │ (trades,  │         │
        └───────────┘  │ portfolio,│         │
                       │ config)   │         │
                       └───────────┘         │
                                             │
```

---

## Modelo de datos (Supabase)

### Nota: Supabase compartido
Se reutiliza el **mismo proyecto de Supabase** que el bot de BTC (free tier solo permite 2 proyectos). Las tablas llevan prefijo `cava_` para evitar colisiones. Las credenciales (URL, anon key, service role key) son las mismas que las del BTC trader.

### Tabla: `cava_trades`
```sql
CREATE TABLE cava_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy TEXT NOT NULL,          -- 'european_close', 'institutional_push', 'mean_reversion'
  direction TEXT NOT NULL,          -- 'long', 'short'
  entry_price DECIMAL NOT NULL,
  entry_time TIMESTAMPTZ NOT NULL,
  exit_price DECIMAL,
  exit_time TIMESTAMPTZ,
  stop_loss DECIMAL NOT NULL,
  take_profit DECIMAL NOT NULL,
  status TEXT DEFAULT 'open',       -- 'open', 'closed_tp', 'closed_sl', 'closed_manual', 'closed_eod'
  pnl_percent DECIMAL,
  pnl_dollars DECIMAL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabla: `cava_portfolio`
```sql
CREATE TABLE cava_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initial_capital DECIMAL DEFAULT 10000,    -- 10,000$ simulados
  current_capital DECIMAL DEFAULT 10000,
  total_trades INT DEFAULT 0,
  winning_trades INT DEFAULT 0,
  losing_trades INT DEFAULT 0,
  total_pnl DECIMAL DEFAULT 0,
  max_drawdown DECIMAL DEFAULT 0,
  best_trade DECIMAL DEFAULT 0,
  worst_trade DECIMAL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabla: `cava_daily_summary`
```sql
CREATE TABLE cava_daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  sp500_open DECIMAL,
  sp500_close DECIMAL,
  sp500_change_pct DECIMAL,
  trades_count INT DEFAULT 0,
  trades_won INT DEFAULT 0,
  pnl_day DECIMAL DEFAULT 0,
  capital_eod DECIMAL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Dashboard (páginas)

| Página | Ruta | Contenido |
|--------|------|-----------|
| Home / Resumen | `/` | Capital actual, P&L total, win rate, racha actual, gráfico equity curve |
| Trades | `/trades` | Tabla de todos los trades con filtros (estrategia, resultado, fecha) |
| Hoy | `/today` | Sesión actual: precio SP500 live, posición abierta si la hay, próximo cron |
| Estrategias | `/strategies` | Rendimiento desglosado por estrategia (European Close vs Institutional Push) |
| Configuración | `/settings` | Ajustar parámetros (stops, take profits, activar/desactivar estrategias) |

---

## Fases de desarrollo

### Fase 1: Infraestructura (semana 1)
- [ ] Crear repo en GitHub (`cava-trader`)
- [ ] Inicializar Next.js 14 con App Router + Tailwind
- [ ] Deploy inicial en Vercel
- [ ] Configurar Supabase (proyecto nuevo o reutilizar)
- [ ] Crear tablas en Supabase
- [ ] Configurar Twelve Data API key
- [ ] API route básica que devuelve precio actual del SP500

### Fase 2: Motor del bot (semana 2)
- [ ] Implementar lógica de Estrategia 1 (European Close)
- [ ] Implementar lógica de Estrategia 2 (Institutional Push)
- [ ] Crear API routes: `/api/bot/execute`, `/api/bot/status`
- [ ] Sistema de gestión de riesgo (stops, take profits, max trades/día)
- [ ] Configurar Vercel Cron Jobs para las horas clave
- [ ] Lógica de cierre forzado a las 22:00 (nunca mantener overnight)

### Fase 3: Dashboard (semana 3)
- [ ] Página Home con métricas clave y equity curve
- [ ] Página Trades con historial
- [ ] Página Today con sesión en curso
- [ ] Página Strategies con análisis por estrategia

### Fase 4: Refinamiento (semana 4+)
- [ ] Implementar Estrategia 3 (Mean Reversion Opening)
- [ ] Añadir filtro de tendencia (SMA50)
- [ ] Backtesting con datos históricos (validar estrategias con datos pasados)
- [ ] Alertas (email o push) cuando el bot ejecuta un trade
- [ ] Modo "manual" para registrar trades propios y compararlos con el bot

### Fase 5: Avanzado (futuro)
- [ ] Integrar indicadores técnicos de Cava (RSI, MACD, Fibonacci)
- [ ] Divergencias automáticas en timeframes 5min/15min
- [ ] Machine learning para optimizar parámetros
- [ ] Comparativa bot vs buy-and-hold vs DCA

---

## Configuración inicial

### Variables de entorno necesarias
```env
# Twelve Data
TWELVE_DATA_API_KEY=tu_api_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Bot config
BOT_INITIAL_CAPITAL=10000
BOT_MAX_TRADES_PER_DAY=2
BOT_STOP_LOSS_PCT=0.3
BOT_TAKE_PROFIT_PCT=1.0
BOT_TIMEZONE=Europe/Madrid
```

### Comandos de setup (ejecutar en orden)

```bash
# 1. Inicializar proyecto
npx create-next-app@latest . --typescript --tailwind --app --src-dir --use-npm

# 2. Dependencias
npm install @supabase/supabase-js recharts date-fns

# 3. GitHub
git init
git add .
git commit -m "Initial setup: Next.js + Tailwind + Supabase"
gh repo create cava-trader --public --source=. --push

# 4. Vercel
vercel link
vercel env add TWELVE_DATA_API_KEY
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel deploy

# 5. Crear tablas en Supabase (ejecutar SQL desde dashboard o CLI)
```

---

## Parámetros del paper trading

| Parámetro | Valor inicial |
|-----------|--------------|
| Capital inicial | $10,000 (simulados) |
| Tamaño posición | 100% del capital (1 posición a la vez) |
| Stop loss | 0.3% |
| Take profit | 1.0% |
| Comisión simulada | $0 (simplificar al principio) |
| Slippage simulado | 0.01% (añadir en Fase 4) |
| Horario operativo | 15:30-22:00 CET (sesión USA) |
| Días operativos | Lunes a viernes (excluir festivos NYSE) |
| Duración mínima del test | 12 meses antes de considerar dinero real |

---

## Métricas clave a trackear

| Métrica | Descripción |
|---------|-------------|
| Win Rate | % de trades ganadores |
| Profit Factor | Ganancias brutas / Pérdidas brutas (>1.5 = bueno) |
| Sharpe Ratio | Retorno ajustado por riesgo (>1.0 = bueno) |
| Max Drawdown | Mayor caída desde pico de equity |
| Avg Win / Avg Loss | Ratio ganancia media vs pérdida media (target >3:1) |
| Expectancy | (Win% × Avg Win) - (Loss% × Avg Loss) → debe ser positivo |
| Trades/mes | Frecuencia operativa |
| Equity Curve | Gráfico de evolución del capital |
| Comparativa | Bot vs Buy & Hold SP500 vs DCA mensual |

---

## Notas importantes

- **NUNCA usar dinero real** hasta completar 12 meses de paper trading con resultados consistentes
- Los cron jobs de Vercel en plan free tienen granularidad de **1 vez/día mínimo** → puede que necesitemos un workaround (ejecutar cada hora y que el código filtre por hora, o usar un servicio externo de cron como cron-job.org para las horas exactas)
- El SP500 (SPX) no se puede operar directamente — en la práctica real se operaría con SPY (ETF) o futuros ES. Para el paper trading usamos el precio del SPX directamente
- Twelve Data free tier tiene 15 minutos de delay — suficiente para paper trading, NO para real trading
- Todo el código debe estar preparado para añadir comisiones y slippage cuando pasemos a fase de validación real

---

## Referencia: Bot de BTC existente

El usuario tiene otro proyecto en desarrollo con un bot de trading de BTC en otra instancia de Cursor. Compartirá detalles si hay componentes reutilizables (gestión de riesgo, dashboard, etc.).

---

## Contexto del autor del sistema

**José Luis Cava** — Analista técnico y macro español, fundador de OPRA. Autor de "Sistema de Especulación en Bolsa". Su sistema combina:
1. Análisis macro (liquidez, crecimiento económico)
2. Análisis técnico (Elliott, Fibonacci, divergencias, pautas de impulso)
3. Pautas horarias intradía
4. Gestión estricta del riesgo (el pilar más importante)

Más detalle sobre su sistema técnico disponible en: `../congress-trades/.cursor/rules/cava-speculation-system.md`
