---
title: Prompt Engineering
tags:
  - GPT
  - Claude
  - LLM
type: page
---

# Prompt Engineering

Prompt engineering is the practice of designing and optimizing input prompts for large language models (LLMs) to achieve desired outputs. It has become an essential skill for anyone working with AI.

## Core Principles

- **Clarity**: Be specific and unambiguous in your instructions
- **Context**: Provide relevant background information for the task
- **Constraints**: Set clear boundaries for the expected response
- **Examples**: Use few-shot prompting to guide output format

## Chain-of-Thought

Chain-of-thought (CoT) prompting encourages the model to reason step by step before arriving at a final answer. This technique dramatically improves performance on complex reasoning tasks.

```
Q: A bakery sold 120 loaves of bread on Monday.
It sold 30% more on Tuesday. How many loaves
were sold in total?

Let's solve this step by step:
1. Monday sales: 120 loaves
2. Tuesday increase: 120 * 0.30 = 36 loaves
3. Tuesday sales: 120 + 36 = 156 loaves
4. Total: 120 + 156 = 276 loaves
```

## Best Practices

1. Start with a clear system message
2. Use delimiters to separate sections
3. Specify the desired output format
4. Iterate and refine based on results
