-- Migration: log, limites e cache do "Pergunte à Rede" (Rede do Episcopado Histórico)
-- Created: 2026-10-28
--
-- Uma linha por pergunta. Serve de limite (por IP e teto diário global), de cache exato para perguntas
-- repetidas (as de exemplo da página), de medição de custo/latência/qualidade e de fonte de lacunas
-- (resultado = 'nao_sabe' → `pnpm episcopado:pauta --perguntas`). Só o servidor (service key) acessa.

CREATE TABLE IF NOT EXISTS episcopado_perguntas (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version TEXT NOT NULL,
  ip_hash TEXT,
  app TEXT,
  contexto TEXT,
  pergunta TEXT NOT NULL,
  pergunta_norm TEXT NOT NULL,
  historico_n INT NOT NULL DEFAULT 0,
  modelo TEXT,
  effort TEXT,
  thinking TEXT,
  -- em_andamento | ok | nao_sabe | recusa | parcial | abortada | erro | cache
  resultado TEXT NOT NULL DEFAULT 'em_andamento',
  rodadas INT,
  duracao_ms INT,
  fria BOOLEAN,
  tokens_in INT,
  tokens_cache_read INT,
  tokens_cache_write INT,
  tokens_out INT,
  custo_usd NUMERIC(10, 5),
  citacoes INT,
  citacoes_removidas INT,
  ferramentas JSONB,
  markdown TEXT,
  notas JSONB,
  blocos JSONB,
  resumo TEXT
);

CREATE INDEX IF NOT EXISTS episcopado_perguntas_created ON episcopado_perguntas (created_at);
CREATE INDEX IF NOT EXISTS episcopado_perguntas_ip ON episcopado_perguntas (ip_hash, created_at);
CREATE INDEX IF NOT EXISTS episcopado_perguntas_cache ON episcopado_perguntas (version, pergunta_norm) WHERE resultado = 'ok' AND historico_n = 0;

ALTER TABLE episcopado_perguntas ENABLE ROW LEVEL SECURITY;
-- Sem políticas: anon e authenticated não leem nem escrevem; o servidor usa a service key.

-- Reserva uma pergunta se os limites permitirem, numa só ida ao banco: devolve o id da linha criada
-- ou NULL quando o IP passou do limite da última hora ou o dia passou do teto global. O advisory lock
-- serializa reservas simultâneas para o teto não estourar por corrida.
CREATE OR REPLACE FUNCTION episcopado_reservar_pergunta(
  p_version TEXT,
  p_ip_hash TEXT,
  p_app TEXT,
  p_contexto TEXT,
  p_pergunta TEXT,
  p_pergunta_norm TEXT,
  p_historico_n INT,
  p_modelo TEXT,
  p_limite_ip_hora INT,
  p_limite_dia INT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dia INT;
  v_ip INT;
  v_id BIGINT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('episcopado_perguntas'));
  SELECT count(*) INTO v_dia FROM episcopado_perguntas
    WHERE created_at >= date_trunc('day', now()) AND resultado <> 'cache';
  SELECT count(*) INTO v_ip FROM episcopado_perguntas
    WHERE ip_hash = p_ip_hash AND created_at >= now() - interval '1 hour' AND resultado <> 'cache';
  IF v_dia >= p_limite_dia THEN
    RETURN jsonb_build_object('id', NULL, 'motivo', 'dia', 'dia', v_dia, 'ip', v_ip);
  END IF;
  IF v_ip >= p_limite_ip_hora THEN
    RETURN jsonb_build_object('id', NULL, 'motivo', 'ip', 'dia', v_dia, 'ip', v_ip);
  END IF;
  INSERT INTO episcopado_perguntas (version, ip_hash, app, contexto, pergunta, pergunta_norm, historico_n, modelo)
    VALUES (p_version, p_ip_hash, p_app, p_contexto, p_pergunta, p_pergunta_norm, p_historico_n, p_modelo)
    RETURNING id INTO v_id;
  RETURN jsonb_build_object('id', v_id, 'dia', v_dia + 1, 'ip', v_ip + 1);
END;
$$;

REVOKE ALL ON FUNCTION episcopado_reservar_pergunta FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE episcopado_perguntas IS 'Pergunte à Rede: log, limites, cache exato e lacunas (ver docs/EPISCOPADO-PERGUNTE.md)';
