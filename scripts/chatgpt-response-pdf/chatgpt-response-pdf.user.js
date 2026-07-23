// ==UserScript==
// @name         ChatGPT - Scarica risposta in PDF
// @namespace    https://chatgpt.com/
// @version      1.2.0
// @description  Aggiunge a ogni risposta di ChatGPT un pulsante per scaricarla come PDF.
// @author       Riccardo
// @match        https://chatgpt.com/*
// @match        https://www.chatgpt.com/*
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js
// @updateURL    https://raw.githubusercontent.com/ricibald/userscripts/main/scripts/chatgpt-response-pdf/chatgpt-response-pdf.user.js
// @downloadURL  https://raw.githubusercontent.com/ricibald/userscripts/main/scripts/chatgpt-response-pdf/chatgpt-response-pdf.user.js
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    const BUTTON_MARKER = 'data-chatgpt-pdf-button';
    let scanScheduled = false;

    const pdfIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
             viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
             aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M14 2v6h6M12 11v7m0 0-3-3m3 3 3-3"/>
        </svg>`;

    function safeFilename(value) {
        return value
            .replace(/\s*[|–—-]\s*ChatGPT\s*$/i, '')
            .replace(/[\\/:*?"<>|]/g, '-')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 90) || 'risposta-chatgpt';
    }

    function findTurn(actions) {
        let node = actions.parentElement;
        while (node && node !== document.body) {
            if (node.querySelector(':scope [data-message-author-role="assistant"]')) return node;
            node = node.parentElement;
        }
        return null;
    }

    function collectResponse(turn) {
        const messages = [...turn.querySelectorAll('[data-message-author-role="assistant"]')];
        const wrapper = document.createElement('main');
        wrapper.className = 'chatgpt-pdf-document';

        for (const message of messages) {
            const content = message.querySelector('.markdown, [class*="markdown"]');
            if (content) wrapper.append(content.cloneNode(true));
        }

        // html2canvas 1.4.1 non comprende i colori CSS moderni lab()/oklab()
        // usati da ChatGPT. Rimuoviamo quindi dal clone classi e stili originali,
        // mantenendo struttura semantica e contenuto della risposta.
        wrapper.querySelectorAll('*').forEach((element) => {
            if (element.matches('button, [role="button"], script, style')) {
                element.remove();
                return;
            }

            element.removeAttribute('class');
            element.removeAttribute('style');
            element.style.setProperty('color', 'rgb(17, 17, 17)', 'important');
            element.style.setProperty('background-color', 'transparent', 'important');
            element.style.setProperty('background-image', 'none', 'important');
            element.style.setProperty('border-color', 'rgb(204, 204, 204)', 'important');
            element.style.setProperty('outline-color', 'rgb(17, 17, 17)', 'important');
            element.style.setProperty('text-decoration-color', 'rgb(17, 17, 17)', 'important');
            element.style.setProperty('box-shadow', 'none', 'important');
            element.style.setProperty('text-shadow', 'none', 'important');
            element.style.setProperty('filter', 'none', 'important');
        });
        return wrapper;
    }

    function addPdfStyles(root) {
        const style = document.createElement('style');
        style.textContent = `
            .chatgpt-pdf-document {
                box-sizing: border-box; color: #111; background: #fff;
                width: 190mm; padding: 4mm; font-family: Arial, Helvetica, sans-serif;
                font-size: 11pt; line-height: 1.5;
            }
            .chatgpt-pdf-document *, .chatgpt-pdf-document *::before,
            .chatgpt-pdf-document *::after {
                box-sizing: border-box;
                color: rgb(17, 17, 17) !important;
                background-color: transparent !important;
                background-image: none !important;
                border-color: rgb(204, 204, 204) !important;
                outline-color: rgb(17, 17, 17) !important;
                text-decoration-color: rgb(17, 17, 17) !important;
                fill: currentColor !important;
                stroke: currentColor !important;
                box-shadow: none !important;
                text-shadow: none !important;
                filter: none !important;
            }
            .chatgpt-pdf-document h1, .chatgpt-pdf-document h2,
            .chatgpt-pdf-document h3 { line-height: 1.25; break-after: avoid-page; }
            .chatgpt-pdf-document p { orphans: 3; widows: 3; }
            .chatgpt-pdf-document pre {
                white-space: pre-wrap; overflow-wrap: anywhere; padding: 10px;
                background: #f4f4f4; border: 1px solid #ddd; border-radius: 6px;
            }
            .chatgpt-pdf-document code { overflow-wrap: anywhere; }
            .chatgpt-pdf-document table {
                width: 100% !important; min-width: 0 !important;
                border-collapse: collapse; table-layout: auto;
            }
            .chatgpt-pdf-document tr { break-inside: avoid-page; }
            .chatgpt-pdf-document th, .chatgpt-pdf-document td {
                border-bottom: 1px solid #ccc; padding: 6px 8px;
                overflow-wrap: anywhere; vertical-align: top;
            }
            .chatgpt-pdf-document img { max-width: 100%; height: auto; }
            .chatgpt-pdf-document a { color: #0645ad; text-decoration: none; }
            .chatgpt-pdf-document blockquote {
                margin-left: 0; padding-left: 12px; border-left: 3px solid #aaa;
            }
        `;
        root.prepend(style);
    }

    async function downloadPdf(actions, button) {
        const turn = findTurn(actions);
        const response = turn && collectResponse(turn);

        if (!response || !response.textContent.trim()) {
            alert('Non riesco a individuare il contenuto di questa risposta.');
            return;
        }

        if (typeof window.html2pdf !== 'function') {
            alert('La libreria PDF non è stata caricata. Ricarica la pagina e riprova.');
            return;
        }

        const originalLabel = button.getAttribute('aria-label');
        button.disabled = true;
        button.setAttribute('aria-label', 'Creazione PDF in corso');
        button.style.opacity = '0.55';

        const staging = document.createElement('div');
        staging.style.cssText = 'position:fixed;left:-100000px;top:0;width:210mm;background:#fff;z-index:-1;pointer-events:none';
        staging.append(response);
        addPdfStyles(response);
        document.body.append(staging);

        try {
            await new Promise((resolve) => {
                requestAnimationFrame(() => requestAnimationFrame(resolve));
            });
            const title = safeFilename(document.title);
            await window.html2pdf().set({
                margin: [8, 8, 8, 8],
                filename: `${title}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    logging: false
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
                pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', 'pre', 'blockquote', 'img'] }
            }).from(response).save();
        } catch (error) {
            console.error('[ChatGPT PDF]', error);
            alert(`Creazione PDF non riuscita:\n${error.message || error}`);
        } finally {
            staging.remove();
            button.disabled = false;
            button.setAttribute('aria-label', originalLabel);
            button.style.opacity = '';
        }
    }

    function createButton(actions) {
        if (actions.querySelector(`[${BUTTON_MARKER}]`)) return;

        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute(BUTTON_MARKER, '');
        button.setAttribute('aria-label', 'Scarica risposta in PDF');
        button.title = 'Scarica risposta in PDF';
        button.className = 'text-token-text-secondary hover:bg-token-surface-hover touch:w-10 flex h-8 w-8 items-center justify-center rounded-lg';
        button.style.cssText = 'pointer-events:auto;cursor:pointer;flex:0 0 auto';
        button.innerHTML = pdfIcon;
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            downloadPdf(actions, button);
        });

        const copyButton = actions.querySelector('[data-testid="copy-turn-action-button"]');
        if (copyButton) copyButton.insertAdjacentElement('afterend', button);
        else actions.append(button);
    }

    function scan() {
        scanScheduled = false;
        document.querySelectorAll('[aria-label="Response actions"]').forEach(createButton);
    }

    function scheduleScan() {
        if (scanScheduled) return;
        scanScheduled = true;
        requestAnimationFrame(scan);
    }

    new MutationObserver(scheduleScan).observe(document.body, {
        childList: true,
        subtree: true
    });

    scan();
})();
