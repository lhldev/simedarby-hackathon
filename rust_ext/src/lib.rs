use pyo3::prelude::*;

#[pyfunction]
fn process_payload(input: String) -> PyResult<String> {
    Ok(format!("Optimized via native Rust execution: {}", input))
}

#[pymodule]
fn starter_rust(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(process_payload, m)?)?;
    Ok(())
}
