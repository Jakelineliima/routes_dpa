// Variável global para controlar a interrupção
let processandoAtual = null;

// ─────────────────────────────────────────────
// Escuta mensagens vindas da página (content script)
// ─────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'atualizarStatus') {
    atualizarStatusRotas(request.dados);
  }
  if (request.action === 'mostrarRelatorio') {
    mostrarRelatorio(request.dados);
    finalizarExecucao();
  }
});

// ─────────────────────────────────────────────
// Reseta os botões ao estado "parado"
// ─────────────────────────────────────────────
function finalizarExecucao() {
  const btnExecutar = document.getElementById('btnExecutar');
  const btnParar = document.getElementById('btnParar');

  btnExecutar.disabled = false;
  btnExecutar.textContent = '▶️ Executar Automação';
  btnExecutar.style.background = '#4CAF50';

  btnParar.disabled = true;
  btnParar.textContent = '⏸️ Parar Automação';

  processandoAtual = null;
}

// ─────────────────────────────────────────────
// Atualiza os cards de status (preview)
// ─────────────────────────────────────────────
function atualizarStatusRotas(dados) {
  const iconeEl = document.getElementById('preview-icone');
  const labelEl = document.getElementById('preview-label');
  const totalEl = document.getElementById('preview-total');

  if (iconeEl) iconeEl.textContent = dados.totalRotas > 0 ? '✅' : '⚠️';

  if (labelEl) {
    if (dados.duplicadas.length > 0) {
      labelEl.textContent = `${dados.totalRotas} única${dados.totalRotas > 1 ? 's' : ''} de ${dados.totalOriginal} total`;
    } else {
      labelEl.textContent = 'Rotas únicas';
    }
  }

  if (totalEl) totalEl.textContent = dados.totalRotas;
}

// ─────────────────────────────────────────────
// Mostra o relatório final
// ─────────────────────────────────────────────
function mostrarRelatorio(dados) {
  const relatorioEl = document.getElementById('relatorio');
  const tituloEl = document.getElementById('relatorio-titulo');
  const interrupcaoEl = document.getElementById('relatorio-interrupcao');
  const processadasTextoEl = document.getElementById('relatorio-processadas-texto');
  const naoEncontradasEl = document.getElementById('relatorio-nao-encontradas');
  const naoEncontradasTituloEl = document.getElementById('relatorio-nao-encontradas-titulo');
  const naoEncontradasListaEl = document.getElementById('relatorio-nao-encontradas-lista');

  tituloEl.textContent = dados.foiInterrompido ? '' : '';

  interrupcaoEl.style.display = dados.foiInterrompido ? 'block' : 'none';

  processadasTextoEl.textContent = `✅ Processadas com sucesso: ${dados.processadas.length}`;

  if (dados.naoEncontradas.length > 0) {
    naoEncontradasTituloEl.textContent = `⚠️ Rotas não encontradas: ${dados.naoEncontradas.length}`;
    naoEncontradasListaEl.replaceChildren();

    dados.naoEncontradas.forEach(r => {
      const item = document.createElement('div');
      const rota = document.createElement('strong');
      const campo = document.createElement('span');


      rota.textContent = `${r.origem} → ${r.destino}`;
      // campo.textContent = `Campo não encontrado: ${r.campo} (buscou: ${r.valor})`;

      // item.appendChild(icone);
      item.appendChild(rota);
      item.appendChild(document.createElement('br'));
      item.appendChild(campo);

      if (r.textoCompleto && r.textoCompleto !== r.valor) {
        const original = document.createElement('span');
        original.textContent = `Texto original: ${r.textoCompleto}`;
        item.appendChild(document.createElement('br'));
        item.appendChild(original);
      }

      naoEncontradasListaEl.appendChild(item);
    });

    naoEncontradasEl.style.display = 'block';
  } else {
    naoEncontradasEl.style.display = 'none';
    naoEncontradasListaEl.replaceChildren();
  }

  relatorioEl.style.display = 'block';
}

// ─────────────────────────────────────────────
// Reseta o relatório
// ─────────────────────────────────────────────
function resetarRelatorio() {
  document.getElementById('relatorio').style.display = 'none';
  document.getElementById('relatorio-titulo').textContent = '';
  document.getElementById('relatorio-interrupcao').style.display = 'none';
  document.getElementById('relatorio-processadas-texto').textContent = '';
  document.getElementById('relatorio-nao-encontradas').style.display = 'none';
  document.getElementById('relatorio-nao-encontradas-lista').replaceChildren();
}

