-- ============================================================================
-- LexMandato: sair de um escritório
-- Permite que cada pessoa desvincule a própria conta de um escritório, sem
-- depender de outra pessoa. Os documentos, os clientes e os modelos ficam no
-- escritório, porque pertencem a ele e não a quem os enviou.
--
-- Rode DEPOIS de sql/lexmandato_escritorio.sql e sql/lexmandato_mestre.sql.
-- Pode ser executado mais de uma vez sem quebrar nada.
-- ============================================================================

create or replace function public.lm_sair_escritorio(p_escritorio uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_papel text; v_donos int;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta.';
  end if;

  select papel into v_papel
    from public.lm_membros
   where escritorio_id = p_escritorio and user_id = auth.uid();

  if v_papel is null then
    raise exception 'Você não está neste escritório.';
  end if;

  select count(*) into v_donos
    from public.lm_membros
   where escritorio_id = p_escritorio and papel = 'dono';

  if v_papel = 'dono' and v_donos <= 1 then
    raise exception 'Você é o único responsável por este escritório. Dê o papel de responsável a outra pessoa antes de sair, ou o escritório fica sem ninguém no comando.';
  end if;

  delete from public.lm_membros
   where escritorio_id = p_escritorio and user_id = auth.uid();
end $$;

grant execute on function public.lm_sair_escritorio(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Conferência: em quais escritórios a sua conta está
-- ---------------------------------------------------------------------------
-- select e.nome, m.papel
--   from public.lm_membros m
--   join public.lm_escritorios e on e.id = m.escritorio_id
--  where m.user_id = auth.uid();
