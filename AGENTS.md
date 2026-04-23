# Kanel repo

This is the monorepo for Kanel and its peripheral packages. Kanel will generate Typescript types, markdown documentation or other artifacts from a live Postgres database.

## General file/folder structure

Keep files focused and maintainable by breaking them up once they grow too large or take on multiple responsibilities—at that point, convert the file into a folder and split its logic into smaller, well-named modules. Each folder should represent a single feature or component and contain all related files (such as logic, styles, tests, and utilities) rather than separating them by file type across the project. Avoid organizing by technical categories like “css” or “js” directories; instead, co-locate everything that belongs together so structure reflects functionality, improves readability, and makes navigation more intuitive.

### Sub-folder AGENTS.md files

Every `/src` folder itself, and every folder within any `/src` folder, should contain an AGENTS.md file that outlines the contents of the folder. The `/src`-level file can be brief since the project README covers the big picture — its job is to orient an agent to what lives in that source tree. The purpose is "caching" of the information. This means that token economics is important here. It should be succinct, and anything which is obvious (for instance, from the name), shouldn’t be stated. It should help the agent understand the folder without or before scanning the code inside. This file should be read whenever working with files inside the folder and updated whenever necessary. When a new folder is created, the parent folder’s AGENTS.md should also be reviewed and updated if needed (for example, to document how the new folder relates to the parent or to describe any new cross‑folder responsibilities).
