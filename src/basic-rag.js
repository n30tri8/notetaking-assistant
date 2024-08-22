import "cheerio";
import {CheerioWebBaseLoader} from "@langchain/community/document_loaders/web/cheerio";
import {RecursiveCharacterTextSplitter} from "langchain/text_splitter";
import {ChatPromptTemplate} from "@langchain/core/prompts";
import {StringOutputParser} from "@langchain/core/output_parsers";
import {initVectorStoreFromDocuments, enumerateAllSimilarityConnections} from "./utils/vectorstore.js";
import {llm} from "./utils/llm.js";
import {createGraph} from "./utils/graph-creator.js";


import {createStuffDocumentsChain} from "langchain/chains/combine_documents";

const loader = new CheerioWebBaseLoader(
    "https://lilianweng.github.io/posts/2023-06-23-agent/"
);

const docs = await loader.load();

const textSplitter = new RecursiveCharacterTextSplitter({
    // chunkSize: 1000,
    // chunkOverlap: 200,
    chunkSize: 400,
    chunkOverlap: 10,
});
const documents = (await textSplitter.splitDocuments(docs)).slice(0, 30);
// const splits = await textSplitter.splitDocuments(docs);
const vectorStore = await initVectorStoreFromDocuments(documents);

let connectedDocuments = await enumerateAllSimilarityConnections()
await createGraph(connectedDocuments);


// Retrieve and generate using the relevant snippets of the blog.
// const retriever = vectorStore.asRetriever();
// const prompt = ChatPromptTemplate.fromMessages([
//     ["human", "You are an assistant for question-answering tasks. Use the following pieces of retrieved context to answer the question. If you don't know the answer, just say that you don't know. Use three sentences maximum and keep the answer concise.\n" +
//     "Question: {question} \n" +
//     "Context: {context} \n" +
//     "Answer:"],
// ]);
//
//
// const ragChain = await createStuffDocumentsChain({
//     llm,
//     prompt,
//     outputParser: new StringOutputParser(),
// });
//
// const retrievedDocs = await retriever.invoke("what is task decomposition");
//
// console.log(retrievedDocs);