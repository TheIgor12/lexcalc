/* LexMandato by BlackSolutions: procurações, declarações e contratos com a identidade do escritório.
   Módulo do Lex Calc. Usa o login, a assinatura e o papel timbrado do Lex Calc. Dados salvos na nuvem (tabelas lm_*). */
const LM={tab:'painel',esc:null,org:null,orgs:[],equipe:[],semOrg:false,convite:null,lote:null,mestre:false,todosEsc:[],acessos:[],clientes:[],docs:[],modelos:[],doc:null,passo:1,busca:'',filtro:'',carregado:false,erroTabela:false,mod:null};

/* ============ Listas ============ */
const LM_AREAS={civel:'Cível',trabalhista:'Trabalhista',previdenciario:'Previdenciário'};
const LM_ACOES_CIVEIS=['Ação de procedimento comum','Ação de cobrança','Ação de indenização por danos morais','Ação de indenização por danos materiais e morais','Ação revisional de contrato','Ação declaratória de inexistência de débito','Ação de obrigação de fazer ou de não fazer','Ação de consignação em pagamento','Ação monitória','Execução de título extrajudicial','Cumprimento de sentença','Impugnação ao cumprimento de sentença','Embargos à execução','Embargos de terceiro','Ação de despejo','Ação renovatória de locação','Ação de reintegração de posse','Ação de manutenção de posse','Interdito proibitório','Ação de usucapião','Ação de imissão na posse','Ação reivindicatória','Ação de divórcio','Ação de reconhecimento e dissolução de união estável','Ação de alimentos','Ação revisional de alimentos','Ação de guarda','Ação de regulamentação de convivência','Ação de investigação de paternidade','Ação de interdição e curatela','Inventário','Arrolamento','Alvará judicial','Ação de busca e apreensão','Ação de exigir contas','Ação de dissolução parcial de sociedade','Habilitação de crédito em recuperação judicial ou falência','Produção antecipada de provas','Ação de exibição de documentos','Tutela cautelar antecedente','Mandado de segurança','Ação popular','Reclamação no Juizado Especial Cível','Recurso em tribunal','Outra, descrita no objeto'];
const LM_TRAB=['Reclamação trabalhista pelo rito ordinário','Reclamação trabalhista pelo rito sumaríssimo','Homologação de acordo extrajudicial','Ação de consignação em pagamento','Inquérito para apuração de falta grave','Execução trabalhista','Recurso','Outra, descrita no objeto'];
const LM_BENEF=['Aposentadoria por idade','Aposentadoria por tempo de contribuição','Aposentadoria especial','Aposentadoria da pessoa com deficiência','Aposentadoria por incapacidade permanente','Auxílio por incapacidade temporária','Auxílio-acidente','Benefício de prestação continuada à pessoa idosa','Benefício de prestação continuada à pessoa com deficiência','Pensão por morte','Auxílio-reclusão','Salário-maternidade','Revisão de benefício','Restabelecimento de benefício','Certidão de tempo de contribuição','Outro, descrito no objeto'];
const LM_ESTCIVIL=[['solteiro','solteiro(a)'],['casado','casado(a)'],['uniao','em união estável'],['divorciado','divorciado(a)'],['separado','separado(a) judicialmente'],['viuvo','viúvo(a)']];
const LM_STATUS=['Rascunho','Em revisão','Aprovado','Gerado','Aguardando assinatura','Assinado','Cancelado','Revogação registrada'];
const LM_DOCS={procuracao:'Procuração',declaracao:'Declaração de hipossuficiência',contrato:'Contrato de honorários',substabelecimento:'Substabelecimento',preposicao:'Carta de preposição',termo_inss:'Termo de responsabilidade (INSS)'};
/* Poderes do art. 105 do CPC, cada um em separado */
const LM_ESPECIAIS=[['citacao','Receber citação','Recebe a citação no lugar do cliente. O prazo começa a correr a partir daí.','receber citação'],
 ['confessar','Confessar','Admite como verdadeiro um fato contrário ao interesse do cliente.','confessar'],
 ['reconhecer','Reconhecer a procedência do pedido','Aceita o pedido da parte contrária.','reconhecer a procedência do pedido'],
 ['transigir','Transigir','Faz acordo, com concessões de ambos os lados.','transigir'],
 ['desistir','Desistir da ação','Encerra o processo sem abrir mão do direito. O pedido pode ser proposto de novo.','desistir'],
 ['renunciar','Renunciar ao direito sobre o qual se funda a ação','Abre mão do próprio direito. Não pode ser pedido de novo.','renunciar ao direito sobre o qual se funda a ação'],
 ['receber','Receber valores','Recebe dinheiro, inclusive por alvará ou transferência.','receber'],
 ['quitacao','Dar quitação','Declara que a dívida foi paga. É diferente de receber.','dar quitação'],
 ['compromisso','Firmar compromisso','Assina compromisso de arbitragem.','firmar compromisso'],
 ['hipossuficiencia','Assinar declaração de hipossuficiência econômica','Permite ao advogado declarar a falta de recursos do cliente para a gratuidade da justiça.','assinar declaração de hipossuficiência econômica']];
const LM_EXTRAS={
 todos:[['alvara','Levantar valores por alvará','levantar valores depositados em juízo, inclusive mediante alvará judicial ou transferência eletrônica'],['administrativo','Atuar em órgãos administrativos','representá-lo(a) perante repartições públicas federais, estaduais e municipais, autarquias e órgãos administrativos em geral, requerendo certidões, cópias e informações']],
 civel:[['alienar','Alienar, hipotecar e onerar bens','alienar, hipotecar e onerar bens, nos termos do art. 661, § 1º, do Código Civil'],['cartorio','Atuar em cartórios','representá-lo(a) perante cartórios de notas, de registro de imóveis e de registro civil']],
 trabalhista:[['fgts','Levantar FGTS e seguro-desemprego','requerer o levantamento dos depósitos do Fundo de Garantia do Tempo de Serviço e a habilitação ao seguro-desemprego'],['acordo_trab','Celebrar acordo na Justiça do Trabalho','celebrar acordos judiciais e extrajudiciais na Justiça do Trabalho']],
 previdenciario:[['inss_recurso','Recorrer administrativamente','interpor recursos ao Conselho de Recursos da Previdência Social'],['inss_receber','Receber o benefício em nome do cliente','receber o benefício previdenciário em nome do(a) outorgante']]};

