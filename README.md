# Runner Pro — PWA running & nutrition

Prima versione funzionante di una Progressive Web App in italiano, pensata per iPhone e GitHub Pages.

## Funzioni incluse
- Dashboard con allenamento del giorno, chilometri settimanali, peso e riepilogo nutrizionale.
- Generatore di piano orientativo per 5 km, 10 km, mezza maratona e maratona.
- Scelta dei giorni di allenamento, data gara e volume settimanale attuale.
- Modifica delle sedute, registrazione completamento e dati effettivi.
- Catalogo personalizzabile dei gel e stima dei carboidrati.
- Diario alimentare manuale con calcolo proporzionale di calorie e macronutrienti.
- Registro del peso.
- Impostazioni profilo e obiettivi nutrizionali.
- Esportazione backup JSON, ripristino, esportazione CSV.
- Service worker per uso offline dopo il primo caricamento.

## Pubblicazione con GitHub Pages
1. Crea un repository GitHub, per esempio `runner-pro`.
2. Carica tutti i file e la cartella `icons` nella radice del repository.
3. Apri **Settings → Pages**.
4. In **Build and deployment**, scegli **Deploy from a branch**, branch `main`, folder `/ (root)`, poi salva.
5. Attendi la pubblicazione e apri l'URL `https://TUO-UTENTE.github.io/runner-pro/` con Safari su iPhone.
6. In Safari premi **Condividi → Aggiungi alla schermata Home**.

Se il repository è pubblicato sotto un percorso diverso, i riferimenti relativi `./` dovrebbero continuare a funzionare.

## Dati e privacy
I dati sono salvati in localStorage sul browser del dispositivo. Non c'è sincronizzazione cloud e non c'è connessione Garmin Connect. Esporta regolarmente un backup JSON. La cancellazione dei dati del browser può rimuovere i dati locali.

## Note
- Il piano è una base orientativa e non sostituisce un allenatore o una valutazione medica.
- Gli obiettivi nutrizionali sono modificabili e non costituiscono una dieta prescritta.
- Per l'uso dei gel, verificare le etichette e provare le strategie in allenamento.
- Google Fonts viene richiesto online per il carattere Inter; il sistema usa font di riserva offline.
