// ==UserScript==
// @name         ChatGPT - Suono a risposta completata
// @namespace    https://github.com/ricibald/userscripts
// @version      1.1.1
// @description  Riproduce un suono e richiama l'attenzione nativa quando ChatGPT termina.
// @author       Riccardo
// @match        https://chatgpt.com/*
// @match        https://www.chatgpt.com/*
// @homepageURL  https://github.com/ricibald/userscripts/tree/main/scripts/chatgpt-completion-sound
// @supportURL   https://github.com/ricibald/userscripts/issues
// @updateURL    https://raw.githubusercontent.com/ricibald/userscripts/main/scripts/chatgpt-completion-sound/chatgpt-completion-sound.user.js
// @downloadURL  https://raw.githubusercontent.com/ricibald/userscripts/main/scripts/chatgpt-completion-sound/chatgpt-completion-sound.user.js
// @run-at       document-idle
// @grant        GM_registerMenuCommand
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    const ASSISTANT_MESSAGE_SELECTOR = '[data-message-author-role="assistant"]';
    const PROMPT_SELECTOR = [
        '#prompt-textarea',
        'textarea[placeholder]',
        '[contenteditable="true"][data-virtualkeyboard]'
    ].join(',');
    const SEND_OR_RETRY_SELECTOR = [
        'button[data-testid="send-button"]',
        'button[aria-label*="Send message" i]',
        'button[aria-label*="Invia messaggio" i]',
        'button[aria-label*="Regenerate" i]',
        'button[aria-label*="Rigenera" i]',
        'button[aria-label*="Try again" i]',
        'button[aria-label*="Riprova" i]'
    ].join(',');
    const STOP_SELECTOR = [
        'button[data-testid="stop-button"]',
        'button[data-testid="stop-generating-button"]',
        'button[aria-label="Stop streaming"]',
        'button[aria-label*="Stop generating" i]',
        'button[aria-label*="Interrompi generazione" i]',
        'button[aria-label*="Ferma generazione" i]'
    ].join(',');

    const COMPLETION_DELAY_MS = 1800;
    const OBSERVER_DEBOUNCE_MS = 120;
    const ATTENTION_MESSAGE = 'ChatGPT ha completato la risposta.';
    const SOUND_DURATION_MS = 360;

    let audioContext = null;
    let audioUnlocked = false;
    let responseExpected = false;
    let generationObserved = false;
    let assistantChanged = false;
    let baselineSignature = '';
    let lastNotifiedSignature = '';
    let scanTimer = null;
    let completionTimer = null;

    function hashText(value) {
        let hash = 2166136261;
        for (let index = 0; index < value.length; index += 1) {
            hash ^= value.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(36);
    }

    function getLastAssistantSnapshot() {
        const messages = document.querySelectorAll(ASSISTANT_MESSAGE_SELECTOR);
        const message = messages[messages.length - 1];

        if (!message) {
            return { signature: '', count: 0 };
        }

        const turn = message.closest('[data-testid^="conversation-turn-"]');
        const stableId =
            message.getAttribute('data-message-id') ||
            turn?.getAttribute('data-testid') ||
            '';
        const text = (message.innerText || message.textContent || '').trim();

        return {
            count: messages.length,
            signature: `${messages.length}|${stableId}|${text.length}|${hashText(text)}`
        };
    }

    function isGenerating() {
        return Boolean(document.querySelector(STOP_SELECTOR));
    }

    function removeUnlockListeners() {
        document.removeEventListener('pointerdown', unlockAudio, true);
        document.removeEventListener('keydown', unlockAudio, true);
    }

    async function ensureAudioContext() {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            return false;
        }

        if (!audioContext) {
            audioContext = new AudioContextClass();
        }

        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        audioUnlocked = audioContext.state === 'running';
        if (audioUnlocked) {
            removeUnlockListeners();
        }

        return audioUnlocked;
    }

    function unlockAudio() {
        void ensureAudioContext().catch(() => {
            audioUnlocked = false;
        });
    }

    function scheduleTone(startTime, frequency) {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, startTime);
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.12, startTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.16);

        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.17);
    }

    async function playCompletionSound() {
        if (!audioUnlocked || !audioContext) {
            return;
        }

        try {
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            const now = audioContext.currentTime + 0.02;
            scheduleTone(now, 659.25);
            scheduleTone(now + 0.14, 880);
        } catch {
            // Il browser può sospendere l'audio in casi eccezionali; il prossimo
            // gesto dell'utente tenterà nuovamente lo sblocco.
            audioUnlocked = false;
            document.addEventListener('pointerdown', unlockAudio, true);
            document.addEventListener('keydown', unlockAudio, true);
        }
    }

    async function notifyCompletion() {
        await playCompletionSound();

        // Lascia terminare il doppio tono prima di aprire il dialogo modale.
        await new Promise((resolve) => window.setTimeout(resolve, SOUND_DURATION_MS));

        if (document.hidden || !document.hasFocus()) {
            window.alert(ATTENTION_MESSAGE);
        }
    }

    function markResponseExpected() {
        responseExpected = true;
        generationObserved = false;
        assistantChanged = false;
        baselineSignature = getLastAssistantSnapshot().signature;
        clearTimeout(completionTimer);
    }

    function completeResponse(expectedSignature) {
        completionTimer = null;

        if (isGenerating()) {
            generationObserved = true;
            return;
        }

        const current = getLastAssistantSnapshot();
        if (
            !responseExpected ||
            !assistantChanged ||
            !current.signature ||
            current.signature === baselineSignature
        ) {
            return;
        }

        if (current.signature !== expectedSignature) {
            scheduleCompletion(current.signature);
            return;
        }

        if (current.signature !== lastNotifiedSignature) {
            lastNotifiedSignature = current.signature;
            void notifyCompletion();
        }

        responseExpected = false;
        generationObserved = false;
        assistantChanged = false;
    }

    function scheduleCompletion(signature) {
        clearTimeout(completionTimer);
        completionTimer = setTimeout(
            () => completeResponse(signature),
            COMPLETION_DELAY_MS
        );
    }

    function scanState() {
        scanTimer = null;

        const generating = isGenerating();
        const current = getLastAssistantSnapshot();

        if (generating) {
            if (!responseExpected) {
                responseExpected = true;
                baselineSignature = current.signature;
            }
            generationObserved = true;
            clearTimeout(completionTimer);
        }

        if (
            responseExpected &&
            current.signature &&
            current.signature !== baselineSignature
        ) {
            assistantChanged = true;
        }

        if (
            responseExpected &&
            assistantChanged &&
            !generating &&
            (generationObserved || current.signature !== baselineSignature)
        ) {
            scheduleCompletion(current.signature);
        }
    }

    function scheduleScan() {
        clearTimeout(scanTimer);
        scanTimer = setTimeout(scanState, OBSERVER_DEBOUNCE_MS);
    }

    document.addEventListener(
        'submit',
        (event) => {
            if (event.target instanceof Element && event.target.querySelector(PROMPT_SELECTOR)) {
                markResponseExpected();
            }
        },
        true
    );

    document.addEventListener(
        'click',
        (event) => {
            if (
                event.target instanceof Element &&
                event.target.closest(SEND_OR_RETRY_SELECTOR)
            ) {
                markResponseExpected();
            }
        },
        true
    );

    document.addEventListener(
        'keydown',
        (event) => {
            if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.isComposing &&
                event.target instanceof Element &&
                event.target.matches(PROMPT_SELECTOR)
            ) {
                markResponseExpected();
            }
        },
        true
    );

    document.addEventListener('pointerdown', unlockAudio, true);
    document.addEventListener('keydown', unlockAudio, true);

    new MutationObserver(scheduleScan).observe(document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['aria-label', 'data-testid', 'disabled']
    });

    GM_registerMenuCommand('Prova il suono di completamento', () => {
        void ensureAudioContext().then((ready) => {
            if (ready) {
                void playCompletionSound();
            }
        });
    });

    GM_registerMenuCommand('Prova l’attenzione nativa fra 3 secondi', () => {
        window.setTimeout(() => window.alert(ATTENTION_MESSAGE), 3000);
    });

    const initial = getLastAssistantSnapshot();
    baselineSignature = initial.signature;
    if (isGenerating()) {
        responseExpected = true;
        generationObserved = true;
    }
}());
