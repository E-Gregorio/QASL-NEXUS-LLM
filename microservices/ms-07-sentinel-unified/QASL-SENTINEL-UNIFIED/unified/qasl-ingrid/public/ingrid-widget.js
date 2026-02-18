/**
 * QASL-INGRID Widget v7 - Grafana Theme
 * Diseño exacto de ingrid-preview.html
 */

(function () {
  'use strict';

  var INGRID_API = window.INGRID_API_URL || 'http://localhost:3100';
  var WIDGET_ID = 'ingrid-chat-container';
  var VERSION = Date.now();

  if (document.getElementById(WIDGET_ID)) return;

  // CSS con cache-busting
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = INGRID_API + '/widget/ingrid-widget.css?v=' + VERSION;
  document.head.appendChild(link);

  function getTime() {
    return new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }

  // DOM - Estructura exacta del preview (Grafana theme)
  var container = document.createElement('div');
  container.id = WIDGET_ID;
  container.innerHTML =
    '<button id="ingrid-float-btn">\uD83E\uDD16</button>' +
    '<div id="ingrid-modal">' +
      '<div id="ingrid-header">' +
        '<div id="ingrid-header-left">' +
          '<div id="ingrid-header-avatar">\uD83E\uDD16</div>' +
          '<div id="ingrid-header-info">' +
            '<div id="ingrid-header-title">INGRID Assistant</div>' +
            '<div id="ingrid-header-status">' +
              '<span id="ingrid-status-dot"></span>' +
              '<span>Conectado</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<button id="ingrid-close-btn">\u00D7</button>' +
      '</div>' +
      '<div id="ingrid-messages"></div>' +
      '<div id="ingrid-quick-actions">' +
        '<button class="ingrid-quick-btn" data-msg="\u00bfC\u00f3mo est\u00e1n las APIs?">\uD83D\uDCCA Estado APIs</button>' +
        '<button class="ingrid-quick-btn" data-msg="\u00bfCu\u00e1l es el uptime actual?">\u23F1\uFE0F Uptime</button>' +
        '<button class="ingrid-quick-btn" data-msg="\u00bfC\u00f3mo est\u00e1 la seguridad?">\uD83D\uDD12 Seguridad</button>' +
        '<button class="ingrid-quick-btn" data-msg="\u00bfC\u00f3mo est\u00e1 el compliance?">\uD83D\uDCC8 Compliance</button>' +
        '<button class="ingrid-quick-btn" data-msg="Dame un resumen general">\uD83D\uDCCB Resumen</button>' +
      '</div>' +
      '<div id="ingrid-input-area">' +
        '<div id="ingrid-input-wrapper">' +
          '<textarea id="ingrid-input" placeholder="Escribe tu consulta..." rows="1"></textarea>' +
        '</div>' +
        '<button id="ingrid-send-btn">\u27A4</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(container);

  var floatBtn = document.getElementById('ingrid-float-btn');
  var modal = document.getElementById('ingrid-modal');
  var closeBtn = document.getElementById('ingrid-close-btn');
  var messagesDiv = document.getElementById('ingrid-messages');
  var quickActions = document.getElementById('ingrid-quick-actions');
  var input = document.getElementById('ingrid-input');
  var sendBtn = document.getElementById('ingrid-send-btn');

  var isOpen = false;
  var isWaiting = false;

  // Auto-resize textarea
  input.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  function toggleChat() {
    isOpen = !isOpen;
    if (isOpen) {
      modal.classList.add('open');
      floatBtn.style.display = 'none';
      input.focus();
      if (messagesDiv.children.length === 0) {
        addBotMessage('\u00a1Hola! Soy INGRID, tu asistente de monitoreo QA. Puedo ayudarte con informaci\u00f3n sobre APIs, uptime, seguridad y compliance.');
      }
    } else {
      modal.classList.remove('open');
      floatBtn.style.display = 'flex';
    }
  }

  function addBotMessage(text) {
    var msg = document.createElement('div');
    msg.className = 'ingrid-msg bot';
    msg.innerHTML =
      '<div class="ingrid-msg-bubble">' + formatText(text) + '</div>' +
      '<div class="ingrid-msg-time">' + getTime() + '</div>';
    messagesDiv.appendChild(msg);
    scrollToBottom();
  }

  function addUserMessage(text) {
    var msg = document.createElement('div');
    msg.className = 'ingrid-msg user';
    msg.innerHTML =
      '<div class="ingrid-msg-bubble">' + escapeHtml(text) + '</div>' +
      '<div class="ingrid-msg-time">' + getTime() + '</div>';
    messagesDiv.appendChild(msg);
    scrollToBottom();
  }

  function showTyping() {
    var typing = document.createElement('div');
    typing.className = 'ingrid-msg bot';
    typing.id = 'ingrid-typing';
    typing.innerHTML =
      '<div class="ingrid-typing-wrap">' +
        '<div class="ingrid-typing-dot"></div>' +
        '<div class="ingrid-typing-dot"></div>' +
        '<div class="ingrid-typing-dot"></div>' +
      '</div>';
    messagesDiv.appendChild(typing);
    scrollToBottom();
  }

  function removeTyping() {
    var t = document.getElementById('ingrid-typing');
    if (t) t.remove();
  }

  function scrollToBottom() {
    setTimeout(function () {
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }, 60);
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Formatea texto de Claude en HTML con parrafos y listas bien espaciados.
   */
  function formatText(text) {
    var html = escapeHtml(text);

    // Bold: **texto** -> <strong>texto</strong>
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Code: `texto` -> <code>texto</code>
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');

    // Dividir en bloques por doble salto de linea
    var blocks = html.split(/\n\n+/);
    var output = [];

    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i].trim();
      if (!block) continue;

      var lines = block.split('\n');

      // Detectar si TODAS las lineas son items de lista
      var allList = true;
      for (var j = 0; j < lines.length; j++) {
        if (!lines[j].trim().match(/^- /)) { allList = false; break; }
      }

      if (allList && lines.length > 0) {
        var items = '';
        for (var k = 0; k < lines.length; k++) {
          items += '<li>' + lines[k].trim().replace(/^- /, '') + '</li>';
        }
        output.push('<ul class="ingrid-ul">' + items + '</ul>');
      } else {
        // Detectar lineas mezcladas (texto + lista)
        var hasList = false;
        for (var m = 0; m < lines.length; m++) {
          if (lines[m].trim().match(/^- /)) { hasList = true; break; }
        }

        if (hasList) {
          var textPart = [];
          var listPart = [];
          var inList = false;
          for (var n = 0; n < lines.length; n++) {
            if (lines[n].trim().match(/^- /)) {
              inList = true;
              listPart.push(lines[n].trim().replace(/^- /, ''));
            } else if (!inList) {
              textPart.push(lines[n]);
            } else {
              if (listPart.length > 0) {
                if (textPart.length > 0) {
                  output.push('<div class="ingrid-p">' + textPart.join('<br>') + '</div>');
                  textPart = [];
                }
                var li = '';
                for (var p = 0; p < listPart.length; p++) li += '<li>' + listPart[p] + '</li>';
                output.push('<ul class="ingrid-ul">' + li + '</ul>');
                listPart = [];
                inList = false;
              }
              textPart.push(lines[n]);
            }
          }
          if (textPart.length > 0) {
            output.push('<div class="ingrid-p">' + textPart.join('<br>') + '</div>');
          }
          if (listPart.length > 0) {
            var rest = '';
            for (var q = 0; q < listPart.length; q++) rest += '<li>' + listPart[q] + '</li>';
            output.push('<ul class="ingrid-ul">' + rest + '</ul>');
          }
        } else {
          output.push('<div class="ingrid-p">' + block.replace(/\n/g, '<br>') + '</div>');
        }
      }
    }

    return output.join('');
  }

  async function sendMessage(text) {
    if (isWaiting || !text.trim()) return;
    var question = text.trim();
    addUserMessage(question);
    input.value = '';
    input.style.height = 'auto';
    isWaiting = true;
    sendBtn.disabled = true;
    showTyping();

    try {
      var response = await fetch(INGRID_API + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question }),
      });
      removeTyping();
      if (response.ok) {
        var data = await response.json();
        addBotMessage(data.response);
      } else {
        addBotMessage('Hubo un error procesando la pregunta. Intenta de nuevo.');
      }
    } catch (e) {
      removeTyping();
      addBotMessage('No se pudo conectar con el servidor. Verifica que INGRID este corriendo.');
    }

    isWaiting = false;
    sendBtn.disabled = false;
    input.focus();
  }

  // Quick action buttons
  quickActions.querySelectorAll('.ingrid-quick-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      sendMessage(btn.getAttribute('data-msg'));
    });
  });

  floatBtn.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);
  sendBtn.addEventListener('click', function () { sendMessage(input.value); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input.value); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) toggleChat();
  });

  console.log('[INGRID] Widget v7 cargado');
})();
