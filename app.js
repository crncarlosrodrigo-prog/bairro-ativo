/* Bairro Ativo – PWA de cursos, eventos e caixa para associações de moradores.
   Dados guardados apenas no aparelho (IndexedDB, com localStorage como reserva). */
'use strict';

const ASSOC_PADRAO = 'Associação Comunitária Santo Inácio de Loyola';
const VERSAO_DADOS = 1;
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const CAT_ENTRADA = ['Bazar', 'Doação', 'Evento', 'Outra entrada'];
const CAT_SAIDA = ['Luz', 'Água', 'Material', 'Outra saída'];

/* ================= armazenamento ================= */
const Banco = (() => {
  const NOME = 'bairro-ativo', LOJA = 'estado', CHAVE = 'principal', LS = 'bairro-ativo-estado';
  let dbp = null;
  function abrir() {
    if (dbp) return dbp;
    dbp = new Promise((ok, falha) => {
      if (!('indexedDB' in window)) return falha(new Error('sem indexedDB'));
      const req = indexedDB.open(NOME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(LOJA);
      req.onsuccess = () => ok(req.result);
      req.onerror = () => falha(req.error);
    });
    return dbp;
  }
  async function ler() {
    try {
      const db = await abrir();
      const v = await new Promise((ok, falha) => {
        const r = db.transaction(LOJA).objectStore(LOJA).get(CHAVE);
        r.onsuccess = () => ok(r.result); r.onerror = () => falha(r.error);
      });
      if (v) return v;
    } catch (e) { /* usa a reserva */ }
    try { const t = localStorage.getItem(LS); return t ? JSON.parse(t) : null; } catch (e) { return null; }
  }
  async function gravar(estado) {
    const copia = JSON.parse(JSON.stringify(estado));
    try {
      const db = await abrir();
      await new Promise((ok, falha) => {
        const tx = db.transaction(LOJA, 'readwrite');
        tx.objectStore(LOJA).put(copia, CHAVE);
        tx.oncomplete = ok; tx.onerror = () => falha(tx.error);
      });
    } catch (e) { /* segue para a reserva */ }
    try { localStorage.setItem(LS, JSON.stringify(copia)); } catch (e) { /* sem espaço ou bloqueado */ }
  }
  return { ler, gravar };
})();

function estadoVazio() {
  return { versao: VERSAO_DADOS, config: { associacao: ASSOC_PADRAO, ultimoBackup: null },
    cursos: [], turmas: [], alunos: [], matriculas: [], eventos: [], lancamentos: [] };
}
let E = estadoVazio();

async function salvar() { E.atualizadoEm = new Date().toISOString(); await Banco.gravar(E); }

/* ================= utilidades ================= */
const $ = s => document.querySelector(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const dataBR = iso => iso ? iso.split('-').reverse().join('/') : '—';
const anoDe = iso => iso ? Number(iso.slice(0, 4)) : null;
const mesDe = iso => iso ? iso.slice(0, 7) : null;
const reais = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const nomeMes = ym => { const [a, m] = ym.split('-').map(Number); return `${MESES[m - 1]} de ${a}`; };
const nomeMesTitulo = ym => { const n = nomeMes(ym); return n.charAt(0).toUpperCase() + n.slice(1); };
const somaMes = (ym, n) => { let [a, m] = ym.split('-').map(Number); m += n; while (m < 1) { m += 12; a--; } while (m > 12) { m -= 12; a++; } return `${a}-${String(m).padStart(2, '0')}`; };
const ordenarNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');
const so = s => String(s || '').replace(/\D/g, '');

function mascararCPF(cpf) {
  const d = so(cpf);
  if (d.length !== 11) return d ? '***' : '';
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}
function formatarCPF(cpf) {
  const d = so(cpf).slice(0, 11);
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
}
function cpfValido(cpf) {
  const d = so(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = n => { let s = 0; for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}
function formatarFone(f) {
  const d = so(f).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
function lerValor(txt) {
  const t = String(txt || '').trim().replace(/[R$\s]/g, '');
  if (!t) return NaN;
  const norm = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  return Number(norm);
}

/* consultas */
const curso = id => E.cursos.find(c => c.id === id);
const turma = id => E.turmas.find(t => t.id === id);
const aluno = id => E.alunos.find(a => a.id === id);
const evento = id => E.eventos.find(e => e.id === id);
const turmasDoCurso = cid => E.turmas.filter(t => t.cursoId === cid).sort((a, b) => (b.inicio || '').localeCompare(a.inicio || ''));
const alunosDaTurma = tid => E.matriculas.filter(m => m.turmaId === tid).map(m => aluno(m.alunoId)).filter(Boolean).sort(ordenarNome);
const turmasDoAluno = aid => E.matriculas.filter(m => m.alunoId === aid).map(m => turma(m.turmaId)).filter(Boolean);
const participantes = ev => ev.modo === 'lista' ? (ev.nomes || []).length : (Number(ev.quantidade) || 0);
function situacaoTurma(t) {
  const h = hoje();
  if (t.inicio && t.inicio > h) return { txt: 'Vai começar', cls: 'cinza' };
  if (t.fim && t.fim < h) return { txt: 'Encerrada', cls: 'cinza' };
  return { txt: 'Em andamento', cls: '' };
}
function turmaNoAno(t, ano) {
  const ini = anoDe(t.inicio) ?? anoDe(t.fim), fim = anoDe(t.fim) ?? ini;
  return ini !== null && ini <= ano && fim >= ano;
}
function totaisMes(ym) {
  const ls = E.lancamentos.filter(l => mesDe(l.data) === ym);
  const ent = ls.filter(l => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0);
  const sai = ls.filter(l => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0);
  return { ls, ent, sai, saldo: ent - sai };
}

/* ================= interface: aviso, modal, confirmação ================= */
let tAviso;
function aviso(msg) {
  const el = $('#aviso'); el.textContent = msg; el.hidden = false;
  clearTimeout(tAviso); tAviso = setTimeout(() => { el.hidden = true; }, 2600);
}
function abrirModal(html, aoMontar) {
  const m = $('#modal');
  m.innerHTML = html; m.hidden = false; $('#fundoModal').hidden = false;
  document.body.style.overflow = 'hidden';
  m.querySelectorAll('[data-fechar]').forEach(b => b.addEventListener('click', fecharModal));
  if (aoMontar) aoMontar(m);
  const f = m.querySelector('input:not([type=radio]):not([type=checkbox]), select, textarea');
  if (f && !f.dataset.semFoco) setTimeout(() => f.focus(), 60);
}
function fecharModal() {
  $('#modal').hidden = true; $('#fundoModal').hidden = true; $('#modal').innerHTML = '';
  document.body.style.overflow = '';
}
function confirmar(titulo, texto, rotulo = 'Excluir') {
  return new Promise(ok => {
    abrirModal(`<h2>${esc(titulo)}</h2><p class="ajuda">${esc(texto)}</p>
      <div class="btn-linha"><button class="btn sec" data-r="0">Cancelar</button><button class="btn coral" data-r="1">${esc(rotulo)}</button></div>`,
    m => m.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => { fecharModal(); ok(b.dataset.r === '1'); })));
  });
}
const campo = (id, rotulo, valor = '', tipo = 'text', extra = '') =>
  `<div class="campo"><label for="${id}">${rotulo}</label><input id="${id}" name="${id}" type="${tipo}" value="${esc(valor)}" ${extra}><div class="erro"></div></div>`;
function erroCampo(form, nome, msg) {
  const c = form.querySelector(`[name="${nome}"]`).closest('.campo');
  c.classList.add('invalido'); c.querySelector('.erro').textContent = msg;
  c.querySelector('input,select,textarea').focus();
}
function limparErros(form) { form.querySelectorAll('.campo.invalido').forEach(c => c.classList.remove('invalido')); }

/* ================= roteamento ================= */
const rotas = {};
function rota(nome, fn) { rotas[nome] = fn; }
function ir(h) { if (location.hash === h) render(); else location.hash = h; }
function render() {
  const partes = (location.hash || '#/inicio').slice(2).split('/');
  const nome = partes[0] || 'inicio';
  const fn = rotas[nome] || rotas.inicio;
  const r = fn(partes[1]);
  if (!r) return;
  $('#tituloTela').textContent = r.titulo;
  $('#subtituloTela').textContent = r.subtitulo ?? E.config.associacao;
  const btn = $('#btnVoltar');
  btn.hidden = !r.voltar; btn.onclick = () => ir(r.voltar);
  document.querySelectorAll('.abas a').forEach(a => a.classList.toggle('ativa', a.dataset.aba === r.aba));
  $('#app').innerHTML = r.html;
  if (r.depois) r.depois($('#app'));
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', render);

/* ================= INÍCIO ================= */
rota('inicio', () => {
  const ano = new Date().getFullYear(), ym = mesDe(hoje());
  const ativas = E.turmas.filter(t => situacaoTurma(t).txt === 'Em andamento');
  const evAno = E.eventos.filter(e => anoDe(e.data) === ano);
  const partAno = evAno.reduce((s, e) => s + participantes(e), 0);
  const tm = totaisMes(ym);
  const semBackup = E.config.ultimoBackup ? (Date.now() - new Date(E.config.ultimoBackup)) / 864e5 > 30 : (E.alunos.length + E.eventos.length + E.lancamentos.length) > 0;
  return {
    titulo: 'Bairro Ativo', aba: 'inicio',
    html: `
      <div class="blocos">
        <a class="bloco" href="#/cursos" style="text-decoration:none"><div class="v">${ativas.length}</div><div class="l">turmas em andamento</div></a>
        <a class="bloco gold" href="#/alunos" style="text-decoration:none"><div class="v">${E.alunos.length}</div><div class="l">alunos cadastrados</div></a>
        <a class="bloco coral" href="#/eventos" style="text-decoration:none"><div class="v">${evAno.length}</div><div class="l">eventos em ${ano}</div></a>
        <a class="bloco" href="#/eventos" style="text-decoration:none"><div class="v">${partAno}</div><div class="l">participações em ${ano}</div></a>
        <a class="bloco largo ${tm.saldo < 0 ? 'coral' : ''}" href="#/caixa" style="text-decoration:none"><div class="v">${reais(tm.saldo)}</div><div class="l">saldo de ${nomeMes(ym)}</div></a>
      </div>
      <p class="secao">Lançar agora</p>
      <div class="btn-linha">
        <button class="btn" id="qAluno">+ Aluno</button>
        <button class="btn" id="qEvento">+ Evento</button>
      </div>
      <div class="btn-linha mt">
        <button class="btn sec" id="qEntrada">+ Entrada</button>
        <button class="btn sec" id="qSaida">+ Saída</button>
      </div>
      ${semBackup ? `<div class="card mt" style="border-color:var(--gold);background:var(--gold-soft)"><b>Faça uma cópia de segurança</b><p style="font-size:14px;margin:4px 0 10px">Os dados ficam só neste celular. Guarde uma cópia para não perder nada se trocar de aparelho.</p><a class="btn sec" href="#/relatorios">Ir para cópia de segurança</a></div>` : ''}
      <p class="rodape-nota">Os dados ficam guardados somente neste celular.</p>`,
    depois: () => {
      $('#qAluno').onclick = () => formAluno(null, null);
      $('#qEvento').onclick = () => formEvento(null);
      $('#qEntrada').onclick = () => formLancamento(null, 'entrada');
      $('#qSaida').onclick = () => formLancamento(null, 'saida');
    }
  };
});

/* ================= CURSOS ================= */
function segmentoCursos(ativo) {
  return `<div class="segmento"><button data-ir="#/cursos" class="${ativo === 'cursos' ? 'ativo' : ''}">Cursos</button><button data-ir="#/alunos" class="${ativo === 'alunos' ? 'ativo' : ''}">Alunos</button></div>`;
}
function ligarSegmento(r) { r.querySelectorAll('[data-ir]').forEach(b => b.onclick = () => ir(b.dataset.ir)); }

rota('cursos', () => {
  const cs = [...E.cursos].sort(ordenarNome);
  return {
    titulo: 'Cursos', aba: 'cursos',
    html: segmentoCursos('cursos') + (cs.length ? `<ul class="lista">${cs.map(c => {
      const ts = turmasDoCurso(c.id), and = ts.filter(t => situacaoTurma(t).txt === 'Em andamento').length;
      const nAl = new Set(E.matriculas.filter(m => ts.some(t => t.id === m.turmaId)).map(m => m.alunoId)).size;
      return `<li><a class="item" href="#/curso/${c.id}"><div class="txt"><div class="n">${esc(c.nome)}</div><div class="d">${ts.length} turma(s) · ${nAl} aluno(s)</div>${and ? `<span class="etiqueta">${and} em andamento</span>` : ''}</div><span class="seta">›</span></a></li>`;
    }).join('')}</ul>` : `<div class="vazio"><b>Nenhum curso ainda</b>Cadastre os cursos que a associação oferece, como dança, costura ou panificação.</div>`) +
      `<div class="acoes"><button class="btn" id="novoCurso">+ Novo curso</button></div>`,
    depois: r => { ligarSegmento(r); $('#novoCurso').onclick = () => formCurso(null); }
  };
});

function formCurso(id) {
  const c = id ? curso(id) : null;
  abrirModal(`<h2>${c ? 'Editar curso' : 'Novo curso'}</h2><form id="f">
    ${campo('nome', 'Nome do curso', c?.nome, 'text', 'placeholder="Ex.: Panificação" autocomplete="off"')}
    <div class="campo"><label for="descricao">Observação <small>(opcional)</small></label><textarea id="descricao" name="descricao" placeholder="Ex.: professor cedido pelo SENAI">${esc(c?.descricao)}</textarea></div>
    <div class="btn-linha"><button type="button" class="btn sec" data-fechar>Cancelar</button><button class="btn">Salvar</button></div></form>`,
  m => m.querySelector('#f').onsubmit = async ev => {
    ev.preventDefault(); const f = ev.target; limparErros(f);
    const nome = f.nome.value.trim();
    if (!nome) return erroCampo(f, 'nome', 'Digite o nome do curso.');
    if (E.cursos.some(x => x.id !== id && x.nome.toLowerCase() === nome.toLowerCase())) return erroCampo(f, 'nome', 'Já existe um curso com esse nome.');
    if (c) Object.assign(c, { nome, descricao: f.descricao.value.trim() });
    else E.cursos.push({ id: uid(), nome, descricao: f.descricao.value.trim(), criadoEm: hoje() });
    await salvar(); fecharModal(); aviso(c ? 'Curso atualizado' : 'Curso cadastrado'); render();
  });
}

rota('curso', id => {
  const c = curso(id); if (!c) { ir('#/cursos'); return null; }
  const ts = turmasDoCurso(id);
  return {
    titulo: c.nome, subtitulo: 'Curso', aba: 'cursos', voltar: '#/cursos',
    html: `${c.descricao ? `<div class="card">${esc(c.descricao)}</div>` : ''}
      <p class="secao">Turmas</p>
      ${ts.length ? `<ul class="lista">${ts.map(t => { const s = situacaoTurma(t); return `<li><a class="item" href="#/turma/${t.id}"><div class="txt"><div class="n">${esc(t.nome)}</div><div class="d">${dataBR(t.inicio)} a ${dataBR(t.fim)}${t.horario ? ' · ' + esc(t.horario) : ''}</div><span class="etiqueta ${s.cls}">${s.txt}</span></div><span class="num">${alunosDaTurma(t.id).length}</span></a></li>`; }).join('')}</ul>`
        : `<div class="vazio"><b>Nenhuma turma</b>Crie uma turma com a data de início e de fim.</div>`}
      <div class="acoes"><button class="btn" id="novaTurma">+ Nova turma</button>
      <div class="btn-linha mt"><button class="btn sec" id="editar">Editar curso</button><button class="btn perigo" id="excluir">Excluir</button></div></div>`,
    depois: () => {
      $('#novaTurma').onclick = () => formTurma(null, id);
      $('#editar').onclick = () => formCurso(id);
      $('#excluir').onclick = async () => {
        if (ts.length) return aviso('Exclua as turmas deste curso antes.');
        if (await confirmar('Excluir curso?', `O curso "${c.nome}" será apagado.`)) {
          E.cursos = E.cursos.filter(x => x.id !== id); await salvar(); aviso('Curso excluído'); ir('#/cursos');
        }
      };
    }
  };
});

function formTurma(id, cursoId) {
  const t = id ? turma(id) : null;
  const n = turmasDoCurso(cursoId).length + 1;
  abrirModal(`<h2>${t ? 'Editar turma' : 'Nova turma'}</h2><form id="f">
    ${campo('nome', 'Nome da turma', t?.nome ?? `Turma ${n}`, 'text', 'autocomplete="off"')}
    <div class="duas">${campo('inicio', 'Início', t?.inicio ?? hoje(), 'date')}${campo('fim', 'Fim', t?.fim, 'date')}</div>
    ${campo('horario', 'Dias e horário <small>(opcional)</small>', t?.horario, 'text', 'placeholder="Ex.: terças, 14h"')}
    ${campo('professor', 'Professor(a) <small>(opcional)</small>', t?.professor, 'text', 'placeholder="Ex.: SENAI"')}
    <div class="btn-linha"><button type="button" class="btn sec" data-fechar>Cancelar</button><button class="btn">Salvar</button></div></form>`,
  m => m.querySelector('#f').onsubmit = async ev => {
    ev.preventDefault(); const f = ev.target; limparErros(f);
    const d = { nome: f.nome.value.trim(), inicio: f.inicio.value, fim: f.fim.value, horario: f.horario.value.trim(), professor: f.professor.value.trim() };
    if (!d.nome) return erroCampo(f, 'nome', 'Digite o nome da turma.');
    if (!d.inicio) return erroCampo(f, 'inicio', 'Informe a data de início.');
    if (d.fim && d.fim < d.inicio) return erroCampo(f, 'fim', 'O fim precisa ser depois do início.');
    if (t) Object.assign(t, d); else E.turmas.push({ id: uid(), cursoId, ...d });
    await salvar(); fecharModal(); aviso(t ? 'Turma atualizada' : 'Turma criada'); render();
  });
}

rota('turma', id => {
  const t = turma(id); if (!t) { ir('#/cursos'); return null; }
  const c = curso(t.cursoId), als = alunosDaTurma(id), s = situacaoTurma(t);
  return {
    titulo: t.nome, subtitulo: c?.nome, aba: 'cursos', voltar: `#/curso/${t.cursoId}`,
    html: `<div class="card"><dl class="info"><dt>Período</dt><dd>${dataBR(t.inicio)} a ${dataBR(t.fim)}</dd>
      ${t.horario ? `<dt>Horário</dt><dd>${esc(t.horario)}</dd>` : ''}${t.professor ? `<dt>Professor(a)</dt><dd>${esc(t.professor)}</dd>` : ''}
      <dt>Situação</dt><dd>${s.txt}</dd></dl></div>
      <p class="secao">Alunos matriculados (${als.length})</p>
      ${als.length ? `<ul class="lista">${als.map(a => `<li><a class="item" href="#/aluno/${a.id}"><div class="txt"><div class="n">${esc(a.nome)}</div><div class="d">${esc(formatarFone(a.telefone) || 'sem telefone')}${a.bairro ? ' · ' + esc(a.bairro) : ''}</div></div><span class="seta">›</span></a></li>`).join('')}</ul>`
        : `<div class="vazio"><b>Nenhum aluno nesta turma</b>Matricule um aluno novo ou alguém que já está cadastrado.</div>`}
      <div class="acoes"><div class="btn-linha"><button class="btn" id="alunoNovo">+ Aluno novo</button><button class="btn sec" id="alunoExist">Já cadastrado</button></div>
      <div class="btn-linha mt"><button class="btn sec" id="editar">Editar turma</button><button class="btn perigo" id="excluir">Excluir</button></div></div>`,
    depois: () => {
      $('#alunoNovo').onclick = () => formAluno(null, id);
      $('#alunoExist').onclick = () => escolherAlunos(id);
      $('#editar').onclick = () => formTurma(id, t.cursoId);
      $('#excluir').onclick = async () => {
        if (await confirmar('Excluir turma?', `A turma "${t.nome}" e as ${als.length} matrícula(s) dela serão apagadas. Os alunos continuam cadastrados.`)) {
          E.turmas = E.turmas.filter(x => x.id !== id); E.matriculas = E.matriculas.filter(m => m.turmaId !== id);
          await salvar(); aviso('Turma excluída'); ir(`#/curso/${t.cursoId}`);
        }
      };
    }
  };
});

function escolherAlunos(turmaId) {
  const ja = new Set(E.matriculas.filter(m => m.turmaId === turmaId).map(m => m.alunoId));
  const livres = E.alunos.filter(a => !ja.has(a.id)).sort(ordenarNome);
  if (!livres.length) return aviso('Todos os alunos cadastrados já estão nesta turma.');
  abrirModal(`<h2>Matricular alunos</h2><p class="ajuda">Marque quem vai participar desta turma.</p>
    <input class="busca" id="busca" type="search" placeholder="Buscar pelo nome" data-sem-foco="1">
    <div class="checks" id="checks">${livres.map(a => `<label data-n="${esc(a.nome.toLowerCase())}"><input type="checkbox" value="${a.id}"> ${esc(a.nome)}</label>`).join('')}</div>
    <div class="btn-linha mt"><button class="btn sec" data-fechar>Cancelar</button><button class="btn" id="ok">Matricular</button></div>`,
  m => {
    m.querySelector('#busca').oninput = e => { const q = e.target.value.toLowerCase(); m.querySelectorAll('#checks label').forEach(l => l.hidden = !l.dataset.n.includes(q)); };
    m.querySelector('#ok').onclick = async () => {
      const ids = [...m.querySelectorAll('#checks input:checked')].map(i => i.value);
      if (!ids.length) return aviso('Marque pelo menos um aluno.');
      ids.forEach(alunoId => E.matriculas.push({ id: uid(), turmaId, alunoId, data: hoje() }));
      await salvar(); fecharModal(); aviso(`${ids.length} aluno(s) matriculado(s)`); render();
    };
  });
}

function formAluno(id, turmaId) {
  const a = id ? aluno(id) : null;
  const turmasAbertas = E.turmas.filter(t => situacaoTurma(t).txt !== 'Encerrada');
  const escolhaTurma = !a && !turmaId && turmasAbertas.length
    ? `<div class="campo"><label for="turma">Matricular na turma <small>(opcional)</small></label><select id="turma" name="turma"><option value="">Nenhuma por enquanto</option>${turmasAbertas.map(t => `<option value="${t.id}">${esc(curso(t.cursoId)?.nome)} – ${esc(t.nome)}</option>`).join('')}</select></div>` : '';
  abrirModal(`<h2>${a ? 'Editar aluno' : 'Novo aluno'}</h2><form id="f" novalidate>
    ${campo('nome', 'Nome completo', a?.nome, 'text', 'autocomplete="off" autocapitalize="words"')}
    ${campo('telefone', 'Telefone', formatarFone(a?.telefone), 'tel', 'inputmode="numeric" placeholder="(41) 99999-9999"')}
    ${campo('endereco', 'Endereço', a?.endereco, 'text', 'placeholder="Rua e número"')}
    ${campo('bairro', 'Bairro', a?.bairro ?? 'Boqueirão', 'text')}
    ${campo('cpf', 'CPF <small>(opcional)</small>', formatarCPF(a?.cpf), 'text', 'inputmode="numeric" placeholder="000.000.000-00" autocomplete="off"')}
    ${escolhaTurma}
    <p class="ajuda" style="margin:0 0 14px">O CPF aparece escondido nas listas e relatórios. Guarde só se a associação precisar dele.</p>
    <div class="btn-linha"><button type="button" class="btn sec" data-fechar>Cancelar</button><button class="btn">Salvar</button></div></form>`,
  m => {
    const f = m.querySelector('#f');
    f.telefone.oninput = () => { f.telefone.value = formatarFone(f.telefone.value); };
    f.cpf.oninput = () => { f.cpf.value = formatarCPF(f.cpf.value); };
    f.onsubmit = async ev => {
      ev.preventDefault(); limparErros(f);
      const d = { nome: f.nome.value.trim(), telefone: so(f.telefone.value), endereco: f.endereco.value.trim(), bairro: f.bairro.value.trim(), cpf: so(f.cpf.value) };
      if (!d.nome) return erroCampo(f, 'nome', 'Digite o nome do aluno.');
      if (d.telefone && d.telefone.length < 10) return erroCampo(f, 'telefone', 'Telefone incompleto: use DDD + número.');
      if (d.cpf && !cpfValido(d.cpf)) return erroCampo(f, 'cpf', 'CPF inválido. Confira os números ou deixe em branco.');
      if (d.cpf && E.alunos.some(x => x.id !== id && x.cpf === d.cpf)) return erroCampo(f, 'cpf', 'Já existe um aluno com este CPF.');
      let alvo = a;
      if (a) Object.assign(a, d); else { alvo = { id: uid(), ...d, criadoEm: hoje() }; E.alunos.push(alvo); }
      const tId = turmaId || (f.turma && f.turma.value);
      if (!a && tId) E.matriculas.push({ id: uid(), turmaId: tId, alunoId: alvo.id, data: hoje() });
      await salvar(); fecharModal(); aviso(a ? 'Aluno atualizado' : (tId ? 'Aluno cadastrado e matriculado' : 'Aluno cadastrado')); render();
    };
  });
}

rota('alunos', () => {
  const als = [...E.alunos].sort(ordenarNome);
  return {
    titulo: 'Alunos', aba: 'cursos',
    html: segmentoCursos('alunos') + (als.length
      ? `<input class="busca" id="busca" type="search" placeholder="Buscar pelo nome"><ul class="lista" id="lista">${als.map(a => {
        const n = turmasDoAluno(a.id).length;
        return `<li data-n="${esc(a.nome.toLowerCase())}"><a class="item" href="#/aluno/${a.id}"><div class="txt"><div class="n">${esc(a.nome)}</div><div class="d">${n} turma(s)${a.bairro ? ' · ' + esc(a.bairro) : ''}</div></div><span class="seta">›</span></a></li>`;
      }).join('')}</ul>`
      : `<div class="vazio"><b>Nenhum aluno cadastrado</b>Cadastre aqui ou direto dentro de uma turma.</div>`) +
      `<div class="acoes"><button class="btn" id="novo">+ Novo aluno</button></div>`,
    depois: r => {
      ligarSegmento(r); $('#novo').onclick = () => formAluno(null, null);
      const b = $('#busca'); if (b) b.oninput = () => { const q = b.value.toLowerCase(); r.querySelectorAll('#lista li').forEach(li => li.hidden = !li.dataset.n.includes(q)); };
    }
  };
});

rota('aluno', id => {
  const a = aluno(id); if (!a) { ir('#/alunos'); return null; }
  const ts = turmasDoAluno(id);
  return {
    titulo: a.nome, subtitulo: 'Aluno', aba: 'cursos', voltar: '#/alunos',
    html: `<div class="card"><dl class="info">
      <dt>Telefone</dt><dd>${a.telefone ? `<a href="tel:${so(a.telefone)}">${esc(formatarFone(a.telefone))}</a>` : '—'}</dd>
      <dt>Endereço</dt><dd>${esc(a.endereco || '—')}</dd><dt>Bairro</dt><dd>${esc(a.bairro || '—')}</dd>
      <dt>CPF</dt><dd>${a.cpf ? `<span id="cpf">${mascararCPF(a.cpf)}</span> <button class="etiqueta" id="verCpf" style="border:0;cursor:pointer">mostrar</button>` : '—'}</dd></dl></div>
      <p class="secao">Turmas (${ts.length})</p>
      ${ts.length ? `<ul class="lista">${ts.map(t => `<li><a class="item" href="#/turma/${t.id}"><div class="txt"><div class="n">${esc(curso(t.cursoId)?.nome)}</div><div class="d">${esc(t.nome)} · ${dataBR(t.inicio)} a ${dataBR(t.fim)}</div></div><span class="seta">›</span></a></li>`).join('')}</ul>`
        : `<div class="vazio">Ainda não está em nenhuma turma.</div>`}
      <div class="acoes"><div class="btn-linha"><button class="btn sec" id="editar">Editar</button><button class="btn perigo" id="excluir">Excluir</button></div></div>`,
    depois: () => {
      const v = $('#verCpf'); if (v) v.onclick = () => { const s = $('#cpf'); const aberto = v.textContent === 'esconder'; s.textContent = aberto ? mascararCPF(a.cpf) : formatarCPF(a.cpf); v.textContent = aberto ? 'mostrar' : 'esconder'; };
      $('#editar').onclick = () => formAluno(id, null);
      $('#excluir').onclick = async () => {
        if (await confirmar('Excluir aluno?', `${a.nome} será apagado(a) e sairá de ${ts.length} turma(s).`)) {
          E.alunos = E.alunos.filter(x => x.id !== id); E.matriculas = E.matriculas.filter(m => m.alunoId !== id);
          await salvar(); aviso('Aluno excluído'); ir('#/alunos');
        }
      };
    }
  };
});

/* ================= EVENTOS ================= */
let anoEventos = new Date().getFullYear();
rota('eventos', () => {
  const evs = E.eventos.filter(e => anoDe(e.data) === anoEventos).sort((a, b) => b.data.localeCompare(a.data));
  const total = evs.reduce((s, e) => s + participantes(e), 0);
  return {
    titulo: 'Eventos', aba: 'eventos',
    html: `<div class="periodo"><button id="ant" aria-label="Ano anterior">‹</button><b>${anoEventos}</b><button id="prox" aria-label="Próximo ano">›</button></div>
      <div class="blocos"><div class="bloco coral"><div class="v">${evs.length}</div><div class="l">eventos</div></div><div class="bloco"><div class="v">${total}</div><div class="l">participações</div></div></div>
      <p class="secao">Eventos de ${anoEventos}</p>
      ${evs.length ? `<ul class="lista">${evs.map(e => `<li><a class="item" href="#/evento/${e.id}"><div class="txt"><div class="n">${esc(e.nome)}</div><div class="d">${dataBR(e.data)}${e.local ? ' · ' + esc(e.local) : ''}</div></div><span class="num coral">${participantes(e)}</span></a></li>`).join('')}</ul>`
        : `<div class="vazio"><b>Nenhum evento em ${anoEventos}</b>Registre cada evento e quantas pessoas participaram.</div>`}
      <div class="acoes"><button class="btn" id="novo">+ Novo evento</button></div>`,
    depois: () => {
      $('#ant').onclick = () => { anoEventos--; render(); };
      $('#prox').onclick = () => { anoEventos++; render(); };
      $('#novo').onclick = () => formEvento(null);
    }
  };
});

function formEvento(id) {
  const e = id ? evento(id) : null;
  let nomes = [...(e?.nomes || [])];
  abrirModal(`<h2>${e ? 'Editar evento' : 'Novo evento'}</h2><form id="f">
    ${campo('nome', 'Nome do evento', e?.nome, 'text', 'placeholder="Ex.: Outubro Rosa" autocomplete="off"')}
    <div class="duas">${campo('data', 'Data', e?.data ?? hoje(), 'date')}${campo('local', 'Local <small>(opcional)</small>', e?.local ?? 'Sede', 'text')}</div>
    <div class="campo"><label>Como registrar os participantes?</label><div class="opcoes">
      <label><input type="radio" name="modo" value="numero" ${e?.modo !== 'lista' ? 'checked' : ''}><span>Só o número</span></label>
      <label><input type="radio" name="modo" value="lista" ${e?.modo === 'lista' ? 'checked' : ''}><span>Lista de nomes</span></label></div></div>
    <div id="boxNumero">${campo('quantidade', 'Quantas pessoas participaram?', e?.modo !== 'lista' ? (e?.quantidade ?? '') : '', 'number', 'inputmode="numeric" min="0" step="1"')}</div>
    <div id="boxLista" hidden><div class="campo"><label for="novoNome">Participantes <small id="contaNomes"></small></label>
      <div class="add-linha"><input id="novoNome" placeholder="Nome do participante" autocomplete="off"><button type="button" class="btn" id="addNome">Incluir</button></div>
      <ul class="nomes" id="nomes"></ul></div></div>
    <div class="campo"><label for="obs">Observação <small>(opcional)</small></label><textarea id="obs" name="obs" placeholder="Ex.: parceria com o SENAI">${esc(e?.obs)}</textarea></div>
    <div class="btn-linha"><button type="button" class="btn sec" data-fechar>Cancelar</button><button class="btn">Salvar</button></div></form>`,
  m => {
    const f = m.querySelector('#f');
    const desenhar = () => {
      m.querySelector('#nomes').innerHTML = nomes.map((n, i) => `<li><span>${i + 1}. ${esc(n)}</span><button type="button" data-i="${i}">remover</button></li>`).join('');
      m.querySelector('#contaNomes').textContent = `(${nomes.length})`;
      m.querySelectorAll('#nomes button').forEach(b => b.onclick = () => { nomes.splice(Number(b.dataset.i), 1); desenhar(); });
    };
    const trocar = () => { const lista = f.modo.value === 'lista'; m.querySelector('#boxLista').hidden = !lista; m.querySelector('#boxNumero').hidden = lista; };
    f.querySelectorAll('[name=modo]').forEach(r => r.onchange = trocar);
    const incluir = () => { const n = m.querySelector('#novoNome'); const v = n.value.trim(); if (v) { nomes.push(v); n.value = ''; desenhar(); } n.focus(); };
    m.querySelector('#addNome').onclick = incluir;
    m.querySelector('#novoNome').onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); incluir(); } };
    trocar(); desenhar();
    f.onsubmit = async ev => {
      ev.preventDefault(); limparErros(f);
      const pend = m.querySelector('#novoNome').value.trim(); if (pend && f.modo.value === 'lista') { nomes.push(pend); }
      const d = { nome: f.nome.value.trim(), data: f.data.value, local: f.local.value.trim(), modo: f.modo.value, obs: f.obs.value.trim() };
      if (!d.nome) return erroCampo(f, 'nome', 'Digite o nome do evento.');
      if (!d.data) return erroCampo(f, 'data', 'Informe a data.');
      if (d.modo === 'numero') {
        const q = f.quantidade.value === '' ? 0 : Number(f.quantidade.value);
        if (!Number.isInteger(q) || q < 0) return erroCampo(f, 'quantidade', 'Use um número inteiro, como 180.');
        d.quantidade = q; d.nomes = [];
      } else { d.nomes = nomes; d.quantidade = nomes.length; }
      if (e) Object.assign(e, d); else E.eventos.push({ id: uid(), ...d });
      anoEventos = anoDe(d.data);
      await salvar(); fecharModal(); aviso(e ? 'Evento atualizado' : 'Evento registrado'); render();
    };
  });
}

rota('evento', id => {
  const e = evento(id); if (!e) { ir('#/eventos'); return null; }
  const lig = E.lancamentos.filter(l => l.eventoId === id);
  const arrec = lig.filter(l => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0);
  const gasto = lig.filter(l => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0);
  return {
    titulo: e.nome, subtitulo: 'Evento', aba: 'eventos', voltar: '#/eventos',
    html: `<div class="blocos"><div class="bloco coral"><div class="v">${participantes(e)}</div><div class="l">participantes</div></div><div class="bloco gold"><div class="v">${reais(arrec)}</div><div class="l">arrecadado</div></div></div>
      <div class="card mt"><dl class="info"><dt>Data</dt><dd>${dataBR(e.data)}</dd><dt>Local</dt><dd>${esc(e.local || '—')}</dd>
      <dt>Registro</dt><dd>${e.modo === 'lista' ? 'Lista de nomes' : 'Só o número'}</dd>${gasto ? `<dt>Gastos</dt><dd>${reais(gasto)}</dd>` : ''}
      ${e.obs ? `<dt>Obs.</dt><dd>${esc(e.obs)}</dd>` : ''}</dl></div>
      ${e.modo === 'lista' && e.nomes?.length ? `<p class="secao">Participantes</p><div class="card"><ol style="padding-left:20px">${e.nomes.map(n => `<li>${esc(n)}</li>`).join('')}</ol></div>` : ''}
      ${lig.length ? `<p class="secao">Lançamentos do caixa ligados</p><ul class="lista">${lig.map(itemLanc).join('')}</ul>` : ''}
      <div class="acoes"><button class="btn" id="entrada">+ Lançar valor arrecadado</button>
      <div class="btn-linha mt"><button class="btn sec" id="editar">Editar</button><button class="btn perigo" id="excluir">Excluir</button></div></div>`,
    depois: r => {
      ligarLancs(r);
      $('#entrada').onclick = () => formLancamento(null, 'entrada', id);
      $('#editar').onclick = () => formEvento(id);
      $('#excluir').onclick = async () => {
        if (await confirmar('Excluir evento?', `"${e.nome}" será apagado. ${lig.length ? 'Os lançamentos do caixa continuam, mas sem o vínculo.' : ''}`)) {
          E.eventos = E.eventos.filter(x => x.id !== id); E.lancamentos.forEach(l => { if (l.eventoId === id) l.eventoId = null; });
          await salvar(); aviso('Evento excluído'); ir('#/eventos');
        }
      };
    }
  };
});

/* ================= CAIXA ================= */
let mesCaixa = mesDe(hoje());
function itemLanc(l) {
  const ev = l.eventoId ? evento(l.eventoId) : null;
  return `<li><button class="item" data-lanc="${l.id}"><div class="txt"><div class="n">${esc(l.categoria)}${l.descricao ? ' – ' + esc(l.descricao) : ''}</div>
    <div class="d">${dataBR(l.data)} · ${l.forma === 'especie' ? 'Espécie' : 'Conta'}${ev ? ' · ' + esc(ev.nome) : ''}</div></div>
    <span class="num ${l.tipo === 'saida' ? 'coral' : ''}">${l.tipo === 'saida' ? '−' : '+'} ${reais(l.valor)}</span></button></li>`;
}
function ligarLancs(r) { r.querySelectorAll('[data-lanc]').forEach(b => b.onclick = () => formLancamento(b.dataset.lanc)); }

rota('caixa', () => {
  const t = totaisMes(mesCaixa);
  const ls = t.ls.sort((a, b) => b.data.localeCompare(a.data) || (b.criadoEm || '').localeCompare(a.criadoEm || ''));
  const porForma = f => t.ls.reduce((s, l) => s + (l.forma === f ? (l.tipo === 'entrada' ? l.valor : -l.valor) : 0), 0);
  return {
    titulo: 'Caixa', aba: 'caixa',
    html: `<div class="periodo"><button id="ant" aria-label="Mês anterior">‹</button><b>${nomeMesTitulo(mesCaixa)}</b><button id="prox" aria-label="Próximo mês">›</button></div>
      <div class="saldo ${t.saldo < 0 ? 'neg' : ''}"><div class="l">Saldo do mês</div><div class="v">${reais(t.saldo)}</div></div>
      <div class="blocos"><div class="bloco"><div class="v" style="font-size:20px">${reais(t.ent)}</div><div class="l">entradas</div></div><div class="bloco coral"><div class="v" style="font-size:20px">${reais(t.sai)}</div><div class="l">saídas</div></div></div>
      ${t.ls.length ? `<div class="card mt"><dl class="info"><dt>Na conta</dt><dd>${reais(porForma('conta'))}</dd><dt>Em espécie</dt><dd>${reais(porForma('especie'))}</dd></dl></div>` : ''}
      <div class="btn-linha mt"><button class="btn" id="ent">+ Entrada</button><button class="btn coral" id="sai">+ Saída</button></div>
      <p class="secao">Lançamentos</p>
      ${ls.length ? `<ul class="lista">${ls.map(itemLanc).join('')}</ul>` : `<div class="vazio"><b>Nada lançado neste mês</b>Registre o que entrou do bazar e as contas pagas.</div>`}`,
    depois: r => {
      $('#ant').onclick = () => { mesCaixa = somaMes(mesCaixa, -1); render(); };
      $('#prox').onclick = () => { mesCaixa = somaMes(mesCaixa, 1); render(); };
      $('#ent').onclick = () => formLancamento(null, 'entrada');
      $('#sai').onclick = () => formLancamento(null, 'saida');
      ligarLancs(r);
    }
  };
});

function formLancamento(id, tipoNovo, eventoNovo) {
  const l = id ? E.lancamentos.find(x => x.id === id) : null;
  let tipo = l?.tipo || tipoNovo || 'entrada';
  const evs = [...E.eventos].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 30);
  const opcCat = t => (t === 'entrada' ? CAT_ENTRADA : CAT_SAIDA).map(c => `<option ${(l?.categoria === c || (!l && eventoNovo && c === 'Evento')) ? 'selected' : ''}>${c}</option>`).join('');
  const dataPadrao = l?.data ?? (mesDe(hoje()) === mesCaixa ? hoje() : `${mesCaixa}-01`);
  abrirModal(`<h2 id="tit">${l ? 'Editar lançamento' : (tipo === 'entrada' ? 'Nova entrada' : 'Nova saída')}</h2><form id="f" novalidate>
    <div class="campo"><div class="opcoes">
      <label><input type="radio" name="tipo" value="entrada" ${tipo === 'entrada' ? 'checked' : ''}><span>Entrada</span></label>
      <label><input type="radio" name="tipo" value="saida" ${tipo === 'saida' ? 'checked' : ''}><span>Saída</span></label></div></div>
    ${campo('valor', 'Valor (R$)', l ? String(l.valor.toFixed(2)).replace('.', ',') : '', 'text', 'inputmode="decimal" placeholder="0,00" autocomplete="off"')}
    <div class="duas">${campo('data', 'Data', dataPadrao, 'date')}
      <div class="campo"><label for="categoria">Categoria</label><select id="categoria" name="categoria">${opcCat(tipo)}</select></div></div>
    <div class="campo"><label>Forma</label><div class="opcoes">
      <label><input type="radio" name="forma" value="especie" ${l?.forma !== 'conta' ? 'checked' : ''}><span>Espécie</span></label>
      <label><input type="radio" name="forma" value="conta" ${l?.forma === 'conta' ? 'checked' : ''}><span>Conta bancária</span></label></div></div>
    ${campo('descricao', 'Descrição <small>(opcional)</small>', l?.descricao, 'text', 'placeholder="Ex.: bazar de quarta" autocomplete="off"')}
    ${evs.length ? `<div class="campo"><label for="evento">Ligar a um evento <small>(opcional)</small></label><select id="evento" name="evento"><option value="">Nenhum</option>${evs.map(e => `<option value="${e.id}" ${(l?.eventoId || eventoNovo) === e.id ? 'selected' : ''}>${esc(e.nome)} (${dataBR(e.data)})</option>`).join('')}</select></div>` : ''}
    <div class="btn-linha"><button type="button" class="btn sec" data-fechar>Cancelar</button><button class="btn">Salvar</button></div>
    ${l ? `<button type="button" class="btn perigo mt" id="excluir">Excluir lançamento</button>` : ''}</form>`,
  m => {
    const f = m.querySelector('#f');
    f.querySelectorAll('[name=tipo]').forEach(r => r.onchange = () => {
      tipo = f.tipo.value; f.categoria.innerHTML = opcCat(tipo);
      if (!l) m.querySelector('#tit').textContent = tipo === 'entrada' ? 'Nova entrada' : 'Nova saída';
    });
    setTimeout(() => f.valor.focus(), 80);
    const ex = m.querySelector('#excluir');
    if (ex) ex.onclick = async () => {
      fecharModal();
      if (await confirmar('Excluir lançamento?', `${l.categoria} de ${reais(l.valor)} em ${dataBR(l.data)}.`)) {
        E.lancamentos = E.lancamentos.filter(x => x.id !== id); await salvar(); aviso('Lançamento excluído');
      }
      render();
    };
    f.onsubmit = async ev => {
      ev.preventDefault(); limparErros(f);
      const valor = Math.round(lerValor(f.valor.value) * 100) / 100;
      if (!(valor > 0)) return erroCampo(f, 'valor', 'Digite um valor maior que zero, como 25,50.');
      if (!f.data.value) return erroCampo(f, 'data', 'Informe a data.');
      const d = { tipo: f.tipo.value, valor, data: f.data.value, categoria: f.categoria.value, forma: f.forma.value, descricao: f.descricao.value.trim(), eventoId: f.evento ? (f.evento.value || null) : null };
      if (l) Object.assign(l, d); else E.lancamentos.push({ id: uid(), ...d, criadoEm: new Date().toISOString() });
      mesCaixa = mesDe(d.data);
      await salvar(); fecharModal(); aviso(l ? 'Lançamento atualizado' : (d.tipo === 'entrada' ? 'Entrada registrada' : 'Saída registrada')); render();
    };
  });
}