// ─────────────────────────────────────────────
// Exibe preview dos cards, aviso de limite e JSON
// ─────────────────────────────────────────────
function exibirPreviewJSON(rotas, duplicadas, totalOriginal) {
  const iconeEl = document.getElementById('preview-icone');
  const labelRotas = document.getElementById('preview-label');
  const totalEl = document.getElementById('preview-total');
  const avisoEl = document.getElementById('aviso-limite');
  const avisoTexto = document.getElementById('aviso-texto');
  const jsonSection = document.getElementById('json-section');
  const jsonOutput = document.getElementById('json-output');

  if (rotas.length === 0) {
    iconeEl.textContent = '⚠️';
    labelRotas.textContent = 'Nenhuma rota válida';
    totalEl.textContent = '0';
    avisoEl.style.display = 'none';
    jsonSection.style.display = 'none';
    return;
  }

  if (duplicadas.length > 0) {
    iconeEl.textContent = '⚠️';
    labelRotas.textContent = `${rotas.length} única${rotas.length > 1 ? 's' : ''} de ${totalOriginal} (${duplicadas.length} removida${duplicadas.length > 1 ? 's' : ''})`;
  } else {
    iconeEl.textContent = '✅';
    labelRotas.textContent = `${rotas.length} rota${rotas.length > 1 ? 's' : ''} (sem duplicatas)`;
  }

  totalEl.textContent = rotas.length;

  if (rotas.length > 20) {
    const excesso = rotas.length - 20;
    avisoTexto.textContent = `${excesso} rota${excesso > 1 ? 's' : ''} acima do limite de 20`;
    avisoEl.style.display = 'block';
  } else {
    avisoTexto.textContent = '';
    avisoEl.style.display = 'none';
  }

  // Monta e exibe o JSON
  const json = JSON.stringify(
    rotas.map(r => ({ origem: r.origem, destino: r.destino })),
    null,
    2
  );
  jsonOutput.value = json;
  jsonSection.style.display = 'block';
}

// ─────────────────────────────────────────────
// Botão Copiar JSON
// ─────────────────────────────────────────────
document.getElementById('btnCopiarJSON').addEventListener('click', () => {
  const jsonOutput = document.getElementById('json-output');
  jsonOutput.select();
  navigator.clipboard.writeText(jsonOutput.value).then(() => {
    const btn = document.getElementById('btnCopiarJSON');
    const original = btn.textContent;
    btn.textContent = '✅ Copiado!';
    setTimeout(() => { btn.textContent = original; }, 2000);
  });
});

// ─────────────────────────────────────────────
// Extrai código entre parênteses
// ─────────────────────────────────────────────
function extrairCodigo(texto) {
  const match = texto.match(/\(([^)]+)\)/);
  if (match) {
    return { codigo: match[1].trim(), textoCompleto: texto.trim(), temParenteses: true };
  }
  return { codigo: texto.trim(), textoCompleto: texto.trim(), temParenteses: false };
}

