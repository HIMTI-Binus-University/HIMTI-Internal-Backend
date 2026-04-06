# HIMTI Core Internal Backend 

This is the internal tools backend API service for **HIMTI**. Built using **Node.js**, **Express**, and **TypeScript**, **PostgreSQL**, featuring **Prisma ORM** for database management and configured with strict linting and formatting rules.

## Tech Stack

* **Runtime:** Node.js
* **Framework:** Express.js
* **Language:** TypeScript
* **Database + ORM:** PostgreSQL + Prisma

## Prerequisites

Before you begin, ensure you have the following installed on your machine:

* **Node.js** (v18 or higher recommended)
* **npm** 
* **PostgreSQL** 

## Installation & Setup

Follow these steps to set up the project locally.

### 1. Clone the Repository

    git clone https://github.com/your-username/himti-internal-backend.git
    cd himti-internal-backend

### 2. Install Dependencies

Install the required node modules using npm:

    npm install

### 3. Configure Environment Variables

Read `.env.example`

### 4. Database Setup (Prisma)

Generate the Prisma client and push the schema to your database:

    # Generate Prisma Client
    npx prisma generate

    # Run Migrations (to sync database with schema)
    npx prisma migrate dev --name init

## Running the Application

### Development Mode
Runs the server.

    npm run dev

## Project Structure

    himti-internal-backend/
    ├── prisma/            # Prisma schema and migrations
    ├── src/               # Source code (Controllers, Routes, Services)
    ├── .eslintrc.ts       # ESLint configuration
    ├── .prettierrc        # Prettier configuration
    ├── package.json       # Project scripts and dependencies
    └── tsconfig.json      # TypeScript configuration

## Contributing / Workflow

1.  Create a new branch for your feature (`git checkout -b feature/fitur-gacor`).
2.  Commit your changes with semantic commits (`git commit -m 'feat: Add some amazing feature [HIMTI-Number]'`).
3.  Push to the branch (`git push origin feature/fitur-gacor).
4.  Open a Pull Request.

---
**HIMTI Internal Dev Team**
