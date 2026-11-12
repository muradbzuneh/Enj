build: cd apps/api && npm install && npx prisma generate && npm run build
release: cd apps/api && node -e "require('dotenv').config(); const {execSync} = require('child_process'); execSync('npx prisma db push --accept-data-loss --url=\"' + process.env.DATABASE_URL + '\"', {stdio: 'inherit'});"
web: node apps/api/dist/server.js
