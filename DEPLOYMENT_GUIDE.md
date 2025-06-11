# Deployment Guide

## Local Development

### 1. Prerequisites
- Node.js 18+
- Your `.env` file is already configured with your Neon database

### 2. Run Database Migrations
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

### 3. Start Development Server
```bash
npm run dev
```
Access at: `http://localhost:5000`

## Vercel Deployment

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Deploy to Vercel
```bash
vercel --prod
```

### 3. Set Environment Variables in Vercel Dashboard
Add these variables in your Vercel project settings:

- `DATABASE_URL`: `postgresql://neondb_owner:npg_HbV8a0sxitpM@ep-bold-pine-a1y2ornk-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
- `GOOGLE_AI_API_KEY`: `AIzaSyB4_K7QTC43vkjkqw-sxfngxdfqUN7vNSU`
- `SESSION_SECRET`: `gopal123`
- `NODE_ENV`: `production`

### 4. Run Migrations on Production
After deployment, run migrations on your production database:
```bash
npx drizzle-kit migrate
```

## Features Available
- User authentication (parent, cook, child roles)
- AI-powered meal suggestions
- Meal planning with calendar
- Shopping list generation
- Activity tracking

## Database Schema
Your Neon database will have these tables:
- users (authentication and roles)
- meals (meal definitions)
- meal_plans (scheduled meals)
- activities (family activities)
- shopping_lists (shopping lists)
- shopping_items (individual items)
- sessions (user sessions)