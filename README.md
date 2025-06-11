# Family Meal Planning App

A comprehensive family meal planning application built with React, Node.js, and PostgreSQL.

## Features

- **Meal Planning**: Plan family meals with AI-powered suggestions
- **Role-based Access**: Different views for parents, cooks, and children
- **Shopping Lists**: Auto-generate shopping lists from meal plans
- **Activity Calendar**: Track family activities and events
- **User Authentication**: Secure login and registration

## Quick Start

### Prerequisites
- Node.js 18 or higher
- PostgreSQL database
- Google AI API key (for meal suggestions)

### Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Fill in your database credentials and API keys in `.env`

4. Run database migrations:
   ```bash
   npx drizzle-kit generate
   npx drizzle-kit migrate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:5000`

### Deploy to Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Set environment variables in Vercel dashboard:
   - `DATABASE_URL`
   - `SESSION_SECRET`
   - `GOOGLE_AI_API_KEY`

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret key for session encryption
- `GOOGLE_AI_API_KEY`: Google AI API key for meal suggestions
- `NODE_ENV`: Set to `production` for production deployment

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local strategy
- **AI Integration**: Google Gemini for meal suggestions