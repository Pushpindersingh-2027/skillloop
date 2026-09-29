# SkillLoop Coding Standards

This document defines the coding and collaboration conventions used by the
SkillLoop development team. The goal is to keep contributions consistent,
readable, maintainable, secure, and easy to review.

## 1. JavaScript Style

SkillLoop uses ESLint and Prettier to maintain consistent JavaScript style.

The project Prettier configuration uses:

- 2 spaces for indentation
- Semicolons
- Single quotes
- Trailing commas where supported by ES5
- Maximum preferred line width of 100 characters

Use `const` by default and `let` when a variable must be reassigned. Avoid
`var`.

Before submitting a pull request, run:

```bash
npm run lint
npm run format:check
```

Code can be automatically formatted with:

```bash
npm run format
```

ESLint-fixable issues can be corrected with:

```bash
npm run lint:fix
```

Developers should not manually reformat files in a way that conflicts with
Prettier.

---

## 2. Naming Conventions

### 2.1 Variables and Functions

Use `camelCase` for variables and functions.

Examples:

```js
const currentUser = req.user;
const postOwnerId = post.author;

function validatePostOwner() {}
```

Function names should clearly describe the action they perform.

Examples:

```text
createPost
updatePost
deletePost
getMessages
requirePostOwner
validateUser
```

Boolean variables should clearly communicate a true/false condition.

Examples:

```text
isOwner
isLoggedIn
isRead
hasPermission
canEdit
```

Avoid unclear names such as:

```text
data1
temp
thing
x
abc
```

unless the variable is very short-lived and its meaning is obvious.

### 2.2 Constants

Use `UPPER_SNAKE_CASE` for fixed configuration constants.

Example:

```js
const PER_PAGE = 5;
const MAX_RETRY_COUNT = 3;
```

### 2.3 Models and Classes

Use `PascalCase` for Mongoose models and classes.

Examples:

```text
User
Post
Message
Conversation
Report
Notification
```

Model filenames should also use PascalCase:

```text
User.js
Post.js
Message.js
Conversation.js
```

### 2.4 Controllers, Middleware and Utility Files

Use descriptive `camelCase` filenames.

Examples:

```text
authController.js
postController.js
postOwnership.js
postHelpers.js
```

### 2.5 Route Files

Use short descriptive lowercase names for route files.

Examples:

```text
auth.js
posts.js
messages.js
profile.js
```

### 2.6 Test Files

Test files should use the feature name followed by `.test.js`.

Examples:

```text
auth.test.js
posts.test.js
postOwnership.test.js
messages.test.js
```

---

## 3. Folder Conventions

Files should be placed according to their responsibility.

```text
skillloop/
│
├── api/
│   └── index.js
│
├── src/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   └── app.js
│
├── views/
│   ├── auth/
│   ├── posts/
│   ├── messaging/
│   ├── profile/
│   └── partials/
│
├── public/
│   ├── css/
│   └── js/
│
├── tests/
├── docs/
│
├── server.js
├── package.json
└── .env.example
```

### `src/models/`

Contains Mongoose schemas and database models.

Examples:

```text
User.js
Post.js
Message.js
Conversation.js
Report.js
```

Models should contain:

- Schema definitions
- Model-level validation
- Database field definitions
- Appropriate indexes

### `src/controllers/`

Contains request-handling and application/business logic.

Examples:

```text
authController.js
postController.js
```

Database operations and larger pieces of application logic should be moved to
controllers rather than being duplicated inside route files where practical.

### `src/routes/`

Contains Express route definitions.

Routes should primarily define:

- HTTP method
- Route path
- Required middleware
- Controller or handler

Example:

```js
router.post('/:id/delete', requirePostOwner, postController.deletePost);
```

### `src/middleware/`

Contains reusable request-processing, authentication and authorisation logic.

Examples:

```text
auth.js
postOwnership.js
```

### `src/utils/`

Contains reusable helper functions that do not belong to one specific route or
model.

Example:

```text
postHelpers.js
```

### `views/`

Contains EJS templates used to render application pages.

### `public/`

Contains browser-accessible static resources such as:

- CSS
- Client-side JavaScript
- Images/assets where required

### `tests/`

Contains Jest/Supertest automated tests.

### `docs/`

Contains team development and technical documentation such as this coding
standards document.

---

## 4. Separation of Concerns / MVC

SkillLoop should follow separation of concerns and an MVC-style structure where
practical.

The preferred request flow is:

```text
Route
  ↓
Middleware
  ↓
Controller
  ↓
Model
  ↓
MongoDB
```

Responsibilities should remain separated:

- **Routes** define endpoints.
- **Middleware** handles authentication, authorisation and reusable request checks.
- **Controllers** contain request-processing and business logic.
- **Models** define application data and database rules.
- **Views** display server-rendered UI.
- **Utilities** contain reusable helper functions.

Avoid placing large database queries, repeated validation or significant
business logic directly inside route definitions when it can be moved into a
controller or middleware.

---

## 5. Branch Naming Conventions

Development work should be completed on a dedicated branch rather than directly
on `main`.

Preferred branch formats are:

```text
feat/<task-or-feature>
fix/<task-or-bug>
refactor/<task-or-feature>
test/<task-or-feature>
docs/<task-or-document>
ci/<task-or-workflow>
```

Include the task/Trello identifier where useful.

Examples:

```text
feat/T054-post-ownership-middleware
refactor/T055-post-mvc-refactor
fix/signin-validation
test/post-ownership
docs/coding-standards
ci/github-actions-tests
```

