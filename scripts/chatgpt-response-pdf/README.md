# ChatGPT – Scarica risposta in PDF

Userscript Tampermonkey che aggiunge un pulsante PDF alla barra delle azioni di ogni risposta di ChatGPT.

## Installazione diretta

[Installa lo userscript](https://raw.githubusercontent.com/ricibald/userscripts/main/scripts/chatgpt-response-pdf/chatgpt-response-pdf.user.js)

Tampermonkey intercetta il file `.user.js` e mostra la schermata di conferma.

## Funzionalità

- esporta esclusivamente la risposta selezionata;
- formato PDF A4;
- supporta tabelle, blocchi di codice, immagini e risposte generate dinamicamente;
- neutralizza i colori CSS moderni `lab()`/oklab usati da ChatGPT e non supportati da html2canvas 1.4.1;
- genera il nome del file dal titolo della conversazione;
- verifica automaticamente gli aggiornamenti tramite `@updateURL` e `@downloadURL`.

## Aggiornamenti

Tampermonkey confronta il valore `@version` installato con quello del file pubblicato. Per distribuire una nuova versione:

1. modifica lo userscript;
2. incrementa `@version`;
3. aggiorna il changelog;
4. esegui il commit sul branch `main`.

Gli URL Raw rimangono stabili e non devono essere modificati.

## Changelog

### 1.2.0

- aggiunti `@updateURL` e `@downloadURL`;
- gestione esplicita del mancato caricamento di html2pdf;
- neutralizzazione degli stili CSS incompatibili con html2canvas;
- migliorata la gestione del layout A4, delle immagini e degli errori.

## Dipendenze

- [html2pdf.js 0.10.1](https://github.com/eKoopmans/html2pdf.js)

## Licenza

MIT.
