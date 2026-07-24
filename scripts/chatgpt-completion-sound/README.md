# ChatGPT – Suono a risposta completata

Riproduce un breve doppio tono quando ChatGPT termina di generare una risposta e segnala visivamente la scheda che richiede attenzione.

**Versione:** 1.1.0

## Installazione

[Installa con Tampermonkey](https://raw.githubusercontent.com/ricibald/userscripts/main/scripts/chatgpt-completion-sound/chatgpt-completion-sound.user.js)

Aprendo il link, Tampermonkey mostra la schermata di installazione. Confermare con **Installa**.

## Pagine supportate

- `https://chatgpt.com/*`
- `https://www.chatgpt.com/*`

## Utilizzo

Lo script si attiva automaticamente. Dopo ogni caricamento della pagina, il primo click o tasto premuto abilita l'audio secondo le regole di autoplay del browser. Il normale invio di un prompt è sufficiente.

Se la risposta termina mentre la scheda o la finestra non è attiva:

- il titolo della scheda mostra **🔔 RISPOSTA PRONTA**;
- la favicon viene sostituita temporaneamente da un indicatore rosso;
- gli indicatori scompaiono appena si torna sulla scheda.

Dal menu di Tampermonkey sono disponibili i comandi **Prova il suono di completamento** e **Prova l’indicatore di attenzione**.

## Funzionamento

La fine della risposta viene rilevata osservando lo stato dinamico dell'interfaccia di ChatGPT e la stabilizzazione dell'ultimo messaggio dell'assistente. Non vengono effettuate chiamate di rete e non vengono letti o trasmessi dati della conversazione.

## Aggiornamenti

Lo script include `@updateURL` e `@downloadURL`: Tampermonkey può quindi rilevare automaticamente le nuove versioni pubblicate.
