# GraphQL API Test Queries & Documentation

This file contains a collection of test queries, mutations, and subscriptions for the project, along with explanations for what each one does.

## 🚀 Quick Reference: Test Commands

Use the GraphiQL UI at `http://localhost:4000/graphql` to run these commands.

| Operation Type | GraphQL Code (Paste in left pane) | Variables (Paste in "Query Variables" pane) |
| :--- | :--- | :--- |
| **Query** (Simple) | `query {` <br/> `  distance(from: "Madrid", to: "Barcelona") {` <br/> `    from` <br/> `    to` <br/> `    km` <br/> `  }` <br/> `}` | (None required) |
| **Mutation** (Create) | `mutation CreateNewArticle($articleData: ArticleInput!) {` <br/> `  createArticle(article: $articleData) {` <br/> `    id` <br/> `    title` <br/> `    description` <br/> `  }` <br/> `}` | `{` <br/> `  "articleData": {` <br/> `    "title": "My First Test Article",` <br/> `    "description": "This is awesome!"` <br/> `  }` <br/> `}` |
| **Query** (Get All) | `query {` <br/> `  articles {` <br/> `    edges {` <br/> `      node {` <br/> `        id` <br/> `        title` <br/> `      }` <br/> `    }` <br/> `  }` <br/> `}` | (None required) |
| **Query** (Get by ID) | `query GetArticleByID($id: String!) {` <br/> `  article(id: $id) {` <br/> `    id` <br/> `    title` <br/> `    description` <br/> `  }` <br/> `}` | `{` <br/> `  "id": "PASTE_VALID_ID_HERE"` <br/> `}` |
| **Subscription** (Listen) | `subscription {` <br/> `  newArticle {` <br/> `    id` <br/> `    title` <br/> `  }` <br/> `}` | (None required) |

---

## 📖 Command Explanations

Here is a breakdown of what each test command is doing.

### 1. Query: `distance`
* **Type:** `Query` (a read-only operation).
* **What it does:** This is a simple query to fetch a `Distance` object.
* **Key Concepts:**
    * **Arguments:** We are passing two required arguments, `from` and `to`, directly into the query.
    * **Field Selection:** The `{ from, to, km }` block is the core feature of GraphQL. We are telling the server *exactly* which fields we want it to return. If the `Distance` type also had a `miles` field, we would *not* receive it because we didn't ask for it.

### 2. Mutation: `createArticle`
* **Type:** `Mutation` (a write/change operation).
* **What it does:** This creates a new article in the database.
* **Key Concepts:**
    * **Variables:** This is the standard, secure way to pass dynamic data (like user input) into a mutation.
    * `mutation CreateNewArticle($articleData: ArticleInput!)`: This line defines our operation. `CreateNewArticle` is just a friendly name. `$articleData: ArticleInput!` defines a **variable** named `$articleData` and states that it **must** (`!`) be of the type `ArticleInput`.
    * `Query Variables Pane`: The separate JSON block is where we provide the *value* for the `$articleData` variable. The GraphiQL tool (and client libraries) will merge these two parts before sending the request.
    * **Return Data:** After creating the article, we ask the server to return the `id`, `title`, and `description` of the new article, all in one round trip.

### 3. Query: `articles`
* **Type:** `Query` (a read operation).
* **What it does:** Fetches a list of all articles.
* **Key Concepts:**
    * **Connections:** This query uses a standard GraphQL list pattern called "Connections." Instead of just returning an array `[Article]`, it returns a more complex `ArticlesPayload` object.
    * `edges` / `node`: To access the list of articles, you must navigate through the `edges` and then get the `node` for each item. This structure is designed to support advanced features like **pagination** (e.g., "get the first 10 articles," "get the next 10 after this cursor," etc.).

### 4. Query: `article` (by ID)
* **Type:** `Query` (a read operation).
* **What it does:** Fetches a single article by its specific `id`.
* **Key Concepts:**
    * **Variables:** Like the mutation, this query uses a variable (`$id`) to pass in the `id` we want to search for.
    * **Non-Nullable Error:** The schema defines this query as `article(id: String!): Article!`. The `!` at the very end means the response *cannot be null*. If you pass an `id` that does not exist, the server's code will return `null`, which breaks this "promise." This is why you see the error `"Cannot return null for non-nullable field Query.article."`—it's a strict schema contract violation.

### 5. Subscription: `newArticle`
* **Type:** `Subscription` (a real-time listener).
* **What it does:** This does not fetch any data immediately. Instead, it opens a persistent WebSocket connection to the server and "listens" for a specific event.
* **Key Concepts:**
    * **Real-time (Push):** When you run this, the response pane will just say "Listening...".
    * **Event-Driven:** If you open a *second* browser tab and run the `createArticle` mutation, the server will "push" the `newArticle` event (and the data you selected) to your original "listening" tab. This is used for notifications, live chats, and real-time dashboards.