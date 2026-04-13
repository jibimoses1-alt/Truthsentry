---
description: Automatically generate clear, concise, and conventional commit messages
alwaysApply: true
---

# Commit Message Rule

Rules:

1. For every code change, generate a **commit message** following [Conventional Commits](https://www.conventionalcommits.org/) format.  
2. Commit messages must be **clear, concise, and descriptive**; summarize the change in **50 characters or less**.  
3. Include an optional longer description (72 characters per line) if needed for clarity.  
4. Prefix must indicate type of change:  
   - `feat:` for new features  
   - `fix:` for bug fixes  
   - `chore:` for routine tasks or refactoring  
   - `docs:` for documentation changes  
   - `test:` for adding or modifying tests  
5. Avoid emojis, unless explicitly requested.  
6. Do **not** include implementation details in the commit title; reserve those for the body.  
7. Apply this rule to all languages, file types, and project folders.  

> Example:  
> ```
> feat(auth): add OAuth2 login flow
>  
> - Added Google and GitHub login options
> - Updated AuthContext to handle tokens
> ```  