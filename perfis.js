/* ============================================================================
   Lex Calc: Equipe e perfis de acesso
   O escritório cria perfis (Recepcionista, Secretária, Setor Comercial,
   Assistente Jurídico, Advogados, Controladoria e outros), marca as
   permissões de cada um e dá um perfil a cada pessoa da equipe.
   A tela esconde o que o perfil não libera, e o banco de dados bloqueia
   do mesmo jeito (sql/perfis.sql), para ninguém contornar pela tela.
   ============================================================================ */

const PERM_GRUPOS=[
 {g:'Cálculos',d:'Cada cálculo fica salvo na conta de quem o fez.',itens:[
  ['calc_juridico','Fazer cálculo jurídico','Atualização de valores, juros, multas e honorários.'],
  ['calc_liquidacao','Fazer liquidação de sentença','Verbas da decisão, cumprimento de sentença e art. 523 do Código de Processo Civil.'],
  ['calc_tributario','Fazer cálculo tributário','Débitos e restituições pela Selic e simulação de IBS e CBS.'],
  ['calc_salvos','Ver e abrir cálculos salvos','Busca e lista de cálculos já feitos.']]},
 {g:'LexMandato: documentos',d:'Procurações, declarações e contratos.',itens:[
  ['lm_gerar','Gerar procuração e declaração','Usa o assistente, grava o cliente e salva o documento. Sem esta permissão a pessoa não cria documento nenhum.'],
  ['lm_contrato','Gerar contrato de honorários','Libera o contrato e o campo de valores e percentuais de honorários.'],
  ['lm_docs_ver','Ver todos os documentos do escritório','Sem esta permissão a pessoa só vê os documentos que ela mesma gerou.'],
  ['lm_docs_excluir','Excluir documentos','Apaga o documento da nuvem. Não tem como desfazer.']]},
 {g:'LexMandato: clientes',d:'Cadastro de clientes do escritório.',itens:[
  ['lm_clientes_ver','Ver a lista de clientes','Aba Clientes, com busca por nome e CPF ou CNPJ.'],
  ['lm_clientes_editar','Cadastrar e alterar clientes','Sem esta permissão, quem gera documento ainda grava o cliente do próprio documento.'],
  ['lm_clientes_excluir','Excluir clientes','Os documentos do cliente continuam salvos.']]},
 {g:'LexMandato: biblioteca de modelos',d:'Modelos em Word do escritório.',itens:[
  ['lm_modelos_ver','Ver a biblioteca de modelos','Quem gera documento usa os modelos mesmo sem esta permissão.'],
  ['lm_modelos_editar','Enviar, alterar e apagar modelos','Mexe nos modelos que todo o escritório usa.']]},
 {g:'Administração do escritório',d:'Permissões sensíveis. Libere só para quem responde pela equipe.',itens:[
  ['esc_editar','Alterar dados do escritório e dos advogados','Nome, cidade, sociedade, OAB e endereço profissional que saem nas procurações.'],
  ['equipe_ver','Ver quem tem acesso','Lista de pessoas e o perfil de cada uma.'],
  ['equipe_convidar','Convidar pessoas','Gera código de convite já com o perfil escolhido.'],
  ['equipe_remover','Tirar o acesso de alguém','Remove a pessoa do escritório. Os documentos dela continuam no escritório.'],
  ['perfis_admin','Criar e alterar perfis','Cria perfis, marca permissões e troca o perfil das pessoas. Só consegue liberar o que o próprio perfil já tem.']]}
];
const PERM_TODAS=PERM_GRUPOS.flatMap(g=>g.itens.map(i=>i[0]));
const PERM_NOME=Object.fromEntries(PERM_GRUPOS.flatMap(g=>g.itens.map(i=>[i[0],i[1]])));
const PERM_ADMIN=['esc_editar','equipe_convidar','equipe_remover','perfis_admin'];

/* total: tudo liberado (conta sem escritório, responsável, suporte, mestre
   ou banco de dados ainda sem a parte de perfis) */
let PERM={total:true,set:new Set(PERM_TODAS),papel:null,perfil:null,semSql:false};
const PF={carregado:false,perfis:[],membros:[],edit:null,convite:null,erro:''};

