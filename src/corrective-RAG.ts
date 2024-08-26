// @ts-ignore
import {loadVectorStore} from "./utils/vectorstore.js";

const vectorStore = await loadVectorStore();
const retriever = vectorStore.asRetriever();

import {StateGraphArgs} from "@langchain/langgraph";
import {Document, type DocumentInterface} from "@langchain/core/documents";


/**
 * Represents the state of our graph.
 */
type GraphState = {
    documents: Document[];
    question: string;
    generation?: string;
};

const graphState: StateGraphArgs<GraphState>["channels"] = {
    documents: {
        value: (left?: Document[], right?: Document[]) =>
            right ? right : left || [],
        default: () => [],
    },
    question: {
        value: (left?: string, right?: string) => (right ? right : left || ""),
        default: () => "",
    },
    generation: {
        value: (left?: string, right?: string) => (right ? right : left),
        default: () => undefined,
    },
};

import {TavilySearchResults} from "@langchain/community/tools/tavily_search";
import {StructuredTool} from "@langchain/core/tools";
import {z} from "zod";
import {ChatPromptTemplate} from "@langchain/core/prompts";
import {ChatOpenAI} from "@langchain/openai";
import {StringOutputParser} from "@langchain/core/output_parsers";
import {JsonOutputToolsParser} from "langchain/output_parsers";

// Data model (create via a LangChain tool)
const zodScore = z.object({
    binaryScore: z.enum(["yes", "no"]).describe("Relevance score 'yes' or 'no'"),
});

class Grade extends StructuredTool<typeof zodScore> {
    name = "grade";
    description =
        "Grade the relevance of the retrieved documents to the question. Either 'yes' or 'no'.";
    schema = zodScore;

    async _call(input: z.infer<(typeof this)["schema"]>) {
        return JSON.stringify(input);
    }
}

const gradeTool = new Grade();

/**
 * Retrieve documents
 *
 * @param {GraphState} state The current state of the graph.
 * @param {RunnableConfig | undefined} config The configuration object for tracing.
 * @returns {Promise<GraphState>} The new state object.
 */
async function retrieve(state: GraphState) {
    console.log("---RETRIEVE---");
    console.log(state);
    const documents = await retriever
        .withConfig({runName: "FetchRelevantDocuments"})
        .invoke(state.question);
    return {
        documents,
    };
}

/**
 * Generate answer
 *
 * @param {GraphState} state The current state of the graph.
 * @param {RunnableConfig | undefined} config The configuration object for tracing.
 * @returns {Promise<GraphState>} The new state object.
 */
async function generate(state: GraphState) {
    console.log("---GENERATE---");
    // Pull in the prompt
    const prompt = ChatPromptTemplate.fromMessages([
        ["human", "You are an assistant for question-answering tasks. Use the following pieces of retrieved context to answer the question. If you don't know the answer, just say that you don't know. Use three sentences maximum and keep the answer concise.\n" +
        "Question: {question} \n" +
        "Context: {context} \n" +
        "Answer:"],
    ]);

    // LLM
    const llm = new ChatOpenAI({
        modelName: "gpt-3.5-turbo",
        temperature: 0,
    });

    // RAG Chain
    const ragChain = prompt.pipe(llm).pipe(new StringOutputParser());

    const formattedDocs = state.documents
        .map((doc) => doc.pageContent)
        .join("\n\n");

    const generation = await ragChain.invoke({
        context: formattedDocs,
        question: state.question,
    });

    return {
        generation,
    };
}

/**
 * Determines whether the retrieved documents are relevant to the question.
 *
 * @param {GraphState} state The current state of the graph.
 * @param {RunnableConfig | undefined} config The configuration object for tracing.
 * @returns {Promise<GraphState>} The new state object.
 */
