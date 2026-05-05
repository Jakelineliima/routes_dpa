// 🆕 Variável global para controlar a interrupção
let processandoAtual = null;

// Escuta mensagens do content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'atualizarStatus') {
    atualizarStatusRotas(request.dados);
  }
  
  if (request.action === 'mostrarRelatorio') {
    mostrarRelatorio(request.dados);
  }
});

// Atualiza o status de rotas no popup
function atualizarStatusRotas(dados) {
  const rotasUnicasEl = document.querySelector('.stat-card:nth-child(1) .number');
  const rotasUnicasLabelEl = document.querySelector('.stat-card:nth-child(1) .label');
  const duplicadasEl = document.querySelector('.stat-card:nth-child(2) .number');
  
  if (rotasUnicasEl) {
    rotasUnicasEl.textContent = dados.totalRotas;
  }
  
  if (rotasUnicasLabelEl && dados.duplicadas.length > 0) {
    rotasUnicasLabelEl.innerHTML = `<span style="color: #ff9800;">📋 ${dados.totalRotas} única${dados.totalRotas > 1 ? 's' : ''} de ${dados.totalOriginal} total</span>`;
  } else if (rotasUnicasLabelEl) {
    rotasUnicasLabelEl.textContent = 'Rotas únicas';
  }
  
  if (duplicadasEl) {
    duplicadasEl.textContent = dados.duplicadas.length;
  }
}

// Mostra o relatório final
function mostrarRelatorio(dados) {
  const relatorioEl = document.getElementById('relatorio');
  
  let conteudoHTML = `
    <div style="margin-top: 15px; padding: 15px; background: white; border: 1px solid #ddd; border-radius: 8px;">
      <h3 style="margin: 0 0 10px 0; color: #0050F2;">
        ${dados.foiInterrompido ? '⏸️ Automação Interrompida' : '📊 Relatório da Automação'}
      </h3>
      
      ${dados.foiInterrompido ? 
        '<div style="padding: 10px; background: #fff3e0; border-radius: 5px; margin-bottom: 10px;"><strong style="color: #f57c00;">⚠️ Processo interrompido pelo usuário</strong></div>' 
        : ''}
      
      <div style="padding: 10px; background: #e8f5e9; border-radius: 5px; margin-bottom: 10px;">
        <strong style="color: #2e7d32;">✅ Processadas com sucesso: ${dados.processadas.length}</strong>
      </div>
  `;

  if (dados.naoEncontradas.length > 0) {
    conteudoHTML += `
      <div style="padding: 10px; background: #fff3e0; border-radius: 5px; margin-bottom: 10px;">
        <strong style="color: #e65100;">⚠️ Rotas não encontradas: ${dados.naoEncontradas.length}</strong>
        <div style="margin-top: 8px; font-size: 13px; max-height: 150px; overflow-y: auto;">
          ${dados.naoEncontradas.map(r => `
            <div style="padding: 4px 0; border-bottom: 1px solid #ffe0b2;">
              ${r.tipo === 'origem' ? '🔴' : '🔵'} <strong>${r.origem} → ${r.destino}</strong><br>
              <span style="color: #666; font-size: 11px;">Campo não encontrado: ${r.campo} (buscou: ${r.valor})</span>
              ${r.textoCompleto && r.textoCompleto !== r.valor ? 
                `<br><span style="color: #999; font-size: 10px;">Texto original: ${r.textoCompleto}</span>` 
                : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  conteudoHTML += `</div>`;
  
  relatorioEl.innerHTML = conteudoHTML;
}

// 🆕 Evento do botão de executar
document.getElementById('btnExecutar').addEventListener('click', async () => {
  const textarea = document.getElementById('dados');
  const texto = textarea.value.trim();
  const btnExecutar = document.getElementById('btnExecutar');
  const btnParar = document.getElementById('btnParar');
  
  // Validação
  if (!texto) {
    alert('⚠️ Por favor, cole os dados antes de executar!');
    return;
  }
  
  const linhas = texto.split('\n').filter(l => l.trim() !== "");
  
  if (linhas.length === 0) {
    alert('⚠️ Nenhuma linha válida encontrada!');
    return;
  }
  
  // Desabilita o botão executar e habilita o botão parar
  btnExecutar.disabled = true;
  btnExecutar.textContent = '⏳ Executando...';
  btnParar.disabled = false;
  btnParar.style.display = 'inline-block';
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Armazena a referência da tab atual
    processandoAtual = tab.id;
    
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: automarFormulario,
      args: [linhas]
    });
    
    // Feedback visual
    btnExecutar.textContent = '✅ Executado com sucesso!';
    btnExecutar.style.background = '#2196F3';
    
    setTimeout(() => {
      btnExecutar.textContent = '▶️ Executar Automação';
      btnExecutar.style.background = '#4CAF50';
    }, 2000);
    
  } catch (error) {
    console.error('Erro ao executar:', error);
    alert('❌ Erro ao executar a automação. Verifique se você está na página correta.');
    
    btnExecutar.disabled = false;
    btnExecutar.textContent = '▶️ Executar Automação';
    btnParar.disabled = true;
    btnParar.style.display = 'none';
    processandoAtual = null;
  }
});

