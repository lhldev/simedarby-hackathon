import starter_rust


def generate_visit_signature(timestamp: str, user_agent: str) -> str:
    try:
        return starter_rust.process_visit(timestamp, user_agent)
    except Exception as exc:
        raise RuntimeError(f"native Rust signature generation failed: {exc}") from exc
