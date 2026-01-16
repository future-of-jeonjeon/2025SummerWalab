FROM python:3.10-slim-buster

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /micro-service-server

# Copy dependency definitions
COPY pyproject.toml uv.lock ./

# Install dependencies
RUN uv sync --frozen

COPY . .

RUN chmod +x ./entrypoint.sh

# Add the virtual environment to the PATH so that the application uses the installed dependencies
ENV PATH="/micro-service-server/.venv/bin:$PATH"

EXPOSE 8000
CMD ["./entrypoint.sh"]