function pode(k){return !!(PERM.total||PERM.set.has(k))}
function podeAlgum(L){return L.some(pode)}
function podeAdministrar(){return !!(PERM.total||(typeof LM!=='undefined'&&LM.mestre))}
function verAbaPerfis(){return !!(typeof LM!=='undefined'&&LM.org&&(podeAdministrar()||pode('perfis_admin')||pode('equipe_ver')||pode('equipe_convidar')))}

async function permAtualizar(){
 if(typeof LM==='undefined'||!LM.org){PERM={total:true,set:new Set(PERM_TODAS),papel:null,perfil:null,semSql:false};return}
 if(LM.mestre){PERM={total:true,set:new Set(PERM_TODAS),papel:'mestre',perfil:null,semSql:false};return}
 try{const r=await SB.rpc('lm_minhas_permissoes',{p_escritorio:LM.org.id});
  if(r.error){const sem=/function|schema cache|does not exist/i.test(r.error.message||'');PERM={total:true,set:new Set(PERM_TODAS),papel:LM.org.papel,perfil:null,semSql:sem};return}
  const j=r.data||{};PERM={total:!!j.total,set:new Set(j.permissoes||[]),papel:j.papel,perfil:j.perfil||null,semSql:false}
 }catch(e){PERM={total:true,set:new Set(PERM_TODAS),papel:LM.org.papel,perfil:null,semSql:false}}}
/* Chamado logo depois do login, para a tela inicial já sair do jeito do perfil */
async function carregarPermissoes(){try{if(typeof lmCarregarOrg==='function')await lmCarregarOrg();await permAtualizar()}catch(e){console.warn(e)}}

/* ---------- Dados ---------- */
async function pfCarregar(){PF.erro='';
 if(!LM.org){PF.carregado=true;return}
 const [p,m]=await Promise.all([
  SB.from('lm_perfis').select('*').eq('escritorio_id',LM.org.id).order('nome'),
  SB.from('lm_membros').select('user_id,email,papel,perfil_id,criado_em').eq('escritorio_id',LM.org.id).order('criado_em')]);
 if(p.error){PF.erro=/relation|does not exist|schema cache/i.test(p.error.message)?'sql':p.error.message;PF.perfis=[]}else PF.perfis=p.data||[];
 if(m.error){const m2=await SB.from('lm_membros').select('user_id,email,papel,criado_em').eq('escritorio_id',LM.org.id).order('criado_em');PF.membros=m2.data||[]}else PF.membros=m.data||[];
 PF.carregado=true}
async function pfRecarregar(){await lmCarregar(true);await pfCarregar();render()}

function pfErro(e){const m=String((e&&e.message)||e||'');
 if(/function|schema cache|does not exist/i.test(m))return 'A parte de perfis ainda não foi ativada no banco de dados. Rode o arquivo sql/perfis.sql no Supabase.';
 if(/duplicate key|lm_perfis_nome/i.test(m))return 'Já existe um perfil com esse nome.';
 return m.replace(/^.*?ERROR:\s*/,'')||'Não foi possível concluir.'}
function pfPerfil(id){return PF.perfis.find(p=>p.id===id)}
function pfUso(id){return PF.membros.filter(m=>m.perfil_id===id).length}

/* ---------- Editor de perfil ---------- */
function pfNovo(base){const b=base?pfPerfil(base):null;
 PF.edit={id:null,nome:b?b.nome+' (cópia)':'',descricao:b?b.descricao:'',perms:new Set(b?b.permissoes:[])};render();window.scrollTo(0,0)}
