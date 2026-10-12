FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=7860

# 建立符合 Hugging Face 規範的 non-root user (UID 1000)
RUN useradd -m -u 1000 user

WORKDIR /app

# 先安裝依賴以利用 Docker 快取
COPY requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 建立靜態檔案與 media 目錄並設定擁有者
RUN mkdir -p /app/staticfiles /app/media && chown -R user:user /app

# 複製專案檔案並將擁有者指派給 user
COPY --chown=user:user . /app

USER user

EXPOSE 7860

CMD ["sh", "-c", "python manage.py collectstatic --no-input && python manage.py migrate && gunicorn backend.wsgi:application --bind 0.0.0.0:7860 --workers 2 --timeout 120"]
