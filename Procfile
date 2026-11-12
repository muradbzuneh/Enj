build: cd apps/api && npm install && npx prisma generate && npm run build
release: cd apps/api && npx prisma db push --accept-data-loss --url="$DATABASE_URL"
web: node apps/api/dist/server.js
