---
title: Claude Guide
tags:
  - Claude
  - Anthropic
  - AI Assistant
type: page
---

# Claude Guide

Claude is Anthropic's AI assistant, designed to be helpful, harmless, and honest. This guide covers practical tips for working with Claude effectively.

## Key Features

- **Long Context**: Claude can process up to 200K tokens in a single prompt
- **Tool Use**: Claude can interact with external tools and APIs
- **Multimodal**: Claude can analyze images, documents, and code
- **Constitutional AI**: Trained with safety principles built into the model

## Effective Prompting

### Be Specific

Instead of "Write about React", try:

```
Explain the React useEffect hook, including:
- When it runs
- Cleanup functions
- Common pitfalls with dependencies
```

### Use System Prompts

System prompts set the overall behavior and constraints for Claude. Place important instructions here rather than in the conversation body.

## Code Generation

Claude excels at generating and explaining code. When asking for code:

1. Specify the language and framework
2. Describe the expected behavior
3. Mention any constraints (performance, style, dependencies)
