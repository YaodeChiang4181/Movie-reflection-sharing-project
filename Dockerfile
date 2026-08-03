FROM python:3.11-slim

WORKDIR /app

# 避免 Python 寫入 .pyc 檔案
ENV PYTHONDONTWRITEBYTECODE 1
# 確保 stdout/stderr 立刻輸出，不會被緩衝
ENV PYTHONUNBUFFERED 1

# 安裝系統相依套件 (若有需要可以加)
# RUN apt-get update && apt-get install -y gcc

# 複製並安裝 Python 套件
COPY requirements.txt /app/
RUN pip install --upgrade pip && pip install -r requirements.txt

# 複製其餘程式碼 (開發時會被 docker-compose 的 volume 覆蓋)
COPY . /app/

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