Branch names should:

- Clearly identify the work being performed.
- Use hyphens between words.
- Avoid vague names such as `new`, `work`, `changes`, or `test123`.
- Keep unrelated tasks on separate branches.

---

## 6. Commit Message Format

Commit messages should clearly describe the purpose of the change.

Preferred format:

```text
<type>(<optional task/scope>): <short description>
```

Common commit types:

```text
feat      New functionality
fix       Bug fix
refactor  Code restructuring without changing intended behaviour
test      Test additions or test changes
docs      Documentation changes
chore     Maintenance/configuration work
ci        Continuous integration changes
```

Examples:

```text
feat(T054): add reusable post ownership middleware
refactor(T055): extract post logic into controller
fix(auth): correct sign-in stylesheet path
test(posts): add post ownership tests
docs: add team coding standards
ci: run automated tests on pull requests
```

Commit messages should:

- Be concise and descriptive.
- Explain what the commit changes.
- Use a consistent type prefix where practical.
- Keep unrelated changes in separate commits.
- Avoid vague messages.

Avoid messages such as:

```text
update
changes
stuff
fix things
final
final final
working now
```

A developer reviewing the Git history should be able to understand the purpose
of a commit without opening every changed file.

---

## 7. Error Handling

Use meaningful HTTP status codes consistently.

Common status codes include:

```text
200 OK                  Successful request
201 Created             Resource successfully created
400 Bad Request         Invalid input/request
401 Unauthorized        Authentication is missing or invalid
403 Forbidden           User is authenticated but not permitted
404 Not Found           Requested resource does not exist
500 Internal Server Error
```

Example:

```js
if (!post) {
  return res.status(404).send('Post not found');
}

if (!isOwner) {
  return res.status(403).send('You do not have permission to modify this post');
}
```

Unexpected server errors should be handled appropriately rather than causing
the application to crash.

Error messages returned to users must not expose sensitive information such as:

- Passwords
- JWT secrets
- Session secrets
- Database credentials
- API keys
- Full internal stack traces

---

## 8. Security and Environment Variables

Secrets must never be hard-coded into application source code or committed to
Git.

Sensitive values include:

```text
MONGODB_URI
JWT_SECRET
SESSION_SECRET
OPENAI_API_KEY
```

Local secret values belong in:

```text
.env
```

The repository's `.env.example` should contain only variable names and safe
placeholder values.

The actual `.env` file must remain Git-ignored.

Before committing changes, developers should check:

```bash
git status
git diff
```

to ensure that credentials, local environment files or unrelated files are not
being committed.

---

## 9. Comments and Documentation

Code should be readable through meaningful names and clear structure.

Comments should be added when they help explain **why** something is being
done, particularly where the reason may not be obvious.

Good example:

```js
// Exclude soft-deleted posts so they can no longer be modified.
```

Avoid comments that simply repeat the code.

Poor example:

```js
// Find post
const post = await Post.findById(id);
```

Complex or reusable modules should include short comments where they improve
maintainability.

---

## 10. Testing Standards

Developers are responsible for testing their own changes before requesting
review.

The project uses Jest and Supertest for automated testing.

Run:

```bash
npm test
```

To generate test coverage information:

```bash
npm run test:coverage
```

New or modified behaviour should include appropriate tests where practical.

Testing should consider:

- Successful/expected behaviour
- Invalid input
- Authentication failures
- Authorisation failures
- Missing resources
- Relevant edge cases

Testing evidence may also be documented using:

- Pull request descriptions
- Trello checklists/comments
- Screenshots for user-facing functionality

---

## 11. Pull Request Standards

Changes should be submitted to `main` using a pull request rather than being
committed directly to `main`.

A pull request should:

- Clearly describe what was changed.
- Reference the relevant Trello/task item where applicable.
- Explain how the change was tested.
- Contain only changes related to the task.
- Pass available automated checks.
- Include screenshots for relevant UI changes.
- Contain no secrets or local `.env` files.
- Be reviewed before merging where required by the team workflow.

Suggested pull request structure:

```text
## Changes
- Change 1
- Change 2
- Change 3

## Testing
- Test performed
- Expected/result observed

## Related Task
- Trello/task identifier
```

---

## 12. Code Quality Checks

Before requesting review, run:

```bash
npm run lint
npm run format:check
npm test
```

If formatting needs correction:

```bash
npm run format
```

If ESLint reports automatically fixable issues:

```bash
npm run lint:fix
```

Any remaining warnings or errors should be reviewed rather than ignored without
reason.

---

## 13. Before Committing

Before creating a commit:

```bash
git status
git diff
```

Confirm that:

- Only files related to the current task have changed.
- No secrets or `.env` files are included.
- Debugging code has been removed where appropriate.
- The application still runs.
- Relevant tests have been performed.

Then stage only the required files.

Example:

```bash
git add docs/CODING_STANDARDS.md README.md
```

rather than automatically staging unrelated changes.

---

## 14. Before Opening a Pull Request

Before opening a pull request:

```bash
npm run lint
npm run format:check
npm test
git status
```

Where useful, review the branch changes against `main`:

```bash
git diff main...HEAD
```

The pull request should contain only the work associated with the relevant
task.

---

## 15. Team Responsibility

These standards are intended to support consistent team development rather than
prevent reasonable improvements.

If a developer needs to introduce a new pattern, dependency, folder or
convention that affects the wider project, it should be discussed with the team
before being adopted across the codebase.

When an agreed team convention changes, this document should be updated so it
continues to reflect the current SkillLoop development process.
