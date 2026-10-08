FROM python:3.12-slim

WORKDIR /code

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . /code/

RUN chmod +x /code/entrypoint.sh 2>/dev/null || true

EXPOSE 8000

CMD ["/bin/sh", "/code/entrypoint.sh"]

