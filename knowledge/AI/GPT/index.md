---
title: GPT Tips
tags:
  - GPT
  - OpenAI
  - Tips
type: page
---

# GPT Tips

Practical tips and techniques for getting the most out of GPT models.

## Temperature Settings

| Temperature | Best For |
|-------------|----------|
| 0.0 - 0.3 | Code generation, factual answers |
| 0.3 - 0.7 | General conversation, explanation |
| 0.7 - 1.0 | Creative writing, brainstorming |

## Token Management

GPT models have token limits that vary by model. A rough rule of thumb: 1 token ≈ 0.75 words in English.

### Counting Tokens

Use the `tiktoken` library to count tokens programmatically before sending requests.

## System Messages

The system message is the most powerful tool for shaping GPT behavior. Place critical instructions here:

```yaml
You are a senior software engineer reviewing code.
Focus on:
- Security vulnerabilities
- Performance issues
- Code clarity
Be concise and provide actionable feedback.
```

## Function Calling

When using function calling, define clear JSON schemas and include descriptions for every parameter.
