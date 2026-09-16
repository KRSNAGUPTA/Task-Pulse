# Task Pulse

**Task Pulse** is a production-grade, containerized microservices monorepo designed for efficient task management, automated alerts, and scalable cloud deployments. It serves as a robust showcase of modern backend architecture, polyglot persistence, container orchestration, and an enterprise API gateway pattern.

Acc: Krx

---

## Technology Stack & Architecture

Task Pulse follows a decoupled microservices approach managed within a single monorepo:

| Service                  | Path                              | Status               | Stack                                                                 |
|--------------------------|-----------------------------------|----------------------|-----------------------------------------------------------------------|
| **Frontend**             | `apps/web-frontend`               | In Development       | Next.js (App Router), TypeScript, Tailwind CSS                        |              |
| **Auth Service**         | `services/auth-service`           | Complete             | Express, TypeScript, Prisma 7 ORM, PostgreSQL (registration, auth, JWT) |
| **Task Service**         | `services/task-service`           | Partially Complete   | Express, TypeScript, Mongoose ODM, MongoDB (task CRUD & metadata)     |
| **Notification Service** | `services/notification-service`   | In Development       | Express, TypeScript, Nodemailer (asynchronous email alerts)           |

**Testing Stack:** Vitest + Supertest for unit and integration testing.

---
## Architecture Diagram

<img width="735" height="411" alt="Task Pulse" src="https://github.com/user-attachments/assets/dde1d74c-d7fb-4508-8247-6a3dead09278" />


## Project Structure

```text
Task-Pulse/
├── .github/workflows/          # CI/CD pipelines (GitHub Actions)
├── apps/
│   └── web-frontend/           # Next.js client application
├── services/
│   ├── auth-service/           # PostgreSQL + Prisma Auth microservice
│   ├── task-service/           # MongoDB + Mongoose Task microservice
│   └── notification-service/   # Async notification handler
├── compose.dev.yaml            # Local development orchestration
├── README.md
└── .env                        # Docker Compose environment (see .env.example)

```

## Getting Started (Local Development)

### Prerequisites

- [Docker & Docker Compose](https://www.docker.com/)
- Node.js (v20+ recommended) for local testing or scripts

### 1. Clone the Repository

```bash
git clone https://github.com/krsnagupta/task-pulse.git
cd task-pulse
```

### 2. Configure Environment Variables

Copy the root `.env.example` (or configure individual service `.env` files) and provide the required database URIs, secrets, and port mappings.

### 3. Run with Docker Compose

Spin up the infrastructure databases and microservices:

```bash
docker compose -f compose.dev.yaml up --build
```

This automatically configures:

| Component | Port | Notes |
|-----------|------|-------|
| PostgreSQL | `5432` | — |
| MongoDB | `27017` | — |
| Auth Service | `5003` | Includes automated Prisma schema migration (`npx prisma migrate deploy`) |
| Task Service | `5002` | — |

---

## Deployment Strategy

Task Pulse is designed for an independent **Dockerized cloud deployment** model (optimized for platforms such as Render and Vercel):

- **Microservices** : Deployed independently as Docker web services to ensure isolated failure domains, tailored scaling, and subfolder-safe root contexts.
- **Frontend** : Hosted on Vercel and communicates exclusively through the Kong API Gateway layer.

---

## Project Status

| Component | Status |
|-----------|--------|
| **Core Auth Service** | Completed & Verified (Prisma 7, PostgreSQL, JWT, Vitest/Supertest suites passing) |
| **Task Service & Kong Gateway** | Active development / integration phase |
