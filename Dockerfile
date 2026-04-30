# Usa l'immagine ufficiale Node.js leggera per ottimizzare le risorse
FROM node:20-slim

# Installa le dipendenze di sistema richieste (incluso ffmpeg fondamentale per la conversione video)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Imposta la cartella di lavoro all'interno del container
WORKDIR /app

# Copia i file delle dipendenze Node prima di copiare il resto (per ottimizzare la cache di Docker)
COPY package*.json ./

# Installa tutte le dipendenze
RUN npm install

# Copia tutto il resto del progetto
COPY . .

# Effettua la build dell'applicazione
RUN npm run build

# Esponi la porta 3000 (quella su cui sta girando Express)
EXPOSE 3000

# Avvia l'applicazione in modalità produzione
CMD ["npm", "run", "start"]