function pfEditar(id){const p=pfPerfil(id);if(!p)return;PF.edit={id:p.id,nome:p.nome,descricao:p.descricao||'',perms:new Set(p.permissoes||[])};render();window.scrollTo(0,0)}
function pfCancelar(){PF.edit=null;render()}
function pfGuardaCampos(){const n=$('#pfNome'),d=$('#pfDesc');if(n)PF.edit.nome=n.value;if(d)PF.edit.descricao=d.value}
function pfRedesenha(){const y=window.scrollY;render();window.scrollTo(0,y)}
function pfMarca(k,v){if(!PF.edit)return;pfGuardaCampos();if(v)PF.edit.perms.add(k);else PF.edit.perms.delete(k);pfRedesenha()}
function pfGrupo(i,v){if(!PF.edit)return;pfGuardaCampos();PERM_GRUPOS[i].itens.forEach(([k])=>{if(!v||pfPodeDar(k)){if(v)PF.edit.perms.add(k);else PF.edit.perms.delete(k)}});const y=window.scrollY;render();window.scrollTo(0,y)}
/* quem não é o responsável só libera o que o próprio perfil já tem */
function pfPodeDar(k){return podeAdministrar()||pode(k)}
function pfResumoAtu(){const e=$('#pfResumo');if(e)e.innerHTML=pfResumo()}
function pfResumo(){const n=PF.edit.perms.size;const adm=PERM_ADMIN.filter(k=>PF.edit.perms.has(k));
 return `<b>${n} de ${PERM_TODAS.length}</b> permissões marcadas${adm.length?`. <span style="color:var(--bad)">Atenção: este perfil administra o escritório (${adm.map(k=>PERM_NOME[k]).join(', ')}).</span>`:''}${PF.edit.perms.has('lm_docs_excluir')||PF.edit.perms.has('lm_clientes_excluir')||PF.edit.perms.has('lm_modelos_editar')?' <span class="sub">Inclui exclusão de dados.</span>':''}`}
async function pfSalvar(){const e=PF.edit;if(!e)return;
 e.nome=($('#pfNome').value||'').trim();e.descricao=($('#pfDesc').value||'').trim();
 if(!e.nome){toast('Informe o nome do perfil.');$('#pfNome').focus();return}
 if(!e.perms.size&&!confirm('Este perfil está sem nenhuma permissão. Quem receber o perfil só vai conseguir entrar e ver a tela inicial. Salvar assim mesmo?'))return;
 if(e.id){const n=pfUso(e.id);if(n&&!confirm('Este perfil está em uso por '+n+(n===1?' pessoa':' pessoas')+'. A mudança vale na hora para '+(n===1?'ela':'todas elas')+'. Continuar?'))return}
 const {error}=await SB.rpc('lm_salvar_perfil',{p_escritorio:LM.org.id,p_id:e.id,p_nome:e.nome,p_descricao:e.descricao,p_permissoes:[...e.perms]});
 if(error){toast(pfErro(error));return}
 PF.edit=null;await pfCarregar();await permAtualizar();render();toast('Perfil salvo.')}
async function pfExcluir(id){const p=pfPerfil(id);if(!p)return;const n=pfUso(id);
 if(n){toast('Este perfil está em uso por '+n+(n===1?' pessoa':' pessoas')+'. Troque o perfil delas antes de excluir.');return}
 if(!confirm('Excluir o perfil '+p.nome+'? Os convites ainda não usados com este perfil deixam de valer.'))return;
 const {error}=await SB.rpc('lm_excluir_perfil',{p_id:id});
 if(error){toast(pfErro(error));return}
 await pfCarregar();render();toast('Perfil excluído.')}
async function pfSugeridos(){const {data,error}=await SB.rpc('lm_perfis_sugeridos',{p_escritorio:LM.org.id});
 if(error){toast(pfErro(error));return}
 await pfCarregar();render();toast(data?(data===1?'1 perfil criado.':data+' perfis criados.')+' Confira as permissões de cada um.':'Os perfis sugeridos já existem.')}

/* ---------- Pessoas ---------- */
async function pfDefinir(uid,perfil){const {error}=await SB.rpc('lm_definir_perfil',{p_escritorio:LM.org.id,p_user:uid,p_perfil:perfil||null});
 if(error){toast(pfErro(error));await pfCarregar();render();return}
 await pfCarregar();render();toast('Perfil atualizado. Vale a partir do próximo acesso da pessoa ou quando ela recarregar a página.')}
async function pfRemover(uid,email){if(!confirm('Tirar o acesso de '+email+'? Os documentos, os clientes e os modelos continuam no escritório.'))return;
 const {error}=await SB.rpc('lm_remover_membro',{p_escritorio:LM.org.id,p_user:uid});
 if(error){toast(pfErro(error));return}
 await pfRecarregar();toast('Acesso removido.')}
async function pfConvidar(){const sel=$('#pfConvPerfil');const perfil=sel?sel.value:'';
 if(!perfil&&!podeAdministrar()){toast('Escolha o perfil da pessoa convidada.');return}
 const {data,error}=await SB.rpc('lm_novo_convite_perfil',{p_escritorio:LM.org.id,p_perfil:perfil||null});
 if(error){toast(pfErro(error));return}
 PF.convite={codigo:data,perfil:perfil?(pfPerfil(perfil)||{}).nome:'Equipe sem perfil (acesso completo de equipe)'};render()}
