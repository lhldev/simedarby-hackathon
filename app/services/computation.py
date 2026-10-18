import starter_rust


def run_optimized_task(input_data: str) -> dict:
    result = starter_rust.process_payload(input_data)
    return {"result": result, "engine": "native_rust"}
