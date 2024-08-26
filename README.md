LLM-powered Relationship Extraction on Personal Notes
============
This project turns personal notes into a topical similarity graph. Pieces of notes that are similar are connected to each other, forming a Zettlekasten-like network of notes.

The project is based on LangChain and uses LLMs.

It is intended to be used alongside Obsidian, as a plugin.

The other feature of this project is question-answering on personal notes using different RAG-systems.

The project is at early stages of development.

## How to Run
1. Clone the repository
2. Install the dependencies using `npm install`
3. Edit .env file to include your LLM API key
4. Run `npm run create-graph` to initialize embedding store and create the graph

To run the question-answering system, run either of the following commands:
- Run `npm run basic-RAG` to run the basic RAG system. You will be prompted to enter a question.
- Run `npm run agentic-RAG` to run the Agentic RAG system. You will be prompted to enter a question.

To get Obsidian graph view of the notes:
1. Install Obsidian
2. Copy the folder `output-graph/output` to your Obsidian vault
3. Open graph view in Obsidian

## Set Input Notes to Create Graph From
Currently, you can add a list of URLs as input. Set the list in `create-graph.js` file in the `urls` variable.

Example question-answering test run:
```
npm run basic-RAG
Please type the query: What is task decomposition?
Task decomposition is the process of breaking down large tasks into smaller, manageable ...
```