async function gradeDocuments(state: GraphState) {
    console.log("---CHECK RELEVANCE---");
    const model = new ChatOpenAI({
        modelName: "gpt-4-0125-preview",
        temperature: 0,
    });

    const parser = new JsonOutputToolsParser();

    // LLM with tool and enforce invocation
    const llmWithTool = model.bindTools([gradeTool], {
        tool_choice: {type: "function", function: {name: gradeTool.name}},
    });

    const prompt = ChatPromptTemplate.fromTemplate(
        `You are a grader assessing relevance of a retrieved document to a user question.
  Here is the retrieved document:
  
  {context}
  
  Here is the user question: {question}

  If the document contains keyword(s) or semantic meaning related to the user question, grade it as relevant.
  Give a binary score 'yes' or 'no' score to indicate whether the document is relevant to the question.`,
    );

    // Chain
    const chain = prompt.pipe(llmWithTool).pipe(parser);

    const filteredDocs: Array<DocumentInterface> = [];
    for await (const doc of state.documents) {
        const grade = await chain.invoke({
            context: doc.pageContent,
            question: state.question,
        });
        const {args} = grade[0];
        if (args.binaryScore === "yes") {
            console.log("---GRADE: DOCUMENT RELEVANT---");
            filteredDocs.push(doc);
        } else {
            console.log("---GRADE: DOCUMENT NOT RELEVANT---");
        }
    }

    return {
        documents: filteredDocs,
    };
}

/**
 * Transform the query to produce a better question.
 *
 * @param {GraphState} state The current state of the graph.
 * @param {RunnableConfig | undefined} config The configuration object for tracing.
 * @returns {Promise<GraphState>} The new state object.
 */
async function transformQuery(state: GraphState) {
    console.log("---TRANSFORM QUERY---");
    // Pull in the prompt
    const prompt = ChatPromptTemplate.fromTemplate(
        `You are generating a question that is well optimized for semantic search retrieval.
  Look at the input and try to reason about the underlying sematic intent / meaning.
  Here is the initial question:
  \n ------- \n
  {question} 
  \n ------- \n
  Formulate an improved question: `,
    );

    // Grader
    const model = new ChatOpenAI({
        modelName: "gpt-4-0125-preview",
        temperature: 0,
        streaming: true,
    });

    // Prompt
    const chain = prompt.pipe(model).pipe(new StringOutputParser());
    const betterQuestion = await chain.invoke({question: state.question});

    return {
        question: betterQuestion,
    };
}

/**
 * Web search based on the re-phrased question using Tavily API.
 *
 * @param {GraphState} state The current state of the graph.
 * @param {RunnableConfig | undefined} config The configuration object for tracing.
 * @returns {Promise<GraphState>} The new state object.
 */
async function webSearch(state: GraphState) {
    console.log("---WEB SEARCH---");

    const tool = new TavilySearchResults();
    const docs = await tool.invoke({query: state.question});
    const webResults = new Document({pageContent: docs});
    const newDocuments = state.documents.concat(webResults);

    return {
        documents: newDocuments,
    };
}

/**
 * Determines whether to generate an answer, or re-generate a question.
 *
 * @param {GraphState} state The current state of the graph.
 * @returns {"transformQuery" | "generate"} Next node to call
 */
function decideToGenerate(state: GraphState) {
    console.log("---DECIDE TO GENERATE---");
    const filteredDocs = state.documents;

    if (filteredDocs.length === 0) {
        // All documents have been filtered checkRelevance
        // We will re-generate a new query
        console.log("---DECISION: TRANSFORM QUERY---");
        return "transformQuery";
    }
    // We have relevant documents, so generate answer
    console.log("---DECISION: GENERATE---");
    return "generate";
}

// Define the graph
import {END, START, StateGraph} from "@langchain/langgraph";

const workflow = new StateGraph<GraphState>({
    channels: graphState,
})
    // Define the nodes
    .addNode("retrieve", retrieve)
    .addNode("gradeDocuments", gradeDocuments)
    .addNode("generate", generate)
    .addNode("transformQuery", transformQuery)
    .addNode("webSearch", webSearch);

// Build graph
workflow.addEdge(START, "retrieve");
workflow.addEdge("retrieve", "gradeDocuments");
workflow.addConditionalEdges(
    "gradeDocuments",
    decideToGenerate,
);
workflow.addEdge("transformQuery", "webSearch");
workflow.addEdge("webSearch", "generate");
workflow.addEdge("generate", END);

// Compile
const app = workflow.compile();

import readlineSync from 'readline-sync';

let inputQuery = readlineSync.question('Please type the query: ');

const inputs = {
    question: inputQuery,
};
const config = {recursionLimit: 50};
let finalGeneration;
for await (const output of await app.stream(inputs, config)) {
    for (const [key, value] of Object.entries(output)) {
        console.log(`Node: '${key}'`);
        // Optional: log full state at each node
        // console.log(JSON.stringify(value, null, 2));
        finalGeneration = value;
    }
    console.log("\n---\n");
}

// Log the final generation.
console.log(JSON.stringify(finalGeneration, null, 2));