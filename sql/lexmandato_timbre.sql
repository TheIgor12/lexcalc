-- ============================================================================
-- Lex Calc: papel timbrado do escritório
--
-- Até agora o papel timbrado ficava pendurado na conta pessoal de quem enviou,
-- guardado em uma pasta com o identificador daquele usuário. Quem entrasse com
-- outro acesso do mesmo escritório gerava planilha e documento sem timbre.
--
-- Agora o arquivo fica em esc/<identificador do escritório>/, e todo mundo que
-- é membro daquele escritório enxerga. Trocar e apagar, só quem administra.
--
-- Rode depois dos arquivos do LexMandato. Pode ser executado mais de uma vez.
-- ============================================================================

-- Identificador do escritório a partir do caminho do arquivo:
-- esc/<uuid>/timbrado.pdf devolve o <uuid>. Qualquer outro caminho devolve nulo.
create or replace function public.lm_esc_do_caminho(p_nome text)
returns uuid
language sql
immutable
as $$
  select case
           when p_nome ~ '^esc/[0-9a-fA-F-]{36}/'
           then substring(p_nome from 5 for 36)::uuid
           else null
         end
$$;

grant execute on function public.lm_esc_do_caminho(text) to authenticated;

-- Ler: qualquer pessoa da equipe do escritório, e o login mestre.
drop policy if exists lexcalc_timbre_esc_ler on storage.objects;
create policy lexcalc_timbre_esc_ler on storage.objects
  for select to authenticated
  using (
    bucket_id = 'lexcalc'
    and public.lm_esc_do_caminho(name) is not null
    and (
      public.lm_e_mestre()
      or public.lm_esc_do_caminho(name) in (select public.lm_meus_escritorios())
    )
  );

-- Enviar, trocar e apagar: só quem administra o escritório, e o login mestre.
drop policy if exists lexcalc_timbre_esc_criar on storage.objects;
create policy lexcalc_timbre_esc_criar on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'lexcalc'
    and public.lm_esc_do_caminho(name) is not null
    and public.lm_administra(public.lm_esc_do_caminho(name))
  );

drop policy if exists lexcalc_timbre_esc_alterar on storage.objects;
create policy lexcalc_timbre_esc_alterar on storage.objects
  for update to authenticated
  using (
    bucket_id = 'lexcalc'
    and public.lm_esc_do_caminho(name) is not null
    and public.lm_administra(public.lm_esc_do_caminho(name))
  )
  with check (
    bucket_id = 'lexcalc'
    and public.lm_esc_do_caminho(name) is not null
    and public.lm_administra(public.lm_esc_do_caminho(name))
  );

drop policy if exists lexcalc_timbre_esc_apagar on storage.objects;
create policy lexcalc_timbre_esc_apagar on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'lexcalc'
    and public.lm_esc_do_caminho(name) is not null
    and public.lm_administra(public.lm_esc_do_caminho(name))
  );

-- ---------------------------------------------------------------------------
-- Conferência
-- ---------------------------------------------------------------------------
-- select name, public.lm_esc_do_caminho(name) as escritorio
--   from storage.objects where bucket_id = 'lexcalc' order by created_at desc;
