// 🆕 Evento do botão de executar
document.getElementById('btnExecutar').addEventListener('click', async () => {
  const textarea = document.getElementById('dados');
  const texto = textarea.value.trim();
  const btnExecutar = document.getElementById('btnExecutar');
  
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
  
  // Desabilita o botão durante execução
  btnExecutar.disabled = true;
  btnExecutar.textContent = '⏳ Executando...';
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: automarFormulario,
      args: [linhas]
    });
    
    // Feedback visual
    btnExecutar.textContent = '✅ Executado com sucesso!';
    btnExecutar.style.background = '#2196F3';
    
    setTimeout(() => {
      btnExecutar.disabled = false;
      btnExecutar.textContent = '▶️ Executar Automação';
      btnExecutar.style.background = '#4CAF50';
    }, 3000);
    
  } catch (error) {
    console.error('Erro ao executar:', error);
    alert('❌ Erro ao executar a automação. Verifique se você está na página correta.');
    
    btnExecutar.disabled = false;
    btnExecutar.textContent = '▶️ Executar Automação';
    btnExecutar.style.background = '#4CAF50';
  }
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
    const partes = linha.trim().split(/\s+/);
    const origem = partes[0] || "";
    const destino = partes[1] || "";
    
    return {
      id: index + 1,
      origem: origem,
      destino: destino,
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
        destino: rota.destino
      });
    } else {
      rotasDuplicadas.push({
        linha: rota.linhaOriginal,
        origem: rota.origem,
        destino: rota.destino
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
        <div style="margin-top: 5px; font-size: 11px; color: #856404;">
          ${duplicadas.map(d => `Linha ${d.linha}: ${d.origem} → ${d.destino}`).join('<br>')}
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
    ${duplicadasHTML}
    <pre style="margin: 10px 0 0 0; font-size: 12px; white-space: pre-wrap;">${jsonString}</pre>
  `;

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
    document.body.appendChild(feedbackEl);
    setTimeout(() => {
      if (document.body.contains(feedbackEl)) document.body.removeChild(feedbackEl);
    }, 4000);
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
      
      displayFeedback(`🧹 Campo ${nomeCampo} limpo!`);
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

  // 🆕 Função para remover duplicatas das linhas
  function removerDuplicatas(linhas) {
    const rotasUnicas = [];
    const rotasVistas = new Set();
    let duplicatasRemovidas = 0;

    linhas.forEach(linha => {
      const partes = linha.trim().split(/\s+/);
      const origem = partes[0];
      const destino = partes[1];
      
      if (!origem || !destino) return;

      const chave = `${origem.toUpperCase()}-${destino.toUpperCase()}`;
      
      if (!rotasVistas.has(chave)) {
        rotasVistas.add(chave);
        rotasUnicas.push(linha);
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
      displayFeedback(`❌ Combobox ${spanLabel} não encontrado!`, true);
      return null;
    }

    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (span.getAttribute("aria-disabled") === "false") break;
      await delay(200);
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
    }
    return null;
  }

  async function digitarESelecionar(spanLabel, texto) {
    const input = await esperarCampo(spanLabel);
    if (!input) {
      displayFeedback(`❌ Input para ${spanLabel} não encontrado!`, true);
      return false;
    }

    input.focus();
    input.value = "";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward" }));

    const textoComHifen = texto + " -";
    
    for (const letra of textoComHifen) {
      input.value += letra;
      input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: letra }));
      await delay(100);
    }

    displayFeedback(`✅ Texto '${textoComHifen}' digitado em ${spanLabel}`);

    await delay(1200);

    const opcoes = Array.from(document.querySelectorAll('li.p-select-option[role="option"]'));
    
    let alvo = opcoes.find(el => normalizarTexto(el.getAttribute("aria-label")).includes(normalizarTexto(texto)));

    if (!alvo) {
      alvo = opcoes.find(el => {
        const labelSpan = el.querySelector("span.label");
        return labelSpan && normalizarTexto(labelSpan.textContent).includes(normalizarTexto(texto));
      });
    }

    if (alvo) {
      alvo.click();
      displayFeedback(`✅ Item '${texto}' selecionado em ${spanLabel}`);
      return true;
    } else {
      displayFeedback(`❌ Opção '${texto}' não encontrada em ${spanLabel}`, true);
      return false;
    }
  }

  async function processar() {
    // 🆕 Remove duplicatas antes de processar
    const linhasUnicas = removerDuplicatas(linhas);
    
    displayFeedback(`🚀 Processando ${linhasUnicas.length} rota${linhasUnicas.length > 1 ? 's' : ''}...`);
    await delay(1500);

    for (let i = 0; i < linhasUnicas.length; i++) {
      const linha = linhasUnicas[i];
      const partes = linha.trim().split(/\s+/);
      const origem = partes[0];
      const destino = partes[1];
      
      if (!origem || !destino) continue;

      displayFeedback(`[${i + 1}/${linhasUnicas.length}] ${origem} → ${destino}`);

      limparOrigem();
      await delay(300);
      const origemOk = await digitarESelecionar("Origin", origem);
      if (!origemOk) continue;
      await delay(1000);

      const destinoOk = await digitarESelecionar("Destination", destino);
      if (!destinoOk) continue;
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
        displayFeedback(`✅ [${i + 1}/${linhasUnicas.length}] Rota adicionada!`);
        await delay(1500);
        
        limparOrigem();
        await delay(500);
        limparDestino();
      } else {
        displayFeedback('❌ Botão "Add route" NÃO encontrado!', true);
      }

      await delay(1000);
    }
    displayFeedback(`🎉 Automação concluída! ${linhasUnicas.length} rota${linhasUnicas.length > 1 ? 's processadas' : ' processada'}!`);
  }

  processar();
}