function pfCopiar(t){try{navigator.clipboard.writeText(t);toast('Código copiado.')}catch(e){toast('Copie o código à mão.')}}

/* ---------- Tela ---------- */
function vPerfis(){
 if(typeof LM==='undefined')return '<div class="panel">Carregando...</div>';
 if(!LM.carregado||!PF.carregado){(LM.carregado?Promise.resolve():lmCarregar()).then(permAtualizar).then(pfCarregar).then(render);return `<h1>Equipe e perfis</h1><div class="panel">Carregando...</div>`}
 const cab=`<h1>Equipe e perfis</h1><p class="sub">Crie um perfil para cada função do escritório, marque o que cada função pode fazer e dê um perfil a cada pessoa. O sistema esconde o que o perfil não libera, e o banco de dados bloqueia do mesmo jeito.</p>`;
 if(!LM.org)return cab+`<div class="notice">Você ainda não está em nenhum escritório. Crie o escritório ou use um código de convite em Configurações.</div><div class="acts" style="justify-content:flex-start"><button class="btn" onclick="ir('config')">Abrir Configurações</button></div>`;
 if(PF.erro==='sql'||PERM.semSql)return cab+`<div class="notice bad"><b>A parte de perfis ainda não foi ativada no banco de dados.</b> O administrador precisa rodar o arquivo sql/perfis.sql no Supabase. Depois disso, recarregue a página.</div>`;
 if(!verAbaPerfis())return cab+`<div class="notice">Seu perfil não inclui a administração da equipe. Fale com o responsável pelo escritório.</div>`;
 if(PF.edit)return cab+pfTelaEditor();
 const adm=pode('perfis_admin');
 const meu=PERM.total?(PERM.papel==='mestre'?'Login mestre BlackSolutions':'Responsável, com todas as permissões'):(PERM.perfil?'Perfil '+esc(PERM.perfil.nome):'Equipe sem perfil');
 return cab+`<p>Escritório: <b>${esc(LM.org.nome)}</b><br><span class="sub">Seu acesso: ${meu}</span></p>
 ${pfTelaPerfis(adm)}
 ${pfTelaPessoas(adm)}
 ${pode('equipe_convidar')?pfTelaConvite():''}
 ${PF.perfis.length?pfTelaMatriz():''}`}

