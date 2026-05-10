# Base Image
FROM node:20-bullseye

# Install Prerequisites
RUN apt-get update && apt-get install -y \
    git \
    postgresql-client \
    curl \
    vim \
    && rm -rf /var/lib/apt/lists/*

# Verify Installations
RUN node -v && npm -v && git --version && psql --version

# Create App Directory
WORKDIR /app

# Copy Application Files
COPY . .

# Install Node Dependencies
RUN npm install

# Expose Application Port
EXPOSE 3000

# Start Application
CMD ["npm", "start"]