// ─────────────────────────────────────────────
// Converte o texto colado em rotas e atualiza UI
// ─────────────────────────────────────────────
function converterParaJSON() {
  const textarea = document.getElementById('dados');
  const texto = textarea.value.trim();

  if (!texto) {
    document.getElementById('preview-icone').textContent = '⚠️';
    document.getElementById('preview-label').textContent = 'Rotas';
    document.getElementById('preview-total').textContent = '0';
    document.getElementById('aviso-limite').style.display = 'none';
    document.getElementById('json-section').style.display = 'none';
    return;
  }

  const linhas = texto.split('\n').filter(l => l.trim() !== '');

  const rotasComDuplicatas = linhas.map((linha, index) => {
    const partes = linha.trim().split(/\t+/);
    const partesProcessadas = partes.length > 1 ? partes : linha.trim().split(/\s{2,}/);
    const partesFinais = partesProcessadas.length > 1 ? partesProcessadas : linha.trim().split(/\s+/);

    const origemInfo = extrairCodigo(partesFinais[0] || '');
    const destinoInfo = extrairCodigo(partesFinais[1] || '');

    return {
      id: index + 1,
      origem: origemInfo.codigo,
      destino: destinoInfo.codigo,
      origemCompleta: origemInfo.textoCompleto,
      destinoCompleta: destinoInfo.textoCompleto,
      linhaOriginal: index + 1
    };
  }).filter(r => r.origem && r.destino);

  const rotasUnicas = [];
  const rotasDuplicadas = [];
  const rotasVistas = new Set();

  rotasComDuplicatas.forEach(rota => {
    const chave = `${rota.origem.toUpperCase()}-${rota.destino.toUpperCase()}`;
    if (!rotasVistas.has(chave)) {
      rotasVistas.add(chave);
      rotasUnicas.push({
        id: rotasUnicas.length + 1,
        origem: rota.origem,
        destino: rota.destino,
        origemCompleta: rota.origemCompleta,
        destinoCompleta: rota.destinoCompleta
      });
    } else {
      rotasDuplicadas.push({
        linha: rota.linhaOriginal,
        origem: rota.origem,
        destino: rota.destino,
        origemCompleta: rota.origemCompleta,
        destinoCompleta: rota.destinoCompleta
      });
    }
  });

  atualizarStatusRotas({
    totalRotas: rotasUnicas.length,
    totalOriginal: rotasComDuplicatas.length,
    duplicadas: rotasDuplicadas
  });

  exibirPreviewJSON(rotasUnicas, rotasDuplicadas, rotasComDuplicatas.length);
}

// ─────────────────────────────────────────────
// Eventos de input e paste
// ─────────────────────────────────────────────
document.getElementById('dados').addEventListener('paste', () => {
  setTimeout(() => converterParaJSON(), 100);
});

document.getElementById('dados').addEventListener('input', () => {
  clearTimeout(window.converterTimeout);
  window.converterTimeout = setTimeout(() => converterParaJSON(), 500);
});

// ─────────────────────────────────────────────
// Botão Executar
// ─────────────────────────────────────────────
document.getElementById('btnExecutar').addEventListener('click', async () => {
  const textarea = document.getElementById('dados');
  const texto = textarea.value.trim();
  const btnExecutar = document.getElementById('btnExecutar');
  const btnParar = document.getElementById('btnParar');

  if (!texto) {
    alert('⚠️ Por favor, cole os dados antes de executar!');
    return;
  }

  const linhas = texto.split('\n').filter(l => l.trim() !== '');
  if (linhas.length === 0) {
    alert('⚠️ Nenhuma linha válida encontrada!');
    return;
  }

  resetarRelatorio();

  btnExecutar.disabled = true;
  btnExecutar.textContent = '⏳ Executando...';
  btnParar.disabled = false;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    processandoAtual = tab.id;

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: automarFormulario,
      args: [linhas]
    });

    // A automação real roda de forma assíncrona dentro da página.
    // Os botões só voltam ao estado normal quando o relatório chegar
    // (mensagem 'mostrarRelatorio' -> finalizarExecucao()).

  } catch (error) {
    console.error('Erro ao executar:', error);
    alert('❌ Erro ao executar a automação. Verifique se você está na página correta.');
    finalizarExecucao();
  }
});

// ─────────────────────────────────────────────
// Botão Parar
// ─────────────────────────────────────────────
document.getElementById('btnParar').addEventListener('click', async () => {
  const btnParar = document.getElementById('btnParar');

  if (!processandoAtual) return;

  btnParar.textContent = '🛑 Parando...';
  btnParar.disabled = true;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: processandoAtual },
      func: () => {
        if (window.automacaoController) {
          window.automacaoController.parar();
        }
      }
    });
  } catch (error) {
    console.error('Erro ao parar:', error);
  }

  // O reset final (botões e textContent) acontece em finalizarExecucao(),
  // disparado quando o relatório de interrupção chegar.
});

// ─────────────────────────────────────────────
// Estado inicial: garante que o botão Parar
// nasça desabilitado (mas visível)
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const btnParar = document.getElementById('btnParar');
  if (btnParar) btnParar.disabled = true;
});