/* ================= RELATÓRIOS ================= */
let anoRel = new Date().getFullYear(), mesRel = mesDe(hoje());
function dadosAnuais(ano) {
  const ts = E.turmas.filter(t => turmaNoAno(t, ano));
  const porCurso = E.cursos.map(c => {
    const tc = ts.filter(t => t.cursoId === c.id);
    const alunos = new Set(E.matriculas.filter(m => tc.some(t => t.id === m.turmaId)).map(m => m.alunoId));
    return { nome: c.nome, turmas: tc.length, alunos: alunos.size };
  }).filter(c => c.turmas > 0).sort((a, b) => b.alunos - a.alunos);
  const alunosUnicos = new Set(E.matriculas.filter(m => ts.some(t => t.id === m.turmaId)).map(m => m.alunoId)).size;
  const evs = E.eventos.filter(e => anoDe(e.data) === ano).sort((a, b) => a.data.localeCompare(b.data));
  const part = evs.reduce((s, e) => s + participantes(e), 0);
  const ls = E.lancamentos.filter(l => anoDe(l.data) === ano);
  const ent = ls.filter(l => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0);
  const sai = ls.filter(l => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0);
  return { ano, porCurso, turmas: ts.length, alunosUnicos, evs, part, ent, sai };
}

rota('relatorios', () => {
  const a = dadosAnuais(anoRel), t = totaisMes(mesRel);
  return {
    titulo: 'Relatórios', aba: 'relatorios',
    html: `<p class="secao">Relatório anual</p>
      <div class="periodo"><button id="aAnt" aria-label="Ano anterior">‹</button><b>${anoRel}</b><button id="aProx" aria-label="Próximo ano">›</button></div>
      <div class="blocos"><div class="bloco"><div class="v">${a.porCurso.length}</div><div class="l">cursos · ${a.turmas} turma(s)</div></div><div class="bloco gold"><div class="v">${a.alunosUnicos}</div><div class="l">alunos atendidos</div></div>
      <div class="bloco coral"><div class="v">${a.evs.length}</div><div class="l">eventos</div></div><div class="bloco"><div class="v">${a.part}</div><div class="l">participações</div></div></div>
      <div class="acoes"><button class="btn" id="pdfAno">Gerar PDF do ano</button></div>

      <p class="secao" style="margin-top:28px">Relatório do caixa (para o contador)</p>
      <div class="periodo"><button id="mAnt" aria-label="Mês anterior">‹</button><b>${nomeMesTitulo(mesRel)}</b><button id="mProx" aria-label="Próximo mês">›</button></div>
      <div class="card"><dl class="info"><dt>Entradas</dt><dd>${reais(t.ent)}</dd><dt>Saídas</dt><dd>${reais(t.sai)}</dd><dt>Saldo</dt><dd>${reais(t.saldo)}</dd><dt>Lançamentos</dt><dd>${t.ls.length}</dd></dl></div>
      <div class="acoes"><button class="btn" id="pdfMes">Gerar PDF do mês</button></div>

      <p class="secao" style="margin-top:28px">Cópia de segurança</p>
      <div class="card"><p style="font-size:15px">Os dados ficam só neste celular. Salve uma cópia no WhatsApp, no Google Drive ou no e-mail para recuperar tudo se trocar de aparelho.</p>
      <p style="font-size:14px;color:var(--muted);margin-top:6px">Última cópia: ${E.config.ultimoBackup ? new Date(E.config.ultimoBackup).toLocaleDateString('pt-BR') : 'nunca'}</p></div>
      <div class="acoes"><button class="btn" id="backup">Salvar cópia de segurança</button><button class="btn sec" id="restaurar">Recuperar de uma cópia</button></div>
      <input type="file" id="arquivo" accept=".json,application/json" hidden>

      <p class="secao" style="margin-top:28px">Configuração</p>
      <div class="acoes" style="margin-top:0"><button class="btn sec" id="cfg">Nome da associação</button></div>
      <p class="rodape-nota">Bairro Ativo · prática extensionista ADS PUCPR</p>`,
    depois: () => {
      $('#aAnt').onclick = () => { anoRel--; render(); }; $('#aProx').onclick = () => { anoRel++; render(); };
      $('#mAnt').onclick = () => { mesRel = somaMes(mesRel, -1); render(); }; $('#mProx').onclick = () => { mesRel = somaMes(mesRel, 1); render(); };
      $('#pdfAno').onclick = () => pdfAnual(anoRel);
      $('#pdfMes').onclick = () => pdfMensal(mesRel);
      $('#backup').onclick = exportarBackup;
      $('#restaurar').onclick = () => $('#arquivo').click();
      $('#arquivo').onchange = ev => importarBackup(ev.target.files[0]);
      $('#cfg').onclick = formConfig;
    }
  };
});

