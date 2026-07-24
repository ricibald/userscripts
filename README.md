# Userscripts

Raccolta pubblica di userscript Tampermonkey mantenuti da [ricibald](https://github.com/ricibald).

## Script disponibili

| Script | Descrizione | Installazione |
|---|---|---|
| ChatGPT – Scarica risposta in PDF | Aggiunge a ogni risposta di ChatGPT un pulsante per esportarla in PDF A4. | [Installa](https://raw.githubusercontent.com/ricibald/userscripts/main/scripts/chatgpt-response-pdf/chatgpt-response-pdf.user.js) |
| ChatGPT – Suono a risposta completata | Riproduce un suono e segnala la scheda quando ChatGPT termina una risposta. | [Installa](https://raw.githubusercontent.com/ricibald/userscripts/main/scripts/chatgpt-completion-sound/chatgpt-completion-sound.user.js) |

## Installazione

1. Installa [Tampermonkey](https://www.tampermonkey.net/) nel browser.
2. Apri il link **Installa** dello script desiderato.
3. Conferma l'installazione nella schermata aperta da Tampermonkey.

## Aggiornamenti

Ogni userscript dichiara `@updateURL` e `@downloadURL` verso il file Raw sul branch `main`. Tampermonkey confronta il valore `@version` installato con quello pubblicato e propone o applica l'aggiornamento secondo le impostazioni dell'estensione.

## Struttura

Ogni script risiede in una cartella autonoma sotto `scripts/` e contiene lo userscript `.user.js` e la relativa documentazione.

## Licenza

Codice distribuito con licenza [MIT](LICENSE), salvo diversa indicazione nella cartella del singolo script.
