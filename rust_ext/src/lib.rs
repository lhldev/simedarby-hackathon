use pyo3::prelude::*;

#[pyfunction]
fn process_payload(input: String) -> PyResult<String> {
    Ok(format!("Optimized via native Rust execution: {}", input))
}

#[pyfunction]
fn process_visit(timestamp: String, user_agent: String) -> PyResult<String> {
    let reversed_ua: String = user_agent.chars().rev().collect();

    let mut hash: u64 = 0xcbf29ce484222325;
    for byte in timestamp.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }

    Ok(format!(
        "RUST-{:016x}|rev:{}|ts_len:{}|ua_len:{}",
        hash,
        reversed_ua,
        timestamp.len(),
        user_agent.len()
    ))
}

#[pymodule]
fn starter_rust(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(process_payload, m)?)?;
    m.add_function(wrap_pyfunction!(process_visit, m)?)?;
    Ok(())
}
