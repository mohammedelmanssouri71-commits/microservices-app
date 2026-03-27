# microservices-tp

Architecture :

Client React → REST API Gateway (3000) → gRPC → Microservices
                                    ↘ RabbitMQ → Auth Service

## Services

- user-service (gRPC 50051, `users_db`)
- movie-service (gRPC 50052, `movies_db`)
- review-service (gRPC 50053, `reviews_db`)
- auth-service (RabbitMQ consumer, `auth_db`)
- api-gateway (REST Express, 3000)
- movies-client (React, 3001)

## Lancement avec Docker (recommandé)

### Prérequis

- Docker + Docker Compose
- Un fichier `.env` à la racine (vous pouvez partir de `.env.example`)

```bash
cp .env.example .env
# puis remplir les URI MongoDB Atlas + JWT_SECRET + TMDB_API_KEY
```

### Démarrer toute la stack

```bash
docker compose up --build
```

- Frontend : http://localhost:3001
- API Gateway : http://localhost:3000
- RabbitMQ UI : http://localhost:15672 (`guest/guest`)

### Arrêter

```bash
docker compose down
```

## Installation backend (sans Docker)

```bash
npm install
```

## Installation frontend (sans Docker)

```bash
cd movies-client
npm install
```

## Installation RabbitMQ (sans Docker)

### Windows
1. Installer Erlang : https://www.erlang.org/downloads
2. Installer RabbitMQ : https://www.rabbitmq.com/install-windows.html
3. Vérifier le service RabbitMQ dans Services Windows
4. (Optionnel) Activer le plugin management :
   ```bash
   rabbitmq-plugins enable rabbitmq_management
   ```
5. UI : http://localhost:15672 (`guest/guest`)

### macOS
```bash
brew install rabbitmq
brew services start rabbitmq
brew services list
```
UI : http://localhost:15672 (`guest/guest`)

### Linux (Ubuntu/Debian)
```bash
sudo apt-get install -y erlang
sudo apt-get install -y rabbitmq-server
sudo systemctl enable rabbitmq-server
sudo systemctl start rabbitmq-server
sudo systemctl status rabbitmq-server
sudo rabbitmq-plugins enable rabbitmq_management
```

## Configuration MongoDB Atlas

Chaque service utilise sa propre base. Remplissez `.env` avec vos URI Atlas (pas de localhost).

Checklist Atlas :
1. Créer cluster (https://cloud.mongodb.com)
2. Créer user DB avec droits read/write
3. Ajouter IP dans Network Access
4. Copier connection string Node.js

## Lancement sans Docker (ordre obligatoire)

```bash
node auth-service/server.js
node user-service/server.js
node movie-service/server.js
node review-service/server.js
node api-gateway/server.js
cd movies-client && npm start
```