// ─────────────────────────────────────────────
// Função principal injetada na página
// ─────────────────────────────────────────────
function automarFormulario(linhas) {
  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  window.automacaoController = {
    deveParar: false,
    parar() {
      this.deveParar = true;
      displayFeedback('🛑 Parando automação...', true);
    }
  };

  const rotasNaoEncontradas = [];
  const rotasProcessadas = [];
  const rotasFalhas = [];

  function displayFeedback(message, isError = false) {
    const el = document.createElement('div');
    el.textContent = message;
    el.style.cssText = `
      position:fixed; top:20px; left:35%; transform:translateX(-50%);
      padding:10px 20px; background:${isError ? '#f44336' : '#4CAF50'};
      color:white; border-radius:5px; z-index:10000;
      box-shadow:0 2px 5px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(el);
    setTimeout(() => { if (document.body.contains(el)) document.body.removeChild(el); }, 4000);
  }

  function enviarRelatorioParaPopup(processadas, naoEncontradas, foiInterrompido = false) {
    chrome.runtime.sendMessage({
      action: 'mostrarRelatorio',
      dados: { processadas, naoEncontradas, foiInterrompido }
    });
  }

  function normalizarTexto(txt) {
    return txt.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  function buscarCombobox(placeholder) {
    return document.evaluate(
      `//atc-location-dropdownlist[@placeholder='${placeholder}']//span[@role='combobox']`,
      document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
    ).singleNodeValue;
  }

  function limparCampo(placeholder) {
    const span = buscarCombobox(placeholder);
    if (!span) return false;
    const container = span.closest('p-select');
    if (!container) return false;
    const clearIcon = container.querySelector('timesicon.p-select-clear-icon');
    if (clearIcon && clearIcon.offsetParent !== null) {
      ['mousedown', 'mouseup', 'click'].forEach(ev =>
        clearIcon.dispatchEvent(new MouseEvent(ev, { bubbles: true }))
      );
      clearIcon.click();
      return true;
    }
    return false;
  }

  const limparOrigem = () => limparCampo('Origin');
  const limparDestino = () => limparCampo('Destination');

  function extrairCodigo(texto) {
    const match = texto.match(/\(([^)]+)\)/);
    if (match) return { codigo: match[1].trim(), textoCompleto: texto.trim(), temParenteses: true };
    return { codigo: texto.trim(), textoCompleto: texto.trim(), temParenteses: false };
  }

  function processarLinha(linha) {
    const partes = linha.trim().split(/\t+/);
    const partesProcessadas = partes.length > 1 ? partes : linha.trim().split(/\s{2,}/);
    const partesFinais = partesProcessadas.length > 1 ? partesProcessadas : linha.trim().split(/\s+/);
    const origemInfo = extrairCodigo(partesFinais[0] || '');
    const destinoInfo = extrairCodigo(partesFinais[1] || '');
    return {
      origem: origemInfo.codigo,
      destino: destinoInfo.codigo,
      origemCompleta: origemInfo.textoCompleto,
      destinoCompleta: destinoInfo.textoCompleto,
      origemTemParenteses: origemInfo.temParenteses,
      destinoTemParenteses: destinoInfo.temParenteses
    };
  }

  function removerDuplicatas(linhas) {
    const rotasUnicas = [];
    const rotasVistas = new Set();
    let duplicatasRemovidas = 0;

    linhas.forEach(linha => {
      const info = processarLinha(linha);
      if (!info.origem || !info.destino) return;
      const chave = `${info.origem.toUpperCase()}-${info.destino.toUpperCase()}`;
      if (!rotasVistas.has(chave)) {
        rotasVistas.add(chave);
        rotasUnicas.push({ linha, ...info });
      } else {
        duplicatasRemovidas++;
      }
    });

    if (duplicatasRemovidas > 0) {
      displayFeedback(`🔍 ${duplicatasRemovidas} rota${duplicatasRemovidas > 1 ? 's duplicadas' : ' duplicada'} removida${duplicatasRemovidas > 1 ? 's' : ''}!`);
    }
    return rotasUnicas;
  }

  async function esperarCampo(spanLabel, timeout = 5000) {
    const span = buscarCombobox(spanLabel);
    if (!span) return null;

    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (span.getAttribute('aria-disabled') === 'false') break;
      await delay(200);
      if (window.automacaoController.deveParar) return null;
    }

    ['mousedown', 'mouseup', 'click'].forEach(ev =>
      span.dispatchEvent(new MouseEvent(ev, { bubbles: true }))
    );
    await delay(500);

    const start2 = Date.now();
    while (Date.now() - start2 < timeout) {
      const inputs = document.querySelectorAll('input.p-inputtext.p-component.p-select-filter');
      if (inputs.length > 0) return inputs[inputs.length - 1];
      await delay(200);
      if (window.automacaoController.deveParar) return null;
    }
    return null;
  }

  async function digitarESelecionar(spanLabel, codigo, textoCompleto, origem, destino) {
    const input = await esperarCampo(spanLabel);
    if (!input) return { success: false, motivo: `Input ${spanLabel} não encontrado` };

    input.focus();
    input.value = '';
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));

    for (const letra of (codigo + ' -')) {
      input.value += letra;
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: letra }));
      await delay(100);
      if (window.automacaoController.deveParar) return { success: false, motivo: 'Interrompido pelo usuário' };
    }

    await delay(1200);

    const opcoes = Array.from(document.querySelectorAll('li.p-select-option[role="option"]'));
    let alvo = opcoes.find(el => normalizarTexto(el.getAttribute('aria-label')).includes(normalizarTexto(codigo)));

    if (!alvo) {
      alvo = opcoes.find(el => {
        const labelSpan = el.querySelector('span.label');
        return labelSpan && normalizarTexto(labelSpan.textContent).includes(normalizarTexto(codigo));
      });
    }

    if (alvo) {
      alvo.click();
      return { success: true };
    }

    rotasNaoEncontradas.push({
      origem, destino,
      campo: spanLabel,
      valor: codigo,
      textoCompleto,
      tipo: spanLabel.toLowerCase() === 'origin' ? 'origem' : 'destino'
    });
    return { success: false, motivo: `${spanLabel} '${codigo}' não encontrado no sistema` };
  }

  async function processar() {
    const rotasUnicas = removerDuplicatas(linhas);
    displayFeedback(`🚀 Processando ${rotasUnicas.length} rota${rotasUnicas.length > 1 ? 's' : ''}...`);
    await delay(1500);

    for (let i = 0; i < rotasUnicas.length; i++) {
      if (window.automacaoController.deveParar) {
        displayFeedback('⏸️ Automação interrompida pelo usuário!', true);
        await delay(1000);
        enviarRelatorioParaPopup(rotasProcessadas, rotasNaoEncontradas, true);
        return;
      }

      const rota = rotasUnicas[i];
      displayFeedback(`[${i + 1}/${rotasUnicas.length}] ${rota.origem} → ${rota.destino}`);

      limparOrigem();
      await delay(300);

      const resultadoOrigem = await digitarESelecionar('Origin', rota.origem, rota.origemCompleta, rota.origem, rota.destino);
      if (!resultadoOrigem.success) {
        if (window.automacaoController.deveParar) { enviarRelatorioParaPopup(rotasProcessadas, rotasNaoEncontradas, true); return; }
        rotasFalhas.push({ origem: rota.origem, destino: rota.destino, motivo: resultadoOrigem.motivo });
        await delay(1000);
        continue;
      }

      await delay(1000);

      const resultadoDestino = await digitarESelecionar('Destination', rota.destino, rota.destinoCompleta, rota.origem, rota.destino);
      if (!resultadoDestino.success) {
        if (window.automacaoController.deveParar) { enviarRelatorioParaPopup(rotasProcessadas, rotasNaoEncontradas, true); return; }
        rotasFalhas.push({ origem: rota.origem, destino: rota.destino, motivo: resultadoDestino.motivo });
        await delay(1000);
        continue;
      }

      await delay(500);

      const btnAdd = document.evaluate(
        "//button[contains(., 'Add route')]",
        document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
      ).singleNodeValue;

      if (btnAdd) {
        btnAdd.click();
        displayFeedback(`✅ [${i + 1}/${rotasUnicas.length}] Rota adicionada!`);
        rotasProcessadas.push({ origem: rota.origem, destino: rota.destino });
        await delay(1500);
        limparOrigem();
        await delay(500);
        limparDestino();
      } else {
        rotasFalhas.push({ origem: rota.origem, destino: rota.destino, motivo: 'Botão "Add route" não encontrado' });
      }

      await delay(1000);
    }

    await delay(1000);
    enviarRelatorioParaPopup(rotasProcessadas, rotasNaoEncontradas, false);
    delete window.automacaoController;
  }

  processar();
}