FROM rust:slim-bookworm AS builder

WORKDIR /usr/src/heartwood

RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

COPY Cargo.toml Cargo.lock ./
COPY crates/heartwood-core/Cargo.toml crates/heartwood-core/Cargo.toml
COPY crates/heartwood-app/Cargo.toml crates/heartwood-app/Cargo.toml

COPY crates/heartwood-core/src crates/heartwood-core/src
COPY crates/heartwood-core/tests crates/heartwood-core/tests
COPY crates/heartwood-app/src crates/heartwood-app/src

RUN cargo build --release -p heartwood-app

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /usr/src/heartwood/target/release/heartwood-app /usr/local/bin/heartwood-app

ENV PORT=8080
EXPOSE 8080

CMD ["heartwood-app", "serve", "--port", "8080"]
