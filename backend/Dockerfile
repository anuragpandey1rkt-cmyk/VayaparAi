FROM python:3.11-slim

# Install system dependencies for OCR and psycopg2
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-hin \
    libpq-dev \
    gcc \
    g++ \
    libssl-dev \
    curl \
    poppler-utils \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create necessary directories
RUN mkdir -p /tmp/uploads /app/logs

EXPOSE 8000

# Make start script executable
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