// 🆕 Evento do botão de parar
document.getElementById('btnParar').addEventListener('click', async () => {
  const btnParar = document.getElementById('btnParar');
  const btnExecutar = document.getElementById('btnExecutar');
  
  if (!processandoAtual) {
    return;
  }
  
  btnParar.textContent = '🛑 Parando...';
  btnParar.disabled = true;
  
  try {
    // Injeta o comando de parada na página
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
  
  setTimeout(() => {
    btnParar.style.display = 'none';
    btnParar.textContent = '⏸️ Parar Automação';
    btnExecutar.disabled = false;
    btnExecutar.style.background = '#4CAF50';
    processandoAtual = null;
  }, 1000);
});

// 🆕 Detecta quando o usuário cola dados no campo
document.getElementById('dados').addEventListener('paste', (e) => {
  setTimeout(() => {
    converterParaJSON();
  }, 100);
});

// 🆕 Detecta quando o usuário digita no campo
document.getElementById('dados').addEventListener('input', () => {
  clearTimeout(window.converterTimeout);
  window.converterTimeout = setTimeout(() => {
    converterParaJSON();
  }, 500);
});

// 🆕 Função para extrair APENAS o código entre parênteses
function extrairCodigo(texto) {
  // Procura por código entre parênteses: "Sao Paulo (GRU)" -> "GRU"
  const match = texto.match(/\(([^)]+)\)/);
  if (match) {
    return {
      codigo: match[1].trim(),
      textoCompleto: texto.trim(),
      temParenteses: true
    };
  }
  // Se não tem parênteses, usa o texto completo
  return {
    codigo: texto.trim(),
    textoCompleto: texto.trim(),
    temParenteses: false
  };
}

// 🆕 Função para converter os dados em JSON
function converterParaJSON() {
  const textarea = document.getElementById('dados');
  const texto = textarea.value.trim();
  
  if (!texto) {
    // Reseta os cards
    document.querySelector('.stat-card:nth-child(1) .number').textContent = '0';
    document.querySelector('.stat-card:nth-child(1) .label').textContent = 'Rotas únicas';
    document.querySelector('.stat-card:nth-child(2) .number').textContent = '0';
    return;
  }

  const linhas = texto.split('\n').filter(l => l.trim() !== "");
  
  const rotasComDuplicatas = linhas.map((linha, index) => {
    const partes = linha.trim().split(/\t+/); // Split por tabs
    
    // Se não tiver tab, tenta split por múltiplos espaços (2 ou mais)
    const partesProcessadas = partes.length > 1 ? partes : linha.trim().split(/\s{2,}/);
    
    // Se ainda não funcionou, tenta split por espaço único
    const partesFinais = partesProcessadas.length > 1 ? partesProcessadas : linha.trim().split(/\s+/);
    
    const origemTexto = partesFinais[0] || "";
    const destinoTexto = partesFinais[1] || "";
    
    const origemInfo = extrairCodigo(origemTexto);
    const destinoInfo = extrairCodigo(destinoTexto);
    
    return {
      id: index + 1,
      origem: origemInfo.codigo,
      destino: destinoInfo.codigo,
      origemCompleta: origemInfo.textoCompleto,
      destinoCompleta: destinoInfo.textoCompleto,
      linhaOriginal: index + 1
    };
  }).filter(r => r.origem && r.destino);

  // 🆕 Remover duplicatas mantendo apenas a primeira ocorrência
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

  // 🎯 Atualiza os cards no HTML
  atualizarStatusRotas({
    totalRotas: rotasUnicas.length,
    totalOriginal: rotasComDuplicatas.length,
    duplicadas: rotasDuplicadas
  });
}

