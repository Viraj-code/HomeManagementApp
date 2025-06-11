#!/bin/bash

echo "🔧 Setting up local development environment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one using .env.example as template"
    exit 1
fi

# Load environment variables
source .env

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set in .env file"
    exit 1
fi

echo "📊 Generating database migrations..."
npx drizzle-kit generate

echo "🚀 Running database migrations..."
npx drizzle-kit migrate

echo "✅ Local setup complete!"
echo "📱 Run 'npm run dev' to start the development server"
echo "🌐 Your app will be available at http://localhost:5000"