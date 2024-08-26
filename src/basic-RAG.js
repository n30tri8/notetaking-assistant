import {loadVectorStore} from "./utils/vectorstore.js";
import {llm} from "./utils/llm.js";
import {ChatPromptTemplate} from "@langchain/core/prompts";
import {StringOutputParser} from "@langchain/core/output_parsers";
import {createStuffDocumentsChain} from "langchain/chains/combine_documents";
import readlineSync from 'readline-sync';


//Retrieve and generate using the relevant snippets of the blog.
const vectorStore = await loadVectorStore();
const retriever = vectorStore.asRetriever();

const prompt = ChatPromptTemplate.fromMessages([
    ["human", "You are an assistant for question-answering tasks. Use the following pieces of retrieved context to answer the question. If you don't know the answer, just say that you don't know. Use three sentences maximum and keep the answer concise.\n" +
    "Question: {question} \n" +
    "Context: {context} \n" +
    "Answer:"],
]);


const ragChain = await createStuffDocumentsChain({
    llm,
    prompt,
    outputParser: new StringOutputParser(),
});

let inputQuery = readlineSync.question('Please type the query: ');

const retrievedDocs = await retriever.invoke(inputQuery);

const result = await ragChain.invoke({
    question: inputQuery,
    context: retrievedDocs,
});

console.log(result);