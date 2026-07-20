---
title: Python Notes
tags:
  - Python
  - Programming
  - Scripting
type: page
---

# Python Notes

Python is a high-level, interpreted programming language known for its readability and versatility.

## Data Structures

### Lists

```python
fruits = ["apple", "banana", "cherry"]
fruits.append("orange")
# List comprehension
squares = [x**2 for x in range(10)]
```

### Dictionaries

```python
user = {"name": "Alice", "age": 30}
user["email"] = "alice@example.com"
# Dict comprehension
squares = {x: x**2 for x in range(5)}
```

### Sets

```python
unique = {1, 2, 3, 3, 4}  # {1, 2, 3, 4}
```

## Virtual Environments

Always use virtual environments to isolate project dependencies:

```bash
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
.venv\Scripts\activate     # Windows
```

## Type Hints

Python 3.5+ supports type hints for better code documentation and IDE support:

```python
def greet(name: str) -> str:
    return f"Hello, {name}"
```

## Popular Libraries

- **Requests** — HTTP client
- **Pandas** — Data analysis
- **Pytest** — Testing framework
- **FastAPI** — Web framework
