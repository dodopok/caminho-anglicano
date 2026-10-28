/**
 * Limites do Pergunte à Rede em memória, para quando o Supabase não está configurado ou está fora do ar.
 * Valem por instância (cada instância conta as suas): o teto real do dia é `porDia` × instâncias vivas.
 * Com o Supabase no ar, quem manda é a função `episcopado_reservar_pergunta`, que vale entre instâncias.
 */

const HORA = 3_600_000

export interface LimitesMemoria {
  /** Conta a pergunta se couber nos dois limites; senão diz qual estourou e não conta. */
  reservar(ipHash: string | null): { ok: true } | { ok: false; motivo: 'ip' | 'dia' }
}

export function createLimitesMemoria(limites: { porIpHora: number; porDia: number }, now: () => number = Date.now): LimitesMemoria {
  const porIp = new Map<string, number[]>()
  let dia = ''
  let noDia = 0

  return {
    reservar(ipHash) {
      const t = now()
      const hoje = new Date(t).toISOString().slice(0, 10)
      if (hoje !== dia) {
        dia = hoje
        noDia = 0
        // Uma vez por dia, esquece os IPs parados há mais de uma hora (a janela deles já passou).
        for (const [ip, ts] of porIp) if (!ts.length || t - ts[ts.length - 1]! >= HORA) porIp.delete(ip)
      }
      const ip = ipHash ?? 'sem-ip'
      const recentes = (porIp.get(ip) ?? []).filter((x) => t - x < HORA)
      if (recentes.length >= limites.porIpHora) {
        porIp.set(ip, recentes)
        return { ok: false, motivo: 'ip' }
      }
      if (noDia >= limites.porDia) return { ok: false, motivo: 'dia' }
      recentes.push(t)
      porIp.set(ip, recentes)
      noDia++
      return { ok: true }
    }
  }
}
