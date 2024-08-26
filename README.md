LLM-powered Relationship Extraction on Personal Notes
============
This project turns personal notes into a topical similarity graph. Pieces of notes that are similar are connected to each other, forming a Zettlekasten-style network of notes.

The project is based on LangChain and uses LLMs.

It is intended to be used alongside Obsidian, as a plugin.

The other feature of this project is question-answering on personal notes using different RAG techniques.

The project is at early stages of development.

## How to Run
1. Clone the repository. Go to the project root.
2. Install node.js version 20.16 or higher.
2. Install the dependencies using `npm install`
3. Create .env file that includes your LLM API key
4. Run `npm run create-graph` to initialize embedding store and create the graph
- The vector store is created in `~ProjectRoot/vectorstore`

To run the question-answering system, run either of the following commands:
- Run `npm run basic-RAG` to run the basic RAG system. You will be prompted to enter a question.
- Run `npm run agentic-RAG` to run the Agentic RAG system. You will be prompted to enter a question.

Example question-answering test run:
```
npm run basic-RAG
Please type the query: What is task decomposition?
Task decomposition is the process of breaking down large tasks into smaller, manageable ...
```


To get Obsidian graph view of the notes:
1. Install Obsidian
2. Copy the folder `~ProjectRoot/output-graph/output` to your Obsidian vault
3. Open graph view in Obsidian

## Set Input Notes to Create Graph from
Currently, you can add a list of URLs as input. Set the list in `create-graph.js` file in the `urls` variable.