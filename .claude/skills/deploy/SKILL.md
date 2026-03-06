---
name: deploy
description: Build e deploy dell'app sul VPS di produzione
disable-model-invocation: true
---

# Deploy su produzione

Esegui il deploy dell'app dashboard-ticket sul VPS di produzione.

## Passaggi

1. **Build**: Esegui `npm run build` e verifica che non ci siano errori
2. **Sync**: Copia la cartella `.next/` sul server con rsync:
   ```bash
   rsync -az --delete -e "ssh -i ~/.ssh/id_ed25519" .next/ stefano@212.132.112.236:/var/www/dashboard-ticket/.next/
   ```
3. **Restart**: Riavvia il processo PM2 sul server:
   ```bash
   ssh -i ~/.ssh/id_ed25519 stefano@212.132.112.236 "cd /var/www/dashboard-ticket && pm2 restart dashboard-ticket"
   ```
4. **Verifica**: Conferma che il deploy e' andato a buon fine mostrando l'output di PM2

## Note

- L'utente SSH e' **stefano** (non root)
- La chiave SSH e' `~/.ssh/id_ed25519`
- Il path sul server e' `/var/www/dashboard-ticket`
- Il processo PM2 si chiama `dashboard-ticket`
- Se la build fallisce, NON procedere con il deploy. Mostra gli errori e chiedi come procedere.
