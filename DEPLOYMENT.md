# Lifeline - Blood Donation Management System
## Production Deployment Guide

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Domain with HTTPS (recommended)

### 1. Environment Setup

Copy the environment template:
```bash
cp .env.example .env
```

Configure your environment variables:
- `DATABASE_URL`: Your PostgreSQL connection string
- `SESSION_SECRET`: A secure random string (use: `openssl rand -base64 32`)
- `NODE_ENV`: Set to `production`
- `PORT`: Server port (default: 5000)
- `HOST`: Server host (default: 0.0.0.0)

### 2. Database Setup

Push the database schema:
```bash
npm run db:push
```

### 3. Build for Production

Build the application:
```bash
npm run build
```

This creates:
- `dist/` - Built frontend assets  
- `dist/index.js` - Built backend server

### 4. Start Production Server

```bash
npm start
```

The application will be available at `http://localhost:5000`

### 5. Docker Deployment (Optional)

Build the Docker image:
```bash
docker build -t lifeline-blood-bank .
```

Run with Docker:
```bash
docker run -p 5000:5000 --env-file .env lifeline-blood-bank
```

### 6. Standard Hosting Platforms

#### Vercel/Netlify (Frontend + Serverless)
- Build command: `npm run build`
- Publish directory: `dist`
- Environment variables: Configure in platform settings

#### Railway/Render (Full-stack)
- Build command: `npm run build`  
- Start command: `npm start`
- Environment variables: Configure in platform settings

#### Traditional VPS/Shared Hosting
1. Upload built files to server
2. Install Node.js dependencies: `npm ci --production`
3. Set environment variables
4. Use PM2 for process management: `pm2 start dist/index.js`

### 7. Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 8. Performance Optimizations

- Enable gzip compression
- Set up CDN for static assets  
- Configure database connection pooling
- Set up monitoring and logging
- Enable HTTPS with SSL certificates

### 9. Health Checks

The application includes a health check endpoint at `/health` that returns server status and database connectivity.

### 10. Troubleshooting

- Check server logs: `pm2 logs` (if using PM2)
- Verify database connectivity
- Check environment variables
- Ensure all dependencies are installed
- Verify port availability