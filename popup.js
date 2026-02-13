// 🆕 Variável global para controlar a interrupção
let processandoAtual = null;

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
  
  try {0
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
    

    btnExecutar.textContent = 'Executar Automação';

    
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
    limparPreview();
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

  exibirPreviewJSON(rotasUnicas, rotasDuplicadas, rotasComDuplicatas.length);
}

// 🆕 Exibe o preview do JSON com informações de duplicatas
function exibirPreviewJSON(rotas, duplicadas, totalOriginal) {
  let previewDiv = document.getElementById('json-preview');
  
  if (!previewDiv) {
    previewDiv = document.createElement('div');
    previewDiv.id = 'json-preview';
    previewDiv.style.marginTop = '10px';
    previewDiv.style.padding = '10px';
    previewDiv.style.background = '#f5f5f5';
    previewDiv.style.border = '1px solid #ddd';
    previewDiv.style.borderRadius = '5px';
    previewDiv.style.maxHeight = '300px';
    previewDiv.style.overflow = 'auto';
    
    const container = document.getElementById('dados').parentElement;
    container.appendChild(previewDiv);
  }

  if (rotas.length === 0) {
    previewDiv.innerHTML = '<span style="color: #f44336;">⚠️ Nenhuma rota válida encontrada. Use o formato: origem destino (separados por espaço ou tab)</span>';
    return;
  }

  const jsonString = JSON.stringify(rotas, null, 2);
  
  let duplicadasHTML = '';
  if (duplicadas.length > 0) {
    duplicadasHTML = `
      <div style="margin-top: 10px; padding: 8px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 3px;">
        <strong style="color: #856404;">⚠️ ${duplicadas.length} rota${duplicadas.length > 1 ? 's duplicadas removidas' : ' duplicada removida'}:</strong>
        <div style="margin-top: 5px; font-size: 11px; color: #856404; max-height: 100px; overflow-y: auto;">
          ${duplicadas.map(d => `Linha ${d.linha}: ${d.origem} → ${d.destino}${d.origemCompleta !== d.origem ? ` (${d.origemCompleta} → ${d.destinoCompleta})` : ''}`).join('<br>')}
        </div>
      </div>
    `;
  }

  const statusHTML = duplicadas.length > 0 
    ? `<span style="color: #ff9800;">📋 ${rotas.length} única${rotas.length > 1 ? 's' : ''} de ${totalOriginal} total (${duplicadas.length} removida${duplicadas.length > 1 ? 's' : ''})</span>`
    : `<strong>📋 ${rotas.length} rota${rotas.length > 1 ? 's' : ''} (sem duplicatas)</strong>`;

  previewDiv.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      ${statusHTML}
      <button id="copiar-json" style="padding: 4px 8px; cursor: pointer; background: #4CAF50; color: white; border: none; border-radius: 3px;">
        Copiar JSON
      </button>
    </div>
    ${duplicadasHTML}`;

  document.getElementById('copiar-json').addEventListener('click', () => {
    navigator.clipboard.writeText(jsonString).then(() => {
      const btn = document.getElementById('copiar-json');
      btn.textContent = '✅ Copiado!';
      btn.style.background = '#2196F3';
      setTimeout(() => {
        btn.textContent = 'Copiar JSON';
        btn.style.background = '#4CAF50';
      }, 2000);
    });
  });
}

// 🆕 Limpa o preview quando o campo está vazio
function limparPreview() {
  const previewDiv = document.getElementById('json-preview');
  if (previewDiv) {
    previewDiv.remove();
  }
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

  // 🆕 Exibe notificação permanente de rotas não encontradas
  function exibirRelatorioFinal(processadas, naoEncontradas, foiInterrompido = false) {
    const relatorioEl = document.createElement('div');
    relatorioEl.style.position = 'fixed';
    relatorioEl.style.top = '50%';
    relatorioEl.style.left = '50%';
    relatorioEl.style.transform = 'translate(-50%, -50%)';
    relatorioEl.style.padding = '20px';
    relatorioEl.style.background = 'white';
    relatorioEl.style.border = '2px solid #ddd';
    relatorioEl.style.borderRadius = '10px';
    relatorioEl.style.zIndex = '10001';
    relatorioEl.style.maxWidth = '500px';
    relatorioEl.style.maxHeight = '80vh';
    relatorioEl.style.overflow = 'auto';
    relatorioEl.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';

    let conteudoHTML = `
      <div style="margin-bottom: 15px;">
        <h3 style="margin: 0 0 10px 0; color: #0050F2;">${foiInterrompido ? '⏸️ Automação Interrompida' : '📊 Relatório da Automação'}</h3>
        ${foiInterrompido ? '<div style="padding: 10px; background: #fff3e0; border-radius: 5px; margin-bottom: 10px;"><strong style="color: #f57c00;">⚠️ Processo interrompido pelo usuário</strong></div>' : ''}
        <div style="padding: 10px; background: #e8f5e9; border-radius: 5px; margin-bottom: 10px;">
          <strong style="color: #2e7d32;">✅ Processadas com sucesso: ${processadas.length}</strong>
        </div>
    `;

    if (naoEncontradas.length > 0) {
      conteudoHTML += `
        <div style="padding: 10px; background: #fff3e0; border-radius: 5px; margin-bottom: 10px;">
          <strong style="color: #e65100;">⚠️ Rotas não encontradas: ${naoEncontradas.length}</strong>
          <div style="margin-top: 8px; font-size: 13px; max-height: 150px; overflow-y: auto;">
            ${naoEncontradas.map(r => `
              <div style="padding: 4px 0; border-bottom: 1px solid #ffe0b2;">
                ${r.tipo === 'origem' ? '🔴' : '🔵'} <strong>${r.origem} → ${r.destino}</strong><br>
                <span style="color: #666; font-size: 11px;">Campo não encontrado: ${r.campo} (buscou: ${r.valor})</span>
                ${r.textoCompleto && r.textoCompleto !== r.valor ? `<br><span style="color: #999; font-size: 10px;">Texto original: ${r.textoCompleto}</span>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    conteudoHTML += `
      </div>
      <button id="fechar-relatorio" style="width: 100%; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold;">
        Fechar Relatório
      </button>
    `;

    relatorioEl.innerHTML = conteudoHTML;
    document.body.appendChild(relatorioEl);

    document.getElementById('fechar-relatorio').addEventListener('click', () => {
      document.body.removeChild(relatorioEl);
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
        exibirRelatorioFinal(rotasProcessadas, rotasNaoEncontradas, true);
        return;
      }

      const rota = rotasUnicas[i];
      
      displayFeedback(`[${i + 1}/${rotasUnicas.length}] ${rota.origem} → ${rota.destino}`);

      limparOrigem();
      await delay(300);
      
      const resultadoOrigem = await digitarESelecionar("Origin", rota.origem, rota.origemCompleta, rota.origem, rota.destino);
      if (!resultadoOrigem.success) {
        if (window.automacaoController.deveParar) {
          exibirRelatorioFinal(rotasProcessadas, rotasNaoEncontradas, true);
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
          exibirRelatorioFinal(rotasProcessadas, rotasNaoEncontradas, true);
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
    
    // 🆕 Exibe relatório final
    await delay(1000);
    exibirRelatorioFinal(rotasProcessadas, rotasNaoEncontradas, false);
    
    // 🆕 Limpa o controlador
    delete window.automacaoController;
  }

  processar();
}