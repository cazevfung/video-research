FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (including dev dependencies needed for build)
RUN npm install

# Copy source code and config files
COPY src ./src
COPY config.yaml ./
COPY scripts ./scripts

# Debug: List what was actually copied to help diagnose issues
RUN echo "=== Checking what was copied ===" && \
    echo "Contents of src/prompts:" && \
    ls -la src/prompts/ && \
    echo "" && \
    echo "Checking general directory:" && \
    (test -d src/prompts/general && ls -la src/prompts/general/ || echo "ERROR: general directory does not exist") && \
    echo "" && \
    echo "Checking research directory:" && \
    (test -d src/prompts/research && ls -la src/prompts/research/ || echo "ERROR: research directory does not exist") && \
    echo "" && \
    echo "Checking summary directory:" && \
    (test -d src/prompts/summary && ls -la src/prompts/summary/ || echo "ERROR: summary directory does not exist")

# Verify prompt files exist (they'll be read from src/prompts at runtime)
RUN ls -la src/prompts/*.md || (echo "ERROR: Prompt files missing in src/prompts/" && exit 1)
RUN test -d src/prompts/general && test -n "$(ls -A src/prompts/general/*.md 2>/dev/null)" && ls -la src/prompts/general/*.md || (echo "ERROR: Prompt files missing in src/prompts/general/" && exit 1)
RUN test -d src/prompts/research && test -n "$(ls -A src/prompts/research/*.md 2>/dev/null)" && ls -la src/prompts/research/*.md || (echo "ERROR: Prompt files missing in src/prompts/research/" && exit 1)
RUN test -d src/prompts/summary && test -n "$(ls -A src/prompts/summary/*.md 2>/dev/null)" && ls -la src/prompts/summary/*.md || (echo "ERROR: Prompt files missing in src/prompts/summary/" && exit 1)

# Build TypeScript
RUN npm run build

# List all prompt files for verification
RUN echo "=== Prompt files verification ===" && \
    echo "Main prompts:" && ls -la src/prompts/*.md && \
    echo "General:" && ls -la src/prompts/general/*.md && \
    echo "Research:" && ls -la src/prompts/research/*.md && \
    echo "Summary:" && ls -la src/prompts/summary/*.md

# Expose port (Cloud Run uses PORT environment variable)
EXPOSE 8080

# Use PORT environment variable (Cloud Run requirement)
ENV PORT=8080

# Start server
CMD ["npm", "start"]

