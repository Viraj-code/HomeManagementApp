# Complete Setup Guide

## Download and Local Setup

### 1. Download Files
Download all project files to your local machine. Your `.env` file is already configured with your Neon database credentials.

### 2. Local Development Setup
```bash
# Install dependencies
npm install

# Generate and run database migrations
npx drizzle-kit generate
npx drizzle-kit migrate

# Start development server
npm run dev
```

Your app will run on `http://localhost:5000`

## Vercel Deployment

### Method 1: Vercel CLI (Recommended)

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Deploy from your project directory**
```bash
vercel --prod
```

3. **Set Environment Variables**
In your Vercel dashboard, add these variables:
- `DATABASE_URL`: `postgresql://neondb_owner:npg_HbV8a0sxitpM@ep-bold-pine-a1y2ornk-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
- `GOOGLE_AI_API_KEY`: `AIzaSyB4_K7QTC43vkjkqw-sxfngxdfqUN7vNSU`
- `SESSION_SECRET`: `gopal123`
- `NODE_ENV`: `production`

### Method 2: GitHub + Vercel Dashboard

1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/your-repo.git
git push -u origin main
```

2. **Import in Vercel**
- Go to [vercel.com](https://vercel.com)
- Click "Import Project"
- Connect your GitHub repository
- Add the environment variables listed above

## Important Files Already Configured

✅ **vercel.json** - Vercel deployment configuration
✅ **.env** - Your environment variables
✅ **drizzle.config.ts** - Database configuration
✅ **package.json** - Dependencies and scripts
✅ **README.md** - Project documentation
✅ **.gitignore** - Git ignore rules

## Features Ready to Use

- User authentication with roles (parent, cook, child)
- AI-powered meal suggestions using Google Gemini
- Meal planning with calendar view
- Auto-generated shopping lists
- Activity tracking
- Responsive design with dark mode

## Database Schema

Your Neon database will automatically have these tables:
- `users` - User accounts and roles
- `meals` - Meal definitions
- `meal_plans` - Scheduled meals
- `activities` - Family activities
- `shopping_lists` - Shopping lists
- `shopping_items` - Individual items
- `sessions` - User sessions

## Troubleshooting

**Local Development Issues:**
- Ensure Node.js 18+ is installed
- Check that your `.env` file exists
- Run `npx drizzle-kit migrate` if database issues occur

**Vercel Deployment Issues:**
- Verify all environment variables are set correctly
- Check build logs in Vercel dashboard
- Ensure your Neon database allows external connections

## Next Steps

1. Download and extract all files
2. Run `npm install` in the project directory
3. Run `npm run dev` to start locally
4. Deploy to Vercel using the CLI or GitHub method
5. Add environment variables in Vercel dashboard

Your family meal planning app is ready to use!