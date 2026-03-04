# create-skill

## Description

Generates a standardized Skill file (`SKILL.md`) based on user requirements. Use when the user wants to create a new automation capability or define a new workflow.

## Triggers

- **Use when:** User explicitly asks to "create a skill", "write a new rule", "define a workflow", or "generate a skill file".
- **Do NOT use when:** User is asking how to use an existing skill, debugging a skill, or requesting information about skills.

## Input

- `requirement`: string (User's description of the task)
- `skill_name`: string (Proposed name for the skill, should follow naming conventions)
- `target_directory`: string (Optional, directory where the skill should be created)

## Output

- `file_path`: string (Path to the new SKILL.md)
- `content`: string (The generated markdown content)
- `status`: boolean (Success status)

## Steps

1. **Analyze Requirement:** Extract the core action, inputs, and expected outputs from the user's request.
2. **Determine Freedom Level:** Decide if the task needs Heuristics, Templates, or Scripts based on complexity.
3. **Draft Content:** Generate the `SKILL.md` content following the "Five Core Standards".
4. **Validate:** Ensure the draft includes "When NOT to use" and "Failure Strategy".
5. **Create Directory:** If target_directory is provided, create the directory structure if it doesn't exist.
6. **Write File:** Save the generated content to the appropriate location.
7. **Output:** Present the file path and content to the user.

## Failure Strategy

- If the requirement is too vague, ask the user for clarification before generating.
- If the proposed `skill_name` violates naming conventions (e.g., contains spaces), auto-correct it and inform the user.
- If the target directory is invalid or cannot be created, return a specific error message.
- If the file already exists, ask for confirmation before overwriting.

## Guidelines

- Follow the "Five Core Standards": Clear Boundaries, Structured I/O, Executable Steps, Failure Strategy, and Single Responsibility.
- Keep the main `SKILL.md` concise (<500 lines). Move detailed references, large scripts, or API docs to separate files and link them.
- Use a Medium Freedom approach: provide a template structure but allow flexibility for specific logic.
- Avoid anti-patterns like Windows-style paths, too many options, time-sensitive info, and inconsistent terminology.
- Follow the "Evaluation-Driven, Failure-First" methodology for development and iteration.
