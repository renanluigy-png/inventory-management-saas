import os from 'os';

interface RequestSample {
  method: string;
  route: string;
  statusCode: number;
  duration: number;
  timestamp: number;
}

// Singleton que acumula métricas em memória durante o ciclo de vida do processo.
class MetricsService {
  private static instance: MetricsService;

  private readonly startTime = Date.now();
  private totalRequests = 0;
  private totalErrors = 0;   // status >= 500
  private samples: RequestSample[] = [];
  private readonly MAX_SAMPLES = 1000; // evita vazamento de memória

  private constructor() {}

  static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  /** Registra uma requisição concluída. Chamado pelo requestLogger middleware. */
  record(sample: Omit<RequestSample, 'timestamp'>): void {
    this.totalRequests++;
    if (sample.statusCode >= 500) this.totalErrors++;

    this.samples.push({ ...sample, timestamp: Date.now() });
    if (this.samples.length > this.MAX_SAMPLES) {
      this.samples.shift(); // mantém apenas as últimas MAX_SAMPLES
    }
  }

  /** Retorna snapshot atual das métricas. */
  getSnapshot() {
    const durations = this.samples.map((s) => s.duration);
    const avgResponseTime =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

    const mem = process.memoryUsage();
    const uptimeMs = Date.now() - this.startTime;

    // Amostra de CPU do sistema operacional
    const cpus = os.cpus();
    const cpuModel = cpus[0]?.model ?? 'N/A';
    const loadAvg = os.loadavg(); // [1m, 5m, 15m]

    // Taxa de erro nos últimos N samples
    const recentSamples = this.samples.slice(-100);
    const recentErrors = recentSamples.filter((s) => s.statusCode >= 500).length;
    const errorRate =
      recentSamples.length > 0
        ? Math.round((recentErrors / recentSamples.length) * 10000) / 100
        : 0;

    return {
      uptime: {
        ms: uptimeMs,
        humanizado: this.formatUptime(uptimeMs),
      },
      requisicoes: {
        total: this.totalRequests,
        erros: this.totalErrors,
        taxaErroPercent: errorRate,
        tempoMedioResposta: `${avgResponseTime}ms`,
      },
      memoria: {
        heapUsado: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
        externo: `${Math.round(mem.external / 1024 / 1024)}MB`,
      },
      cpu: {
        modelo: cpuModel,
        nucleos: cpus.length,
        loadAvg: {
          '1m': Math.round(loadAvg[0] * 100) / 100,
          '5m': Math.round(loadAvg[1] * 100) / 100,
          '15m': Math.round(loadAvg[2] * 100) / 100,
        },
      },
      sistema: {
        plataforma: process.platform,
        arquitetura: process.arch,
        node: process.version,
        totalRam: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`,
        ramLivre: `${Math.round(os.freemem() / 1024 / 1024)}MB`,
      },
    };
  }

  private formatUptime(ms: number): string {
    const sec = Math.floor(ms / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);
    if (day > 0) return `${day}d ${hr % 24}h ${min % 60}m`;
    if (hr > 0) return `${hr}h ${min % 60}m ${sec % 60}s`;
    if (min > 0) return `${min}m ${sec % 60}s`;
    return `${sec}s`;
  }
}

export { MetricsService };