function formConfig() {
  abrirModal(`<h2>Nome da associação</h2><form id="f">${campo('assoc', 'Aparece no topo e nos relatórios', E.config.associacao)}
    <div class="btn-linha"><button type="button" class="btn sec" data-fechar>Cancelar</button><button class="btn">Salvar</button></div></form>`,
  m => m.querySelector('#f').onsubmit = async ev => {
    ev.preventDefault(); const v = ev.target.assoc.value.trim();
    if (!v) return erroCampo(ev.target, 'assoc', 'Digite o nome.');
    E.config.associacao = v; await salvar(); fecharModal(); aviso('Nome atualizado'); render();
  });
}

/* ---------- PDF ---------- */
const COR = { teal: [15, 82, 87], coral: [232, 92, 64], gold: [245, 184, 61], ink: [30, 42, 43], muted: [91, 107, 108], soft: [225, 239, 236], linha: [228, 222, 211] };
function novoPDF(titulo, subtitulo) {
  if (!window.jspdf) { aviso('O gerador de PDF ainda está carregando. Tente de novo.'); return null; }
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFillColor(...COR.teal); doc.rect(0, 0, 210, 34, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text(titulo, 15, 16);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.text(subtitulo, 15, 25);
  doc.setTextColor(...COR.ink);
  return { doc, y: 46 };
}
function pdfPagina(p, precisa = 12) { if (p.y + precisa > 280) { p.doc.addPage(); p.y = 20; } }
function pdfSecao(p, txt) {
  pdfPagina(p, 18); const d = p.doc;
  d.setFont('helvetica', 'bold'); d.setFontSize(12); d.setTextColor(...COR.teal); d.text(txt, 15, p.y);
  d.setDrawColor(...COR.linha); d.line(15, p.y + 2, 195, p.y + 2); p.y += 9; d.setTextColor(...COR.ink);
}
function pdfBlocos(p, itens) {
  const d = p.doc, w = (180 - (itens.length - 1) * 4) / itens.length;
  itens.forEach((it, i) => {
    const x = 15 + i * (w + 4);
    d.setFillColor(...(it.cor || COR.soft)); d.roundedRect(x, p.y, w, 22, 3, 3, 'F');
    d.setFont('helvetica', 'bold'); d.setFontSize(16); d.setTextColor(...COR.teal); d.text(String(it.v), x + 4, p.y + 10);
    d.setFont('helvetica', 'normal'); d.setFontSize(8.5); d.setTextColor(...COR.muted); d.text(it.l, x + 4, p.y + 17);
  });
  d.setTextColor(...COR.ink); p.y += 30;
}
function pdfTabela(p, cab, linhas, larg, alinhar = []) {
  const d = p.doc, xs = []; let x = 15; larg.forEach(w => { xs.push(x); x += w; });
  const cabecalho = () => {
    d.setFillColor(...COR.soft); d.rect(15, p.y - 5, 180, 8, 'F');
    d.setFont('helvetica', 'bold'); d.setFontSize(9.5); d.setTextColor(...COR.teal);
    cab.forEach((c, i) => alinhar[i] === 'r' ? d.text(c, xs[i] + larg[i] - 2, p.y, { align: 'right' }) : d.text(c, xs[i] + 2, p.y));
    p.y += 7; d.setFont('helvetica', 'normal'); d.setTextColor(...COR.ink);
  };
  cabecalho();
  if (!linhas.length) { d.setTextColor(...COR.muted); d.text('Nenhum registro no período.', 17, p.y); d.setTextColor(...COR.ink); p.y += 8; return; }
  linhas.forEach(l => {
    const partes = l.map((c, i) => d.splitTextToSize(String(c), larg[i] - 4));
    const h = Math.max(...partes.map(pt => pt.length)) * 4.6 + 2;
    if (p.y + h > 282) { d.addPage(); p.y = 20; cabecalho(); }
    d.setFontSize(9.5);
    partes.forEach((pt, i) => alinhar[i] === 'r' ? d.text(pt, xs[i] + larg[i] - 2, p.y, { align: 'right' }) : d.text(pt, xs[i] + 2, p.y));
    p.y += h; d.setDrawColor(...COR.linha); d.line(15, p.y - 3.5, 195, p.y - 3.5);
  });
  p.y += 4;
}
function pdfRodape(doc) {
  const n = doc.getNumberOfPages(), quando = new Date().toLocaleString('pt-BR');
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(...COR.muted);
    doc.text(`Gerado pelo Bairro Ativo em ${quando}`, 15, 290); doc.text(`Página ${i} de ${n}`, 195, 290, { align: 'right' });
  }
}
async function entregarPDF(doc, nome) {
  const blob = doc.output('blob');
  const arq = new File([blob], nome, { type: 'application/pdf' });
  if (navigator.canShare && navigator.canShare({ files: [arq] })) {
    try { await navigator.share({ files: [arq], title: nome }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000); aviso('PDF salvo em Downloads');
}

function pdfAnual(ano) {
  const a = dadosAnuais(ano), p = novoPDF(`Relatório anual ${ano}`, E.config.associacao); if (!p) return;
  pdfSecao(p, 'Resumo do ano');
  pdfBlocos(p, [{ v: a.porCurso.length, l: 'cursos oferecidos' }, { v: a.turmas, l: 'turmas' }, { v: a.alunosUnicos, l: 'alunos atendidos', cor: [253, 241, 214] }, { v: a.evs.length, l: 'eventos', cor: [253, 230, 224] }, { v: a.part, l: 'participações' }]);
  pdfSecao(p, 'Cursos');
  pdfTabela(p, ['Curso', 'Turmas', 'Alunos'], a.porCurso.map(c => [c.nome, c.turmas, c.alunos]), [120, 30, 30], ['', 'r', 'r']);
  pdfSecao(p, 'Eventos');
  pdfTabela(p, ['Data', 'Evento', 'Local', 'Participantes'], a.evs.map(e => [dataBR(e.data), e.nome, e.local || '—', participantes(e)]), [25, 85, 40, 30], ['', '', '', 'r']);
  pdfSecao(p, 'Caixa no ano');
  pdfTabela(p, ['Item', 'Valor'], [['Total de entradas', reais(a.ent)], ['Total de saídas', reais(a.sai)], ['Saldo do ano', reais(a.ent - a.sai)]], [130, 50], ['', 'r']);
  pdfRodape(p.doc); entregarPDF(p.doc, `relatorio-anual-${ano}.pdf`);
}

function pdfMensal(ym) {
  const t = totaisMes(ym), p = novoPDF(`Caixa de ${nomeMes(ym)}`, E.config.associacao); if (!p) return;
  pdfSecao(p, 'Resumo do mês');
  pdfBlocos(p, [{ v: reais(t.ent), l: 'entradas' }, { v: reais(t.sai), l: 'saídas', cor: [253, 230, 224] }, { v: reais(t.saldo), l: 'saldo do mês', cor: [253, 241, 214] }]);
  const porCat = {};
  t.ls.forEach(l => { const k = `${l.tipo === 'entrada' ? 'Entrada' : 'Saída'} · ${l.categoria}`; porCat[k] = (porCat[k] || 0) + l.valor; });
  pdfSecao(p, 'Por categoria');
  pdfTabela(p, ['Categoria', 'Total'], Object.entries(porCat).sort().map(([k, v]) => [k, reais(v)]), [130, 50], ['', 'r']);
  const forma = f => t.ls.reduce((s, l) => s + (l.forma === f ? (l.tipo === 'entrada' ? l.valor : -l.valor) : 0), 0);
  pdfSecao(p, 'Por forma');
  pdfTabela(p, ['Forma', 'Movimento líquido'], [['Espécie', reais(forma('especie'))], ['Conta bancária', reais(forma('conta'))]], [130, 50], ['', 'r']);
  pdfSecao(p, 'Lançamentos');
  const ls = [...t.ls].sort((a, b) => a.data.localeCompare(b.data));
  pdfTabela(p, ['Data', 'Tipo', 'Categoria / descrição', 'Forma', 'Valor'],
    ls.map(l => [dataBR(l.data), l.tipo === 'entrada' ? 'Entrada' : 'Saída', `${l.categoria}${l.descricao ? ' – ' + l.descricao : ''}${l.eventoId && evento(l.eventoId) ? ' (' + evento(l.eventoId).nome + ')' : ''}`, l.forma === 'especie' ? 'Espécie' : 'Conta', (l.tipo === 'saida' ? '- ' : '') + reais(l.valor)]),
    [22, 20, 83, 22, 33], ['', '', '', '', 'r']);
  pdfPagina(p, 20);
  p.doc.setFontSize(9); p.doc.setTextColor(...COR.muted);
  p.doc.text('Relatório de apoio para conferência com as notas enviadas ao contador.', 15, p.y + 4);
  pdfRodape(p.doc); entregarPDF(p.doc, `caixa-${ym}.pdf`);
}

/* ---------- backup ---------- */
async function exportarBackup() {
  E.config.ultimoBackup = new Date().toISOString(); await salvar();
  const nome = `bairro-ativo-copia-${hoje()}.json`;
  const blob = new Blob([JSON.stringify(E, null, 1)], { type: 'application/json' });
  const arq = new File([blob], nome, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [arq] })) {
    try { await navigator.share({ files: [arq], title: 'Cópia de segurança – Bairro Ativo' }); aviso('Cópia criada'); render(); return; } catch (e) { if (e.name === 'AbortError') { render(); return; } }
  }
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000); aviso('Cópia salva em Downloads'); render();
}
async function importarBackup(arquivo) {
  if (!arquivo) return;
  let dados;
  try { dados = JSON.parse(await arquivo.text()); } catch (e) { return aviso('Arquivo inválido.'); }
  const ok = dados && ['cursos', 'turmas', 'alunos', 'matriculas', 'eventos', 'lancamentos'].every(k => Array.isArray(dados[k]));
  if (!ok) return aviso('Este arquivo não é uma cópia do Bairro Ativo.');
  const resumo = `${dados.cursos.length} curso(s), ${dados.alunos.length} aluno(s), ${dados.eventos.length} evento(s) e ${dados.lancamentos.length} lançamento(s).`;
  if (await confirmar('Recuperar esta cópia?', `Os dados atuais deste celular serão substituídos por: ${resumo}`, 'Recuperar')) {
    E = Object.assign(estadoVazio(), dados); E.config = Object.assign(estadoVazio().config, dados.config || {});
    await salvar(); aviso('Dados recuperados'); ir('#/inicio');
  }
  $('#arquivo') && ($('#arquivo').value = '');
}

/* ================= início do app ================= */
$('#fundoModal').addEventListener('click', fecharModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) fecharModal(); });

(async () => {
  const salvo = await Banco.ler();
  if (salvo) { E = Object.assign(estadoVazio(), salvo); E.config = Object.assign(estadoVazio().config, salvo.config || {}); }
  if (navigator.storage && navigator.storage.persist) { try { await navigator.storage.persist(); } catch (e) { /* opcional */ } }
  render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
