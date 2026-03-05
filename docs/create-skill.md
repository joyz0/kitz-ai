---
name: create-skill
description: A guide for creating high-quality, maintainable Skills following Trae's best practices.
---

Helps users create high-quality, maintainable Skills following Trae's best practices. Use when users need to generate or improve a Skill file (SKILL.md) based on Trae's official guidelines.

## steps

1. Analyze Requirement: Extract the core action, inputs, and expected outputs from the user's request.
2. Determine Freedom Level: Decide if the task needs Heuristics, Templates, or Scripts based on complexity.
3. Draft Content: Generate the `SKILL.md` content following the "Five Core Standards".
4. Validate: Ensure the draft includes "When NOT to use" and "Failure Strategy".
5. Create Directory: If target_directory is provided, create the directory structure if it doesn't exist.
6. Write File: Save the generated content to the appropriate location.
7. Output: Present the file path and content to the user, along with specific recommendations.

## failure strategy

- If the requirement is too vague, ask the user for clarification before generating.
- If the proposed `skill_name` violates naming conventions (e.g., contains spaces), auto-correct it and inform the user.
- If the target directory is invalid or cannot be created, return a specific error message.
- If the file already exists, ask for confirmation before overwriting.
- If the user's request doesn't align with Trae's best practices, provide specific recommendations for improvement.

## guidelines

Follow the "Five Core Standards":

1. **Boundary Clear**: Define clear "When" and "When NOT" conditions.
2. **Structured I/O**: Define input and output in a structured format.
3. **Executable Steps**: Provide clear, step-by-step instructions.
4. **Failure Strategy**: Include detailed failure handling.
5. **Single Responsibility**: One Skill should do one thing well.

**Progressive Disclosure Principle**: Design SKILL.md as an entry point and navigation guide, not an all-inclusive document. Move detailed references, large scripts, or API docs to separate files and link them.

**Information Architecture Principle**: Structure content from simple to complex. Start with core functionality and provide links to detailed resources as needed.

## best practices

- Keep the main `SKILL.md` concise (<500 lines), only including essential information.
- Avoid deep nesting: all reference files should be directly linked from SKILL.md, maintaining a single level of reference depth.
- Add a Table of Contents to reference files longer than 100 lines to help the model quickly understand file structure.
- Use a Medium Freedom approach: provide a template structure but allow flexibility for specific logic.
- Avoid anti-patterns like Windows-style paths, too many options, time-sensitive info, and inconsistent terminology.
- Follow the "Evaluation-Driven, Failure-First" methodology for development and iteration.
