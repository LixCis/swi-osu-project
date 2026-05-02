# BrigadnikApp

Worker time-tracking system for events. Admins create events and positions, workers register and track their hours in real time.

## Stack

- **Backend:** Java 21, Spring Boot 3.4.1, MariaDB
- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Vite 6

## Setup

Create a `.env` file in the project root (it is gitignored — never committed):

```env
DB_URL=jdbc:mariadb://<host>:<port>/<database>
DB_USERNAME=<username>
DB_PASSWORD=<password>
JWT_SECRET=<random-secret-string>
```

The application requires an existing MariaDB database. All tables are created automatically by Hibernate on first start (`ddl-auto=update`) — no migration scripts need to be run manually.

## Run

```bash
docker compose up --build
```

Frontend: http://localhost:5173  
Backend API: http://localhost:8080
