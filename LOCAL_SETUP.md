# Local Development Setup

## Prerequisites

1. **Node.js 18+** - Download from [nodejs.org](https://nodejs.org/)
2. **PostgreSQL** - Install locally or use a cloud provider
3. **Google AI API Key** - Get from [Google AI Studio](https://aistudio.google.com/)

## Quick Setup Steps

### 1. Environment Configuration

Create a `.env` file in the root directory with your database credentials:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/your_database_name
SESSION_SECRET=your-super-secret-session-key-here
GOOGLE_AI_API_KEY=your-google-ai-api-key
NODE_ENV=development
PORT=5000
```

### 2. Database Setup

Run these commands to set up your database:

```bash
# Generate migration files
npx drizzle-kit generate

# Apply migrations to your database
npx drizzle-kit migrate

# Optional: Open database studio
npx drizzle-kit studio
```

### 3. Start Development Server

```bash
npm run dev
```

Your app will be available at `http://localhost:5000`

## Vercel Deployment

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Deploy

```bash
vercel
```

### 3. Set Environment Variables

In your Vercel dashboard, add these environment variables:

- `DATABASE_URL` - Your PostgreSQL connection string
- `SESSION_SECRET` - A secure random string
- `GOOGLE_AI_API_KEY` - Your Google AI API key
- `NODE_ENV` - Set to `production`

## Database Commands

- `npx drizzle-kit generate` - Generate migration files
- `npx drizzle-kit migrate` - Apply migrations
- `npx drizzle-kit push` - Push schema changes directly
- `npx drizzle-kit studio` - Open database browser

## Troubleshooting

### Database Connection Issues
- Verify your PostgreSQL server is running
- Check your `DATABASE_URL` format
- Ensure the database exists

### Build Issues
- Run `npm run check` to verify TypeScript
- Check for missing environment variables

### Vercel Deployment Issues
- Ensure all environment variables are set
- Check build logs in Vercel dashboard
- Verify your database is accessible from Vercel