# Guida al Deploy e a GitHub

Questa applicazione è stata costruita in **Node.js** con React/Vite (Frontend) ed Express (Backend), usando `fluent-ffmpeg` per la conversione in locale sul server. 

## 1. Caricare il Progetto su GitHub

Per prima cosa, salva il codice su GitHub per non perderlo. Da Google AI Studio, puoi esportare il progetto come `.zip` (tramite l'icona Download/Esporta), oppure puoi inizializzare la repo dal tuo VPS.

Se lo fai dal tuo computer locale:
```bash
# Scompatta lo zip
cd mio-progetto

# Inizializza git
git init
git add .
git commit -m "Primo commit - App per scaricare video"

# Crea un nuovo repository su GitHub.com, copia il link e aggiungilo
git remote add origin https://github.com/TUO-UTENTE/TUA-REPO.git
git branch -M main
git push -u origin main
```

## 2. Installazione sul tuo VPS (Ubuntu/Debian)

Sul tuo server VPS, assicurati di avere Node.js installato (versione 18 o superiore consigliata).

### Passaggio A: Installa i requisiti iniziali
Esegui questi comandi sul server:

```bash
# Aggiorna il server
sudo apt update && sudo apt upgrade -y

# Installa Node.js (se non lo hai già)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Installa PM2 (process manager per tenerlo sempre online)
sudo npm install -g pm2
```

### Passaggio B: Clona la repo e installa le dipendenze
```bash
# Clona il tuo codice da GitHub
git clone https://github.com/TUO-UTENTE/TUA-REPO.git
cd TUA-REPO

# Installa le dipendenze dell'app
npm install

# Installa ffmpeg (utile a livello di sistema operativo come backup, anche se usiamo ffmpeg-static)
sudo apt install ffmpeg -y
```

### Passaggio C: Compila e Avvia
```bash
# Compila sia il Frontend (Vite) che il Backend
npm run build

# Avvia l'app in background con PM2
pm2 start npm --name "SocialDownloader" -- run start

# Fai in modo che PM2 si riavvii se il VPS si spegne
pm2 startup
pm2 save
```

L'applicazione adesso è attiva sulla porta **3000** del tuo server (`http://INDIRIZZO_IP_VPS:3000`).

## 3. Collegare il tuo Dominio (Reverse Proxy Nginx)

Per raggiungere l'app tramite `https://iltuodominio.com`, installa **Nginx** e un certificato SSL.

```bash
sudo apt install nginx -y
```

Crea il file di configurazione nginx per il tuo dominio:
```bash
sudo nano /etc/nginx/sites-available/socialdownloader
```

Incolla questo blocco (cambiando `iltuodominio.com`):
```nginx
server {
    listen 80;
    server_name iltuodominio.com www.iltuodominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Salva e attiva la configurazione:
```bash
sudo ln -s /etc/nginx/sites-available/socialdownloader /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Ottenere l'HTTPS (SSL) Gratis
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d iltuodominio.com -d www.iltuodominio.com
```

Ora l'app è live e sicura sul tuo dominio!

## Note su Instagram e Limiti
Per i video di Instagram, usa le impostazioni dell'app ("Settings") per incollare il tuo `sessionid` ricavato dal browser. Questo permette al server di fingere che stai navigando tu, bypassando la schermata di login. Meno scarichi intensivamente, minore è il rischio di ban temporanei. Non diffondere il tuo `sessionid`!