// Função principal que será executada na página
function automarFormulario(linhas) {
  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  // 🆕 Cria o controlador de automação
  window.automacaoController = {
    deveParar: false,
    parar: function() {
      this.deveParar = true;
      displayFeedback('🛑 Parando automação...', true);
    }
  };

  // 🆕 Array para armazenar rotas não encontradas
  const rotasNaoEncontradas = [];
  const rotasProcessadas = [];
  const rotasFalhas = [];

  function displayFeedback(message, isError = false) {
    const feedbackEl = document.createElement('div');
    feedbackEl.textContent = message;
    feedbackEl.style.position = 'fixed';
    feedbackEl.style.top = '20px';
    feedbackEl.style.left = '50%';
    feedbackEl.style.transform = 'translateX(-50%)';
    feedbackEl.style.padding = '10px 20px';
    feedbackEl.style.background = isError ? '#f44336' : '#4CAF50';
    feedbackEl.style.color = 'white';
    feedbackEl.style.borderRadius = '5px';
    feedbackEl.style.zIndex = '10000';
    feedbackEl.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    document.body.appendChild(feedbackEl);
    setTimeout(() => {
      if (document.body.contains(feedbackEl)) document.body.removeChild(feedbackEl);
    }, 4000);
  }

  // 🆕 Envia relatório final para o popup
  function enviarRelatorioParaPopup(processadas, naoEncontradas, foiInterrompido = false) {
    chrome.runtime.sendMessage({
      action: 'mostrarRelatorio',
      dados: {
        processadas: processadas,
        naoEncontradas: naoEncontradas,
        foiInterrompido: foiInterrompido
      }
    });
  }

  function normalizarTexto(txt) {
    return txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  function buscarCombobox(placeholder) {
    return document.evaluate(
      `//atc-location-dropdownlist[@placeholder='${placeholder}']//span[@role='combobox']`,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
  }

  function limparCampo(placeholder, nomeCampo) {
    const span = buscarCombobox(placeholder);
    if (!span) {
      return false;
    }
    
    const container = span.closest('p-select');
    if (!container) {
      return false;
    }
    
    const clearIcon = container.querySelector("timesicon.p-select-clear-icon");
    
    if (clearIcon && clearIcon.offsetParent !== null) {
      clearIcon.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      clearIcon.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      clearIcon.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      clearIcon.click();
      
      return true;
    }
    
    return false;
  }

  function limparOrigem() {
    return limparCampo("Origin", "Origin");
  }

  function limparDestino() {
    return limparCampo("Destination", "Destination");
  }

  // 🆕 Função para extrair APENAS código entre parênteses
  function extrairCodigo(texto) {
    const match = texto.match(/\(([^)]+)\)/);
    if (match) {
      return {
        codigo: match[1].trim(),
        textoCompleto: texto.trim(),
        temParenteses: true
      };
    }
    return {
      codigo: texto.trim(),
      textoCompleto: texto.trim(),
      temParenteses: false
    };
  }

  // 🆕 Função para processar linha e extrair códigos
  function processarLinha(linha) {
    const partes = linha.trim().split(/\t+/);
    const partesProcessadas = partes.length > 1 ? partes : linha.trim().split(/\s{2,}/);
    const partesFinais = partesProcessadas.length > 1 ? partesProcessadas : linha.trim().split(/\s+/);
    
    const origemTexto = partesFinais[0] || "";
    const destinoTexto = partesFinais[1] || "";
    
    const origemInfo = extrairCodigo(origemTexto);
    const destinoInfo = extrairCodigo(destinoTexto);
    
    return {
      origem: origemInfo.codigo,
      destino: destinoInfo.codigo,
      origemCompleta: origemInfo.textoCompleto,
      destinoCompleta: destinoInfo.textoCompleto,
      origemTemParenteses: origemInfo.temParenteses,
      destinoTemParenteses: destinoInfo.temParenteses
    };
  }

  // 🆕 Função para remover duplicatas das linhas
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
        rotasUnicas.push({
          linha: linha,
          ...info
        });
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
    if (!span) {
      return null;
    }

    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (span.getAttribute("aria-disabled") === "false") break;
      await delay(200);
      
      // 🆕 Verifica se deve parar durante a espera
      if (window.automacaoController.deveParar) {
        return null;
      }
    }

    span.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    span.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    span.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await delay(500);

    const start2 = Date.now();
    while (Date.now() - start2 < timeout) {
      const inputs = document.querySelectorAll('input.p-inputtext.p-component.p-select-filter');
      if (inputs.length > 0) {
        return inputs[inputs.length - 1];
      }
      await delay(200);
      
      // 🆕 Verifica se deve parar durante a espera
      if (window.automacaoController.deveParar) {
        return null;
      }
    }
    return null;
  }

  // 🆕 Função que usa APENAS o código extraído (GRU, JFK, etc)
  async function digitarESelecionar(spanLabel, codigo, textoCompleto, origem, destino) {
    const input = await esperarCampo(spanLabel);
    if (!input) {
      return { success: false, motivo: `Input ${spanLabel} não encontrado` };
    }

    input.focus();
    input.value = "";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward" }));

    // 🆕 Usa APENAS o código (GRU, JFK, etc)
    const textoComHifen = codigo + " -";
    
    for (const letra of textoComHifen) {
      input.value += letra;
      input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: letra }));
      await delay(100);
      
      // 🆕 Verifica se deve parar durante a digitação
      if (window.automacaoController.deveParar) {
        return { success: false, motivo: 'Interrompido pelo usuário' };
      }
    }

    await delay(1200);

    const opcoes = Array.from(document.querySelectorAll('li.p-select-option[role="option"]'));
    
    let alvo = opcoes.find(el => normalizarTexto(el.getAttribute("aria-label")).includes(normalizarTexto(codigo)));

    if (!alvo) {
      alvo = opcoes.find(el => {
        const labelSpan = el.querySelector("span.label");
        return labelSpan && normalizarTexto(labelSpan.textContent).includes(normalizarTexto(codigo));
      });
    }

    if (alvo) {
      alvo.click();
      return { success: true };
    } else {
      // 🆕 Adiciona na lista de não encontradas
      rotasNaoEncontradas.push({
        origem: origem,
        destino: destino,
        campo: spanLabel,
        valor: codigo,
        textoCompleto: textoCompleto,
        tipo: spanLabel.toLowerCase() === 'origin' ? 'origem' : 'destino'
      });
      
      return { success: false, motivo: `${spanLabel} '${codigo}' não encontrado no sistema` };
    }
  }

  async function processar() {
    // 🆕 Remove duplicatas antes de processar
    const rotasUnicas = removerDuplicatas(linhas);
    
    displayFeedback(`🚀 Processando ${rotasUnicas.length} rota${rotasUnicas.length > 1 ? 's' : ''}...`);
    await delay(1500);

    for (let i = 0; i < rotasUnicas.length; i++) {
      // 🆕 Verifica se deve parar A CADA ITERAÇÃO
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
      
      const resultadoOrigem = await digitarESelecionar("Origin", rota.origem, rota.origemCompleta, rota.origem, rota.destino);
      if (!resultadoOrigem.success) {
        if (window.automacaoController.deveParar) {
          enviarRelatorioParaPopup(rotasProcessadas, rotasNaoEncontradas, true);
          return;
        }
        rotasFalhas.push({
          origem: rota.origem,
          destino: rota.destino,
          motivo: resultadoOrigem.motivo
        });
        await delay(1000);
        continue;
      }
      
      await delay(1000);

      const resultadoDestino = await digitarESelecionar("Destination", rota.destino, rota.destinoCompleta, rota.origem, rota.destino);
      if (!resultadoDestino.success) {
        if (window.automacaoController.deveParar) {
          enviarRelatorioParaPopup(rotasProcessadas, rotasNaoEncontradas, true);
          return;
        }
        rotasFalhas.push({
          origem: rota.origem,
          destino: rota.destino,
          motivo: resultadoDestino.motivo
        });
        await delay(1000);
        continue;
      }
      
      await delay(500);

      const btnAdd = document.evaluate(
        "//button[contains(., 'Add route')]",
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;

      if (btnAdd) {
        btnAdd.click();
        displayFeedback(`✅ [${i + 1}/${rotasUnicas.length}] Rota adicionada!`);
        
        // 🆕 Adiciona às rotas processadas com sucesso
        rotasProcessadas.push({
          origem: rota.origem,
          destino: rota.destino
        });
        
        await delay(1500);
        
        limparOrigem();
        await delay(500);
        limparDestino();
      } else {
        rotasFalhas.push({
          origem: rota.origem,
          destino: rota.destino,
          motivo: 'Botão "Add route" não encontrado'
        });
      }

      await delay(1000);
    }
    
    // 🆕 Envia relatório final para o popup
    await delay(1000);
    enviarRelatorioParaPopup(rotasProcessadas, rotasNaoEncontradas, false);
    
    // 🆕 Limpa o controlador
    delete window.automacaoController;
  }

  processar();
}