function pfTelaPerfis(adm){
 const L=PF.perfis.map(p=>{const n=pfUso(p.id),q=(p.permissoes||[]).length;const admin=(p.permissoes||[]).some(k=>PERM_ADMIN.includes(k));
  return `<div class="rec"><div><b>${esc(p.nome)}</b>${admin?' <span class="selo">administra</span>':''}<br><small>${q} de ${PERM_TODAS.length} permissões · ${n===1?'1 pessoa':n+' pessoas'}${p.descricao?' · '+esc(p.descricao):''}</small></div>
  ${adm?`<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn2" onclick="pfEditar('${p.id}')">Editar permissões</button><button class="btn3" onclick="pfNovo('${p.id}')">Duplicar</button><button class="btn3" style="color:var(--bad)" onclick="pfExcluir('${p.id}')">Excluir</button></div>`:'<div></div>'}</div>`}).join('');
 return `<div class="panel"><h2 style="margin-top:0">Perfis de acesso</h2>
 <p class="sub">Exemplos de perfil: Recepcionista, Secretária, Setor Comercial, Assistente Jurídico, Advogados e Controladoria. O nome é livre.</p>
 ${L||'<p class="sub" style="margin-top:12px">Nenhum perfil criado ainda.</p>'}
 ${adm?`<div class="acts" style="justify-content:flex-start;margin-top:12px"><button class="btn" onclick="pfNovo()">+ Novo perfil</button>${podeAdministrar()?`<button class="btn2" onclick="pfSugeridos()">Criar os perfis sugeridos</button>`:''}</div>
 ${podeAdministrar()?'<p class="dica">Os perfis sugeridos criam Recepcionista, Secretária, Setor Comercial, Assistente Jurídico, Advogados e Controladoria já com permissões marcadas. Confira e ajuste cada um antes de entregar os convites. Nenhum perfil existente é alterado.</p>':''}`:''}</div>`}

function pfTelaEditor(){const e=PF.edit;
 const grupos=PERM_GRUPOS.map((g,gi)=>{const marc=g.itens.filter(([k])=>e.perms.has(k)).length;
  return `<div class="lmcard" style="margin-top:14px"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><div><h3 style="margin:0">${g.g} <span class="selo">${marc}/${g.itens.length}</span></h3><small class="sub">${g.d}</small></div>
  <div style="display:flex;gap:8px"><button class="btn3" onclick="pfGrupo(${gi},true)">Marcar todos</button><button class="btn3" onclick="pfGrupo(${gi},false)">Desmarcar todos</button></div></div>
  ${g.itens.map(([k,n,a])=>{const ok=pfPodeDar(k);return `<label class="chk" style="align-items:flex-start;margin:10px 0;${ok?'':'opacity:.55'}"><input type="checkbox" ${e.perms.has(k)?'checked':''} ${ok?'':'disabled'} onchange="pfMarca('${k}',this.checked)"><span><b>${n}</b><br><small class="sub">${a}${ok?'':' Seu perfil não tem esta permissão, então você não pode liberá-la.'}</small></span></label>`}).join('')}</div>`}).join('');
 const n=e.id?pfUso(e.id):0;
 return `<div class="panel"><h2 style="margin-top:0">${e.id?'Editar perfil':'Novo perfil'}</h2>
 ${n?`<div class="notice" style="margin:0 0 12px">Este perfil está em uso por <b>${n===1?'1 pessoa':n+' pessoas'}</b>. O que você mudar aqui vale para ${n===1?'ela':'todas'}.</div>`:''}
 <div class="fields"><div class="f s2"><label for="pfNome">Nome do perfil *</label><input id="pfNome" value="${esc(e.nome)}" placeholder="Exemplo: Recepcionista" maxlength="60"></div>
 <div class="f s2"><label for="pfDesc">O que esta função faz no escritório</label><input id="pfDesc" value="${esc(e.descricao)}" placeholder="Ajuda quem for dar o perfil a escolher certo" maxlength="200"></div></div>
 <h3 style="margin-bottom:0">Permissões</h3><p class="sub">Marque somente o que a função precisa no dia a dia. O que ficar desmarcado some da tela da pessoa e é bloqueado no banco de dados.</p>
 ${grupos}
 <div class="notice" id="pfResumo" style="margin-top:16px">${pfResumo()}</div>
 <div class="acts" style="justify-content:space-between"><button class="btn2" onclick="pfCancelar()">Cancelar</button><button class="btn" onclick="pfSalvar()">Salvar perfil</button></div></div>`}

function pfTelaPessoas(adm){const eu=U.user.id;const rem=pode('equipe_remover');
 const opcs=(sel,dono)=>`${podeAdministrar()?`<option value="" ${!sel?'selected':''}>Equipe sem perfil (usa tudo, menos administração)</option>`:(!sel?'<option value="" selected disabled>Sem perfil</option>':'')}${PF.perfis.map(p=>`<option value="${p.id}" ${p.id===sel?'selected':''} ${!podeAdministrar()&&(p.permissoes||[]).some(k=>!pode(k))?'disabled':''}>${esc(p.nome)}</option>`).join('')}`;
 const linhas=PF.membros.map(m=>{const fixo=m.papel!=='equipe';const proprio=m.user_id===eu;
  const perfil=fixo?`<span class="sub">${LM_PAPEIS[m.papel]||m.papel}: todas as permissões</span>`
   :(adm&&!(proprio&&!podeAdministrar())?`<select onchange="pfDefinir('${m.user_id}',this.value)" style="min-width:220px">${opcs(m.perfil_id)}</select>`
   :`<span class="sub">${m.perfil_id&&pfPerfil(m.perfil_id)?esc(pfPerfil(m.perfil_id).nome):'Equipe sem perfil'}</span>`);
  return `<tr><td data-l="Pessoa"><b>${esc(m.email||'sem e-mail')}</b>${proprio?' <span class="selo">você</span>':''}<br><small class="sub">desde ${br((m.criado_em||'').slice(0,10))}</small></td><td data-l="Perfil">${perfil}</td>
  <td style="white-space:nowrap">${rem&&!proprio&&(!fixo||podeAdministrar())?`<button class="btn3" style="color:var(--bad)" onclick="pfRemover('${m.user_id}','${esc(m.email||'')}')">Tirar acesso</button>`:''}</td></tr>`}).join('');
 const semPerfil=PF.membros.filter(m=>m.papel==='equipe'&&!m.perfil_id).length;
 return `<div class="panel"><h2 style="margin-top:0">Pessoas e perfis</h2>
 ${semPerfil&&PF.perfis.length?`<div class="notice" style="margin:0 0 12px">${semPerfil===1?'1 pessoa da equipe está':semPerfil+' pessoas da equipe estão'} sem perfil e ${semPerfil===1?'usa':'usam'} tudo, menos a administração. Escolha o perfil de cada uma.</div>`:''}
 <div class="tvw"><table class="tv"><thead><tr><th>Pessoa</th><th>Perfil</th><th></th></tr></thead><tbody>${linhas||'<tr><td>Ninguém além de você.</td></tr>'}</tbody></table></div>
 <p class="dica">A troca de perfil vale a partir do próximo acesso da pessoa ou quando ela recarregar a página. O bloqueio no banco de dados vale na hora.</p></div>`}

function pfTelaConvite(){
 return `<div class="panel"><h2 style="margin-top:0">Convidar pessoa</h2>
 <p class="sub">Escolha o perfil, gere o código e entregue para a pessoa. Ela cria o acesso dela no Lex Calc e usa o código em Configurações. A pessoa já entra com o perfil escolhido. O código serve uma vez só e vence em 30 dias.</p>
 <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;align-items:center"><select id="pfConvPerfil" style="min-width:240px;background:#111e27;border:1px solid #6e6a5e;border-radius:7px;padding:10px;color:#fff">${!PF.perfis.length&&!podeAdministrar()?'<option value="">Nenhum perfil criado</option>':''}${podeAdministrar()?'<option value="">Equipe sem perfil (usa tudo, menos administração)</option>':''}${PF.perfis.map(p=>`<option value="${p.id}" ${!podeAdministrar()&&(p.permissoes||[]).some(k=>!pode(k))?'disabled':''}>${esc(p.nome)}</option>`).join('')}</select><button class="btn" onclick="pfConvidar()">Gerar código de convite</button></div>
 ${PF.convite?`<div class="notice ok" style="margin:12px 0">Código para o perfil <b>${esc(PF.convite.perfil)}</b>: <b style="font-size:20px;letter-spacing:3px">${esc(PF.convite.codigo)}</b> <button class="btn3" onclick="pfCopiar('${esc(PF.convite.codigo)}')">Copiar</button><br><small>Copie agora. Ele continua válido por 30 dias e some desta tela quando você sair.</small></div>`:''}
 <p class="dica">O código de responsável, que dá todas as permissões, continua em Configurações, no painel Escritório e equipe.</p></div>`}

function pfTelaMatriz(){const P=PF.perfis;
 return `<div class="panel"><h2 style="margin-top:0">Comparar perfis</h2><p class="sub">Confira lado a lado o que cada perfil libera antes de entregar os convites.</p>
 <div style="overflow:auto;margin-top:10px"><table style="border-collapse:collapse;width:100%;min-width:${260+P.length*110}px;font-size:13px"><thead><tr><th style="text-align:left;padding:8px;border-bottom:1px solid #3d3423">Permissão</th>${P.map(p=>`<th style="padding:8px;border-bottom:1px solid #3d3423;color:var(--gold2)">${esc(p.nome)}</th>`).join('')}</tr></thead>
 <tbody>${PERM_GRUPOS.map(g=>`<tr><td colspan="${P.length+1}" style="padding:12px 8px 4px;color:var(--gold);font-weight:700">${g.g}</td></tr>${g.itens.map(([k,n])=>`<tr><td style="padding:6px 8px;border-bottom:1px solid #2a251a">${n}</td>${P.map(p=>`<td style="text-align:center;border-bottom:1px solid #2a251a">${(p.permissoes||[]).includes(k)?'<span style="color:#7fd6a0;font-weight:700">Sim</span>':'<span class="sub">Não</span>'}</td>`).join('')}</tr>`).join('')}`).join('')}</tbody></table></div></div>`}