/* ============ Utilidades ============ */
const lmG=(o,p)=>p.split('.').reduce((a,k)=>a==null?a:a[k],o);
function lmS(o,p,v){const k=p.split('.');let a=o;k.slice(0,-1).forEach(x=>{if(a[x]==null||typeof a[x]!=='object')a[x]={};a=a[x]});a[k[k.length-1]]=v}
const lmDig=v=>String(v||'').replace(/\D/g,'');
function lmCPF(v){const s=lmDig(v);if(s.length!==11||/^(\d)\1+$/.test(s))return false;let t=0;for(let i=0;i<9;i++)t+=+s[i]*(10-i);let d=t*10%11%10;if(d!==+s[9])return false;t=0;for(let i=0;i<10;i++)t+=+s[i]*(11-i);d=t*10%11%10;return d===+s[10]}
function lmCNPJ(v){const s=lmDig(v);if(s.length!==14||/^(\d)\1+$/.test(s))return false;const c=n=>{const p=n===12?[5,4,3,2,9,8,7,6,5,4,3,2]:[6,5,4,3,2,9,8,7,6,5,4,3,2];let t=0;for(let i=0;i<n;i++)t+=+s[i]*p[i];const r=t%11;return r<2?0:11-r};return c(12)===+s[12]&&c(13)===+s[13]}
const lmFmtCPF=v=>{const s=lmDig(v).slice(0,11);return s.length===11?s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4'):v||''};
const lmFmtCNPJ=v=>{const s=lmDig(v).slice(0,14);return s.length===14?s.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5'):v||''};
const MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const lmDataExt=d=>{d=d||hoje();return +d.slice(8,10)+' de '+MESES[+d.slice(5,7)-1]+' de '+d.slice(0,4)};
function lmGen(g,m,f,n){return g==='f'?f:g==='m'?m:n}
const LM_EC_FORMAS={solteiro:['solteiro','solteira','solteiro(a)'],casado:['casado','casada','casado(a)'],uniao:['em união estável','em união estável','em união estável'],divorciado:['divorciado','divorciada','divorciado(a)'],separado:['separado judicialmente','separada judicialmente','separado(a) judicialmente'],viuvo:['viúvo','viúva','viúvo(a)']};
function lmEstCivil(c,g){const f=LM_EC_FORMAS[c];if(!f)return '';return g==='m'?f[0]:g==='f'?f[1]:f[2]}
function lmEnd(o){o=o||{};const p=[];if(o.logradouro)p.push(o.logradouro+(o.numero?', nº '+o.numero:', sem número')+(o.complemento?', '+o.complemento:''));if(o.bairro)p.push('bairro '+o.bairro);if(o.cidade)p.push(o.cidade+(o.uf?'/'+o.uf:''));if(o.cep)p.push('CEP '+o.cep);return p.join(', ')}

/* ============ Documento novo ============ */
function lmNovoDoc(area,docs){const e=LM.esc||{};const advs=(e.advogados||[]).map((a,i)=>i===0);
 return {status:'Rascunho',area:area||'civel',cliente:{tipo:'pf',genero:'',nacionalidade:'brasileira',estadoCivil:'',mostrarContato:false},rep:{modo:'proprio'},
  obj:{acao:'',polo:'autor',contraria:'',contrariaDoc:'',processo:'',juizo:'',objeto:'',alcance:{judicial:true,extrajudicial:false,administrativo:false},trabPolo:'reclamante',via:'administrativa',beneficio:'',nb:'',nit:'',protocolo:'',preposto:{}},
  advs,poderes:{geral:true,especiais:{},extras:{},substab:'livre',restricoes:'',prazo:''},
  docs:Object.assign({procuracao:true,declaracao:false,contrato:false,substabelecimento:false,preposicao:false,termo_inss:false},docs||{}),
  substab:{reserva:'com'},hon:{tipo:'exito',valor:'',entrada:'',parcelas:'1',venc1:'',forma:'Pix',pct:'30',base:'sobre o proveito econômico obtido pelo(a) contratante',momento:'no momento do recebimento dos valores',despesas:'contratante',foro:'',naProcuracao:false},
  modelos:{},local:e.cidade?e.cidade+(e.uf?'/'+e.uf:''):'',data:hoje()}}

/* ============ Textos ============ */
function lmQualPF(c,rotulo){const g=c.genero;const p=[(c.nome||'{{cliente.nome}}').toUpperCase()+(c.nomeSocial?' (nome social: '+c.nomeSocial+')':'')];
 if(c.nacionalidade)p.push(c.nacionalidade);const ec=lmEstCivil(c.estadoCivil,g);if(ec)p.push(ec);if(c.profissao)p.push(c.profissao);
 if(c.nascimento&&rotulo)p.push(lmGen(g,'nascido','nascida','nascido(a)')+' em '+br(c.nascimento));
 if(c.rg)p.push(lmGen(g,'portador','portadora','portador(a)')+' da cédula de identidade nº '+c.rg+(c.rgOrgao?' '+c.rgOrgao:''));
 if(c.cpf)p.push(lmGen(g,'inscrito','inscrita','inscrito(a)')+' no CPF sob o nº '+lmFmtCPF(c.cpf));
 const end=lmEnd(c);if(end)p.push(lmGen(g,'residente e domiciliado','residente e domiciliada','residente e domiciliado(a)')+' na '+end);
 if(c.mostrarContato){if(c.email)p.push('e-mail '+c.email);if(c.telefone)p.push('telefone '+c.telefone)}return p.join(', ')}
function lmQualPJ(c,r){const p=[(c.razao||'{{cliente.razao_social}}').toUpperCase(),'pessoa jurídica de direito privado'];if(c.cnpj)p.push('inscrita no CNPJ sob o nº '+lmFmtCNPJ(c.cnpj));const end=lmEnd(c);if(end)p.push('com sede na '+end);
 if(c.mostrarContato){if(c.email)p.push('e-mail '+c.email);if(c.telefone)p.push('telefone '+c.telefone)}
 let t=p.join(', ');if(r&&r.nome)t+=', neste ato representada por '+(r.cargo?lmGen(r.genero,'seu','sua','seu(sua)')+' '+r.cargo+', ':'')+lmQualPF(r);return t}
function lmTitular(d){const c=d.cliente;return c.tipo==='pj'?(c.razao||''):(c.nome||'')}
function lmQualCliente(d){const c=d.cliente,r=d.rep||{};if(c.tipo==='pj')return lmQualPJ(c,r);
 const base=lmQualPF(c,true),g=c.genero,rg=r.genero,rq=r.nome?lmQualPF(r):'{{representante}}',vin=r.vinculo?(' '+r.vinculo):'',seu=lmGen(rg,'seu','sua','seu(sua)'),nom=lmGen(rg,'nomeado','nomeada','nomeado(a)');
 switch(r.modo){case 'menor_rep':return base+', '+lmGen(g,'menor impúbere','menor impúbere','menor impúbere')+', neste ato '+lmGen(g,'representado','representada','representado(a)')+' por '+seu+vin+' '+rq;
  case 'menor_ass':return base+', menor púbere, neste ato '+lmGen(g,'assistido','assistida','assistido(a)')+' por '+seu+vin+' '+rq;
  case 'tutela':return base+', neste ato '+lmGen(g,'representado','representada','representado(a)')+' por '+seu+' '+lmGen(rg,'tutor','tutora','tutor(a)')+' '+rq+(r.processo?', '+nom+' nos autos nº '+r.processo:'');
  case 'curatela':return base+', neste ato '+lmGen(g,'representado','representada','representado(a)')+' por '+seu+' '+lmGen(rg,'curador','curadora','curador(a)')+(r.provisoria?' '+lmGen(rg,'provisório','provisória','provisório(a)'):'')+' '+rq+(r.processo?', '+nom+' por decisão proferida nos autos nº '+r.processo:'')+(r.limites?', nos limites fixados naquela decisão: '+r.limites:', nos limites fixados na decisão de nomeação');
  default:return base}}
function lmAssinante(d){const c=d.cliente,r=d.rep||{};if(c.tipo==='pj')return [(c.razao||'').toUpperCase(),r.nome?r.nome+(r.cargo?', '+r.cargo:''):'Representante legal'];
 if(['menor_rep','tutela','curatela'].includes(r.modo))return [(c.nome||'').toUpperCase(),'representado(a) por '+(r.nome||'')];
 if(r.modo==='menor_ass')return [(c.nome||'').toUpperCase()+' e '+(r.nome||'').toUpperCase(),'assistente: '+(r.nome||'')];return [(c.nome||'').toUpperCase(),c.cpf?'CPF '+lmFmtCPF(c.cpf):'']}
function lmAdvsSel(d){if(d.advsLista)return d.advsLista;const L=(LM.esc&&LM.esc.advogados)||[];return L.filter((a,i)=>d.advs&&d.advs[i])}
function lmPl(d){return lmAdvsSel(d).length>1||!!lmSociedade()}
function lmQualAdv(a){const g=a.genero;const p=[(a.nome||'').toUpperCase()];if(a.nacionalidade)p.push(a.nacionalidade);const ec=lmEstCivil(a.estadoCivil,g);if(ec)p.push(ec);p.push(lmGen(g,'advogado','advogada','advogado(a)'));
 p.push(lmGen(g,'inscrito','inscrita','inscrito(a)')+' na Ordem dos Advogados do Brasil, Seção '+(a.uf||'{{UF}}')+', sob o nº '+(a.oab||'{{OAB}}'));if(a.endereco)p.push('com escritório profissional na '+a.endereco);if(a.email)p.push('e-mail '+a.email);return p.join(', ')}
function lmQualAdvs(d){const A=lmAdvsSel(d);if(!A.length)return '{{advogados.qualificacao}}';const q=A.map(lmQualAdv);return q.length>1?q.slice(0,-1).join('; ')+'; e '+q[q.length-1]:q[0]}
function lmSociedade(){const s=(LM.esc&&LM.esc.sociedade)||{};if(!s.nome)return '';return 'integrantes da sociedade '+s.nome+(s.registro?', registrada na Ordem dos Advogados do Brasil sob o nº '+s.registro:'')+(s.endereco?', com sede na '+s.endereco:'')}
function lmFinalidade(d){const o=d.obj,a=d.area;let t='';
 if(a==='civel'){const ac=o.acao&&!/^Outra/.test(o.acao)?o.acao.replace(/^Ação/,'ação').replace(/^([A-Z])/,m=>m.toLowerCase()):'';
  if(ac||o.objeto){const verbo=o.polo==='reu'?'atuar na defesa do(a) outorgante'+(ac?' nos autos de '+ac:''):o.polo==='terceiro'?'atuar como terceiro interessado'+(ac?' nos autos de '+ac:''):(ac?'propor e acompanhar '+ac:'atuar em favor do(a) outorgante');t='para o fim especial de '+verbo+(o.contraria?(o.polo==='autor'?' em face de ':' movida por ')+o.contraria+(o.contrariaDoc?' ('+o.contrariaDoc+')':''):'')+(o.processo?', nos autos nº '+o.processo:'')+(o.juizo?', perante '+o.juizo:'')+(o.objeto?', tendo por objeto '+o.objeto:'')}}
 if(a==='trabalhista'){const ac=o.acao&&!/^Outra/.test(o.acao)?o.acao.replace(/^([A-Z])/,m=>m.toLowerCase()):'reclamação trabalhista';
  t=o.trabPolo==='reclamada'?'para o fim especial de defender a outorgante nos autos de '+ac+(o.contraria?' ajuizada por '+o.contraria+(o.contrariaDoc?' ('+o.contrariaDoc+')':''):''):'para o fim especial de propor e acompanhar '+ac+(o.contraria?' em face de '+o.contraria+(o.contrariaDoc?' ('+o.contrariaDoc+')':''):'');
  t+=(o.processo?', processo nº '+o.processo:'')+(o.juizo?', perante '+o.juizo:'')+(o.objeto?', tendo por objeto '+o.objeto:'')}
 if(a==='previdenciario'){const b=o.beneficio&&!/^Outro/.test(o.beneficio)?o.beneficio.toLowerCase():(o.objeto||'benefício previdenciário ou assistencial');const nb=(o.nb?', NB '+o.nb:'')+(o.nit?', NIT '+o.nit:'')+(o.protocolo?', protocolo '+o.protocolo:'');
  const adm='representá-lo(a) perante o Instituto Nacional do Seguro Social (INSS), em quaisquer de suas agências e canais de atendimento, para requerer, acompanhar, cumprir exigências e tomar ciência de decisões no pedido de '+b+nb;
  const jud='propor e acompanhar ação previdenciária em face do Instituto Nacional do Seguro Social (INSS) visando '+b+(o.processo?', processo nº '+o.processo:'')+(o.juizo?', perante '+o.juizo:'');
  t='para o fim especial de '+(o.via==='judicial'?jud:o.via==='ambas'?adm+', bem como '+jud:adm);if(o.objeto&&!/^Outro/.test(o.beneficio||''))t+=', tendo por objeto '+o.objeto}
 return t}
function lmListaE(L){return L.length>1?L.slice(0,-1).join(', ')+' e '+L[L.length-1]:L[0]||''}
function lmPoderes(d){const P=d.poderes,o=d.obj,a=d.area,partes=[];
 const prev=a==='previdenciario'&&o.via==='administrativa';
 if(P.geral&&!prev)partes.push('a quem confere amplos poderes para o foro em geral, com a cláusula ad judicia et extra, podendo praticar todos os atos do processo em qualquer juízo, instância ou tribunal, propor as ações competentes e defendê-lo(a) nas contrárias, seguindo umas e outras até final decisão, interpor recursos, apresentar defesas, impugnações e manifestações, requerer, produzir provas e acompanhar diligências'+(o.alcance&&o.alcance.extrajudicial?', bem como representá-lo(a) extrajudicialmente':''));
 if(prev)partes.push('a quem confere poderes para praticar todos os atos necessários a esse fim, inclusive apresentar documentos, prestar informações, agendar atendimentos e perícias e acompanhar o andamento do requerimento');
 const esp=LM_ESPECIAIS.filter(x=>P.especiais&&P.especiais[x[0]]).map(x=>x[3]);
 const ext=[...(LM_EXTRAS.todos||[]),...(LM_EXTRAS[a]||[])].filter(x=>P.extras&&P.extras[x[0]]).map(x=>x[2]);
 const lh=lmPl(d)?'lhes':'lhe';if(esp.length)partes.push('conferindo-'+lh+', ainda, os poderes especiais para '+lmListaE(esp));
 if(ext.length)partes.push((esp.length?'e também para ':'conferindo-'+lh+', ainda, poderes para ')+lmListaE(ext));
 return partes.join(', ')}
/* Só a enumeração dos poderes especiais, para o escritório que já tem a própria frase de poderes gerais */
function lmPoderesLista(d){const P=d.poderes,a=d.area;const esp=LM_ESPECIAIS.filter(x=>P.especiais&&P.especiais[x[0]]).map(x=>x[3]);
 const ext=[...(LM_EXTRAS.todos||[]),...(LM_EXTRAS[a]||[])].filter(x=>P.extras&&P.extras[x[0]]).map(x=>x[2]);
 return lmListaE(esp.concat(ext))}
function lmSubstab(d){const s=d.poderes.substab,g1=(lmAdvsSel(d)[0]||{}).genero,q=lmPl(d)?'Os outorgados poderão':lmGen(g1,'O outorgado poderá','A outorgada poderá','O(A) outorgado(a) poderá');return s==='vedado'?'Fica vedado o substabelecimento.':s==='com'?q+' substabelecer, no todo ou em parte, somente com reserva de iguais poderes.':q+' substabelecer, no todo ou em parte, com ou sem reserva de iguais poderes.'}
function lmRestricoes(d){const P=d.poderes;let t='';if(P.restricoes)t+='Ficam expressamente excluídos ou limitados os seguintes atos: '+P.restricoes.replace(/\.$/,'')+'.';if(P.prazo)t+=(t?' ':'')+'O presente mandato vigorará até '+br(P.prazo)+'.';return t}
function lmHonTexto(d){const h=d.hon;const p=[];if(h.tipo!=='exito'&&num(h.valor)){let s='honorários fixos de '+R(num(h.valor));if(num(h.entrada))s+=', com entrada de '+R(num(h.entrada));const n=Math.max(1,parseInt(h.parcelas)||1),resto=num(h.valor)-num(h.entrada);if(n>1&&resto>0)s+=', e o saldo em '+n+' parcelas mensais de '+R(resto/n)+(h.venc1?', a primeira com vencimento em '+br(h.venc1):'');else if(h.venc1)s+=', com vencimento em '+br(h.venc1);s+=', por meio de '+(h.forma||'Pix');p.push(s)}
 if(h.tipo!=='fixo'&&num(h.pct))p.push('honorários de êxito de '+String(h.pct).replace('.',',')+'% '+(h.base||'sobre o proveito econômico obtido')+', devidos '+(h.momento||'no momento do recebimento dos valores'));return lmListaE(p)}
function lmVars(d){const c=d.cliente,e=LM.esc||{},A=lmAdvsSel(d),[ass1,ass2]=lmAssinante(d);
 return {'cliente.nome':c.tipo==='pj'?c.razao||'':c.nome||'','cliente.razao_social':c.razao||'','cliente.cpf':lmFmtCPF(c.cpf),'cliente.cnpj':lmFmtCNPJ(c.cnpj),'cliente.documento':c.tipo==='pj'?lmFmtCNPJ(c.cnpj):lmFmtCPF(c.cpf),'cliente.rg':c.rg||'','cliente.nacionalidade':c.nacionalidade||'','cliente.estado_civil':lmEstCivil(c.estadoCivil,c.genero),'cliente.profissao':c.profissao||'','cliente.endereco_completo':lmEnd(c),'cliente.email':c.email||'','cliente.telefone':c.telefone||'',
  'cliente.qualificacao':lmQualCliente(d),'representacao.texto':(d.rep&&d.rep.nome)?lmQualPF(d.rep):'','representante.nome':(d.rep&&d.rep.nome)||'','advogados.qualificacao':lmQualAdvs(d),'advogados.nomes':lmListaE(A.map(a=>a.nome)),'sociedade.texto':lmSociedade(),'finalidade.texto':lmFinalidade(d),'poderes.texto':lmPoderes(d),'poderes.lista':lmPoderesLista(d),'substabelecimento.texto':lmSubstab(d),'restricoes.texto':lmRestricoes(d),'honorarios.texto':lmHonTexto(d),
  'parte_contraria':d.obj.contraria||'','processo':d.obj.processo||'','acao':d.obj.acao||'','beneficio':d.obj.beneficio||'','nb':d.obj.nb||'','local':d.local||e.cidade||'','data':lmDataExt(d.data),'local_data':(d.local||e.cidade||'')+', '+lmDataExt(d.data),'assinante.nome':ass1,'escritorio.nome':e.nome||''}}
const LM_CAMPOS=[['cliente.qualificacao','Qualificação completa do cliente'],['cliente.nome','Nome do cliente'],['cliente.cpf','CPF'],['cliente.cnpj','CNPJ'],['cliente.rg','RG'],['cliente.nacionalidade','Nacionalidade'],['cliente.estado_civil','Estado civil'],['cliente.profissao','Profissão'],['cliente.endereco_completo','Endereço completo'],['cliente.email','E-mail do cliente'],['cliente.telefone','Telefone do cliente'],['representacao.texto','Qualificação do representante'],['advogados.qualificacao','Qualificação dos advogados'],['advogados.nomes','Nomes dos advogados'],['sociedade.texto','Sociedade de advogados'],['finalidade.texto','Finalidade'],['poderes.texto','Poderes selecionados'],['poderes.lista','Só a lista de poderes especiais'],['substabelecimento.texto','Cláusula de substabelecimento'],['restricoes.texto','Restrições e prazo'],['honorarios.texto','Honorários'],['parte_contraria','Parte contrária'],['processo','Número do processo'],['acao','Tipo de ação'],['beneficio','Benefício'],['nb','Número do benefício'],['local','Local'],['data','Data por extenso'],['local_data','Local e data juntos'],['assinante.nome','Quem assina']];

/* Textos padrão de cada documento (o escritório pode trocar por modelo próprio) */
function lmPadrao(tipo,d){const v=lmVars(d),soc=v['sociedade.texto'];const ass=lmAssinante(d);const A=lmAdvsSel(d);
 const fecho=`\n${v.local||'{{local}}'}, ${v.data}.\n\n\n____________________________________\n${ass[0]}${ass[1]?'\n'+ass[1]:''}`;
 if(tipo==='procuracao'){const fin=v['finalidade.texto'];const pl=lmPl(d),g1=(A[0]||{}).genero;const lbl=pl?'OUTORGADOS':lmGen(g1,'OUTORGADO','OUTORGADA','OUTORGADO(A)'),quem=pl?'seus bastantes procuradores os outorgados acima qualificados':lmGen(g1,'seu bastante procurador o outorgado acima qualificado','sua bastante procuradora a outorgada acima qualificada','seu(sua) bastante procurador(a) o(a) outorgado(a) acima qualificado(a)');let t=`# PROCURAÇÃO\n\n**OUTORGANTE:** ${v['cliente.qualificacao']}.\n\n**${lbl}:** ${v['advogados.qualificacao']}${soc?', '+soc:''}.\n\n**PODERES:** Pelo presente instrumento particular de mandato, o(a) outorgante nomeia e constitui ${quem}${fin?', '+fin:''}, ${v['poderes.texto']}. ${v['substabelecimento.texto']}${v['restricoes.texto']?' '+v['restricoes.texto']:''}`;
  if(d.hon.naProcuracao&&v['honorarios.texto'])t+=`\n\n**HONORÁRIOS:** Ficam ajustados ${v['honorarios.texto']}, conforme o contrato de honorários firmado entre as partes.`;return t+'\n'+fecho}
 if(tipo==='declaracao'){const trab=d.area==='trabalhista';return `# DECLARAÇÃO DE HIPOSSUFICIÊNCIA ECONÔMICA\n\n${v['cliente.qualificacao']}, DECLARA, para os fins do art. 99, § 3º, do Código de Processo Civil${trab?' e do art. 790, § 4º, da Consolidação das Leis do Trabalho':''}, e do art. 1º da Lei nº 7.115, de 29 de agosto de 1983, que não possui condições de arcar com as custas e despesas processuais e com os honorários advocatícios sem prejuízo do próprio sustento e do de sua família, razão pela qual requer os benefícios da gratuidade da justiça.\n\nDeclara, ainda, estar ciente de que a falsidade desta declaração sujeita o(a) declarante às sanções civis, administrativas e criminais previstas em lei.\n${fecho}`}
 if(tipo==='contrato'){const h=d.hon,trab=d.area==='trabalhista';const fin=v['finalidade.texto'].replace(/^para o fim especial de /,'');let n=0;const cl=t=>`**CLÁUSULA ${['PRIMEIRA','SEGUNDA','TERCEIRA','QUARTA','QUINTA','SEXTA','SÉTIMA','OITAVA','NONA','DÉCIMA'][n++]}.** ${t}`;
  const par=[];par.push(cl(`O presente contrato tem por objeto a prestação de serviços advocatícios pelos CONTRATADOS ao(à) CONTRATANTE, consistentes em ${fin||'{{finalidade.texto}}'}, abrangendo os atos necessários até a decisão final${trab?' na Justiça do Trabalho':''}.`));
  par.push(cl(`Pelos serviços contratados, o(a) CONTRATANTE pagará aos CONTRATADOS ${v['honorarios.texto']||'{{honorarios.texto}}'}.`));
  par.push(cl(`As custas, as despesas processuais e extraprocessuais, como cópias, certidões, deslocamentos e perícias particulares, ficam a cargo d${h.despesas==='contratados'?'os CONTRATADOS':'o(a) CONTRATANTE'}, mediante prestação de contas.`));
  par.push(cl('Os honorários de sucumbência pertencem exclusivamente aos CONTRATADOS e não se compensam com os honorários ajustados neste contrato, nos termos do art. 23 da Lei nº 8.906, de 4 de julho de 1994, e do art. 85, § 14, do Código de Processo Civil.'));
  par.push(cl('A revogação do mandato pelo(a) CONTRATANTE não o(a) desobriga do pagamento dos honorários proporcionais aos serviços já prestados, nem dos honorários de êxito, caso o resultado venha a ser obtido em razão dos atos praticados pelos CONTRATADOS.'));
  par.push(cl('O(A) CONTRATANTE compromete-se a fornecer informações verdadeiras e os documentos necessários e a manter atualizados os seus dados de contato.'));
  par.push(cl('Este contrato constitui título executivo, nos termos do art. 24 da Lei nº 8.906, de 4 de julho de 1994.'));
  par.push(cl(`Fica eleito o foro da comarca de ${h.foro||v.local||'{{local}}'} para dirimir as questões decorrentes deste contrato.`));
  const assA=A.map(a=>`____________________________________\n${(a.nome||'').toUpperCase()}\nOAB/${a.uf||''} ${a.oab||''}`).join('\n\n\n');
  const sing=t=>lmPl(d)?t:t.replace(/aos CONTRATADOS/g,'ao CONTRATADO').replace(/pelos CONTRATADOS/g,'pelo CONTRATADO').replace(/os CONTRATADOS/g,'o CONTRATADO').replace(/CONTRATADOS/g,'CONTRATADO');
  return sing(`# CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS\n\n**CONTRATANTE:** ${v['cliente.qualificacao']}.\n\n**CONTRATADOS:** ${v['advogados.qualificacao']}${soc?', '+soc:''}.\n\nAs partes acima qualificadas celebram o presente contrato de prestação de serviços advocatícios, que se regerá pelas cláusulas seguintes.\n\n${par.join('\n\n')}\n\nE, por estarem justas e contratadas, as partes assinam o presente instrumento em duas vias de igual teor, na presença das testemunhas abaixo.\n\n${v.local||'{{local}}'}, ${v.data}.\n\n\n____________________________________\n${ass[0]}\nCONTRATANTE\n\n\n${assA||'____________________________________\nCONTRATADOS'}\n\n\nTestemunhas:\n\n____________________________________\nNome e CPF\n\n____________________________________\nNome e CPF`)}
 if(tipo==='substabelecimento'){const s=d.substab||{},a=A[0]||{};const sq=lmQualAdv({nome:s.nome,genero:s.genero,uf:s.uf,oab:s.oab,endereco:s.endereco,nacionalidade:s.nacionalidade,estadoCivil:s.estadoCivil});
  return `# SUBSTABELECIMENTO\n\nPelo presente instrumento, ${a.nome?lmQualAdv(a):'{{advogado}}'}, substabelece, ${s.reserva==='sem'?'sem':'com'} reserva de iguais poderes, na pessoa de ${s.nome?sq:'{{substabelecido}}'}, os poderes que lhe foram conferidos por ${lmTitular(d)||'{{cliente.nome}}'}${d.obj.processo?', nos autos nº '+d.obj.processo:''}, na procuração outorgada.\n\n${v.local||'{{local}}'}, ${v.data}.\n\n\n____________________________________\n${(a.nome||'').toUpperCase()}\nOAB/${a.uf||''} ${a.oab||''}`}
 if(tipo==='preposicao'){const p=d.obj.preposto||{};return `# CARTA DE PREPOSIÇÃO\n\n${v['cliente.qualificacao']}, nomeia e constitui como ${lmGen(p.genero,'seu preposto','sua preposta','seu(sua) preposto(a)')} ${(p.nome||'{{preposto}}').toUpperCase()}${p.cpf?', '+lmGen(p.genero,'inscrito','inscrita','inscrito(a)')+' no CPF sob o nº '+lmFmtCPF(p.cpf):''}${p.cargo?', '+p.cargo:''}, para representá-la nas audiências${d.obj.processo?' do processo nº '+d.obj.processo:''}${d.obj.juizo?', em trâmite perante '+d.obj.juizo:''}${d.obj.contraria?', em que figura como reclamante '+d.obj.contraria:''}, com poderes para prestar depoimento, confessar, transigir e firmar acordos, cujas declarações obrigarão a preponente, nos termos do art. 843, § 1º, da Consolidação das Leis do Trabalho.\n${fecho}`}
 if(tipo==='termo_inss'){const a=A[0]||{};return `# TERMO DE RESPONSABILIDADE\n\nPelo presente Termo de Responsabilidade, eu, ${a.nome?lmQualAdv(a):'{{procurador}}'}, procurador(a) de ${lmTitular(d)||'{{cliente.nome}}'}${d.cliente.cpf?', CPF '+lmFmtCPF(d.cliente.cpf):''}${d.obj.nb?', NB '+d.obj.nb:''}, comprometo-me a comunicar ao Instituto Nacional do Seguro Social (INSS) qualquer evento que possa anular a procuração, principalmente o óbito do(a) outorgante, mediante apresentação da respectiva certidão, no prazo de trinta dias contados da ocorrência, sob pena de responder civil, administrativa e criminalmente.\n\n${v.local||'{{local}}'}, ${v.data}.\n\n\n____________________________________\n${(a.nome||'').toUpperCase()}\nOAB/${a.uf||''} ${a.oab||''}`}
 return ''}
function lmPreencher(texto,d){const v=lmVars(d);return texto.replace(/\{\{\s*([\w.]+)\s*\}\}/g,(m,k)=>v[k]!=null&&v[k]!==''?v[k]:m)}
function lmModeloDe(tipo,d){const id=d.modelos&&d.modelos[tipo];if(id&&id!=='padrao'){const m=LM.modelos.find(x=>x.id===id);if(m)return m}return null}
function lmOg(d){return d.cliente.tipo==='pj'?'f':d.cliente.genero}
function lmConcPares(d){const g=lmOg(d);if(g!=='m'&&g!=='f')return [];const f=g==='f';
 return [[/\bo\(a\) outorgante/g,f?'a outorgante':'o outorgante'],[/\bdo\(a\) outorgante/g,f?'da outorgante':'do outorgante'],[/-lo\(a\)/g,f?'-la':'-lo'],[/\bo\(a\) CONTRATANTE/g,f?'a CONTRATANTE':'o CONTRATANTE'],[/\bO\(A\) CONTRATANTE/g,f?'A CONTRATANTE':'O CONTRATANTE'],[/\bao\(à\) CONTRATANTE/g,f?'à CONTRATANTE':'ao CONTRATANTE'],[/\bpelo\(a\) CONTRATANTE/g,f?'pela CONTRATANTE':'pelo CONTRATANTE'],[/\bdo\(a\) CONTRATANTE/g,f?'da CONTRATANTE':'do CONTRATANTE'],[/\bo\(a\) desobriga/g,f?'a desobriga':'o desobriga'],[/obtido pelo\(a\) contratante/g,f?'obtido pela contratante':'obtido pelo contratante'],[/\bo\(a\) declarante/g,f?'a declarante':'o declarante']]}
function lmConc(t,d){lmConcPares(d).forEach(([a,b])=>{t=t.replace(a,b)});return t}
/* Acerta o gênero no texto escrito pelo escritório, que normalmente vem no masculino.
   onde='tudo' vale para todo o documento; onde='qual' só para o parágrafo que recebeu os dados do cliente. */
function lmGenPares(d,onde){if(lmOg(d)!=='f')return [];const P=[];
 const dupla=(a,b)=>{P.push([new RegExp('\\b'+a+'\\b','g'),b]);P.push([new RegExp('\\b'+a.toUpperCase()+'\\b','g'),b.toUpperCase()]);P.push([new RegExp('\\b'+a.charAt(0).toUpperCase()+a.slice(1)+'\\b','g'),b.charAt(0).toUpperCase()+b.slice(1)])};
 if(onde==='tudo'){['outorgante','contratante','mandante','declarante','constituinte'].forEach(w=>{dupla('o '+w,'a '+w);dupla('do '+w,'da '+w);dupla('ao '+w,'à '+w);dupla('pelo '+w,'pela '+w)});
  dupla('defendê-lo','defendê-la');dupla('representá-lo','representá-la');dupla('substituí-lo','substituí-la');dupla('seu bastante procurador','seu bastante procurador')}
 else [['portador','portadora'],['inscrito','inscrita'],['domiciliado','domiciliada'],['nascido','nascida'],['brasileiro','brasileira'],['casado','casada'],['solteiro','solteira'],['divorciado','divorciada'],['viúvo','viúva'],['separado','separada'],['falecido','falecida'],['identificado','identificada'],['aposentado','aposentada'],['representado','representada'],['assistido','assistida']].forEach(([a,b])=>dupla(a,b));
 return P}
function lmTexto(tipo,d){const m=lmModeloDe(tipo,d);if(m&&lmEhDocx(m))return lmDxTexto(lmDxDados(m),d);return lmConc(m?lmPreencher(m.texto,d):lmPadrao(tipo,d),d)}
function lmDocsSel(d){return Object.keys(LM_DOCS).filter(k=>d.docs[k]&&lmDocDisponivel(k,d))}
function lmDocDisponivel(k,d){if(k==='preposicao')return d.area==='trabalhista'&&d.obj.trabPolo==='reclamada';if(k==='termo_inss')return d.area==='previdenciario'&&d.obj.via!=='judicial';if(k==='declaracao')return d.cliente.tipo!=='pj'||d.area!=='previdenciario';return true}

/* ============ Conferência antes de gerar ============ */
function lmPendencias(d){const P=[],c=d.cliente,r=d.rep||{};
 if(c.tipo==='pj'){if(!c.razao)P.push(['erro','Informe a razão social do cliente.']);if(!c.cnpj)P.push(['erro','Informe o CNPJ do cliente.']);else if(!lmCNPJ(c.cnpj))P.push(['erro','O CNPJ do cliente não é válido. Confira os números.']);if(!r.nome)P.push(['erro','Informe quem representa a empresa e assina.'])}
 else{if(!c.nome)P.push(['erro','Informe o nome completo do cliente.']);if(!c.cpf)P.push(['aviso','O CPF do cliente está em branco.']);else if(!lmCPF(c.cpf))P.push(['erro','O CPF do cliente não é válido. Confira os números.']);if(!c.nacionalidade||!c.estadoCivil||!c.profissao)P.push(['aviso','Nacionalidade, estado civil ou profissão do cliente em branco.'])}
 if(!c.logradouro||!c.cidade)P.push(['aviso','O endereço do cliente está incompleto.']);
 if(c.tipo!=='pj'&&r.modo&&r.modo!=='proprio'){if(!r.nome)P.push(['erro','Informe quem representa ou assiste o cliente.']);else if(r.cpf&&!lmCPF(r.cpf))P.push(['erro','O CPF do representante não é válido.']);if(r.modo==='curatela'&&!r.processo)P.push(['aviso','Informe o processo e a decisão que nomeou o curador.']);if(['menor_rep','menor_ass'].includes(r.modo)&&!c.nascimento)P.push(['aviso','Informe a data de nascimento do menor.'])}
 const A=lmAdvsSel(d);if(!A.length)P.push(['erro','Selecione pelo menos um advogado. Cadastre os advogados na aba Escritório.']);A.forEach(a=>{if(!a.oab||!a.uf)P.push(['erro','Informe o número e a UF da inscrição na OAB de '+(a.nome||'um advogado')+'.']);if(!a.endereco)P.push(['erro','Informe o endereço profissional de '+(a.nome||'um advogado')+' (art. 105, § 2º, do CPC).'])});
 if(d.area==='previdenciario'&&!d.obj.beneficio&&!d.obj.objeto)P.push(['aviso','Escolha o benefício ou descreva o objeto.']);
 if(d.area==='civel'&&!d.obj.acao&&!d.obj.objeto)P.push(['aviso','Escolha o tipo de ação ou descreva o objeto.']);
 if(d.poderes.especiais&&d.poderes.especiais.renunciar)P.push(['aviso','O poder de renunciar ao direito foi marcado. Ele impede que o pedido seja proposto de novo. Confirme com o cliente.']);
 if(d.area==='previdenciario'&&d.poderes.extras&&d.poderes.extras.inss_receber)P.push(['aviso','Receber o benefício em nome do cliente segue regras próprias do INSS. Confira se o caso permite.']);
 if(d.area==='trabalhista'&&d.docs.declaracao&&!(d.poderes.especiais||{}).hipossuficiencia)P.push(['aviso','Se o advogado for assinar a declaração de hipossuficiência, marque esse poder na procuração (Súmula 463 do TST). A declaração gerada aqui é assinada pelo próprio cliente.']);
 if(d.docs.contrato){const h=d.hon;if(h.tipo!=='exito'&&!num(h.valor))P.push(['erro','Informe o valor dos honorários fixos.']);if(h.tipo!=='fixo'&&!num(h.pct))P.push(['erro','Informe o percentual dos honorários de êxito.']);if(num(h.entrada)>num(h.valor)&&h.tipo!=='exito')P.push(['erro','A entrada é maior que o valor total dos honorários.'])}
 if(d.docs.substabelecimento&&!(d.substab&&d.substab.nome&&d.substab.oab))P.push(['erro','Informe o nome e a OAB do advogado que vai receber o substabelecimento.']);
 if(d.docs.substabelecimento&&d.poderes.substab==='vedado')P.push(['erro','A procuração veda o substabelecimento, mas o substabelecimento foi selecionado.']);
 if(d.docs.preposicao&&lmDocDisponivel('preposicao',d)&&!(d.obj.preposto&&d.obj.preposto.nome))P.push(['erro','Informe o nome do preposto.']);
 if(!d.local)P.push(['aviso','Informe o local de assinatura.']);
 lmDocsSel(d).forEach(k=>{const t=lmTexto(k,d);const m=t.match(/\{\{[^}]+\}\}/g);if(m)P.push(['erro',LM_DOCS[k]+': campos sem preenchimento, '+[...new Set(m)].slice(0,4).join(', ')+'.'])});
 if(!lmDocsSel(d).length)P.push(['erro','Escolha pelo menos um documento para gerar.']);return P}

/* ============ Nuvem ============ */
/* Escritório atual: a biblioteca de modelos, os clientes e os documentos pertencem
   ao escritório, não ao login. Um login pode ser membro de mais de um escritório. */
async function lmCarregarOrg(){LM.org=null;LM.orgs=[];LM.equipe=[];LM.acessos=[];LM.semOrg=false;LM.mestre=false;LM.todosEsc=[];
 let sel=null;try{sel=localStorage.getItem('lm_org')}catch(e){}
 try{const mr=await SB.rpc('lm_e_mestre');LM.mestre=!!(mr&&mr.data)}catch(e){}
 try{const r=await SB.from('lm_membros').select('escritorio_id,papel,criado_em,lm_escritorios(id,nome,dados)').eq('user_id',U.user.id).order('criado_em');
  if(!r.error){const L=(r.data||[]).filter(x=>x.lm_escritorios);
   LM.orgs=L.map(y=>({id:y.escritorio_id,papel:y.papel,nome:y.lm_escritorios.nome}));
   const x=L.find(y=>y.escritorio_id===sel)||L[0];
   if(x)LM.org={id:x.escritorio_id,papel:x.papel,nome:x.lm_escritorios.nome,dados:x.lm_escritorios.dados||{}}}
 }catch(e){}
 if(LM.mestre){
  try{const t=await SB.rpc('lm_mestre_escritorios');if(!t.error)LM.todosEsc=t.data||[]}catch(e){}
  if(sel&&(!LM.org||LM.org.id!==sel)){
   try{const d=await SB.from('lm_escritorios').select('id,nome,dados').eq('id',sel).maybeSingle();
    if(d.data)LM.org={id:d.data.id,papel:'mestre',nome:d.data.nome,dados:d.data.dados||{}}}catch(e){}}
 }
 LM.semOrg=!LM.org;
 if(LM.org){
  try{const q=await SB.from('lm_membros').select('user_id,email,papel,criado_em').eq('escritorio_id',LM.org.id).order('criado_em');LM.equipe=q.data||[]}catch(e){}
  try{const a=await SB.from('lm_acessos_mestre').select('email,acao,quando').eq('escritorio_id',LM.org.id).order('quando',{ascending:false}).limit(12);LM.acessos=(a&&a.data)||[]}catch(e){}}}
function lmOrgFiltro(q){return LM.org?q.or('escritorio_id.eq.'+LM.org.id+',escritorio_id.is.null'):q}
function lmAdministra(){return !!(LM.mestre||(LM.org&&(LM.org.papel==='dono'||LM.org.papel==='suporte')))}
async function lmCarregar(forcar){if(LM.carregado&&!forcar)return;LM.erroTabela=false;
 await lmCarregarOrg();
 const [e,c,dd,m]=await Promise.all([SB.from('lm_escritorio').select('dados').maybeSingle(),lmOrgFiltro(SB.from('lm_clientes').select('*')).order('atualizado_em',{ascending:false}).limit(300),lmOrgFiltro(SB.from('lm_documentos').select('id,cliente_id,cliente_nome,area,titulo,status,atualizado_em,dados')).order('atualizado_em',{ascending:false}).limit(200),lmOrgFiltro(SB.from('lm_modelos').select('*').eq('ativo',true)).order('criado_em',{ascending:false})]);
 if(e.error&&/relation|does not exist|schema cache/i.test(e.error.message)){LM.erroTabela=true;LM.carregado=true;return}
 const p=pref();const base={nome:p.escritorio||'',cidade:'',uf:'SC',advogados:p.advogado?[{nome:p.advogado,oab:String(p.oab||'').replace(/\D/g,''),uf:'SC',nacionalidade:'brasileiro(a)'}]:[],sociedade:{}};
 if(LM.org){LM.esc=Object.assign({},base,LM.org.dados||{});LM.esc.nome=(LM.org.dados&&LM.org.dados.nome)||LM.org.nome}
 else LM.esc=(e.data&&e.data.dados)||base;
 LM.clientes=c.data||[];LM.docs=dd.data||[];LM.modelos=m.data||[];LM.carregado=true}
async function lmSalvarEsc(){
 if(LM.org){const nome=(LM.esc.nome||'').trim()||LM.org.nome;
  const {error}=await SB.from('lm_escritorios').update({nome,dados:LM.esc,atualizado_em:new Date().toISOString()}).eq('id',LM.org.id);
  if(error){toast('Não foi possível salvar: '+error.message);return false}
  LM.org.nome=nome;LM.org.dados=LM.esc;toast('Dados do escritório salvos');return true}
 const {error}=await SB.from('lm_escritorio').upsert({dono:U.user.id,dados:LM.esc,atualizado_em:new Date().toISOString()});if(error){toast('Não foi possível salvar: '+error.message);return false}toast('Dados do escritório salvos');return true}

/* ---------- Escritório, equipe e convites ---------- */
const LM_PAPEIS={dono:'Responsável',equipe:'Equipe',suporte:'Suporte BlackSolutions',mestre:'Login mestre BlackSolutions'};
async function lmCriarEscritorio(){const nome=($('#lmOrgNome')&&$('#lmOrgNome').value||'').trim();
 if(!nome){toast('Escreva o nome do escritório.');return}
 const {error}=await SB.rpc('lm_criar_escritorio',{p_nome:nome});
 if(error){toast(lmErroSql(error));return}
 LM.carregado=false;await lmCarregar(true);render();toast('Escritório criado. Agora você é o responsável.')}
async function lmGerarConvite(papel){if(!LM.org)return;
 const {data,error}=await SB.rpc('lm_novo_convite',{p_escritorio:LM.org.id,p_papel:papel||'equipe'});
 if(error){toast(lmErroSql(error));return}
 LM.convite={codigo:data,papel:papel||'equipe'};render()}
async function lmUsarConvite(){const c=($('#lmConvCod')&&$('#lmConvCod').value||'').trim().toUpperCase();
 if(c.length<6){toast('Digite o código completo.');return}
 const {data,error}=await SB.rpc('lm_usar_convite',{p_codigo:c});
 if(error){toast(lmErroSql(error));return}
 try{localStorage.setItem('lm_org',data)}catch(e){}
 LM.carregado=false;await lmCarregar(true);render();toast('Você entrou no escritório.')}
async function lmRemoverMembro(uid,email){if(!confirm('Tirar o acesso de '+email+'? Os documentos e modelos continuam no escritório.'))return;
 const {error}=await SB.rpc('lm_remover_membro',{p_escritorio:LM.org.id,p_user:uid});
 if(error){toast(lmErroSql(error));return}
 LM.carregado=false;await lmCarregar(true);render();toast('Acesso removido.')}
async function lmTrocarOrg(id){try{localStorage.setItem('lm_org',id)}catch(e){}
 LM.carregado=false;LM.doc=null;LM.mod=null;await lmCarregar(true);render();toast('Agora você está no escritório '+(LM.org?LM.org.nome:''))}
function lmErroSql(e){const m=String(e.message||e||'');
 if(/relation|does not exist|schema cache|function/i.test(m))return 'A parte de escritório ainda não foi ativada no banco de dados.';
 return m.replace(/^.*?:\s*/,'')||'Não foi possível concluir.'}
async function lmSalvarCliente(d){const c=d.cliente;const nome=c.tipo==='pj'?c.razao:c.nome;if(!nome)return null;const row={nome,documento:lmDig(c.tipo==='pj'?c.cnpj:c.cpf),dados:{cliente:c,rep:d.rep},atualizado_em:new Date().toISOString()};if(LM.org)row.escritorio_id=LM.org.id;
 let r;if(d.clienteId)r=await SB.from('lm_clientes').update(row).eq('id',d.clienteId).select('id').single();else r=await SB.from('lm_clientes').insert(row).select('id').single();
 if(r.error){toast('Não foi possível salvar o cliente: '+r.error.message);return null}d.clienteId=r.data.id;return r.data.id}
async function lmSalvarDoc(status,silencioso){const d=LM.doc;if(!d)return false;if(status)d.status=status;await lmSalvarCliente(d);
 const textos={};lmDocsSel(d).forEach(k=>{textos[k]={texto:lmTexto(k,d),modelo:(lmModeloDe(k,d)||{nome:'Modelo padrão LexMandato'}).nome,versao:(lmModeloDe(k,d)||{}).versao||null}});
 const hist=(d.historico||[]).concat([{quando:new Date().toISOString(),quem:U.user.email,acao:status||'Salvo'}]).slice(-40);d.historico=hist;
 const row={cliente_id:d.clienteId||null,cliente_nome:lmTitular(d),area:d.area,titulo:lmDocsSel(d).map(k=>LM_DOCS[k]).join(', ')||'Documento',status:d.status,dados:d,textos,atualizado_em:new Date().toISOString()};if(LM.org)row.escritorio_id=LM.org.id;
 let r;if(d.id)r=await SB.from('lm_documentos').update(row).eq('id',d.id).select('id').single();else r=await SB.from('lm_documentos').insert(row).select('id').single();
 if(r.error){toast('Não foi possível salvar na nuvem: '+r.error.message);return false}d.id=r.data.id;if(!silencioso)toast('Salvo na nuvem como '+d.status);lmCarregar(true);return true}
async function lmAbrirDoc(id){const {data,error}=await SB.from('lm_documentos').select('*').eq('id',id).single();if(error){toast('Não foi possível abrir o documento');return}
 const base=lmNovoDoc(data.area);const d=Object.assign(base,data.dados||{});d.id=data.id;d.status=data.status;LM.doc=d;LM.passo=7;LM.tab='nova';render()}
async function lmStatus(id,st){const {error}=await SB.from('lm_documentos').update({status:st,atualizado_em:new Date().toISOString()}).eq('id',id);if(error){toast('Não foi possível mudar a situação');return}const x=LM.docs.find(z=>z.id===id);if(x)x.status=st;toast('Situação: '+st)}
async function lmExcluirDoc(id){if(!confirm('Excluir este documento da nuvem? Isso não pode ser desfeito.'))return;const {error}=await SB.from('lm_documentos').delete().eq('id',id);if(error){toast('Não foi possível excluir');return}await lmCarregar(true);render()}
async function lmExcluirCliente(id){if(!confirm('Excluir este cliente? Os documentos dele continuam salvos.'))return;const {error}=await SB.from('lm_clientes').delete().eq('id',id);if(error){toast('Não foi possível excluir');return}await lmCarregar(true);render()}

/* ============ Telas ============ */
function lmTopo(){const t=[['painel','Início'],['nova','Nova procuração'],['clientes','Clientes'],['documentos','Documentos'],['modelos','Biblioteca'],['escritorio','Escritório']];if(LM.mestre)t.push(['admin','Administração']);
 return `<div class="lmhead"><div><h1 style="margin:0">Lex<span style="color:var(--gold)">Mandato</span></h1><p class="sub">Procurações, declarações e contratos com a identidade do seu escritório${LM.esc&&LM.esc.nome?' · '+esc(LM.esc.nome):''}</p></div></div>
 <div class="lmtabs">${t.map(([k,n])=>`<button class="${LM.tab===k?'on':''}" onclick="lmIr('${k}')">${n}</button>`).join('')}</div>`}
function lmIr(t,extra){if(t==='nova'&&(!LM.doc||extra)){LM.doc=lmNovoDoc(extra&&extra.area,extra&&extra.docs);LM.passo=1}LM.tab=t;render();window.scrollTo(0,0)}
function vMandato(){if(!LM.carregado){lmCarregar().then(render);return lmTopo()+'<div class="panel">Carregando...</div>'}
 if(LM.erroTabela)return lmTopo()+`<div class="notice bad"><b>O LexMandato ainda não foi ativado no banco de dados.</b> O administrador precisa rodar o arquivo sql/lexmandato.sql no Supabase. Depois disso, recarregue a página.</div>`;
 const V={painel:lmPainel,nova:lmNova,clientes:lmClientes,documentos:lmDocumentos,modelos:lmModelos,escritorio:lmEscritorio,admin:lmAdmin}[LM.tab]||lmPainel;return lmTopo()+V()}
function posMandato(){if(LM.tab==='nova')lmPreview();if(LM.tab==='modelos'&&LM.mod)lmModPreview();if(typeof mascaraData==='function')try{mascaraData()}catch(e){}}

function lmPainel(){const cont=a=>LM.docs.filter(x=>x.area===a).length;const pend=LM.docs.filter(x=>['Rascunho','Em revisão','Aguardando assinatura'].includes(x.status));
 const semAdv=!(LM.esc&&LM.esc.advogados&&LM.esc.advogados.length);
 return `${semAdv?`<div class="notice">Comece pelo cadastro do escritório e dos advogados. Esses dados entram em todas as procurações. <button class="btn" style="margin-left:8px" onclick="lmIr('escritorio')">Cadastrar escritório</button></div>`:''}
 <div class="grid3">${Object.entries(LM_AREAS).map(([k,n])=>`<div class="choice"><div class="sym">${icoLex(k==='civel'?'balanca':k==='trabalhista'?'maleta':'escudo')}</div><h2>${n}</h2><p>${cont(k)} documento${cont(k)===1?'':'s'} salvo${cont(k)===1?'':'s'}</p>
 <div class="cbt"><button class="btn" onclick="lmIr('nova',{area:'${k}'})">Nova procuração ›</button><button class="btn2" onclick="lmIr('nova',{area:'${k}',docs:{procuracao:false,contrato:true}})">Contrato ›</button></div></div>`).join('')}</div>
 <div class="acts" style="justify-content:flex-start"><button class="btn2" onclick="lmIr('nova',{area:'civel',docs:{procuracao:false,declaracao:true}})">Nova declaração de hipossuficiência</button><button class="btn2" onclick="lmIr('nova',{area:'civel',docs:{procuracao:true,contrato:true}})">Procuração e contrato juntos</button></div>
 <div class="panel"><h2>Pendências</h2>${pend.length?lmTabelaDocs(pend.slice(0,8)):'<p class="sub">Nenhum documento pendente.</p>'}</div>
 <div class="panel"><h2>Documentos recentes</h2>${LM.docs.length?lmTabelaDocs(LM.docs.slice(0,10)):'<p class="sub">Nenhum documento ainda. Clique em Nova procuração para começar.</p>'}</div>`}
function lmTabelaDocs(L){return `<div class="tvw"><table class="tv"><thead><tr><th>Cliente</th><th>Documentos</th><th>Área</th><th>Atualização</th><th>Situação</th><th></th></tr></thead><tbody>${L.map(x=>`<tr><td data-l="Cliente"><b>${esc(x.cliente_nome||'Sem nome')}</b></td><td data-l="Documentos">${esc(x.titulo)}</td><td data-l="Área">${esc(LM_AREAS[x.area]||'')}</td><td data-l="Atualização">${br((x.atualizado_em||'').slice(0,10))}</td>
 <td data-l="Situação"><select onchange="lmStatus('${x.id}',this.value)" style="min-width:150px">${LM_STATUS.map(s=>`<option ${s===x.status?'selected':''}>${s}</option>`).join('')}</select></td><td style="white-space:nowrap"><button class="btn2" onclick="lmAbrirDoc('${x.id}')">Abrir</button> <button class="btn3" onclick="lmDuplicar('${x.id}')">Duplicar</button> <button class="btn3" style="color:var(--bad)" onclick="lmExcluirDoc('${x.id}')">Excluir</button></td></tr>`).join('')}</tbody></table></div>`}
async function lmDuplicar(id){const {data}=await SB.from('lm_documentos').select('dados,area').eq('id',id).single();if(!data)return;const d=Object.assign(lmNovoDoc(data.area),data.dados);delete d.id;d.status='Rascunho';d.data=hoje();d.historico=[];LM.doc=d;LM.passo=1;LM.tab='nova';render();toast('Cópia criada. Altere o que precisar e salve.')}

/* ---------- Escritório ---------- */
function lmCampo(rot,k,obj,extra){extra=extra||{};const v=lmG(obj==='esc'?LM.esc:LM.doc,k);const id='lm_'+k.replace(/\W/g,'_');const base=k.replace(/\.cep$/,'');
 const at=`id="${id}" data-o="${obj}" data-k="${k}" ${extra.adv!=null?`data-adv="${extra.adv}"`:''} ${extra.r?'data-r="1"':''} oninput="${extra.cep?`lmCepDig(this,'${obj}','${base}')`:'lmSet(this)'}" ${extra.ph?`placeholder="${esc(extra.ph)}"`:''}`;
 let inp;if(extra.opts)inp=`<select ${at} onchange="lmSet(this)">${extra.opts.map(o=>{const[val,txt]=Array.isArray(o)?o:[o,o];return `<option value="${esc(val)}" ${String(val)===String(v??'')?'selected':''}>${esc(txt)}</option>`}).join('')}</select>`;
 else if(extra.area)inp=`<textarea ${at} rows="${extra.rows||3}">${esc(v||'')}</textarea>`;else inp=`<input ${at} type="${extra.type||'text'}" value="${esc(v??'')}" ${extra.list?`list="${extra.list}"`:''} ${extra.cep?`inputmode="numeric" maxlength="9" onblur="lmCep(this,'${obj}','${base}')"`:''} ${extra.rs?'data-rs="1"':'data-rs="0"'}>`;
 return `<div class="f ${extra.s||''}"><label for="${id}">${rot}${extra.req?' *':''}</label>${inp}${extra.ajuda?`<small class="sub" style="font-size:12px">${extra.ajuda}</small>`:''}</div>`}
function lmChk(rot,k,obj,extra){extra=extra||{};const v=lmG(obj==='esc'?LM.esc:LM.doc,k);return `<label class="chk" style="align-items:flex-start;margin:6px 0"><input type="checkbox" data-o="${obj}" data-k="${k}" ${extra.r?'data-r="1"':''} ${v?'checked':''} onchange="lmSet(this)"><span><b>${rot}</b>${extra.ajuda?`<br><small class="sub">${extra.ajuda}</small>`:''}</span></label>`}
function lmSet(el){const o=el.dataset.o==='esc'?LM.esc:LM.doc;let v=el.type==='checkbox'?el.checked:el.value;lmS(o,el.dataset.k,v);
 if(el.dataset.adv!=null)lmAdvEnd(Number(el.dataset.adv));if(el.dataset.r){const y=window.scrollY;render();window.scrollTo(0,y)}else if(LM.tab==='nova')lmPreviewDeb()}
/* Enquanto digita: formata o CEP e, nos oito dígitos, busca o endereço sem esperar sair do campo */
function lmCepDig(el,obj,base){const c=lmDig(el.value).slice(0,8);el.value=c.length>5?c.slice(0,5)+'-'+c.slice(5):c;
 const o=obj==='esc'?LM.esc:LM.doc;lmS(o,(base?base+'.':'')+'cep',el.value);
 if(el.dataset.adv!=null)lmAdvEnd(Number(el.dataset.adv));
 if(c.length===8&&LM.cepUlt!==obj+'|'+base+'|'+c)lmCep(el,obj,base)}
async function lmCep(el,obj,base){const c=lmDig(el.value);if(c.length!==8||LM.cepBusca)return;LM.cepBusca=true;LM.cepUlt=obj+'|'+base+'|'+c;try{const r=await fetch('https://viacep.com.br/ws/'+c+'/json/');const j=await r.json();if(j.erro){LM.cepBusca=false;toast('CEP não encontrado. Confira o número do CEP.');return}const o=obj==='esc'?LM.esc:LM.doc;const p=base?base+'.':'';
 const adv=/^advogados\.\d+$/.test(base||'');
 lmS(o,p+'cep',c.replace(/(\d{5})(\d{3})/,'$1-$2'));if(j.logradouro)lmS(o,p+'logradouro',j.logradouro);if(j.bairro)lmS(o,p+'bairro',j.bairro);if(j.localidade)lmS(o,p+'cidade',j.localidade);if(j.uf)lmS(o,p+(adv?'ufEnd':'uf'),j.uf);
 if(adv)lmAdvEnd(Number(base.split('.')[1]));
 const y=window.scrollY;render();window.scrollTo(0,y);
 const alvo=document.getElementById('lm_'+((base?base+'.':'')+'numero').replace(/\W/g,'_'));if(alvo){alvo.focus();alvo.select&&alvo.select()}
 toast('Endereço preenchido pelo CEP. Falta o número.')}catch(e){toast('Não foi possível buscar o CEP agora. Digite o endereço à mão.')}finally{LM.cepBusca=false}}
/* O endereço profissional do advogado é montado a partir do CEP e do número, e continua editável à mão */
function lmAdvEnd(i){const a=((LM.esc||{}).advogados||[])[i];if(!a||!a.logradouro)return;
 const p=[];p.push(a.logradouro+(a.numero?', nº '+a.numero:''));if(a.complemento)p.push(a.complemento);if(a.bairro)p.push(a.bairro);if(a.cidade)p.push(a.cidade+(a.ufEnd?'/'+a.ufEnd:''));if(a.cep)p.push('CEP '+a.cep);
 a.endereco=p.join(', ');const el=document.getElementById(('lm_advogados.'+i+'.endereco').replace(/\W/g,'_'));if(el&&el.value!==a.endereco)el.value=a.endereco}
function lmEscritorio(){const e=LM.esc;e.advogados=e.advogados||[];e.sociedade=e.sociedade||{};
 return `<div class="panel"><h2>Escritório</h2><div class="fields">${lmCampo('Nome do escritório','nome','esc',{s:'s2',req:true})}${lmCampo('Cidade (local padrão de assinatura)','cidade','esc')}${lmCampo('UF','uf','esc',{opts:['','AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']})}</div>
 <h3>Sociedade de advogados (se houver)</h3><p class="sub">Quando a procuração é outorgada aos integrantes de uma sociedade, o art. 105, § 3º, do Código de Processo Civil exige o nome, o registro na OAB e o endereço dela.</p><div class="fields" style="margin-top:10px">${lmCampo('Nome da sociedade','sociedade.nome','esc',{s:'s2'})}${lmCampo('Registro na OAB','sociedade.registro','esc')}${lmCampo('Endereço completo','sociedade.endereco','esc',{s:'s4'})}</div>
 <h3>Advogados</h3><p class="sub">Endereço profissional e OAB com UF são obrigatórios na procuração judicial (art. 105, § 2º, do Código de Processo Civil).</p>
 ${e.advogados.map((a,i)=>`<div class="lmcard"><div class="fields">${lmCampo('Nome completo','advogados.'+i+'.nome','esc',{s:'s2',req:true})}${lmCampo('Número da OAB','advogados.'+i+'.oab','esc',{req:true})}${lmCampo('UF da OAB','advogados.'+i+'.uf','esc',{req:true,opts:['','AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']})}
  ${lmCampo('Gênero (para concordância)','advogados.'+i+'.genero','esc',{opts:[['','Não informar'],['f','Feminino'],['m','Masculino']]})}${lmCampo('Nacionalidade','advogados.'+i+'.nacionalidade','esc',{ph:'brasileira'})}${lmCampo('Estado civil','advogados.'+i+'.estadoCivil','esc',{opts:[['','Não incluir'],...LM_ESTCIVIL]})}${lmCampo('E-mail','advogados.'+i+'.email','esc',{type:'email'})}
  ${lmCampo('CEP do escritório','advogados.'+i+'.cep','esc',{cep:true,adv:i,ph:'00000-000'})}${lmCampo('Número','advogados.'+i+'.numero','esc',{adv:i})}
  ${lmCampo('Endereço profissional completo','advogados.'+i+'.endereco','esc',{s:'s2',req:true,ph:'Rua, número, bairro, cidade/UF, CEP'})}</div><div class="acts" style="margin-top:8px"><button class="btn3" style="color:var(--bad)" onclick="LM.esc.advogados.splice(${i},1);render()">Remover advogado</button></div></div>`).join('')}
 <div class="acts" style="justify-content:space-between"><button class="btn2" onclick="LM.esc.advogados.push({nacionalidade:'brasileira',uf:LM.esc.uf||''});render()">+ Adicionar advogado</button><button class="btn" onclick="lmSalvarEsc()">Salvar dados do escritório</button></div></div>
 <div class="panel"><h2>Papel timbrado e marca d'água</h2><p class="sub">O LexMandato usa o mesmo papel timbrado das planilhas do Lex Calc. Envie o PDF ou a imagem do timbre, com logomarca, rodapé e marca d'água, em Configurações.</p><div class="acts" style="justify-content:flex-start"><label class="btn" style="cursor:pointer">Enviar papel timbrado (PDF, PNG ou JPG)<input type="file" accept=".pdf,.png,.jpg,.jpeg" style="display:none" onchange="enviarTimbrado(this)"></label><button class="btn2" onclick="ir('config')">Ajustar margens em Configurações</button></div><p class="sub" style="margin-top:8px">Deixe o corpo da folha em branco: só logomarca, cabeçalho, rodapé e marca d'água clara. Se o escritório já tem a procuração pronta em Word, com timbre e fonte próprios, envie o arquivo na aba Modelos: o sistema mantém toda a identidade.</p><p class="sub" style="margin-top:8px">${pref().timbrado&&pref().timbrado.path?'Papel timbrado enviado: '+esc(pref().timbrado.nome||'arquivo'):'Nenhum papel timbrado enviado ainda. Os documentos saem com o nome do escritório no topo.'}</p></div>`}

/* ---------- Assistente ---------- */
const LM_PASSOS=['Cliente','Representação','Área e objeto','Poderes','Documentos','Honorários','Revisão'];
function lmPassosAtivos(d){return LM_PASSOS.map((n,i)=>i===5&&!d.docs.contrato&&!d.hon.naProcuracao?null:i+1).filter(Boolean)}
function lmIrPasso(n){LM.passo=n;render();window.scrollTo(0,0)}
function lmProx(dir){const A=lmPassosAtivos(LM.doc);const i=A.indexOf(LM.passo);const n=A[Math.max(0,Math.min(A.length-1,i+dir))];lmIrPasso(n)}
function lmNova(){const d=LM.doc||(LM.doc=lmNovoDoc());const A=lmPassosAtivos(d);
 const passos=`<div class="lmsteps">${A.map((n,k)=>`<button class="${n===LM.passo?'on':n<LM.passo?'ok':''}" onclick="lmIrPasso(${n})"><span>${n<LM.passo?'✓':k+1}</span>${LM_PASSOS[n-1]}</button>`).join('')}</div>`;
 const corpo={1:lmP1,2:lmP2,3:lmP3,4:lmP4,5:lmP5,6:lmP6,7:lmP7}[LM.passo]();
 const ult=LM.passo===A[A.length-1];
 return `<div class="lmareas">${Object.entries(LM_AREAS).map(([k,n])=>`<button class="${d.area===k?'on':''}" onclick="LM.doc.area='${k}';render()">${n}</button>`).join('')}<span class="selo" style="margin-left:auto">${d.id?'Documento salvo · '+esc(d.status):'Documento novo'}</span></div>${passos}
 <div class="lmgrid" ${LM.passo===7?'style="grid-template-columns:1fr"':''}><div class="panel" style="margin-top:0">${corpo}
 <div class="acts" style="justify-content:space-between"><div>${LM.passo!==A[0]?'<button class="btn2" onclick="lmProx(-1)">‹ Voltar</button>':''}</div><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn2" onclick="lmSalvarDoc()">Salvar rascunho</button>${ult?'':'<button class="btn" onclick="lmProx(1)">Continuar ›</button>'}</div></div></div>
 ${LM.passo<7?`<div class="lmprev"><div class="selo" style="margin-bottom:8px">Prévia da ${d.docs.procuracao?'procuração':esc((LM_DOCS[lmDocsSel(d)[0]]||'').toLowerCase())}</div><div class="papel" id="lmPrev"></div></div>`:''}</div>`}
let lmT=null;function lmPreviewDeb(){clearTimeout(lmT);lmT=setTimeout(lmPreview,180)}
function lmPreview(){const el=$('#lmPrev');if(!el||!LM.doc)return;const k=LM.doc.docs.procuracao?'procuracao':lmDocsSel(LM.doc)[0];el.innerHTML=k?lmHTML(lmTexto(k,LM.doc)):'<p>Escolha um documento.</p>'}
function lmHTML(t){return t.split('\n').map(l=>{if(/^# /.test(l))return `<h4>${esc(l.slice(2))}</h4>`;if(!l.trim())return '<div style="height:8px"></div>';let h=esc(l).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\{\{([^}]+)\}\}/g,'<mark>{{$1}}</mark>');return /^_{6,}/.test(l)||/^(CONTRATANTE|CONTRATADOS|Nome e CPF|OAB\/)/.test(l)?`<p style="text-align:center;margin:0">${h}</p>`:`<p>${h}</p>`}).join('')}
function lmP1(){const d=LM.doc,c=d.cliente,pj=c.tipo==='pj';
 return `<h2>Dados do cliente</h2><div class="f" style="margin-bottom:14px"><label>Buscar cliente já cadastrado</label><input list="lmCliList" placeholder="Digite o nome ou o CPF/CNPJ" onchange="lmUsarCliente(this.value)"><datalist id="lmCliList">${LM.clientes.map(x=>`<option value="${esc(x.nome)} · ${esc(x.documento)}">`).join('')}</datalist></div>
 <div class="lmareas" style="margin-bottom:12px"><button class="${!pj?'on':''}" onclick="LM.doc.cliente.tipo='pf';if(LM.doc.rep.modo==='pj')LM.doc.rep.modo='proprio';render()">Pessoa física</button><button class="${pj?'on':''}" onclick="LM.doc.cliente.tipo='pj';LM.doc.rep.modo='pj';render()">Pessoa jurídica</button></div>
 <div class="fields">${pj?lmCampo('Razão social','cliente.razao','doc',{s:'s2',req:true})+lmCampo('CNPJ','cliente.cnpj','doc',{req:true})+lmCampo('Nome fantasia (opcional)','cliente.fantasia','doc'):
  lmCampo('Nome completo','cliente.nome','doc',{s:'s2',req:true})+lmCampo('CPF','cliente.cpf','doc',{req:true})+lmCampo('Gênero (para concordância)','cliente.genero','doc',{opts:[['','Não informar'],['f','Feminino'],['m','Masculino']]})+
  lmCampo('Nome social (se houver)','cliente.nomeSocial','doc')+lmCampo('Nacionalidade','cliente.nacionalidade','doc')+lmCampo('Estado civil','cliente.estadoCivil','doc',{opts:[['','Selecione'],...LM_ESTCIVIL]})+lmCampo('Profissão','cliente.profissao','doc')+
  lmCampo('RG ou outro documento','cliente.rg','doc')+lmCampo('Órgão emissor','cliente.rgOrgao','doc',{ph:'SSP/SC'})+lmCampo('Data de nascimento','cliente.nascimento','doc',{type:'date'})}
  ${lmCampo('CEP','cliente.cep','doc',{cep:true,ph:'00000-000'})}${lmCampo('Logradouro','cliente.logradouro','doc',{s:'s2'})}${lmCampo('Número','cliente.numero','doc')}${lmCampo('Complemento','cliente.complemento','doc')}${lmCampo('Bairro','cliente.bairro','doc')}${lmCampo('Cidade','cliente.cidade','doc')}${lmCampo('UF','cliente.uf','doc')}
  ${lmCampo('Telefone','cliente.telefone','doc')}${lmCampo('E-mail','cliente.email','doc',{type:'email'})}</div>
 ${lmChk('Incluir telefone e e-mail no documento','cliente.mostrarContato','doc',{ajuda:'O cadastro guarda o contato. Marque apenas se o escritório quiser que ele apareça impresso.'})}
 ${!pj&&c.cpf&&!lmCPF(c.cpf)?'<div class="notice bad">CPF inválido. Confira os números.</div>':''}${pj&&c.cnpj&&!lmCNPJ(c.cnpj)?'<div class="notice bad">CNPJ inválido. Confira os números.</div>':''}`}
function lmUsarCliente(v){const x=LM.clientes.find(c=>v.startsWith(c.nome+' ·'));if(!x)return;LM.doc.cliente=Object.assign({},x.dados.cliente||{});if(x.dados.rep)LM.doc.rep=Object.assign({},x.dados.rep);LM.doc.clienteId=x.id;render();toast('Cliente carregado: '+x.nome)}
function lmP2(){const d=LM.doc,r=d.rep,pj=d.cliente.tipo==='pj';
 const modos=pj?[['pj','Empresa representada por seu representante legal']]:[['proprio','O próprio cliente assina (atua em nome próprio)'],['menor_rep','Menor de 16 anos, representado pelo pai, mãe ou responsável'],['menor_ass','Maior de 16 e menor de 18 anos, assistido pelo pai, mãe ou responsável'],['tutela','Representado por tutor'],['curatela','Representado por curador']];
 if(pj&&r.modo!=='pj')r.modo='pj';
 const ajuda={proprio:'',menor_rep:'O menor de 16 anos é absolutamente incapaz (art. 3º do Código Civil) e é representado. O representante assina pelo menor.',menor_ass:'O maior de 16 e menor de 18 anos é relativamente incapaz (art. 4º, I, do Código Civil) e é assistido. O menor e o assistente assinam juntos.',tutela:'Informe o processo de nomeação do tutor.',curatela:'A curatela é medida extraordinária e se limita aos atos fixados na decisão (arts. 84 e 85 da Lei nº 13.146/2015). A deficiência, por si só, não autoriza presumir incapacidade nem exigir curador.',pj:'Informe quem representa a empresa conforme o contrato social ou o estatuto.'}[r.modo]||'';
 return `<h2>Representação</h2><p class="sub">Quem é o titular do direito, quem o representa ou assiste e quem assina.</p><div style="margin:14px 0">${modos.map(([k,n])=>`<label class="chk" style="margin:6px 0"><input type="radio" name="lmrep" ${r.modo===k?'checked':''} onchange="LM.doc.rep.modo='${k}';render()"> ${n}</label>`).join('')}</div>
 ${ajuda?`<div class="notice">${ajuda}</div>`:''}
 ${r.modo&&r.modo!=='proprio'?`<h3>${pj?'Representante legal':r.modo==='curatela'?'Curador(a)':r.modo==='tutela'?'Tutor(a)':r.modo==='menor_ass'?'Assistente':'Representante'}</h3><div class="fields">
  ${lmCampo('Nome completo','rep.nome','doc',{s:'s2',req:true})}${lmCampo('CPF','rep.cpf','doc')}${lmCampo('Gênero','rep.genero','doc',{opts:[['','Não informar'],['f','Feminino'],['m','Masculino']]})}
  ${pj?lmCampo('Cargo','rep.cargo','doc',{ph:'sócio-administrador'}):['menor_rep','menor_ass'].includes(r.modo)?lmCampo('Vínculo','rep.vinculo','doc',{opts:[['','Selecione'],['pai','pai'],['mãe','mãe'],['responsável legal','responsável legal']]}):''}
  ${lmCampo('Nacionalidade','rep.nacionalidade','doc')}${lmCampo('Estado civil','rep.estadoCivil','doc',{opts:[['','Não incluir'],...LM_ESTCIVIL]})}${lmCampo('Profissão','rep.profissao','doc')}${lmCampo('RG','rep.rg','doc')}
  ${lmCampo('CEP','rep.cep','doc',{cep:true,ph:'00000-000'})}${lmCampo('Logradouro','rep.logradouro','doc',{s:'s2'})}${lmCampo('Número','rep.numero','doc')}${lmCampo('Bairro','rep.bairro','doc')}${lmCampo('Cidade','rep.cidade','doc')}${lmCampo('UF','rep.uf','doc')}
  ${['tutela','curatela'].includes(r.modo)?lmCampo('Processo de nomeação','rep.processo','doc',{s:'s2'}):''}${r.modo==='curatela'?lmCampo('Limites fixados na decisão','rep.limites','doc',{s:'s4',area:true,rows:2,ph:'Ex.: atos de natureza patrimonial e negocial'}):''}</div>
  ${r.modo==='curatela'?lmChk('Curatela provisória','rep.provisoria','doc'):''}`:''}
 <div class="notice" style="margin-top:16px"><b>Quem assina:</b> ${esc(lmAssinante(d).filter(Boolean).join(' · ')||'preencha os dados')}</div>`}
function lmP3(){const d=LM.doc,o=d.obj,a=d.area;let h=`<h2>${LM_AREAS[a]}: objeto da procuração</h2>`;
 if(a==='civel')h+=`<div class="fields">${lmCampo('Tipo de ação','obj.acao','doc',{s:'s2',opts:['',...LM_ACOES_CIVEIS]})}${lmCampo('O cliente é','obj.polo','doc',{opts:[['autor','Autor ou requerente'],['reu','Réu ou requerido'],['terceiro','Terceiro interessado']]})}
  ${lmCampo('Parte contrária','obj.contraria','doc',{s:'s2'})}${lmCampo('CPF ou CNPJ da parte contrária','obj.contrariaDoc','doc')}${lmCampo('Número do processo (se já existir)','obj.processo','doc')}${lmCampo('Juízo ou comarca','obj.juizo','doc',{s:'s2',ph:'o Juízo da 1ª Vara Cível da comarca de Jaraguá do Sul/SC'})}
  ${lmCampo('Objeto e limites da atuação','obj.objeto','doc',{s:'s4',area:true,rows:2,ph:'Ex.: revisão do contrato de financiamento nº 123, com bens envolvidos se houver'})}</div>
  <h3>Alcance</h3>${lmChk('Atuação judicial','obj.alcance.judicial','doc')}${lmChk('Atuação extrajudicial','obj.alcance.extrajudicial','doc')}<p class="sub">Deixe a ação em branco para uma procuração geral para o foro.</p>`;
 if(a==='trabalhista')h+=`<div class="fields">${lmCampo('O cliente é','obj.trabPolo','doc',{r:true,opts:[['reclamante','Reclamante (empregado)'],['reclamada','Reclamada (empregador)']]})}${lmCampo('Tipo','obj.acao','doc',{opts:['',...LM_TRAB]})}
  ${lmCampo(o.trabPolo==='reclamada'?'Reclamante':'Empregador (reclamada)','obj.contraria','doc',{s:'s2'})}${lmCampo('CPF ou CNPJ','obj.contrariaDoc','doc')}${lmCampo('Número do processo (se já existir)','obj.processo','doc')}${lmCampo('Vara do Trabalho','obj.juizo','doc',{s:'s2',ph:'a 1ª Vara do Trabalho de Jaraguá do Sul/SC'})}
  ${lmCampo('Objeto','obj.objeto','doc',{s:'s4',area:true,rows:2,ph:'Ex.: verbas rescisórias, horas extras e adicional de insalubridade'})}</div>
  ${o.trabPolo==='reclamada'?`<h3>Preposto (para a carta de preposição)</h3><div class="fields">${lmCampo('Nome do preposto','obj.preposto.nome','doc',{s:'s2'})}${lmCampo('CPF','obj.preposto.cpf','doc')}${lmCampo('Cargo ou função','obj.preposto.cargo','doc')}${lmCampo('Gênero','obj.preposto.genero','doc',{opts:[['','Não informar'],['f','Feminino'],['m','Masculino']]})}</div>`:''}`;
 if(a==='previdenciario')h+=`<div class="fields">${lmCampo('Atuação','obj.via','doc',{r:true,opts:[['administrativa','Administrativa, perante o INSS'],['judicial','Judicial'],['ambas','Administrativa e judicial']]})}${lmCampo('Benefício ou serviço','obj.beneficio','doc',{s:'s2',opts:['',...LM_BENEF]})}
  ${lmCampo('NB (número do benefício)','obj.nb','doc')}${lmCampo('NIT ou PIS','obj.nit','doc')}${lmCampo('Protocolo do requerimento','obj.protocolo','doc')}${o.via!=='administrativa'?lmCampo('Número do processo','obj.processo','doc')+lmCampo('Juízo','obj.juizo','doc',{s:'s2',ph:'o Juizado Especial Federal de Jaraguá do Sul/SC'}):''}
  ${lmCampo('Objeto (detalhe)','obj.objeto','doc',{s:'s4',area:true,rows:2})}</div>
  <div class="notice">Requerer e acompanhar um benefício é diferente de receber o benefício em nome do cliente. O poder de receber fica separado, no passo Poderes. Para cadastrar procurador no INSS, o órgão também pede o termo de responsabilidade, disponível no passo Documentos.</div>`;
 return h}
function lmP4(){const d=LM.doc,P=d.poderes,a=d.area;P.especiais=P.especiais||{};P.extras=P.extras||{};const prevAdm=a==='previdenciario'&&d.obj.via==='administrativa';
 const ex=[...LM_EXTRAS.todos,...(LM_EXTRAS[a]||[])];
 return `<h2>Poderes</h2>${prevAdm?'<p class="sub">Atuação só administrativa: a procuração traz os poderes para o INSS. A cláusula para o foro não entra.</p>':lmChk('Poderes gerais para o foro (cláusula ad judicia et extra)','poderes.geral','doc',{ajuda:'Habilita o advogado a praticar todos os atos do processo, exceto os poderes especiais abaixo (art. 105 do Código de Processo Civil).'})}
 <h3>Poderes especiais do art. 105 do Código de Processo Civil</h3><p class="sub">Cada um precisa constar de forma expressa. Marque só o que o cliente autorizou.</p>
 <div class="lmpod">${LM_ESPECIAIS.map(([k,n,aj])=>lmChk(n,'poderes.especiais.'+k,'doc',{ajuda:aj+(k==='hipossuficiencia'&&a==='trabalhista'?' Na Justiça do Trabalho, a Súmula 463 do TST exige esse poder para o advogado assinar a declaração.':'')})).join('')}</div>
 <div class="acts" style="justify-content:flex-start;margin-top:6px"><button class="btn3" onclick="LM_ESPECIAIS.forEach(x=>LM.doc.poderes.especiais[x[0]]=!['renunciar','compromisso','confessar','reconhecer'].includes(x[0]));render()">Marcar os usuais</button><button class="btn3" onclick="LM.doc.poderes.especiais={};render()">Desmarcar todos</button></div>
 <h3>Outros poderes de ${LM_AREAS[a].toLowerCase()}</h3><div class="lmpod">${ex.map(([k,n])=>lmChk(n,'poderes.extras.'+k,'doc')).join('')}</div>
 <h3>Substabelecimento, restrições e prazo</h3><div class="fields">${lmCampo('Substabelecimento','poderes.substab','doc',{s:'s2',opts:[['livre','Permitido, com ou sem reserva'],['com','Permitido somente com reserva de poderes'],['vedado','Vedado']]})}${lmCampo('Prazo do mandato (opcional)','poderes.prazo','doc',{type:'date'})}
  ${lmCampo('Atos excluídos ou limites (opcional)','poderes.restricoes','doc',{s:'s4',area:true,rows:2,ph:'Ex.: vedado firmar acordo abaixo de R$ 10.000,00'})}</div>
 <div class="notice"><b>Desistir</b> encerra o processo e permite propor de novo. <b>Renunciar</b> extingue o direito. <b>Receber</b> é pegar o dinheiro; <b>dar quitação</b> é declarar a dívida paga.</div>`}
function lmP5(){const d=LM.doc;const M=t=>LM.modelos.filter(m=>m.tipo===t&&(m.area==='todas'||m.area===d.area));d.modelos=d.modelos||{};
 return `<h2>Documentos a gerar</h2><p class="sub">Todos saem do mesmo cadastro, com os mesmos dados e valores.</p>
 ${Object.entries(LM_DOCS).map(([k,n])=>{if(!lmDocDisponivel(k,d))return '';const mods=M(k);return `<div class="lmcard">${lmChk(n,'docs.'+k,'doc',{r:true,ajuda:{procuracao:'Documento principal de representação.',declaracao:'Assinada pelo próprio cliente, para pedir a gratuidade da justiça.',contrato:'Abre o passo Honorários.',substabelecimento:'Transfere os poderes a outro advogado.',preposicao:'Indica quem representa a empresa nas audiências trabalhistas.',termo_inss:'Exigido pelo INSS para cadastrar o advogado como procurador.'}[k]})}
  ${d.docs[k]?`<div class="f" style="max-width:420px;margin-left:26px"><label>Modelo</label><select onchange="LM.doc.modelos['${k}']=this.value;lmPreviewDeb()"><option value="padrao">Modelo padrão LexMandato</option>${mods.map(m=>`<option value="${m.id}" ${d.modelos[k]===m.id?'selected':''}>${esc(m.nome)} (versão ${m.versao})</option>`).join('')}</select></div>`:''}
  ${k==='substabelecimento'&&d.docs[k]?`<div class="fields" style="margin:10px 0 0 26px">${lmCampo('Advogado que recebe','substab.nome','doc',{s:'s2'})}${lmCampo('OAB','substab.oab','doc')}${lmCampo('UF','substab.uf','doc')}${lmCampo('Endereço profissional','substab.endereco','doc',{s:'s4'})}${lmCampo('Reserva de poderes','substab.reserva','doc',{opts:[['com','Com reserva'],['sem','Sem reserva']]})}</div>`:''}</div>`}).join('')}
 <h3>Advogados que constam nos documentos</h3>${((LM.esc&&LM.esc.advogados)||[]).map((a,i)=>`<label class="chk" style="margin:6px 0"><input type="checkbox" ${d.advs&&d.advs[i]?'checked':''} onchange="LM.doc.advs=LM.doc.advs||[];LM.doc.advs[${i}]=this.checked;lmPreviewDeb()"> ${esc(a.nome||'Sem nome')} · OAB/${esc(a.uf||'')} ${esc(a.oab||'')}</label>`).join('')||'<div class="notice bad">Nenhum advogado cadastrado. <button class="btn3" onclick="lmIr(\'escritorio\')">Cadastrar agora</button></div>'}
 <h3>Local e data</h3><div class="fields">${lmCampo('Local de assinatura','local','doc',{s:'s2',ph:'Jaraguá do Sul/SC'})}${lmCampo('Data','data','doc',{type:'date'})}</div>`}
function lmP6(){const d=LM.doc,h=d.hon;const n=Math.max(1,parseInt(h.parcelas)||1),resto=num(h.valor)-num(h.entrada);
 return `<h2>Honorários</h2><p class="sub">Os valores daqui alimentam o contrato e, se marcado, a cláusula da procuração. Assim os documentos nunca saem com valores diferentes.</p>
 <div class="fields" style="margin-top:12px">${lmCampo('Tipo','hon.tipo','doc',{r:true,opts:[['exito','Somente êxito'],['fixo','Somente fixo'],['misto','Fixo mais êxito']]})}</div>
 ${h.tipo!=='exito'?`<h3>Honorários fixos</h3><div class="fields">${lmCampo('Valor total','hon.valor','doc',{rs:true,r:true})}${lmCampo('Entrada','hon.entrada','doc',{rs:true,r:true})}${lmCampo('Parcelas do saldo','hon.parcelas','doc',{type:'number',r:true})}${lmCampo('Primeiro vencimento','hon.venc1','doc',{type:'date'})}${lmCampo('Forma de pagamento','hon.forma','doc',{opts:['Pix','boleto bancário','cartão de crédito','transferência bancária','dinheiro']})}</div>
  ${num(h.valor)?`<p class="sub" style="margin-top:8px">${n>1&&resto>0?n+' parcelas de '+R(resto/n):'Pagamento único'}${num(h.entrada)?' após entrada de '+R(num(h.entrada)):''}.</p>`:''}`:''}
 ${h.tipo!=='fixo'?`<h3>Honorários de êxito</h3><div class="fields">${lmCampo('Percentual','hon.pct','doc',{ph:'30'})}${lmCampo('Base de cálculo','hon.base','doc',{s:'s2'})}${lmCampo('Quando são devidos','hon.momento','doc',{s:'s4'})}</div>`:''}
 <h3>Despesas e foro</h3><div class="fields">${lmCampo('Despesas do processo','hon.despesas','doc',{opts:[['contratante','Por conta do cliente'],['contratados','Por conta do escritório']]})}${lmCampo('Foro do contrato','hon.foro','doc',{s:'s2',ph:d.local||'Jaraguá do Sul/SC'})}</div>
 ${lmChk('Incluir também uma cláusula de honorários na procuração','hon.naProcuracao','doc',{ajuda:'Alguns escritórios preferem. O texto usa exatamente os mesmos valores do contrato.'})}`}
function lmP7(){const d=LM.doc,P=lmPendencias(d),erros=P.filter(x=>x[0]==='erro');const D=lmDocsSel(d);LM.ver=LM.ver&&D.includes(LM.ver)?LM.ver:D[0];
 return `<h2>Revisão</h2><div class="lmrev"><div><div class="lmareas" style="margin-bottom:10px">${D.map(k=>`<button class="${LM.ver===k?'on':''}" onclick="LM.ver='${k}';render()">${LM_DOCS[k]}</button>`).join('')}</div><div class="papel">${LM.ver?lmHTML(lmTexto(LM.ver,d)):''}</div></div>
 <div><div class="lmcard"><b>Resumo</b><p class="sub" style="margin-top:6px">Cliente: ${esc(lmTitular(d)||'sem nome')}<br>Área: ${LM_AREAS[d.area]}<br>Modelos: ${D.map(k=>esc((lmModeloDe(k,d)||{nome:'padrão'}).nome)).join(', ')}<br>Poderes especiais: ${esc(LM_ESPECIAIS.filter(x=>d.poderes.especiais&&d.poderes.especiais[x[0]]).map(x=>x[1]).join('; ')||'nenhum')}<br>Substabelecimento: ${{livre:'permitido',com:'só com reserva',vedado:'vedado'}[d.poderes.substab]}</p></div>
 <div class="lmcard" style="border-color:${erros.length?'#a14a3c':'#3f7a4b'}"><b>Conferência</b>${P.length?P.map(([t,m])=>`<p style="margin:6px 0;color:${t==='erro'?'var(--bad)':'#f6dba5'}">${t==='erro'?'✕':'!'} ${esc(m)}</p>`).join(''):'<p style="color:var(--ok);margin:6px 0">✓ Tudo preenchido e coerente.</p>'}</div>
 <div class="lmcard"><b>Aprovação</b><p class="sub" style="margin:6px 0">A conferência automática não substitui a revisão do advogado responsável.</p>${lmCampo('Aprovado por','aprovadoPor','doc',{ph:'Nome do advogado responsável'})}</div>
 <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px"><button class="btn" ${erros.length?'disabled style="opacity:.5"':''} onclick="lmGerar('baixar',this)">⬇ Gerar PDF</button><button class="btn2" ${erros.length?'disabled style="opacity:.5"':''} onclick="lmGerar('imprimir',this)">🖨 Imprimir</button>${D.some(k=>lmEhDocx(lmModeloDe(k,d)))?`<button class="btn" ${erros.length?'disabled style="opacity:.5"':''} onclick="lmDxBaixar(this)">⬇ Baixar no modelo do escritório (Word)</button>`:''}<button class="btn2" onclick="lmWord()">Baixar em Word</button><button class="btn2" onclick="lmSalvarDoc('Em revisão')">Salvar como Em revisão</button><button class="btn2" onclick="lmAssinar()">Enviar para assinatura</button></div>
 ${erros.length?'<p class="sub" style="margin-top:8px">Corrija os itens marcados com ✕ para gerar o PDF.</p>':''}</div></div>`}
function lmAssinar(){modal(`<h2>Assinatura eletrônica</h2><p>Baixe o PDF e peça ao cliente para assinar pelo gov.br, de graça:</p><ol><li>Clique em <b>Gerar PDF</b>.</li><li>Envie o arquivo ao cliente pelo WhatsApp ou e-mail.</li><li>O cliente abre <b>assinador.iti.br</b>, entra com a conta gov.br, envia o PDF e clica em Assinar.</li><li>Ele devolve o arquivo assinado, e você muda a situação para <b>Assinado</b> em Documentos.</li></ol><p class="sub">A integração direta com plataformas de assinatura entra numa próxima versão.</p><div class="acts"><button class="btn" onclick="this.closest('.modal').remove();lmStatus&&LM.doc.id&&lmStatus(LM.doc.id,'Aguardando assinatura')">Entendi</button></div>`)}

/* ---------- Clientes e documentos ---------- */
function lmClientes(){const q=(LM.busca||'').toLowerCase(),qd=lmDig(LM.busca);const L=LM.clientes.filter(c=>!q||c.nome.toLowerCase().includes(q)||(qd&&c.documento.includes(qd)));
 return `<div class="panel"><div style="display:flex;gap:10px;flex-wrap:wrap"><input id="lmBc" placeholder="Nome ou CPF/CNPJ" value="${esc(LM.busca)}" style="flex:1;min-width:220px;background:#111e27;border:1px solid #6e6a5e;border-radius:7px;padding:11px;color:#fff" oninput="LM.busca=this.value;clearTimeout(lmT);lmT=setTimeout(()=>{render();const e=$('#lmBc');e.focus();e.setSelectionRange(e.value.length,e.value.length)},300)"><button class="btn" onclick="lmIr('nova',{area:'civel'})">+ Novo cliente e procuração</button></div>
 <div style="margin-top:14px">${L.length?L.map(c=>{const ds=LM.docs.filter(x=>x.cliente_id===c.id);return `<div class="rec"><div><b>${esc(c.nome)}</b><br><small>${c.documento.length===14?lmFmtCNPJ(c.documento):lmFmtCPF(c.documento)} · ${ds.length} documento${ds.length===1?'':'s'}${ds[0]?' · último: '+esc(ds[0].titulo):''}</small></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn2" onclick="lmNovoPara('${c.id}')">Nova procuração</button><button class="btn3" onclick="LM.tab='documentos';LM.filtro='${c.id}';render()">Ver documentos</button><button class="btn3" style="color:var(--bad)" onclick="lmExcluirCliente('${c.id}')">Excluir</button></div></div>`}).join(''):'<p class="sub">Nenhum cliente encontrado.</p>'}</div></div>`}
function lmNovoPara(id){const x=LM.clientes.find(c=>c.id===id);LM.doc=lmNovoDoc('civel');if(x){LM.doc.cliente=Object.assign({},x.dados.cliente||{});if(x.dados.rep)LM.doc.rep=Object.assign({},x.dados.rep);LM.doc.clienteId=x.id}LM.passo=1;LM.tab='nova';render()}
function lmDocumentos(){let L=LM.docs;if(LM.filtro)L=L.filter(x=>x.cliente_id===LM.filtro||x.status===LM.filtro||x.area===LM.filtro);
 return `<div class="panel"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><select onchange="LM.filtro=this.value;render()" style="background:#111e27;border:1px solid #6e6a5e;border-radius:7px;padding:10px;color:#fff"><option value="">Todos os documentos</option>${Object.entries(LM_AREAS).map(([k,n])=>`<option value="${k}" ${LM.filtro===k?'selected':''}>${n}</option>`).join('')}${LM_STATUS.map(s=>`<option ${LM.filtro===s?'selected':''}>${s}</option>`).join('')}</select>${LM.filtro&&!LM_AREAS[LM.filtro]&&!LM_STATUS.includes(LM.filtro)?'<button class="btn3" onclick="LM.filtro=\'\';render()">Limpar filtro do cliente</button>':''}</div>
 <div style="margin-top:14px">${L.length?lmTabelaDocs(L):'<p class="sub">Nenhum documento.</p>'}</div></div>`}

/* ---------- Painel do escritório nas Configurações ---------- */
function cfgEquipe(){
 if(!LM.carregado)return `<div class="panel"><h2 style="margin-top:0">Escritório e equipe</h2><p class="sub">Carregando...</p><div class="acts" style="justify-content:flex-start"><button class="btn2" onclick="cfgCarregarLM()">Carregar</button></div></div>`;
 if(LM.erroTabela)return `<div class="panel"><h2 style="margin-top:0">Escritório e equipe</h2><div class="notice bad">O LexMandato ainda não foi ativado no banco de dados.</div></div>`;
 const entrar=`<h3>Entrar em um escritório já existente</h3><p class="sub">Recebeu um código de convite? Digite abaixo. Você passa a enxergar os modelos, os clientes e os documentos daquele escritório.</p>
  <div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap"><input id="lmConvCod" placeholder="Código do convite" style="flex:1;min-width:180px;text-transform:uppercase;background:#111e27;border:1px solid #6e6a5e;border-radius:7px;padding:11px;color:#fff" onkeydown="if(event.key==='Enter')lmUsarConvite()"><button class="btn2" onclick="lmUsarConvite()">Usar convite</button></div>`;

 const mestreTopo=LM.mestre?`<div class="notice" style="margin:0 0 14px"><b>Você está no login mestre da BlackSolutions.</b> Você cria, enxerga e alimenta qualquer escritório. A lista completa fica na aba Administração do LexMandato.<div class="acts" style="justify-content:flex-start;margin-top:10px"><button class="btn2" onclick="ir('mandato');lmIr('admin')">Abrir a Administração</button></div></div>`:'';
 if(LM.semOrg||!LM.org)return `<div class="panel"><h2 style="margin-top:0">Escritório e equipe</h2>${mestreTopo}
  <p class="sub">Os modelos, os clientes e os documentos do LexMandato pertencem ao escritório, não ao login. Assim, quando outra pessoa do escritório criar o acesso dela, encontra a mesma biblioteca, sem ninguém dividir senha.</p>
  <div class="notice" style="margin:12px 0">Você ainda não está em nenhum escritório. Crie o seu ou use um código de convite.</div>
  <div class="f" style="margin-bottom:10px"><label>Nome do escritório</label><input id="lmOrgNome" placeholder="Edinei Marcondes Advogados Associados"></div>
  <div class="acts" style="justify-content:flex-start"><button class="btn" onclick="lmCriarEscritorio()">Criar escritório</button></div>
  ${entrar}</div>`;

 const eu=U.user.id;const adm=lmAdministra();
 const linhas=LM.equipe.map(m=>`<div class="rec"><div><b>${esc(m.email||'sem e-mail')}</b>${m.user_id===eu?' <span class="selo">você</span>':''}<br><small>${LM_PAPEIS[m.papel]||m.papel} · desde ${br((m.criado_em||'').slice(0,10))}</small></div>${adm&&m.user_id!==eu?`<div><button class="btn3" style="color:var(--bad)" onclick="lmRemoverMembro('${m.user_id}','${esc(m.email||'')}')">Tirar acesso</button></div>`:'<div></div>'}</div>`).join('');

 const lst=LM.orgs.slice();if(!lst.some(o=>o.id===LM.org.id))lst.unshift({id:LM.org.id,papel:LM.org.papel,nome:LM.org.nome});
 const troca=lst.length>1?`<div class="f" style="margin:12px 0"><label>Escritório em que você está trabalhando agora</label><select onchange="lmTrocarOrg(this.value)">${lst.map(o=>`<option value="${o.id}" ${o.id===LM.org.id?'selected':''}>${esc(o.nome)} (${LM_PAPEIS[o.papel]||o.papel})</option>`).join('')}</select></div><p class="dica">Tudo o que você enviar e gerar fica no escritório selecionado aqui.</p>`:'';

 const conv=adm?`<h3>Dar acesso a mais alguém</h3><p class="sub">Gere um código, entregue para a pessoa e peça que ela crie o acesso dela no Lex Calc e use o código nesta mesma tela. O código serve uma vez só e vence em 30 dias. Ninguém precisa dividir senha.</p>
  <div class="acts" style="justify-content:flex-start;margin-top:10px"><button class="btn2" onclick="lmGerarConvite('equipe')">Gerar código para a equipe</button><button class="btn3" onclick="lmGerarConvite('dono')">Gerar código de responsável</button></div>
  ${LM.convite?`<div class="notice" style="margin:12px 0">Código gerado para <b>${LM_PAPEIS[LM.convite.papel]}</b>: <b style="font-size:20px;letter-spacing:3px">${esc(LM.convite.codigo)}</b><br><small>Copie agora. Ele continua válido por 30 dias e some desta tela quando você sair.</small></div>`:''}`:'';

 const log=(LM.acessos&&LM.acessos.length)?`<h3>Registro de acesso da BlackSolutions</h3><p class="sub">Toda vez que o suporte da BlackSolutions entra neste escritório, fica registrado aqui.</p>${LM.acessos.map(x=>`<div class="rec"><div><b>${esc(x.email||'')}</b><br><small>${esc(x.acao||'')} em ${br(String(x.quando||'').slice(0,10))}</small></div><div></div></div>`).join('')}`:'';
 return `<div class="panel"><h2 style="margin-top:0">Escritório e equipe</h2>${mestreTopo}
  <p>Escritório: <b>${esc(LM.org.nome)}</b><br><span class="sub">Seu papel: ${LM_PAPEIS[LM.org.papel]||LM.org.papel}</span></p>
  ${troca}
  <h3>Quem tem acesso</h3>${linhas||'<p class="sub">Ninguém mais.</p>'}
  ${conv}
  ${entrar}
  ${log}
  <div class="acts" style="justify-content:flex-start;margin-top:14px"><button class="btn2" onclick="ir('mandato');lmIr('escritorio')">Dados do escritório e advogados</button><button class="btn2" onclick="ir('mandato');lmIr('modelos')">Biblioteca de documentos</button></div></div>`}
async function cfgCarregarLM(){await lmCarregar(true);render()}

/* Envio do modelo direto pela tela de Configurações */
function cfgModelosResumo(){if(!LM.carregado)return 'Depois de enviar, o documento abre no LexMandato com os campos já reconhecidos, para você conferir e salvar.';
 const g={};LM.modelos.forEach(m=>{g[m.tipo]=(g[m.tipo]||0)+1});
 const t=Object.keys(LM_DOCS).filter(k=>g[k]).map(k=>g[k]+' '+(g[k]===1?LM_DOCS[k].toLowerCase():LM_DOCS[k].toLowerCase()+'s'));
 return t.length?'Modelos já enviados: '+t.join(', ')+'.':'Nenhum modelo enviado ainda. Sem modelo próprio, o LexMandato usa o modelo padrão.'}
async function cfgModelo(inp,tipo){const f=inp.files&&inp.files[0];if(!f)return;inp.value='';
 if(f.size>2.6*1048576&&/\.docx$/i.test(f.name)){toast('O arquivo passa de 2,6 MB. Reduza as imagens do timbre e envie de novo.');return}
 U.view='mandato';LM.tab='modelos';LM.semDx=false;
 if(!LM.carregado){toast('Abrindo o LexMandato...');await lmCarregar()}
 if(LM.erroTabela){render();toast('O LexMandato ainda não foi ativado no banco de dados.');return}
 LM.mod={tipo,area:'todas',nome:'',texto:''};render();
 await lmImportar(f)}
/* ---------- Administração: só o login mestre ---------- */
function lmAdmin(){if(!LM.mestre)return `<div class="panel"><div class="notice bad">Esta tela é do login mestre.</div></div>`;
 const T=LM.todosEsc||[];
 return `<div class="panel"><h2 style="margin-top:0">Administração BlackSolutions</h2>
 <p class="sub">Você está no login mestre. Daqui você cria o escritório do cliente, alimenta a biblioteca dele e entrega o código para ele criar o próprio acesso. Toda vez que você escolhe um escritório aqui, fica registrado, e o escritório enxerga esse registro nas Configurações dele.</p>
 <div class="f" style="margin:14px 0 10px"><label>Nome do escritório novo</label><input id="lmAdmNome" placeholder="Edinei Marcondes Advogados Associados"></div>
 <div class="acts" style="justify-content:flex-start"><button class="btn" onclick="lmMestreCriar()">Criar escritório</button></div></div>
 <div class="panel"><h2 style="margin-top:0">Escritórios ${T.length?'<span class="selo">'+T.length+'</span>':''}</h2>
 ${T.length?T.map(e=>`<div class="rec" style="align-items:flex-start;flex-wrap:wrap;gap:10px">
  <div style="flex:1;min-width:260px"><b>${esc(e.nome)}</b>${LM.org&&LM.org.id===e.id?' <span class="selo">você está aqui</span>':''}
   <br><small class="sub">${e.modelos||0} modelos · ${e.clientes||0} clientes · ${e.documentos||0} documentos · criado em ${br(String(e.criado_em||'').slice(0,10))}</small>
   <br><small class="sub">Acessos: ${esc(e.emails||'ninguém ainda')}</small>
   ${LM.conviteAdm&&LM.conviteAdm.id===e.id?`<div class="notice" style="margin-top:10px">Código de ${LM_PAPEIS[LM.conviteAdm.papel]}: <b style="font-size:19px;letter-spacing:3px">${esc(LM.conviteAdm.codigo)}</b><br><small>Entregue para o escritório. Serve uma vez só e vence em 30 dias.</small></div>`:''}</div>
  <div style="display:flex;flex-direction:column;gap:8px;min-width:200px">
   <button class="btn2" onclick="lmMestreAbrir('${e.id}')">Alimentar este escritório</button>
   <button class="btn3" onclick="lmMestreConvite('${e.id}','dono')">Gerar código de responsável</button>
   <button class="btn3" onclick="lmMestreRenomear('${e.id}')">Renomear</button></div>
 </div>`).join(''):'<p class="sub">Nenhum escritório cadastrado ainda.</p>'}</div>`}
async function lmMestreCriar(){const nome=($('#lmAdmNome')&&$('#lmAdmNome').value||'').trim();
 if(!nome){toast('Escreva o nome do escritório.');return}
 const {data,error}=await SB.rpc('lm_mestre_criar',{p_nome:nome});
 if(error){toast(lmErroSql(error));return}
 try{localStorage.setItem('lm_org',data)}catch(e){}
 LM.carregado=false;LM.doc=null;LM.mod=null;LM.lote=null;await lmCarregar(true);LM.tab='modelos';render();
 toast('Escritório criado. Você já está dentro dele, pronto para enviar os documentos.')}
async function lmMestreAbrir(id){try{localStorage.setItem('lm_org',id)}catch(e){}
 try{await SB.rpc('lm_mestre_registrar',{p_escritorio:id,p_acao:'entrou'})}catch(e){}
 LM.carregado=false;LM.doc=null;LM.mod=null;LM.lote=null;LM.conviteAdm=null;await lmCarregar(true);LM.tab='modelos';render();
 toast('Agora você está no escritório '+(LM.org?LM.org.nome:''))}
async function lmMestreConvite(id,papel){const {data,error}=await SB.rpc('lm_mestre_convite',{p_escritorio:id,p_papel:papel||'dono'});
 if(error){toast(lmErroSql(error));return}
 LM.conviteAdm={id,codigo:data,papel:papel||'dono'};render()}
async function lmMestreRenomear(id){const e=(LM.todosEsc||[]).find(x=>x.id===id);const nome=prompt('Novo nome do escritório:',e?e.nome:'');
 if(nome===null)return;if(!nome.trim()){toast('Escreva o nome do escritório.');return}
 const {error}=await SB.rpc('lm_mestre_renomear',{p_escritorio:id,p_nome:nome.trim()});
 if(error){toast(lmErroSql(error));return}
 LM.carregado=false;await lmCarregar(true);render();toast('Nome alterado.')}

/* ---------- Envio de vários modelos de uma vez ---------- */
function lmAdivTipo(n){const x=String(n||'').toLowerCase();
 if(/substabel/.test(x))return 'substabelecimento';
 if(/preposi|preposto/.test(x))return 'preposicao';
 if(/hipossuf|declara/.test(x))return 'declaracao';
 if(/termo.*(inss|responsab)|responsab.*inss/.test(x))return 'termo_inss';
 if(/contrato|honor/.test(x))return 'contrato';
 if(/procura/.test(x))return 'procuracao';
 return 'procuracao'}
function lmAdivArea(n){const x=String(n||'').toLowerCase();
 if(/previden|inss|aposentad|bpc|loas|aux[ií]lio|benef[ií]c|pens[aã]o|rural/.test(x))return 'previdenciario';
 if(/trabalh|clt|rescis|verbas|v[ií]nculo|hora extra/.test(x))return 'trabalhista';
 if(/c[ií]vel|civil|consumidor|banc[aá]r|revision|indeniza/.test(x))return 'civel';
 return 'todas'}
async function cfgLote(inp,areaFixa){let fs=[].slice.call(inp.files||[]);inp.value='';
 fs=fs.filter(f=>/\.docx?$/i.test(f.name)&&!/^~\$/.test(f.name));
 if(!fs.length){toast('Nenhum arquivo do Word encontrado na seleção.');return}
 if(fs.length>60){toast('São '+fs.length+' arquivos. Envie em partes de até 60 por vez.');return}
 U.view='mandato';LM.tab='modelos';LM.mod=null;LM.semDx=false;
 if(!LM.carregado){toast('Abrindo o LexMandato...');await lmCarregar()}
 if(LM.erroTabela){render();toast('O LexMandato ainda não foi ativado no banco de dados.');return}
 LM.lote=fs.map(f=>{const cam=f.webkitRelativePath||'';const pasta=cam.indexOf('/')>0?cam.slice(0,cam.lastIndexOf('/')):'';
  return {f,pasta,nome:f.name.replace(/\.\w+$/,''),tipo:lmAdivTipo(cam||f.name),area:areaFixa||lmAdivArea(cam||f.name),estado:'fila',campos:0,erro:'',dx:null}});
 render();await lmLoteLer()}
async function lmLoteLer(){if(!LM.lote)return;
 for(let i=0;i<LM.lote.length;i++){const it=LM.lote[i];if(it.estado!=='fila')continue;
  it.estado='lendo';render();
  try{
   if(/\.doc$/i.test(it.f.name))throw new Error('Arquivo .doc antigo. Abra no Word, use Salvar como e escolha .docx.');
   if(!/\.docx$/i.test(it.f.name))throw new Error('Envie em Word .docx. Só esse formato guarda o timbre e a marca d\'água.');
   if(it.f.size>2.6*1048576)throw new Error('Passa de 2,6 MB. Reduza as imagens do timbre e envie de novo.');
   const buf=await it.f.arrayBuffer();const r=await lmDxAbrir(new Uint8Array(buf));const pars=lmDxPars(r.dom);
   it.dx={arquivo:it.f.name,b64:lmB64(buf),pars,mapa:lmDxDetectar(pars)};
   it.campos=it.dx.mapa.length;it.estado=it.campos?'pronto':'semcampo';
   const nm=(it.nome||'').trim().toLowerCase();
   it.repetido=LM.modelos.some(m=>String(m.nome||'').trim().toLowerCase()===nm&&m.tipo===it.tipo&&(m.area||'todas')===it.area);
  }catch(e){it.estado='erro';it.erro=e.message||String(e);it.dx=null}
  render()}
 const ok=LM.lote.filter(x=>x.estado==='pronto').length,ruim=LM.lote.filter(x=>x.estado==='erro').length;
 toast((ok===1?'1 documento lido.':ok+' documentos lidos.')+(ruim?(ruim===1?' 1 não deu certo.':' '+ruim+' não deram certo.'):'')+' Confira o tipo e a área antes de salvar.')}
function lmLoteTela(){const L=LM.lote;
 const est={fila:'Na fila',lendo:'Lendo o arquivo...',pronto:'Pronto para salvar',semcampo:'Nenhum campo reconhecido',erro:'Não foi possível ler'};
 const prontos=L.filter(x=>x.estado==='pronto'||x.estado==='semcampo').length;
 return `<div class="panel"><h2>Envio de vários modelos</h2>
 <p class="sub">${L.length===1?'1 arquivo':L.length+' arquivos'} na lista${LM.org?', indo para o escritório <b>'+esc(LM.org.nome)+'</b>':''}. O sistema lê cada Word, guarda a fonte, o cabeçalho, o rodapé, o timbre e a marca d'água, e marca sozinho os trechos que mudam de cliente para cliente. O tipo e a área vêm adivinhados pelo nome do arquivo, então confira linha por linha antes de salvar.</p>
 ${L.map((it,i)=>`<div class="rec" style="align-items:flex-start;flex-wrap:wrap;gap:12px">
  <div style="flex:1;min-width:240px"><b>${esc(it.f.name)}</b>${it.pasta?`<br><small class="sub">pasta ${esc(it.pasta)}</small>`:''}<br><small class="${it.estado==='erro'?'':'sub'}" style="${it.estado==='erro'?'color:var(--bad)':''}">${est[it.estado]||it.estado}${it.campos?' · '+it.campos+' campos reconhecidos':''}${it.erro?' · '+esc(it.erro):''}</small>${it.repetido?'<br><small style="color:var(--gold)">Já existe um modelo com este nome, tipo e área na biblioteca. Salvar de novo cria um segundo.</small>':''}
   <div class="f" style="margin-top:8px"><label>Nome do modelo</label><input value="${esc(it.nome)}" oninput="LM.lote[${i}].nome=this.value"></div></div>
  <div style="min-width:210px">
   <div class="f"><label>Documento</label><select onchange="LM.lote[${i}].tipo=this.value">${Object.entries(LM_DOCS).map(([k,n])=>`<option value="${k}" ${it.tipo===k?'selected':''}>${n}</option>`).join('')}</select></div>
   <div class="f" style="margin-top:8px"><label>Área</label><select onchange="LM.lote[${i}].area=this.value"><option value="todas" ${it.area==='todas'?'selected':''}>Todas as áreas</option>${Object.entries(LM_AREAS).map(([k,n])=>`<option value="${k}" ${it.area===k?'selected':''}>${n}</option>`).join('')}</select></div></div>
  <div style="display:flex;flex-direction:column;gap:8px">${it.dx?`<button class="btn3" onclick="lmLoteAbrir(${i})">Conferir campos</button>`:''}<button class="btn3" style="color:var(--bad)" onclick="lmLoteTirar(${i})">Tirar da lista</button></div>
 </div>`).join('')}
 <div class="acts"><button class="btn2" onclick="LM.lote=null;render()">Cancelar tudo</button><button class="btn" ${prontos?'':'disabled'} onclick="lmLoteSalvar(this)">Salvar ${prontos===1?'1 modelo':prontos+' modelos'}</button></div></div>`}
function lmLoteTirar(i){LM.lote.splice(i,1);if(!LM.lote.length)LM.lote=null;render()}
function lmLoteAbrir(i){const it=LM.lote[i];if(!it.dx)return;
 LM.mod={tipo:it.tipo,area:it.area,nome:it.nome,texto:'',dx:JSON.parse(JSON.stringify(it.dx))};
 LM.lote.splice(i,1);if(!LM.lote.length)LM.lote=null;render()}
async function lmLoteSalvar(b){const L=LM.lote.filter(x=>x.estado==='pronto'||x.estado==='semcampo');
 if(!L.length){toast('Nenhum documento pronto para salvar.');return}
 const rep=L.filter(x=>x.repetido).length;
 if(rep&&!confirm((rep===1?'1 documento já existe':rep+' documentos já existem')+' na biblioteca com o mesmo nome, tipo e área. Salvar agora cria cópia. Continuar assim mesmo?'))return;
 const sem=L.filter(x=>!x.campos).length;
 if(sem&&!confirm((sem===1?'1 documento ficou':sem+' documentos ficaram')+' sem nenhum campo reconhecido. '+(sem===1?'Ele será salvo':'Eles serão salvos')+' do jeito que está, sem preenchimento automático. Continuar?'))return;
 b.disabled=true;const t0=b.textContent;let ok=0;const falhou=[];
 for(let i=0;i<L.length;i++){const it=L[i];b.textContent='Salvando '+(i+1)+' de '+L.length+'...';
  const row={tipo:it.tipo,area:it.area,nome:(it.nome||'').trim()||it.f.name,texto:LM_DX+JSON.stringify(it.dx),ativo:true,versao:1,enviado_por:U.user.id};
  if(LM.org)row.escritorio_id=LM.org.id;
  const r=await SB.from('lm_modelos').insert(row).select('id').single();
  if(r.error)falhou.push(it.f.name+': '+r.error.message);else{ok++;it.estado='salvo'}}
 b.disabled=false;b.textContent=t0;
 LM.lote=LM.lote.filter(x=>x.estado!=='salvo');if(!LM.lote.length)LM.lote=null;
 await lmCarregar(true);render();
 toast(falhou.length?ok+' salvos. Não deu certo em '+falhou.length+': '+falhou[0]:(ok===1?'1 modelo salvo':ok+' modelos salvos')+' na biblioteca do escritório.')}

/* ---------- Modelos do escritório ---------- */
const LM_BIB=[['previdenciario','Previdenci\u00e1rio'],['trabalhista','Trabalhista'],['civel','C\u00edvel'],['todas','Geral, serve para qualquer \u00e1rea']];
function lmModelos(){if(LM.lote)return lmLoteTela();if(LM.mod)return lmEditor();
 const tot=LM.modelos.length;
 return `<div class="panel"><h2 style="margin-top:0">Biblioteca do escrit\u00f3rio${LM.org?' \u00b7 '+esc(LM.org.nome):''}</h2>
 <p class="sub">\u00c9 daqui que o LexMandato tira o modelo de cada documento. Envie os arquivos em Word (.docx) do jeito que o escrit\u00f3rio j\u00e1 usa. O sistema mant\u00e9m a fonte, o cabe\u00e7alho, o rodap\u00e9, o timbre e a marca d'\u00e1gua do pr\u00f3prio arquivo, reconhece sozinho o nome, o CPF, o RG, a nacionalidade, o estado civil, a profiss\u00e3o, o endere\u00e7o, o local e a data, e liga cada trecho ao cadastro do cliente. Onde n\u00e3o houver modelo pr\u00f3prio, o LexMandato usa o modelo padr\u00e3o.</p>
 <div class="notice" style="margin:12px 0">Cada \u00e1rea tem o pr\u00f3prio bot\u00e3o de envio logo abaixo. Use <b>Enviar a pasta inteira</b> para mandar de uma vez tudo o que estiver dentro de uma pasta do computador, como PREVIDENCIARIO, TRABALHISTA e C\u00cdVEL. Tudo o que voc\u00ea enviar por um bot\u00e3o entra na \u00e1rea daquele bot\u00e3o, e o tipo de cada documento vem adivinhado pelo nome do arquivo, para voc\u00ea conferir antes de gravar.</p>
 <div class="acts" style="justify-content:flex-start"><label class="btn2" style="cursor:pointer">Enviar v\u00e1rias pastas de uma vez<input type="file" accept=".docx" webkitdirectory directory multiple style="display:none" onchange="cfgLote(this)"></label><span class="sub" style="align-self:center">${tot===1?'1 modelo':tot+' modelos'} na biblioteca</span></div></div>
 ${LM_BIB.map(([k,n])=>lmBibArea(k,n)).join('')}`}
function lmBibArea(k,n){const L=LM.modelos.filter(m=>(m.area||'todas')===k);const G={};L.forEach(m=>{(G[m.tipo]=G[m.tipo]||[]).push(m)});
 return `<div class="panel"><h2 style="margin-top:0">${n} <span class="selo">${L.length}</span></h2>
 <div class="acts" style="justify-content:flex-start;margin-bottom:12px">
  <label class="btn" style="cursor:pointer">Enviar documentos<input type="file" accept=".docx" multiple style="display:none" onchange="cfgLote(this,'${k}')"></label>
  <label class="btn2" style="cursor:pointer">Enviar a pasta inteira<input type="file" accept=".docx" webkitdirectory directory multiple style="display:none" onchange="cfgLote(this,'${k}')"></label>
  <button class="btn3" onclick="lmNovoModelo('${k}')">Escrever um modelo</button></div>
 ${Object.keys(LM_DOCS).filter(t=>G[t]).map(t=>`<h3>${LM_DOCS[t]}</h3>${G[t].map(m=>`<div class="rec"><div><b>${esc(m.nome)}</b><br><small>vers\u00e3o ${m.versao} \u00b7 ${br((m.criado_em||'').slice(0,10))}${lmEhDocx(m)?' \u00b7 Word do escrit\u00f3rio':' \u00b7 texto'}</small></div><div style="display:flex;gap:8px"><button class="btn2" onclick="lmEditarModelo('${m.id}')">Editar</button><button class="btn3" style="color:var(--bad)" onclick="lmArquivarModelo('${m.id}')">Arquivar</button></div></div>`).join('')}`).join('')||'<p class="sub">Nenhum documento nesta \u00e1rea ainda.</p>'}</div>`}
function lmNovoModelo(area){LM.mod={tipo:'procuracao',area:area||'todas',nome:'',texto:''};render()}
function lmEditarModelo(id){const m=LM.modelos.find(x=>x.id===id);if(m){LM.mod=Object.assign({},m);delete LM.mod._dx;if(lmEhDocx(m)){LM.mod.dx=JSON.parse(JSON.stringify(lmDxDados(m)));LM.mod.texto=''}}render()}
async function lmArquivarModelo(id){if(!confirm('Arquivar este modelo? Os documentos já emitidos com ele continuam guardados.'))return;const {error}=await SB.from('lm_modelos').update({ativo:false}).eq('id',id);if(error){toast('Não foi possível arquivar');return}await lmCarregar(true);render()}
function lmEditor(){const m=LM.mod;
 return `<div class="panel"><h2>${m.id?'Editar modelo (gera a versão '+(m.versao+1)+')':'Preparar modelo'}</h2>
 <div class="fields">${`<div class="f s2"><label>Nome do modelo</label><input value="${esc(m.nome)}" oninput="LM.mod.nome=this.value" placeholder="Procuração cível do escritório"></div>`}
 <div class="f"><label>Documento</label><select onchange="LM.mod.tipo=this.value">${Object.entries(LM_DOCS).map(([k,n])=>`<option value="${k}" ${m.tipo===k?'selected':''}>${n}</option>`).join('')}</select></div>
 <div class="f"><label>Área</label><select onchange="LM.mod.area=this.value"><option value="todas">Todas as áreas</option>${Object.entries(LM_AREAS).map(([k,n])=>`<option value="${k}" ${m.area===k?'selected':''}>${n}</option>`).join('')}</select></div></div>
 <div class="acts" style="justify-content:flex-start"><label class="btn2" style="cursor:pointer">Importar Word ou PDF<input type="file" accept=".docx,.doc,.pdf,.txt" style="display:none" onchange="LM.semDx=false;lmImportar(this.files[0])"></label>${m.dx?'':'<button class="btn2" onclick="lmSugerir()">Sugerir campos</button>'}<button class="btn2" onclick="lmPadraoComCampos();render()">Começar do modelo padrão</button></div>
 ${m.dx?lmDxEditor():`<div class="lmrev" style="margin-top:14px"><div><div class="f"><label>Texto do modelo</label><textarea id="lmModTxt" rows="22" style="font-family:Georgia,serif;line-height:1.5" oninput="LM.mod.texto=this.value;lmModPreviewDeb()">${esc(m.texto)}</textarea><small class="sub">Use # no começo da linha para o título e **texto** para negrito. Selecione um trecho e clique em um campo ao lado para trocá-lo por um campo variável.</small></div></div>
 <div><b>Campos variáveis</b><div class="lmchips">${LM_CAMPOS.map(([k,n])=>`<button title="{{${k}}}" onclick="lmInserirCampo('${k}')">${n}</button>`).join('')}</div>
 <div id="lmModAviso"></div><div class="sub" style="margin:10px 0 4px">Teste com dados fictícios</div><div class="papel" id="lmModPrev"></div></div></div>`}
 <div class="acts"><button class="btn2" onclick="LM.mod=null;render()">Cancelar</button><button class="btn" onclick="lmSalvarModelo()">Salvar modelo</button></div></div>`}
function lmPadraoComCampos(){const t=LM.mod.tipo;const d=lmDemo();const v=lmVars(d);let x=lmPadrao(t,d);const ordem=Object.keys(v).filter(k=>v[k]&&String(v[k]).length>3).sort((a,b)=>String(v[b]).length-String(v[a]).length);ordem.forEach(k=>{x=x.split(String(v[k])).join('{{'+k+'}}')});LM.mod.texto=x}
function lmInserirCampo(k){const ta=$('#lmModTxt');if(!ta)return;const a=ta.selectionStart,b=ta.selectionEnd;ta.value=ta.value.slice(0,a)+'{{'+k+'}}'+ta.value.slice(b);LM.mod.texto=ta.value;ta.focus();ta.selectionStart=ta.selectionEnd=a+k.length+4;lmModPreview()}
let lmMT=null;function lmModPreviewDeb(){clearTimeout(lmMT);lmMT=setTimeout(lmModPreview,250)}
function lmDemo(){const d=lmNovoDoc('civel');d.cliente=Object.assign(d.cliente,{nome:'Maria Exemplo da Silva',genero:'f',nacionalidade:'brasileira',estadoCivil:'casado',profissao:'comerciante',cpf:'52998224725',rg:'1.234.567',rgOrgao:'SSP/SC',logradouro:'Rua Exemplo',numero:'100',bairro:'Centro',cidade:'Jaraguá do Sul',uf:'SC',cep:'89251-000'});d.obj.acao='Ação revisional de contrato';d.obj.contraria='Banco Exemplo S.A.';d.poderes.especiais={transigir:true,receber:true,quitacao:true};d.hon.valor='3000';d.hon.tipo='misto';
 if(!lmAdvsSel(d).length)d.advsLista=[{nome:'Advogado Exemplo',oab:'12345',uf:'SC',nacionalidade:'brasileiro',genero:'m',endereco:'Rua do Escritório, 10, Centro, Jaraguá do Sul/SC'}];d.local=d.local||'Jaraguá do Sul/SC';return d}
function lmModPreview(){const el=$('#lmModPrev');if(!el||!LM.mod)return;if(LM.mod.dx){lmDxPreview();return}const t=LM.mod.texto||'';const d=lmDemo();el.innerHTML=t?lmHTML(lmPreencher(t,d)):'<p class="sub">Importe um arquivo ou escreva o texto.</p>';
 const av=[];const desconhecidos=[...new Set((t.match(/\{\{\s*([\w.]+)\s*\}\}/g)||[]).map(x=>x.replace(/[{}\s]/g,'')))].filter(k=>!LM_CAMPOS.some(c=>c[0]===k));if(desconhecidos.length)av.push('Campos que o sistema não conhece: '+desconhecidos.join(', ')+'.');
 if(LM.mod.tipo==='procuracao'&&!/\{\{\s*poderes\.texto/.test(t)){const ach=LM_ESPECIAIS.filter(x=>new RegExp('\\b'+x[3]+(x[0]==='receber'?'(?! cita)':'')+'\\b','i').test(t)).map(x=>x[1]);av.push(ach.length?'O modelo já traz poderes escritos ('+ach.slice(0,4).join(', ')+'). Troque esse trecho por {{poderes.texto}} para que a seleção de poderes funcione.':'Inclua o campo {{poderes.texto}} para que os poderes selecionados entrem no documento.')}
 if(/\d{3}\.\d{3}\.\d{3}-\d{2}/.test(t))av.push('Há um CPF escrito no texto. Clique em Sugerir campos ou troque por {{cliente.cpf}}.');
 const box=$('#lmModAviso');if(box)box.innerHTML=av.map(a=>`<div class="notice" style="margin:8px 0">${esc(a)}</div>`).join('')}
function lmSugerir(){let t=LM.mod.texto||'';const antes=t;t=t.replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g,'{{cliente.cpf}}').replace(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g,'{{cliente.cnpj}}').replace(/\b\d{1,2} de (janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro) de \d{4}\b/gi,'{{data}}').replace(/_{3,}[^\n]*\n?/g,m=>m);
 LM.mod.texto=t;render();toast(t===antes?'Nenhum campo reconhecido automaticamente. Selecione o trecho e clique no campo.':'Campos sugeridos. Confira o texto.')}
function lmCarregarScript(src,glob){if(window[glob])return Promise.resolve(window[glob]);return new Promise((ok,erro)=>{const s=document.createElement('script');s.src=src;s.onload=()=>ok(window[glob]);s.onerror=()=>erro(new Error('Não foi possível carregar o leitor de arquivos.'));document.head.appendChild(s)})}
async function lmImportar(f){if(!f)return;try{let txt='';
 if(/\.doc$/i.test(f.name)){toast('Arquivo .doc antigo. Abra no Word, use Salvar como e escolha o formato .docx.');return}
 if(/\.docx$/i.test(f.name)&&!LM.semDx){if(f.size>2.6*1048576){toast('O arquivo passa de 2,6 MB. Reduza as imagens do timbre e envie de novo.');return}const buf=await f.arrayBuffer();const {dom}=await lmDxAbrir(new Uint8Array(buf));const pars=lmDxPars(dom);LM.mod.dx={arquivo:f.name,b64:lmB64(buf),pars,mapa:lmDxDetectar(pars)};LM.mod.texto='';if(!LM.mod.nome)LM.mod.nome=f.name.replace(/\.\w+$/,'');render();toast(LM.mod.dx.mapa.length+' campos reconhecidos. Confira a lista.');return}
 if(/\.docx$/i.test(f.name)){const m=await lmCarregarScript('assets/mammoth.browser.min.js','mammoth');const r=await m.extractRawText({arrayBuffer:await f.arrayBuffer()});txt=r.value}
 else if(/\.pdf$/i.test(f.name)){const pj=await lmCarregarScript('assets/pdfjs.min.js','pdfjsLib');pj.GlobalWorkerOptions.workerSrc='assets/pdfjs.worker.min.js';const doc=await pj.getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise;
  for(let i=1;i<=doc.numPages;i++){const pg=await doc.getPage(i);const c=await pg.getTextContent();let y=null,linha='';const L=[];c.items.forEach(it=>{const yy=Math.round(it.transform[5]);if(y!==null&&Math.abs(yy-y)>3){L.push(linha);linha=''}linha+=it.str;y=yy});L.push(linha);txt+=L.join('\n')+'\n\n'}
  if(txt.replace(/\s/g,'').length<20){toast('Este PDF é uma imagem digitalizada, sem texto. Importe a versão em Word ou digite o texto.');return}}
 else txt=await f.text();
 txt=txt.replace(/\r/g,'').replace(/\n{3,}/g,'\n\n').trim();const L=txt.split('\n');if(L[0]&&L[0].length<60&&L[0]===L[0].toUpperCase())L[0]='# '+L[0];
 LM.mod.texto=L.join('\n');if(!LM.mod.nome)LM.mod.nome=f.name.replace(/\.\w+$/,'');render();toast('Texto importado. Agora marque os campos variáveis.')}catch(e){toast(e.message||'Não foi possível ler o arquivo.')}}
async function lmSalvarModelo(){const m=LM.mod;if(!m.nome.trim()){toast('Dê um nome ao modelo.');return}if(!m.dx&&!m.texto.trim()){toast('O modelo está vazio.');return}
 if(m.dx){m.dx.mapa=m.dx.mapa.filter(x=>x.de&&x.campo);if(!m.dx.mapa.length){toast('Marque pelo menos um campo variável.');return}}
 const row={tipo:m.tipo,area:m.area,nome:m.nome.trim(),texto:m.dx?LM_DX+JSON.stringify(m.dx):m.texto,ativo:true,versao:m.id?(m.versao||1)+1:1};if(m.grupo)row.grupo=m.grupo;if(LM.org)row.escritorio_id=LM.org.id;row.enviado_por=U.user.id;
 const r=await SB.from('lm_modelos').insert(row).select('*').single();if(r.error){toast('Não foi possível salvar: '+r.error.message);return}
 if(m.id)await SB.from('lm_modelos').update({ativo:false}).eq('id',m.id);
 if(LM.doc&&LM.doc.modelos)Object.keys(LM.doc.modelos).forEach(k=>{if(LM.doc.modelos[k]===m.id)LM.doc.modelos[k]=r.data.id});
 LM.mod=null;await lmCarregar(true);render();toast('Modelo salvo na versão '+row.versao+'. Os documentos já emitidos continuam com a versão anterior.')}

/* ============ PDF com papel timbrado ============ */
async function lmPDF(){const d=LM.doc;const L=await carregarPdfLib();const {PDFDocument,StandardFonts,rgb}=L;const pdf=await PDFDocument.create();
 const F=await pdf.embedFont(StandardFonts.TimesRoman),FB=await pdf.embedFont(StandardFonts.TimesRomanBold);const pf=pref(),tb=pf.timbrado||{};
 const W=595.28,H=841.89,cm=28.35,ML=3*cm,MR=2*cm;const topo=tb.path?(num(tb.topo)||4)*cm:2.5*cm,rod=tb.path?(num(tb.rodape)||3)*cm:2*cm;
 let fundo=null,fundo2=null,img=false;const tbb=await timbradoBytes();
 if(tbb){try{if(tbb.tipo==='application/pdf'){const src=await PDFDocument.load(tbb.bytes,{ignoreEncryption:true});const n=src.getPageCount();const emb=await pdf.embedPdf(src,n>1?[0,1]:[0]);fundo=emb[0];fundo2=emb[1]||emb[0]}else{img=true;fundo=fundo2=tbb.tipo==='image/png'?await pdf.embedPng(tbb.bytes):await pdf.embedJpg(tbb.bytes)}}catch(e){toast('Não foi possível usar o papel timbrado.')}}
 const limpa=t=>{let o='';for(const ch of String(t)){try{F.encodeText(ch);o+=ch}catch(e){o+=ch==='º'?'o':ch==='ª'?'a':ch==='–'||ch==='—'?'-':'?'}}return o};
 const preto=rgb(0,0,0);let pg,y,np=0,first=true;const largura=W-ML-MR,Z=12,LH=18;
 /* largura sem kerning: o pdf-lib aplica kerning na medida, mas não no desenho */
 const WC=new Map();const larg=(t,f,z)=>{let a=0;for(const ch of t){const k=(f===FB?'b':'n')+ch+z;let v=WC.get(k);if(v==null){v=f.widthOfTextAtSize(ch,z);WC.set(k,v)}a+=v}return a};
 function nova(){pg=pdf.addPage([W,H]);np++;const bg=first?fundo:fundo2;first=false;if(bg){if(img)pg.drawImage(bg,{x:0,y:0,width:W,height:H});else pg.drawPage(bg,{x:0,y:0,width:W,height:H})}y=H-topo;
  if(!fundo&&np===1&&(LM.esc&&LM.esc.nome||pf.escritorio)){pg.drawText(limpa((LM.esc&&LM.esc.nome)||pf.escritorio),{x:ML,y,size:11,font:FB,color:rgb(.25,.25,.25)});y-=10;pg.drawLine({start:{x:ML,y},end:{x:W-MR,y},thickness:.5,color:rgb(.6,.6,.6)});y-=26}}
 function precisa(h){if(y-h<rod){nova();return true}return false}
 function tokens(linha){const T=[];linha.split(/(\*\*.+?\*\*)/).forEach(seg=>{if(!seg)return;const b=/^\*\*.+\*\*$/.test(seg);const s=b?seg.slice(2,-2):seg;s.split(/(\s+)/).forEach(w=>{if(!w)return;if(/^\s+$/.test(w)){T.push({esp:true});return}T.push({t:limpa(w),f:b?FB:F})})});return T}
 function paragrafo(linha,opt){opt=opt||{};const T=tokens(linha).filter((x,i,a)=>!(x.esp&&(i===0||a[i-1].esp)));const esp=larg(' ',F,Z);const linhas=[];let atual=[],w=0;
  T.forEach(tk=>{if(tk.esp)return;const tw=larg(tk.t,tk.f,Z);if(atual.length&&w+esp+tw>largura-(opt.recuo||0)){linhas.push(atual);atual=[];w=0}if(atual.length)w+=esp;atual.push(Object.assign({w:tw},tk));w+=tw});if(atual.length)linhas.push(atual);
  linhas.forEach((ln,i)=>{precisa(LH);const ult=i===linhas.length-1;const soma=ln.reduce((a,x)=>a+x.w,0);let x=ML+(i===0?(opt.recuo||0):0),gap=esp;
   if(opt.centro){x=ML+(largura-soma-esp*(ln.length-1))/2}else if(!ult&&ln.length>1)gap=(largura-(i===0?(opt.recuo||0):0)-soma)/(ln.length-1);
   ln.forEach(tk=>{pg.drawText(tk.t,{x,y,size:Z,font:tk.f,color:preto});x+=tk.w+gap});y-=LH})}
 const D=lmDocsSel(d);D.forEach((k,idx)=>{first=true;nova();const texto=lmTexto(k,d);let antesAss=false;
  texto.split('\n').forEach(l=>{if(/^# /.test(l)){const t=limpa(l.slice(2));const tw=larg(t,FB,14);precisa(30);pg.drawText(t,{x:ML+(largura-tw)/2,y,size:14,font:FB,color:preto});y-=30;return}
   if(!l.trim()){antesAss=false;y-=8;return}
   if(/, \d{1,2} de [a-zç]+ de \d{4}\.$/.test(l)&&l.length<90){paragrafo(l,{centro:true});return}
   if(/^_{6,}/.test(l)){precisa(LH*4);antesAss=true;paragrafo(l,{centro:true});return}
   if(antesAss&&!/^(Testemunhas)/.test(l)){paragrafo(l,{centro:true});return}
   antesAss=false;paragrafo(l,{recuo:/^\*\*[A-ZÇÃÉÍÓÚ]/.test(l)||/^Testemunhas/.test(l)?0:2*cm})})});
 return pdf.save()}
async function lmGerar(acao,b){const t0=b.textContent;b.disabled=true;b.textContent='Gerando...';try{const bytes=await lmPDF();const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));const d=LM.doc;
  const nome=(lmDocsSel(d).length>1?'Documentos':LM_DOCS[lmDocsSel(d)[0]])+' '+(lmTitular(d)||'cliente')+'.pdf';
  if(acao==='baixar'){const a=document.createElement('a');a.href=url;a.download=nome.replace(/[\\/:*?"<>|]+/g,' ');document.body.appendChild(a);a.click();a.remove()}
  else{let f=document.getElementById('frLm');if(f)f.remove();f=document.createElement('iframe');f.id='frLm';f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0';f.src=url;f.onload=()=>{try{f.contentWindow.focus();f.contentWindow.print()}catch(e){window.open(url,'_blank')}};document.body.appendChild(f)}
  setTimeout(()=>URL.revokeObjectURL(url),120000);await lmSalvarDoc('Gerado',true);toast('Documento gerado e salvo na nuvem')}catch(e){toast(e.message||String(e))}finally{b.disabled=false;b.textContent=t0}}
function lmWord(){const d=LM.doc;const corpo=lmDocsSel(d).map(k=>lmTexto(k,d).split('\n').map(l=>{if(/^# /.test(l))return `<p align="center" style="text-align:center"><b>${esc(l.slice(2))}</b></p>`;if(!l.trim())return '<p>&nbsp;</p>';const h=esc(l).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');return /^_{6,}/.test(l)?`<p align="center" style="text-align:center">${h}</p>`:`<p style="text-align:justify">${h}</p>`}).join('')).join('<br clear="all" style="page-break-before:always">');
 const html=`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><style>body{font-family:"Times New Roman";font-size:12pt;line-height:1.5}p{margin:0 0 6pt}@page{margin:2.5cm 2cm 2cm 3cm}</style></head><body>${corpo}</body></html>`;
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['﻿'+html],{type:'application/msword'}));a.download=((lmTitular(d)||'documento')+' LexMandato.doc').replace(/[\\/:*?"<>|]+/g,' ');document.body.appendChild(a);a.click();a.remove()}

/* ============ Modelo em Word (.docx) com a identidade do escritório preservada ============ */
const LM_DX_QUAL=/^(cliente\.(nome|cpf|cnpj|rg|endereco_completo|qualificacao)|representacao\.texto)$/;
const LM_DX='DOCX1:',W_NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
function lmEhDocx(m){return !!(m&&typeof m.texto==='string'&&m.texto.startsWith(LM_DX))}
function lmDxDados(m){if(!m._dx){try{m._dx=JSON.parse(m.texto.slice(LM_DX.length))}catch(e){m._dx={b64:'',mapa:[],pars:[]}}}return m._dx}
function lmB64(buf){let s='';const u=new Uint8Array(buf);for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s)}
function lmDeB64(b){const s=atob(b);const u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u}
async function lmDxAbrir(u8){const JS=await lmCarregarScript('assets/jszip.min.js','JSZip');let zip;try{zip=await JS.loadAsync(u8)}catch(e){throw new Error('Não foi possível abrir o arquivo. Confira se é um Word no formato .docx.')}const f=zip.file('word/document.xml');if(!f)throw new Error('Este arquivo não é um Word válido (.docx).');const dom=new DOMParser().parseFromString(await f.async('string'),'application/xml');return {zip,dom}}
function lmDxPars(dom){return [...dom.getElementsByTagNameNS(W_NS,'p')].map(p=>[...p.getElementsByTagNameNS(W_NS,'t')].map(t=>t.textContent).join(''))}
const LM_MESES_RE='(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)';
function lmDxDetectar(pars){const M=[],add=(de,campo,uma)=>{de=String(de||'').trim();if(de.length<2||M.some(x=>x.de===de))return;M.push({de,campo,uma:!!uma})};const T=pars.join('\n');
 let i=pars.findIndex(p=>/^\s*(OUTORGANTE|CONTRATANTE|DECLARANTE|MANDANTE)/i.test(p)&&p.length>40);if(i<0)i=pars.findIndex(p=>/\d{3}\.\d{3}\.\d{3}-\d{2}/.test(p));const q=i>=0?pars[i]:'';
 if(q){const m=q.match(/^\s*(?:OUTORGANTE|CONTRATANTE|DECLARANTE|MANDANTE)S?\s*[:\-–]?\s*([^,]{5,80}),/i)||q.match(/^\s*(?:Eu,\s*)?([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú' ]{5,80}),/);if(m)add(m[1],'cliente.nome');
  const nac=q.match(/\b(brasileir[oa]|portugu[eê]sa?|argentin[oa]|paraguai[oa]|uruguai[oa]|venezuelan[oa]|haitian[oa]|italian[oa]|alem[ãa]o?)\b/i);if(nac)add(nac[1],'cliente.nacionalidade',true);
  const ec=q.match(/\b(solteir[oa]|casad[oa]|divorciad[oa]|viúv[oa]|separad[oa] judicialmente|separad[oa]|em união estável|convivente)\b/i);
  if(ec){add(ec[1],'cliente.estado_civil',true);const pr=q.slice(q.indexOf(ec[1])+ec[1].length).match(/^,\s*([^,]{3,40}),/);if(pr&&!/portador|inscrit|residente|\bRG\b|CPF|nascid/i.test(pr[1]))add(pr[1],'cliente.profissao',true)}
  const rg=q.match(/(?:\bRG\b|identidade|\bC\.?I\.?\b)[^0-9]{0,25}([\d.\-]{5,14}[\dxX]?(?:\s+[A-Z]{2,4}\/[A-Z]{2})?)/);if(rg)add(rg[1],'cliente.rg',true);
  const en=q.match(/(?:residente e domiciliad[oa]|domiciliad[oa]|com sede|com endereço)\s+(?:na|no|à|a|em)\s+(.+?)(?:\.\s*$|, neste ato|, e-mail|, telefone|;|$)/i);if(en)add(en[1].replace(/\.$/,''),'cliente.endereco_completo',true)}
 const cpf=T.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/);if(cpf)add(cpf[0],'cliente.cpf');const cnpj=q.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);if(cnpj)add(cnpj[0],'cliente.cnpj');
 const corta=v=>{v=String(v).trim().split(/\.\s+(?=[A-ZÀ-Ú])/)[0].trim();return /\b[A-ZÀ-Ú]\.?$/.test(v)?v:v.replace(/[.,;]+$/,'')};
 const pc=T.match(/em face (?:de|da|do|dos|das|à|ao)\s+([A-ZÀ-Ú][^,;\n]{2,70})/);if(pc)add(corta(pc[1]),'parte_contraria',true);
 const ac=T.match(/\b((?:ação|reclamação trabalhista|execução|cumprimento de sentença|mandado de segurança|habeas corpus|exceção de pré-executividade)(?: de| por| para)?[^,.;\n]{0,60})/i);
 if(ac&&!/ações/i.test(ac[1]))add(ac[1].split(/\s+(?:em face|contra|em desfavor|movida|proposta|ajuizada)\b/)[0].trim(),'acao',true);
 const pr=T.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/);if(pr)add(pr[0],'processo');
 const dt=T.match(new RegExp("[A-ZÀ-Ú][\\wÀ-ú' ]{2,40}(?:\\s*[\\/\\-]\\s*[A-Z]{2}|\\s*\\([A-Z]{2}\\))?,\\s*\\d{1,2}º? de "+LM_MESES_RE+" de \\d{4}","i"));
 if(dt)add(dt[0],'local_data');else{const d2=T.match(new RegExp("\\d{1,2}º? de "+LM_MESES_RE+" de \\d{4}","i"));if(d2)add(d2[0],'data')}
 return M}
function lmDxValor(s,v){let x=v[s.campo];if(x==null||x==='')return '{{'+s.campo+'}}';x=String(x);
 if(/[A-ZÀ-Ú]/.test(s.de)&&s.de===s.de.toUpperCase())x=x.toUpperCase();
 else if(/^[a-zà-ú]/.test(s.de)&&/^[A-ZÀ-Ú][a-zà-ú]/.test(x))x=x.charAt(0).toLowerCase()+x.slice(1);
 return x}
function lmDxSubs(dx,d){const v=lmVars(d);return dx.mapa.filter(s=>s.de&&s.campo).map((s,i)=>({de:s.de,uma:s.uma,tok:''+i+'',valor:lmDxValor(s,v),campo:s.campo})).sort((a,b)=>b.de.length-a.de.length)}
function lmDxTrocaTxt(pars,subs,fmt){const feito={};let P=pars.map(p=>{subs.forEach(s=>{if(s.uma){if(feito[s.tok])return;const i=p.indexOf(s.de);if(i>=0){p=p.slice(0,i)+s.tok+p.slice(i+s.de.length);feito[s.tok]=1}}else p=p.split(s.de).join(s.tok)});return p});return P.map(p=>{subs.forEach(s=>{p=p.split(s.tok).join(fmt(s))});return p})}
function lmDxTexto(dx,d){const subs=lmDxSubs(dx,d),pt=lmGenPares(d,'tudo'),pq=lmGenPares(d,'qual');
 const brutos=lmDxTrocaTxt(dx.pars||[],subs,s=>s.valor).map((linha,i)=>{const orig=(dx.pars||[])[i]||'';const temCliente=subs.some(s=>LM_DX_QUAL.test(s.campo)&&s.de.length>7&&orig.includes(s.de));
  let t=lmConc(linha,d);pt.forEach(([a,b])=>{t=t.replace(a,b)});if(temCliente)pq.forEach(([a,b])=>{t=t.replace(a,b)});return t});
 const P=brutos.filter((p,i,a)=>p.trim()||(i>0&&a[i-1].trim()));const k=P.findIndex(p=>p.trim());if(k>=0&&P[k].length<70&&P[k]===P[k].toUpperCase())P[k]='# '+P[k].trim();return P.join('\n')}
function lmDxTrocarPar(p,lista){let feitas=0;lista.forEach(s=>{if(s.ref&&s.ref.uma&&s.ref.feito)return;let from=0,g=0;while(g++<40){const ts=[...p.getElementsByTagNameNS(W_NS,'t')];const full=ts.map(t=>t.textContent).join('');const idx=full.indexOf(s.alvo,from);if(idx<0)break;const fim=idx+s.alvo.length;let a=0,posto=false;
   ts.forEach(t=>{const tx=t.textContent,b=a+tx.length;if(b>idx&&a<fim){const ini=Math.max(0,idx-a),ate=Math.min(tx.length,fim-a);t.textContent=tx.slice(0,ini)+(posto?'':s.por)+tx.slice(ate);posto=true;t.setAttribute('xml:space','preserve')}a=b});
   feitas++;from=idx+s.por.length;if(s.ref&&s.ref.uma){s.ref.feito=true;break}}});return feitas}
/* troca por expressão regular mantendo a formatação de cada pedaço do parágrafo */
function lmDxConc(p,pares){if(!pares.length)return;const ts=[...p.getElementsByTagNameNS(W_NS,'t')];const full=ts.map(t=>t.textContent).join('');const lista=[];
 pares.forEach(([re,por])=>{const rx=new RegExp(re.source,re.flags.includes('g')?re.flags:re.flags+'g');let m,g=0;while((m=rx.exec(full))&&g++<40){const al=m[0],pr=al.replace(new RegExp(re.source,re.flags.replace('g','')),por);if(pr!==al&&!lista.some(x=>x.alvo===al))lista.push({alvo:al,por:pr});if(m[0]==='')break}});
 if(lista.length)lmDxTrocarPar(p,lista.sort((a,b)=>b.alvo.length-a.alvo.length))}
async function lmDxGerar(m,d){const dx=lmDxDados(m);const {zip,dom}=await lmDxAbrir(lmDeB64(dx.b64));const subs=lmDxSubs(dx,d);const ps=[...dom.getElementsByTagNameNS(W_NS,'p')];
 const dosDados=subs.filter(s=>LM_DX_QUAL.test(s.campo)&&s.de.length>7);
 const temCliente=ps.map(p=>{const t=[...p.getElementsByTagNameNS(W_NS,'t')].map(x=>x.textContent).join('');return dosDados.some(s=>t.includes(s.de))});
 ps.forEach(p=>lmDxTrocarPar(p,subs.map(s=>({alvo:s.de,por:s.tok,ref:s}))));ps.forEach(p=>lmDxTrocarPar(p,subs.map(s=>({alvo:s.tok,por:s.valor}))));
 const pt=lmConcPares(d).concat(lmGenPares(d,'tudo')),pq=lmGenPares(d,'qual');
 ps.forEach((p,i)=>{lmDxConc(p,pt);if(temCliente[i])lmDxConc(p,pq)});
 zip.file('word/document.xml',new XMLSerializer().serializeToString(dom));return zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',compression:'DEFLATE'})}
async function lmDxBaixar(b){const d=LM.doc,t0=b.textContent;b.disabled=true;b.textContent='Gerando...';try{let n=0;for(const k of lmDocsSel(d)){const m=lmModeloDe(k,d);if(!lmEhDocx(m))continue;const blob=await lmDxGerar(m,d);const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(LM_DOCS[k]+' '+(lmTitular(d)||'cliente')+'.docx').replace(/[\\/:*?"<>|]+/g,' ');document.body.appendChild(a);a.click();a.remove();n++;await new Promise(r=>setTimeout(r,400))}
  await lmSalvarDoc('Gerado',true);toast(n+(n===1?' documento gerado':' documentos gerados')+' no modelo do escritório')}catch(e){toast(e.message||String(e))}finally{b.disabled=false;b.textContent=t0}}
function lmDxFalta(){const dx=LM.mod.dx,T=(dx.pars||[]).join('\n'),tem=k=>dx.mapa.some(x=>x.campo===k&&x.de),A=[];
 if(!tem('cliente.nome')&&!tem('cliente.qualificacao'))A.push('O nome do cliente não está ligado a nenhum campo. Marque o nome que está escrito no modelo.');
 if(!tem('cliente.cpf')&&!tem('cliente.cnpj')&&!tem('cliente.qualificacao'))A.push('O CPF ou o CNPJ não está ligado a nenhum campo.');
 if(!tem('local_data')&&!tem('data'))A.push('A data não está ligada a nenhum campo: o documento sairá sempre com a data escrita no arquivo.');
 if(LM.mod.tipo==='procuracao'&&!tem('poderes.texto')&&!tem('poderes.lista'))A.push('Os poderes estão fixos no texto do modelo. Marque o trecho dos poderes e escolha Poderes selecionados, ou só a lista de poderes especiais, para que a escolha feita na tela entre no documento.');
 if(!tem('finalidade.texto')&&!tem('acao')&&/\b(ação|reclamação|execução|benefício)\b/i.test(T))A.push('A finalidade, ou o tipo de ação, parece estar fixa no texto. Marque esse trecho para que mude a cada cliente.');
 if(!tem('parte_contraria')&&/em face (?:de|da|do)/i.test(T))A.push('A parte contrária parece estar fixa no texto. Marque esse trecho.');
 if(!tem('advogados.qualificacao')&&!tem('advogados.nomes'))A.push('Os advogados estão fixos no modelo. Isso é normal quando sempre são os mesmos; se mudar conforme o caso, marque o trecho e escolha Qualificação dos advogados.');
 return A}
function lmDxEditor(){const dx=LM.mod.dx;const nomeC=k=>(LM_CAMPOS.find(c=>c[0]===k)||[0,k])[1];const falta=lmDxFalta();
 return `<div class="notice" style="margin-top:14px"><b>Arquivo: ${esc(dx.arquivo||'modelo.docx')}.</b> A fonte, o cabeçalho, o rodapé, o timbre e a marca d'água deste arquivo são mantidos. O sistema troca só os trechos da lista abaixo pelos dados do cadastro.</div>
 ${falta.length?`<div class="notice" style="margin-top:10px"><b>Confira antes de salvar:</b><ul style="margin:6px 0 0 18px;padding:0">${falta.map(a=>`<li>${esc(a)}</li>`).join('')}</ul></div>`:'<div class="notice ok" style="margin-top:10px">Os dados essenciais estão ligados ao cadastro.</div>'}
 <div class="lmrev"><div><b>Campos reconhecidos</b><p class="sub" style="margin:4px 0 10px">Confira cada linha. O trecho da esquerda é o texto que está hoje no seu modelo. Ele será trocado pelo campo da direita.</p>
 ${dx.mapa.map((s,i)=>`<div class="lmcard" style="margin-top:8px;padding:10px"><div class="fields" style="grid-template-columns:1.4fr 1fr"><div class="f"><label>Trecho do modelo</label><input value="${esc(s.de)}" data-rs="0" oninput="LM.mod.dx.mapa[${i}].de=this.value;lmModPreviewDeb()"></div><div class="f"><label>Campo</label><select onchange="LM.mod.dx.mapa[${i}].campo=this.value;lmModPreviewDeb()">${LM_CAMPOS.map(([k,n])=>`<option value="${k}" ${s.campo===k?'selected':''}>${n}</option>`).join('')}</select></div></div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px"><label class="chk" style="font-size:12px"><input type="checkbox" ${s.uma?'checked':''} onchange="LM.mod.dx.mapa[${i}].uma=this.checked;lmModPreviewDeb()"> Trocar só a primeira vez que aparece</label><button class="btn3" style="color:var(--bad)" onclick="LM.mod.dx.mapa.splice(${i},1);render()">Remover</button></div></div>`).join('')||'<p class="sub">Nenhum campo reconhecido. Adicione manualmente.</p>'}
 <div class="acts" style="justify-content:flex-start"><button class="btn2" onclick="lmDxAdd()">+ Adicionar campo</button><button class="btn3" onclick="LM.semDx=true;LM.mod.dx=null;toast('Envie o arquivo de novo para converter em texto editável.');render()">Prefiro converter em texto editável</button></div>
 <p class="sub">Para adicionar: selecione com o mouse um trecho no texto ao lado e clique em Adicionar campo. Cada trecho precisa estar dentro de um único parágrafo. Para usar os poderes escolhidos na tela, adicione o trecho dos poderes do seu modelo e escolha o campo Poderes selecionados.</p></div>
 <div><div class="sub" style="margin-bottom:4px">Seu modelo, com os campos marcados</div><div class="papel" id="lmDxOrig" style="max-height:38vh"></div><div class="sub" style="margin:10px 0 4px">Teste com dados fictícios</div><div class="papel" id="lmModPrev" style="max-height:38vh"></div></div></div>`}
function lmDxAdd(){const sel=String(window.getSelection?window.getSelection():'').replace(/\s+/g,' ').trim();const dx=LM.mod.dx;if(sel&&!(dx.pars||[]).some(p=>p.includes(sel))){toast('O trecho selecionado passa de um parágrafo ou não foi encontrado. Selecione um trecho menor.');return}dx.mapa.push({de:sel,campo:'cliente.nome',uma:false});render();toast(sel?'Trecho adicionado. Escolha o campo.':'Digite o trecho do modelo e escolha o campo.')}
function lmDxPreview(){const dx=LM.mod.dx;const d=lmDemo();const subs=lmDxSubs(dx,d);const nomeC=k=>(LM_CAMPOS.find(c=>c[0]===k)||[0,k])[1];
 const o=$('#lmDxOrig');if(o)o.innerHTML=lmDxTrocaTxt((dx.pars||[]).map(esc),subs.map(s=>Object.assign({},s,{de:esc(s.de)})),s=>'<mark title="'+esc(s.de)+'">'+esc(nomeC(s.campo))+'</mark>').filter(p=>p.trim()).map(p=>'<p>'+p+'</p>').join('');
 const el=$('#lmModPrev');if(el)el.innerHTML=lmHTML(lmDxTexto(dx,d))}
