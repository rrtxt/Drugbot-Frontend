# Drugbot Frontend

This is the frontend for Drugbot, a chatbot for drug recommendation that leverages Large Language Models (LLMs) and Retrieval-Augmented Generation (RAG).

## User Interface

![Drugbot UI](docs/Drugbot%20UI.png)

## Table of Contents

- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Available Scripts](#available-scripts)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
  - [Docker](#docker)
- [Technologies Used](#technologies-used)

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You need to have Node.js and npm (or pnpm/yarn/bun) installed on your machine.

- [Node.js](https://nodejs.org/) (v23 or higher recommended, as per Dockerfile)
- [npm](https://www.npmjs.com/get-npm)

### Installation

1.  Clone the repo
    ```sh
    git clone https://github.com/your_username/drugbot-frontend.git
    ```
2.  Install NPM packages
    ```sh
    npm install
    ```
3.  Start the development server
    ```sh
    npm run dev
    ```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Available Scripts

In the project directory, you can run:

-   `npm run dev`: Runs the app in the development mode using Turbopack.
-   `npm run build`: Builds the app for production.
-   `npm run start`: Starts the production server.
-   `npm run lint`: Lints the code using Next.js's built-in ESLint configuration.

## Environment Variables

The application uses the following environment variable:

-   `NEXT_PUBLIC_BACKEND_URL`: The URL of the backend service. It defaults to `http://localhost:5000`. The frontend rewrites requests from `/api` to this URL.

## Deployment

### Docker

This project includes a `Dockerfile` for containerization.

To build the Docker image for production:

```sh
docker build -t drugbot-frontend .
```

To run the container:

```sh
docker run -p 3000:3000 -e NEXT_PUBLIC_BACKEND_URL=<your_backend_url> drugbot-frontend
```

Replace `<your_backend_url>` with the actual URL of your backend service.

## Technologies Used

-   [Next.js](https://nextjs.org/) - React Framework
-   [React](https://reactjs.org/) - JavaScript library for building user interfaces
-   [TypeScript](https://www.typescriptlang.org/) - Typed JavaScript
-   [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
-   [React Toastify](https://fkhadra.github.io/react-toastify/introduction/) - For notifications
-   [Docker](https://www.docker.com/) - Containerization platform 